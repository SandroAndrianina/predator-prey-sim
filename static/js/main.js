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

import { 
    updateStatsUI, 
    updateTable,
    updatePauseButton,
    initEventListeners 
} from './components/kpi.js';

import { initConfigModal } from './components/config-modal.js';
import { loadSidebar } from './components/sidebar.js';

const POLL_INTERVAL_MS = 130;

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
    
    // 6. Event listeners
    if (document.getElementById('toggleAutoPlay')) {
        initEventListeners();
    }
    
    // 7. Polling et rendu
    setInterval(async () => {
        await fetchState();
        updateStatsUI();
        updatePauseButton();
    }, POLL_INTERVAL_MS);
    
    renderLoop();
}

// LANCEMENT
document.addEventListener('DOMContentLoaded', init);
window.addEventListener('resize', resizeCanvas);