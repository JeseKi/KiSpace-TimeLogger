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
}

const TimelineChart: React.FC<TimelineChartProps> = ({
  data,
  startDate,
  endDate,
  marginTop = 10,
  marginRight = 30,
  marginBottom = 30,
  marginLeft = 30,
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

    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    const xAxis = d3.axisBottom(xScale)
                     .ticks(d3.timeHour.every(2) || innerWidth / 80)
                     .tickSizeOuter(0)
                     .tickFormat(d3.timeFormat('%H:%M'));

    g.append('g')
     .attr('class', 'x-axis timeline-axis')
     .attr('transform', `translate(0, ${innerHeight})`)
     .call(xAxis)
     .selectAll('text')
     .style('text-anchor', 'middle');

    const timeSegments = [];
    for (let i = 1; i < data.length; i++) {
        const startTime = dayjs(data[i-1].timestamp);
        const endTime = dayjs(data[i].timestamp);
        const tag = data[i].tag || '未分类';
        const activity = data[i].activity;
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
    console.log("计算出的时间段:", timeSegments);

    const tooltip = d3.select(tooltipRef.current);

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
     .attr('fill', (d: { tag: any; }) => colorScale(d.tag))
     .attr('stroke', '#555')
     .attr('stroke-width', 0.5)
     .on('mouseover', (event: MouseEvent, d: { startTime: Dayjs; endTime: Dayjs; duration: number; tag: any; activity: any; }) => {
        d3.select(event.currentTarget).attr('opacity', 0.7);
        tooltip
            .style('opacity', 0.9)
            .html(`
                <div class="font-semibold text-sm mb-1">${d.tag}</div>
                <div>${d.activity}</div>
                <div>
                  ${d.startTime.format('HH:mm')} - ${d.endTime.format('HH:mm')}
                  (<span class="font-bold">${formatDurationSimple(d.duration)}</span>)
                </div>
            `)
            .style('left', `${event.pageX + 10}px`)
            .style('top', `${event.pageY - 28}px`);
     })
     .on('mousemove', (event: MouseEvent) => {
         tooltip
             .style('left', `${event.pageX + 10}px`)
             .style('top', `${event.pageY - 28}px`);
     })
     .on('mouseout', (event: MouseEvent) => {
         tooltip.style('opacity', 0);
         d3.select(event.currentTarget).attr('opacity', 1)
     })
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

  }, [data, startDate, endDate, marginTop, marginRight, marginBottom, marginLeft]);

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