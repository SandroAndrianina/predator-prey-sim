// ============================================================
// log-manager.js - Gestion des logs de la simulation
// ============================================================

const MAX_LOGS = 200;
let logs = [];
let listeners = [];

export function logEvent(type, message, data = {}) {
    const entry = {
        timestamp: Date.now(),
        cycle: window.__state?.cycle || 0,
        tick: window.__state?.tick || 0,
        type, // 'predation', 'birth', 'death', 'info'
        message,
        data,
    };
    logs.unshift(entry);
    if (logs.length > MAX_LOGS) logs.pop();

    // Notifier les écouteurs
    listeners.forEach(fn => fn(entry));
}

export function getLogs() {
    return logs;
}

export function clearLogs() {
    logs = [];
    listeners.forEach(fn => fn(null));
}

export function onLog(callback) {
    listeners.push(callback);
    return () => {
        listeners = listeners.filter(fn => fn !== callback);
    };
}