// ============================================================
// density-heatmap.js - Heatmap de densité des agents, D3.js
// Palette thermique (interpolateTurbo) → bleu → vert → jaune → rouge
// ============================================================

import { dashboardState } from './dashboard-api.js';

let svg;

export function initDensityHeatmap() {
    const container = document.getElementById('densityHeatmap');
    if (!container || typeof d3 === 'undefined') return;

    // Supprimer l'ancien SVG s'il existe
    container.innerHTML = '';

    svg = d3.select(container).append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .style('display', 'block');
}

export function updateDensityHeatmap() {
    if (!svg || !dashboardState.available) return;

    const grid = dashboardState.densityHeatmap;
    const size = dashboardState.heatmapGridSize;
    if (!grid || grid.length === 0) return;

    const container = document.getElementById('densityHeatmap');
    const rect = container.getBoundingClientRect();
    const width = rect.width || 260;
    const height = rect.height || 260;
    const cellW = width / size;
    const cellH = height / size;

    let maxCount = 0;
    grid.forEach(row => row.forEach(v => { if (v > maxCount) maxCount = v; }));
    if (maxCount === 0) maxCount = 1;

    // ✅ Palette thermique (interpolateTurbo) → couleurs chaudes
    // Si interpolateTurbo n'est pas disponible, utiliser interpolateRgb
    const colorScale = typeof d3.interpolateTurbo !== 'undefined'
        ? d3.scaleSequential(d3.interpolateTurbo).domain([0, maxCount])
        : d3.scaleSequential(d3.interpolateRgb('#0000ff', '#ff0000')).domain([0, maxCount]);

    const cells = [];
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            cells.push({ x, y, value: grid[y][x] });
        }
    }

    svg.selectAll('rect')
        .data(cells)
        .join('rect')
        .attr('x', d => d.x * cellW)
        .attr('y', d => d.y * cellH)
        .attr('width', Math.ceil(cellW) + 1)
        .attr('height', Math.ceil(cellH) + 1)
        .attr('fill', d => (d.value === 0 ? 'rgba(255,255,255,0.03)' : colorScale(d.value)))
        .attr('rx', 1);
}