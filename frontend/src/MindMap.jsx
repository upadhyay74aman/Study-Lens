import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Maximize2, Move } from 'lucide-react';

export default function MindMap({ data }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    // Dimensions
    const width = 800;
    const height = 400;

    // Clear previous SVG contents
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Create main zoomable group
    const g = svg.append('g').attr('class', 'zoom-container');

    // Setup Zoom Behavior
    const zoom = d3.zoom()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Create D3 Hierarchy and Tree Layout
    const root = d3.hierarchy(data);
    const treeLayout = d3.tree().size([height - 80, width - 260]);
    treeLayout(root);

    // Center tree on load: translate to left-center
    const initialTransform = d3.zoomIdentity.translate(80, 40).scale(0.95);
    svg.call(zoom.transform, initialTransform);

    // Color definitions based on depth
    const depthColors = {
      0: '#6c47ff',
      1: '#1a1625',
      2: '#65607a',
      3: '#9b95ab',
    };

    // Draw Links
    const linkGenerator = d3.linkHorizontal()
      .x(d => d.y)
      .y(d => d.x);

    g.selectAll('.mindmap-link')
      .data(root.links())
      .enter()
      .append('path')
      .attr('class', 'mindmap-link')
      .attr('d', linkGenerator)
      .attr('stroke', d => depthColors[d.source.depth] || '#d1d5db')
      .attr('stroke-width', 2.5)
      .attr('fill', 'none')
      .attr('opacity', 0.45);

    // Draw Nodes
    const node = g.selectAll('.mindmap-node')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('class', d => `mindmap-node depth-${d.depth}`)
      .attr('transform', d => `translate(${d.y},${d.x})`);

    // Node Circles
    node.append('circle')
      .attr('r', d => {
        if (d.depth === 0) return 10;
        if (d.depth === 1) return 7;
        return 5;
      })
      .attr('fill', d => d.depth === 0 ? depthColors[0] : '#ffffff')
      .attr('stroke', d => depthColors[d.depth] || depthColors[2])
      .attr('stroke-width', d => d.depth === 0 ? 3 : 2.5);

    // Node Labels
    node.append('text')
      .attr('dy', '.35em')
      .attr('x', d => {
        // Root label is centered above or to the left
        if (d.depth === 0) return -15;
        // Leaf nodes or nodes with no children have labels on the right
        return d.children ? -12 : 12;
      })
      .attr('text-anchor', d => {
        if (d.depth === 0) return 'end';
        return d.children ? 'end' : 'start';
      })
      .text(d => d.data.topic)
      .clone(true).lower() // Drop shadow for readability
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 3)
      .attr('stroke-linejoin', 'round');

    // Cleanup zoom listener
    return () => {
      svg.on('.zoom', null);
    };
  }, [data]);

  const handleResetZoom = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const zoom = d3.zoom();
    
    // Zoom back to default fit
    svg.transition()
      .duration(750)
      .call(
        zoom.on('zoom', (event) => {
          d3.select(svgRef.current).select('.zoom-container').attr('transform', event.transform);
        }).transform,
        d3.zoomIdentity.translate(80, 40).scale(0.95)
      );
  };

  return (
    <div className="mindmap-layout" ref={containerRef}>
      <div className="mindmap-header">
        <div className="mindmap-instructions">
          <Move size={16} />
          <span>Use mouse wheel to <strong>Zoom</strong> and click-drag to <strong>Pan</strong>.</span>
        </div>
      </div>

      <div className="mindmap-container">
        <svg ref={svgRef} className="mindmap-svg"></svg>
        <button className="reset-zoom-btn" onClick={handleResetZoom}>
          <Maximize2 size={14} />
          Reset View
        </button>
      </div>
    </div>
  );
}
