// ============================================================
// api.js - Gestion des appels API
// ============================================================

const API_URL = '/api';

// État global partagé
export let state = {
    prey: 0,
    predators: 0,
    total: 0,
    history: [],
    ticks: 0,
    cycle: 0,
    tick: 0,
    paused: false,
    ticks_per_cycle: 10,
    agents: []
};

// Variables d'interpolation (exportées pour simulation.js)
export let previousAgents = new Map();
export let currentAgents = new Map();
export let lastSnapshotTime = performance.now();

// ============================================================
// RÉCUPÉRER L'ÉTAT
// ============================================================
// core/api.js

export async function fetchState() {
    try {
        const response = await fetch(`${API_URL}/state`);
        const data = await response.json();

        state.prey = data.prey;
        state.predators = data.predators;
        state.total = data.total;
        state.history = data.history || [];
        state.ticks = data.history ? data.history.length : 0;
        state.cycle = data.cycle || 0;
        state.tick = data.tick || 0;
        state.paused = data.paused;
        state.ticks_per_cycle = data.ticks_per_cycle || 10;
        state.agents = data.agents || [];

        // ✅ METTRE À JOUR window.__state POUR LES LOGS
        window.__state = {
            cycle: state.cycle,
            tick: state.tick
        };

        previousAgents = currentAgents;
        currentAgents = new Map();
        (data.agents || []).forEach(a => {
            currentAgents.set(a.id, { 
                x: a.x, 
                y: a.y, 
                species: a.species,
                energy: a.energy || 0
            });
        });
        lastSnapshotTime = performance.now();

        return data;
    } catch (error) {
        console.error('Erreur fetchState:', error);
        return null;
    }
}

// ============================================================
// ACTIONS
// ============================================================
export async function sendTick() {
    try {
        await fetch(`${API_URL}/tick`, { method: 'POST' });
        await fetchState();
    } catch (error) {
        console.error('Erreur sendTick:', error);
    }
}

export async function resetSimulation() {
    try {
        await fetch(`${API_URL}/reset`, { method: 'POST' });
        previousAgents = new Map();
        currentAgents = new Map();
        await fetchState();
    } catch (error) {
        console.error('Erreur reset:', error);
    }
}

export async function togglePause() {
    try {
        const response = await fetch(`${API_URL}/toggle-pause`, { method: 'POST' });
        const data = await response.json();
        state.paused = data.paused;
        return data.paused;
    } catch (error) {
        console.error('Erreur togglePause:', error);
        return null;
    }
}

export async function loadPresets() {
    try {
        const response = await fetch(`${API_URL}/configs`);
        return await response.json();
    } catch (error) {
        console.error('Erreur chargement presets:', error);
        return [];
    }
}

export async function saveConfig(config) {
    try {
        const response = await fetch(`${API_URL}/configs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
        return await response.json();
    } catch (error) {
        console.error('Erreur sauvegarde config:', error);
        return null;
    }
}

export async function applyConfigDirect(config) {
    try {
        const response = await fetch(`${API_URL}/apply-config-direct`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
        return await response.json();
    } catch (error) {
        console.error('Erreur application config:', error);
        return null;
    }
}