import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { formatDuration } from '../../utils/formatters';

interface PieChartData {
    label: string;
    value: number;
}

interface TagPieChartProps {
    data: PieChartData[];
    innerRadiusRatio?: number;
}

const TagPieChart: React.FC<TagPieChartProps> = ({
    data,
    innerRadiusRatio = 0.6,
}) => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const tooltipRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!data || data.length === 0 || !svgRef.current || !tooltipRef.current) {
            d3.select(svgRef.current).selectAll("*").remove();
            return;
        }

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();
        const padding = 20;
        const svgWidth = svgRef.current.clientWidth - padding * 2;
        const svgHeight = svgRef.current.clientHeight - padding * 2;

        const radius = Math.min(svgWidth, svgHeight) / 2;
        const innerRadius = radius * innerRadiusRatio;

        const g = svg.append('g')
            .attr('transform', `translate(${svgWidth / 2 + padding}, ${svgHeight / 2 + padding})`);
        const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

        const pie = d3.pie()
            .value((d: PieChartData) => d.value)
            .sort(null);

        const arc = d3.arc()
            .innerRadius(innerRadius)
            .outerRadius(radius);

        const arcs = g.selectAll('.arc')
            .data(pie(data))
            .enter()
            .append('g')
            .attr('class', 'arc');

        const tooltip = d3.select(tooltipRef.current);

        arcs.append('path')
            .attr('d', arc)
            .attr('fill', (d: any) => colorScale(d.data.label))
            .attr('stroke', '#ffffff')
            .style('stroke-width', '2px')
            .on('mouseover', (event: MouseEvent, d: any) => {
                tooltip
                    .style('opacity', 0.9)
                    .html(`
                        <div class="font-semibold text-sm mb-1">${d.data.label}</div>
                        <div>总时长: <span class="font-bold">${formatDuration(d.data.value)}</span></div>
                    `)
                    .style('left', `${event.pageX + 10}px`)
                    .style('top', `${event.pageY - 28}px`);

                d3.select(event.currentTarget)
                    .transition()
                    .duration(200)
                    .attr('transform', 'scale(1.05)')
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
                    .attr('transform', 'scale(1)')
                    .attr('opacity', 1);
            });

    }, [data, innerRadiusRatio]);

    return (
        <div className="relative w-full h-full flex justify-center items-center">
            <div className="aspect-square w-full max-w-[90%]">
                <svg ref={svgRef} className="w-full h-full"></svg>
                <div
                    ref={tooltipRef}
                    className="fixed bg-gray-800 text-white text-xs rounded py-1 px-2 pointer-events-none shadow-lg"
                    style={{ opacity: 0, transition: 'opacity 0.2s' }}
                >
                </div>
            </div>
        </div>
    );
};

export default TagPieChart;