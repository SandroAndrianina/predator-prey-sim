import { 
    state, 
    fetchState, 
    sendTick, 
    resetSimulation, 
    togglePause,
    loadPresets,
    applyConfigDirect
} from './core/api.js';

import { 
    resizeCanvas, 
    renderLoop, 
    drawAgents,
    getInterpolatedAgents 
} from './core/simulation.js';

import { 
    historyChart, 
    updateChart 
} from './core/chart.js';

import { fetchDashboard } from './core/dashboard-api.js';

import { 
    updateStatsUI, 
    updateTable,
    updatePauseButton,
    initEventListeners 
} from './components/kpi.js';

import {
    buildAdvancedKpiCards,
    updateAdvancedKpis,
    updateEnergyHistogram
} from './components/dashboard.js';

import { initPhaseChart, updatePhaseChart } from './components/phase-chart.js';
import { initDensityHeatmap, updateDensityHeatmap } from './components/density-heatmap.js';

import { initConfigModal } from './components/config-modal.js';
import { loadSidebar } from './components/sidebar.js';

// ⚠️ ALIGNÉ SUR LE TICK SERVEUR (100ms)
const POLL_INTERVAL_MS = 100;
const DASHBOARD_POLL_INTERVAL_MS = 10000;

async function refreshDashboard() {
    await fetchDashboard();
    updateAdvancedKpis();
    updateEnergyHistogram();
    updatePhaseChart();
    updateDensityHeatmap();
}

async function init() {
    // 1. Canvas
    resizeCanvas();
    
    // 2. Charger la sidebar
    await loadSidebar();
    
    // 3. Charger le modal HTML
    const modalHTML = await fetch('/static/templates/config-modal.html').then(r => r.text());
    document.getElementById('configModalContainer').innerHTML = modalHTML;
    
    // 4. Initialiser le modal
    initConfigModal();
    
    // 5. Charger l'état initial
    await fetchState();
    updateStatsUI();
    updatePauseButton();

    // 5bis. Dashboard
    buildAdvancedKpiCards();
    initPhaseChart();
    initDensityHeatmap();
    await refreshDashboard();
    
    // 6. Event listeners
    if (document.getElementById('toggleAutoPlay')) {
        initEventListeners();
    }
    
    // 7. Polling (synchronisé avec le serveur)
    setInterval(async () => {
        await fetchState();
        updateStatsUI();
        updatePauseButton();
        updatePhaseChart();
    }, POLL_INTERVAL_MS);

    setInterval(refreshDashboard, DASHBOARD_POLL_INTERVAL_MS);
    
    renderLoop();
}

// LANCEMENT
document.addEventListener('DOMContentLoaded', init);
window.addEventListener('resize', () => {
    resizeCanvas();
    updatePhaseChart();
    updateDensityHeatmap();
});