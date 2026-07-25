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
                borderColor: '#16a34a',
                backgroundColor: 'rgba(22, 163, 74, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 2
            },
            {
                label: 'Prédateurs',
                data: [],
                borderColor: '#dc2626',
                backgroundColor: 'rgba(220, 38, 38, 0.1)',
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
                labels: { usePointStyle: true, padding: 20 }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                title: { display: true, text: 'Population' }
            },
            x: {
                title: { display: true, text: 'Cycles' }
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