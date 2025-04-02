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
  tagColors?: Record<string, string>; 
}

const TagBarChart: React.FC<TagBarChartProps> = ({
  data,
  marginTop = 20,
  marginRight = 20,
  marginBottom = 70,
  marginLeft = 50,
  tagColors = {}, 
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

    const getColor = (label: string) => {
      return tagColors[label] || d3.schemeCategory10[sortedData.findIndex(d => d.label === label) % 10];
    };

    const xAxis = d3.axisBottom(xScale);
    const xAxisG = g.append('g')
                    .attr('class', 'x-axis')
                    .attr('transform', `translate(0, ${innerHeight})`)
                    .call(xAxis);

    xAxisG.selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end')
        .attr('dx', '-.8em')
        .attr('dy', '.15em');

    const yAxis = d3.axisLeft(yScale)
                    .ticks(5)
                    .tickFormat((d: any) => formatDuration(d));
    g.append('g')
      .attr('class', 'y-axis')
      .call(yAxis);

    const tooltip = d3.select(tooltipRef.current);

    g.selectAll('.bar')
      .data(sortedData)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', (d: BarChartData) => xScale(d.label) || 0)
      .attr('y', (d: BarChartData) => yScale(d.value))
      .attr('width', xScale.bandwidth())
      .attr('height', (d: BarChartData) => innerHeight - yScale(d.value))
      .attr('fill', (d: BarChartData) => getColor(d.label))
      .attr('opacity', 0.9)
      .attr('rx', 2)
      .attr('ry', 2)
      .on('mouseover', (event: MouseEvent, d: BarChartData) => {
        tooltip
          .style('opacity', 0.9)
          .html(`
            <div class="font-semibold text-sm mb-1">${d.label}</div>
            <div>时长: <span class="font-bold">${formatDuration(d.value)}</span></div>
          `)
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 28}px`);

        d3.select(event.currentTarget)
          .transition()
          .duration(200)
          .attr('opacity', 1)
          .attr('stroke', '#333')
          .attr('stroke-width', 1);
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
          .attr('opacity', 0.9)
          .attr('stroke', 'none');
      });

    svg.append('text')
       .attr('transform', 'rotate(-90)')
       .attr('y', 0)
       .attr('x', 0 - (svgRef.current.clientHeight / 2))
       .attr('dy', '1em')
       .style('text-anchor', 'middle')
       .style('font-size', '12px')
       .text('时长');

  }, [data, marginTop, marginRight, marginBottom, marginLeft, tagColors]);

  return (
    <div className="relative w-full h-full">
      <svg ref={svgRef} className="w-full h-full"></svg>
      <div
        ref={tooltipRef}
        className="fixed bg-gray-800 text-white text-xs rounded py-1 px-2 pointer-events-none shadow-lg"
        style={{ opacity: 0 }}
      ></div>
    </div>
  );
};

export default TagBarChart;