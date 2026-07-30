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
    agentCount: document.getElementById('agentCount'),
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
    if (elements.agentCount) elements.agentCount.textContent = `${state.total} agents`;
    
    // Topbar
    const cycleDisplay = document.getElementById('cycleDisplay');
    if (cycleDisplay) {
        cycleDisplay.textContent = `Cycle ${state.cycle} · Tick ${state.tick}`;
    }

    // Graphique
    updateChart();

    // ✅ Appeler l'horloge
    updateClock();
    
    if (state.cycle > 0 && state.cycle !== window._lastLoggedCycle) {
            window._lastLoggedCycle = state.cycle;
            logCycle(state.cycle, state.prey, state.predators, state.total);
    }
}

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

// ============================================================
// HORLOGE HUD (mise à jour continue)
// ============================================================
function updateClock() {
    const hudCycle = document.getElementById('hudCycle');
    const hudTick = document.getElementById('hudTick');
    if (hudCycle) hudCycle.textContent = state.cycle;
    if (hudTick) hudTick.textContent = state.tick;

    const hand = document.getElementById('clockHand');
    const arc = document.getElementById('clockArc');

    if (!hand && !arc) return;

    const ticksPerCycle = state.ticks_per_cycle || 10;
    
    // Progression dans le cycle (0 à 1)
    const progress = (state.tick % ticksPerCycle) / ticksPerCycle;
    
    // Angle cumulé : chaque cycle = 360°
    const totalDegrees = (state.cycle * 360) + (progress * 360);
    
    // Aiguille
    if (hand) {
        hand.style.transform = `rotate(${totalDegrees}deg)`;
    }

    // Arc de progression
    if (arc) {
        const circumference = 2 * Math.PI * 26;
        const offset = circumference * (1 - progress);
        arc.style.strokeDasharray = circumference;
        arc.style.strokeDashoffset = offset;
    }
}