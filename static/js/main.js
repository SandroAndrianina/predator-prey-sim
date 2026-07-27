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

const POLL_INTERVAL_MS = 130;
// Le dashboard (7 KPI + histogramme + heatmap) est calculé et mis en cache
// côté Rust une fois par cycle : pas besoin de le sonder aussi vite que
// /api/state. Cf. répartition /api/state (tick) vs /api/dashboard (cycle).
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
    
    // 4. Initialiser le modal (MAINTENANT le HTML est présent)
    initConfigModal();
    
    // 5. Charger l'état initial
    await fetchState();
    updateStatsUI();
    updatePauseButton();

    // 5bis. Dashboard (KPI avancés, histogramme, phase, heatmap)
    buildAdvancedKpiCards();
    initPhaseChart();
    initDensityHeatmap();
    await refreshDashboard();
    
    // 6. Event listeners
    if (document.getElementById('toggleAutoPlay')) {
        initEventListeners();
    }
    
    // 7. Polling et rendu
    setInterval(async () => {
        await fetchState();
        updateStatsUI();
        updatePauseButton();
        // Le diagramme de phase réutilise state.history (aucun appel serveur
        // supplémentaire) : on le redessine au même rythme que le reste.
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
