import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { Timelog } from '../../Api';
import { formatDurationSimple } from '../../utils/formatters';

interface TimelineChartProps {
  data: Timelog[];
  startDate: Dayjs;
  endDate: Dayjs;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
  tagColors?: Record<string, string>; 
}

const TimelineChart: React.FC<TimelineChartProps> = ({
  data,
  startDate,
  endDate,
  marginTop = 10,
  marginRight = 30,
  marginBottom = 30,
  marginLeft = 30,
  tagColors = {}, 
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!data || data.length < 2 || !svgRef.current || !startDate || !endDate || !tooltipRef.current) {
      d3.select(svgRef.current).selectAll("*").remove();
      return;
    }

    const svgWidth = svgRef.current.clientWidth;
    const svgHeight = svgRef.current.clientHeight;
    const innerWidth = svgWidth - marginLeft - marginRight;
    const innerHeight = svgHeight - marginTop - marginBottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg.append('g')
                 .attr('transform', `translate(${marginLeft}, ${marginTop})`);

    const xScale = d3.scaleTime()
                     .domain([startDate.toDate(), endDate.toDate()])
                     .range([0, innerWidth]);

    const getColor = (tag: string) => {
      if (!tag) return '#aaaaaa'; 
      return tagColors[tag] || d3.schemeCategory10[
        Array.from(new Set(data.map(d => d.tag))).indexOf(tag) % 10
      ];
    };

    const xAxis = d3.axisBottom(xScale)
                     .ticks(d3.timeHour.every(2) || innerWidth / 80)
                     .tickSizeOuter(0)
                     .tickFormat(d3.timeFormat('%H:%M'));

    g.append('g')
     .attr('class', 'x-axis timeline-axis')
     .attr('transform', `translate(0, ${innerHeight})`)
     .call(xAxis)
     .selectAll('text')
     .style('font-size', '10px');

    const tooltip = d3.select(tooltipRef.current);

    const sortedData = [...data].sort((a, b) => dayjs(a.timestamp).unix() - dayjs(b.timestamp).unix());

    const timeSegments = [];
    for (let i = 1; i < sortedData.length; i++) {
        const startTime = dayjs(sortedData[i-1].timestamp);
        const endTime = dayjs(sortedData[i].timestamp);
        const tag = sortedData[i].tag || '未分类';
        const activity = sortedData[i].activity;
        if (endTime.isAfter(startDate) && startTime.isBefore(endDate)) {
             timeSegments.push({
               startTime: startTime.isBefore(startDate) ? startDate : startTime,    
               endTime: endTime.isAfter(endDate) ? endDate : endTime,
               tag: tag,
               activity: activity,
               duration: endTime.diff(startTime, 'second'),
             });
        }
    }

    const timelineHeight = innerHeight * 0.6;
    const timelineY = innerHeight * 0.2;

    g.selectAll('.time-segment')
     .data(timeSegments)
     .enter()
     .append('rect')
     .attr('class', 'time-segment')
     .attr('x', (d: { startTime: { toDate: () => any; }; }) => xScale(d.startTime.toDate()))
     .attr('y', timelineY )
     .attr('width', (d: { endTime: { toDate: () => any; }; startTime: { toDate: () => any; }; }) => Math.max(0, xScale(d.endTime.toDate()) - xScale(d.startTime.toDate())) )
     .attr('height', timelineHeight)
     .attr('fill', (d: { tag: any; }) => getColor(d.tag))
     .attr('stroke', '#555')
     .attr('stroke-width', 0.5)
     .on('mouseover', (event: MouseEvent, d: { startTime: Dayjs; endTime: Dayjs; duration: number; tag: any; activity: any; }) => {
        tooltip
          .style('opacity', 0.9)
          .html(`
            <div class="font-semibold">${d.activity || '活动未记录'}</div>
            <div class="text-xs mt-1">
              <div>${d.startTime.format('HH:mm')} - ${d.endTime.format('HH:mm')}</div>
              <div>持续时间: ${formatDurationSimple(d.duration)}</div>
              <div>标签: ${d.tag}</div>
            </div>
          `)
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 28}px`);

        d3.select(event.currentTarget)
          .attr('stroke-width', 2)
          .attr('opacity', 1)
     })
     .on('mousemove', (event: MouseEvent) => {
        tooltip
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 28}px`);
     })
     .on('mouseout', (event: MouseEvent) => {
        tooltip.style('opacity', 0);
        
        d3.select(event.currentTarget)
          .attr('stroke-width', 0.5)
          .attr('opacity', 0.8);
     });

    const hours = [];
    const startHour = startDate.hour();
    const endHour = endDate.hour() + (endDate.day() > startDate.day() ? 24 : 0);
    
    for (let i = startHour; i <= endHour; i++) {
        const hour = i % 24;
        const day = Math.floor(i / 24);
        const time = startDate.hour(hour).minute(0).second(0).add(day, 'day');
        if (time.isAfter(startDate) && time.isBefore(endDate)) {
            hours.push(time);
        }
    }

    g.selectAll('.hour-marker')
     .data(hours)
     .enter()
     .append('line')
     .attr('class', 'hour-marker')
     .attr('x1', (d: Dayjs) => xScale(d.toDate()))
     .attr('y1', 0)
     .attr('x2', (d: Dayjs) => xScale(d.toDate()))
     .attr('y2', innerHeight)
     .attr('stroke', '#ddd')
     .attr('stroke-width', 1)
     .attr('stroke-dasharray', '3,3');

    if (endDate.isSame(dayjs(), 'minute')) {
        const nowX = xScale(dayjs().toDate());
        if (nowX >= 0 && nowX <= innerWidth) {
             g.append('line')
              .attr('class', 'now-marker')
              .attr('x1', nowX)
              .attr('x2', nowX)
              .attr('y1', 0)
              .attr('y2', innerHeight)
              .attr('stroke', 'red')
              .attr('stroke-width', 1.5)
              .attr('stroke-dasharray', '4 2');

             g.append('text')
                .attr('x', nowX)
                .attr('y', -5)
                .attr('text-anchor', 'middle')
                .attr('fill', 'red')
                .style('font-size', '10px')
                .text('现在');
        }
    }

  }, [data, startDate, endDate, marginTop, marginRight, marginBottom, marginLeft, tagColors]);

  return (
    <div className="relative w-full h-full">
        <svg ref={svgRef} className='w-full h-full'></svg>
        <div
            ref={tooltipRef}
            className="fixed bg-gray-800 text-white text-xs rounded py-1 px-2 pointer-events-none shadow-lg"
            style={{ opacity: 0, transition: 'opacity 0.2s' }}
        >
        </div>
    </div>
  );
};

export default TimelineChart;