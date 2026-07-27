// ============================================================
// phase-chart.js - Diagramme de phase (prédateurs vs proies), D3.js
//
// Calculé entièrement côté frontend à partir de state.history
// (déjà transmis pour la courbe temporelle) : aucun appel serveur
// supplémentaire, aucune statistique biologique nouvelle - juste un
// nuage de points (x=proies, y=prédateurs) par cycle.
// ============================================================

import { state } from '../core/api.js';

const margin = { top: 10, right: 16, bottom: 30, left: 44 };

let svg, dotsGroup, xAxisGroup, yAxisGroup;

function getCycleData() {
    const ticksPerCycle = state.ticks_per_cycle || 10;
    const cycleData = [];
    for (let i = 0; i < state.history.length; i += ticksPerCycle) {
        const idx = Math.min(i + ticksPerCycle - 1, state.history.length - 1);
        cycleData.push(state.history[idx]);
    }
    return cycleData;
}

export function initPhaseChart() {
    const container = document.getElementById('phaseChart');
    if (!container || typeof d3 === 'undefined') return;

    svg = d3.select(container).append('svg')
        .attr('width', '100%')
        .attr('height', '100%');

    svg.append('g').attr('class', 'phase-axis phase-axis-x');
    svg.append('g').attr('class', 'phase-axis phase-axis-y');
    dotsGroup = svg.append('g').attr('class', 'phase-dots');
}

export function updatePhaseChart() {
    if (!svg) return;

    const container = document.getElementById('phaseChart');
    const rect = container.getBoundingClientRect();
    const width = rect.width || 320;
    const height = rect.height || 260;
    const w = Math.max(10, width - margin.left - margin.right);
    const h = Math.max(10, height - margin.top - margin.bottom);

    const cycleData = getCycleData();
    if (cycleData.length === 0) return;

    const preyMax = d3.max(cycleData, d => d[0]) || 1;
    const predMax = d3.max(cycleData, d => d[1]) || 1;

    const xScale = d3.scaleLinear().domain([0, preyMax * 1.1]).range([0, w]);
    const yScale = d3.scaleLinear().domain([0, predMax * 1.1]).range([h, 0]);

    svg.select('.phase-axis-x')
        .attr('transform', `translate(${margin.left},${margin.top + h})`)
        .call(d3.axisBottom(xScale).ticks(5));

    svg.select('.phase-axis-y')
        .attr('transform', `translate(${margin.left},${margin.top})`)
        .call(d3.axisLeft(yScale).ticks(5));

    dotsGroup.attr('transform', `translate(${margin.left},${margin.top})`);

    const lastIndex = cycleData.length - 1;

    dotsGroup.selectAll('circle')
        .data(cycleData)
        .join('circle')
        .attr('cx', d => xScale(d[0]))
        .attr('cy', d => yScale(d[1]))
        .attr('r', (d, i) => (i === lastIndex ? 5 : 3))
        .attr('class', (d, i) => `phase-point${i === lastIndex ? ' phase-point-current' : ''}`);
}
