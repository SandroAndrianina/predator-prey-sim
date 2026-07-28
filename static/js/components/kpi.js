// ============================================================
// kpi.js - Mise à jour des KPI, table et boutons
// ============================================================

import { state } from '../core/api.js';
import { historyChart, updateChart } from '../core/chart.js';
import { logCycle } from '../core/log-manager.js';

// ============================================================
// RÉFÉRENCES DOM
// ============================================================
const elements = {
    kpiPrey: document.getElementById('kpiPrey'),
    kpiPredators: document.getElementById('kpiPredators'),
    kpiTotal: document.getElementById('kpiTotal'),
    kpiCycle: document.getElementById('kpiCycle'),
    kpiTick: document.getElementById('kpiTick'),
    badgePrey: document.getElementById('badgePrey'),
    badgePredators: document.getElementById('badgePredators'),
    badgeCycle: document.getElementById('badgeCycle'),
    agentCount: document.getElementById('agentCount'),
    historyBody: document.getElementById('historyBody'), // Peut être null
    toggleAutoPlay: document.getElementById('toggleAutoPlay'),
};

// ============================================================
// MISE À JOUR DES KPI
// ============================================================
export function updateStatsUI() {
    // KPI
    if (elements.kpiPrey) elements.kpiPrey.textContent = state.prey;
    if (elements.kpiPredators) elements.kpiPredators.textContent = state.predators;
    if (elements.kpiTotal) elements.kpiTotal.textContent = state.total;
    if (elements.badgePrey) elements.badgePrey.textContent = state.prey;
    if (elements.badgePredators) elements.badgePredators.textContent = state.predators;
    if (elements.agentCount) elements.agentCount.textContent = `${state.total} agents`;
    
    // Cycles et Ticks
    if (elements.kpiCycle) elements.kpiCycle.textContent = state.cycle;
    if (elements.kpiTick) elements.kpiTick.textContent = state.tick;
    if (elements.badgeCycle) elements.badgeCycle.textContent = state.cycle;
    
    // Topbar
    const cycleDisplay = document.getElementById('cycleDisplay');
    if (cycleDisplay) {
        cycleDisplay.textContent = `Cycle ${state.cycle} · Tick ${state.tick}`;
    }

    // Graphique
    updateChart();
    
    if (state.cycle > 0 && state.cycle !== window._lastLoggedCycle) {
            window._lastLoggedCycle = state.cycle;
            logCycle(state.cycle, state.prey, state.predators, state.total);
    }
}

// ============================================================
// MISE À JOUR DU TABLEAU (protégé)
// ============================================================
// export function updateTable() {
//     const body = elements.historyBody;
//     if (!body) return; // ✅ Sécurité : si l'élément n'existe pas, on sort

//     const history = state.history;

//     if (history.length === 0) {
//         body.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Aucune donnée</td></tr>';
//         return;
//     }

//     const start = Math.max(0, history.length - 20);
//     let html = '';
//     for (let i = start; i < history.length; i++) {
//         const [prey, predators] = history[i];
//         html += `
//             <tr>
//                 <td>#${i + 1}</td>
//                 <td><span style="color:#00ff88;font-weight:700;">${prey}</span></td>
//                 <td><span style="color:#ff0044;font-weight:700;">${predators}</span></td>
//                 <td>${prey + predators}</td>
//             </tr>
//         `;
//     }
//     body.innerHTML = html;
// }

// ============================================================
// BOUTON PAUSE
// ============================================================
export function updatePauseButton() {
    const icon = elements.toggleAutoPlay?.querySelector('i');
    if (!icon) return;
    
    if (state.paused) {
        icon.className = 'fa-solid fa-play';
        elements.toggleAutoPlay.classList.remove('active');
    } else {
        icon.className = 'fa-solid fa-pause';
        elements.toggleAutoPlay.classList.add('active');
    }
}

// ============================================================
// EVENT LISTENERS
// ============================================================
export function initEventListeners() {
    const toggleBtn = document.getElementById('toggleAutoPlay');
    const stepBtn = document.getElementById('stepForward');
    const resetBtn = document.getElementById('btnReset');
    const navReset = document.getElementById('navReset');
    
    // Importer les fonctions depuis api.js
    import('../core/api.js').then(({ togglePause, sendTick, resetSimulation }) => {
        if (toggleBtn) toggleBtn.addEventListener('click', togglePause);
        if (stepBtn) stepBtn.addEventListener('click', sendTick);
        if (resetBtn) resetBtn.addEventListener('click', resetSimulation);
        if (navReset) navReset.addEventListener('click', resetSimulation);
    });
}