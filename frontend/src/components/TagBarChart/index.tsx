import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { formatDuration } from '../../utils/formatters';

interface BarChartData {
  label: string;
  value: number;
}

interface TagBarChartProps {
  data: BarChartData[];
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
}

const TagBarChart: React.FC<TagBarChartProps> = ({
  data,
  marginTop = 20,
  marginRight = 20,
  marginBottom = 70,
  marginLeft = 50,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!data || data.length === 0 || !svgRef.current || !tooltipRef.current) {
      d3.select(svgRef.current).selectAll("*").remove();
      return;
    }

    const sortedData = [...data].sort((a, b) => d3.descending(a.value, b.value));

    const innerWidth = svgRef.current.clientWidth - marginLeft - marginRight;
    const innerHeight = svgRef.current.clientHeight - marginTop - marginBottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg.append('g')
                 .attr('transform', `translate(${marginLeft}, ${marginTop})`);

    const xScale = d3.scaleBand()
                     .domain(sortedData.map(d => d.label))
                     .range([0, innerWidth])
                     .padding(0.2);

    const yScale = d3.scaleLinear()
                     .domain([0, d3.max(sortedData, (d: BarChartData) => d.value) || 0])
                     .range([innerHeight, 0]);

    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    const xAxis = d3.axisBottom(xScale);
    const xAxisG = g.append('g')
                    .attr('class', 'x-axis')
                    .attr('transform', `translate(0, ${innerHeight})`)
                    .call(xAxis);

    xAxisG.selectAll('text')
          .attr('transform', 'rotate(-45)')
          .attr('text-anchor', 'end')
          .attr('dx', '-0.8em')
          .attr('dy', '0.15em');

    const yAxis = d3.axisLeft(yScale)
                    .tickFormat((d: number) => {
                      const seconds = d;
                      if (seconds < 60) return `${seconds}s`;
                      const minutes = Math.floor(seconds / 60);
                      if (minutes < 60) return `${minutes}m`;
                      const hours = Math.floor(minutes / 60);
                      const remMinutes = minutes % 60;
                      return `${hours}h${remMinutes > 0 ? `${remMinutes}m` : ''}`;
                    });

    const yAxisG = g.append('g')
                    .attr('class', 'y-axis')
                    .call(yAxis);

    yAxisG.selectAll('.tick line')
          .clone()
          .attr('stroke-opacity', 0.1)
          .attr('x2', innerWidth);

    yAxisG.append('text')
        .attr('class', 'axis-label')
        .attr('y', -10)
        .attr('x', 0)
        .attr('fill', 'currentColor')
        .attr('text-anchor', 'end')
        .attr('font-size', '13px')
        .text('总时长');

    const tooltip = d3.select(tooltipRef.current);

    g.selectAll('.bar')
     .data(sortedData)
     .enter()
     .append('rect')
     .attr('class', 'bar')
     .attr('x', (d: BarChartData) => xScale(d.label)!)
     .attr('y', (d: BarChartData) => yScale(d.value))
     .attr('width', xScale.bandwidth())
     .attr('height', (d: BarChartData) => innerHeight - yScale(d.value))
     .attr('fill', (d: BarChartData) => colorScale(d.label))
     .on('mouseover', (event: MouseEvent, d: BarChartData) => {
         tooltip
             .style('opacity', 0.9)
             .html(`
                 <div class="font-semibold text-sm mb-1">${d.label}</div>
                 <div>总时长: <span class="font-bold">${formatDuration(d.value)}</span></div>
             `)
             .style('left', `${event.pageX + 10}px`)
             .style('top', `${event.pageY - 28}px`);

         d3.select(event.currentTarget)
             .transition()
             .duration(200)
             .attr('opacity', 0.7);
     })
     .on('mousemove', (event: MouseEvent) => {
         tooltip
             .style('left', `${event.pageX + 10}px`)
             .style('top', `${event.pageY - 28}px`);
     })
     .on('mouseout', (event: MouseEvent) => {
         tooltip.style('opacity', 0);

         d3.select(event.currentTarget)
             .transition()
             .duration(200)
             .attr('opacity', 1);
     });

  }, [data, marginTop, marginRight, marginBottom, marginLeft]);

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

export default TagBarChart;