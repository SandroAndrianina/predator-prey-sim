// ============================================================
// chart.js - Gestion du graphique Chart.js
// ============================================================

import { state } from './api.js';

// ============================================================
// INITIALISATION
// ============================================================
const ctx = document.getElementById('historyChart').getContext('2d');

export const historyChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [
            {
                label: 'Proies',
                data: [],
                borderColor: '#00ff88',
                backgroundColor: 'rgba(0, 255, 136, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 2
            },
            {
                label: 'Prédateurs',
                data: [],
                borderColor: '#ff0044',
                backgroundColor: 'rgba(255, 0, 68, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 2
            }
        ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
            legend: {
                position: 'top',
                labels: { usePointStyle: true, padding: 20, color: '#c4c4d4' }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                title: { display: true, text: 'Population', color: '#8888aa' },
                ticks: { color: '#8888aa' },
                grid: { color: 'rgba(255,255,255,0.06)' }
            },
            x: {
                title: { display: true, text: 'Cycles', color: '#8888aa' },
                ticks: { color: '#8888aa' },
                grid: { color: 'rgba(255,255,255,0.06)' }
            }
        },
        interaction: {
            intersect: false,
            mode: 'index'
        }
    }
});

// ============================================================
// MISE À JOUR
// ============================================================
export function updateChart() {
    if (state.history.length === 0) return;
    
    const ticksPerCycle = state.ticks_per_cycle || 10;
    const cycleData = [];
    
    for (let i = 0; i < state.history.length; i += ticksPerCycle) {
        const idx = Math.min(i + ticksPerCycle - 1, state.history.length - 1);
        cycleData.push(state.history[idx]);
    }
    
    const labels = cycleData.map((_, i) => i + 1);
    const preyData = cycleData.map(h => h[0]);
    const predatorData = cycleData.map(h => h[1]);

    historyChart.data.labels = labels;
    historyChart.data.datasets[0].data = preyData;
    historyChart.data.datasets[1].data = predatorData;
    historyChart.update('none');
}