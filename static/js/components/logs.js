// ============================================================
// logs.js - Interface des logs (toggle dans sidebar)
// ============================================================

import { getLogs, clearLogs, onLog } from '../core/log-manager.js';

let container, logList, isOpen = false;
let unsubscribe;

export function initLogs() {
    // Créer le conteneur si inexistant
    if (!document.getElementById('logContainer')) {
        const div = document.createElement('div');
        div.id = 'logContainer';
        div.className = 'log-container hidden';
        div.innerHTML = `
            <div class="log-header">
                <span><i class="fa-solid fa-terminal"></i> Console de logs</span>
                <div>
                    <button id="clearLogs" class="icon-btn" title="Effacer"><i class="fa-solid fa-trash"></i></button>
                    <button id="closeLogs" class="icon-btn" title="Fermer"><i class="fa-solid fa-xmark"></i></button>
                </div>
            </div>
            <div class="log-body" id="logBody"></div>
        `;
        document.body.appendChild(div);

        // Boutons
        document.getElementById('clearLogs')?.addEventListener('click', () => {
            clearLogs();
            renderLogs();
        });
        document.getElementById('closeLogs')?.addEventListener('click', toggleLogs);
    }

    container = document.getElementById('logContainer');
    logList = document.getElementById('logBody');

    // Écouter les nouveaux logs
    unsubscribe = onLog(() => renderLogs());

    // Rendu initial
    renderLogs();

    // Bouton dans la sidebar
    const logBtn = document.getElementById('navLogs');
    if (logBtn) {
        logBtn.addEventListener('click', (e) => {
            e.preventDefault();
            toggleLogs();
        });
    }
}

export function toggleLogs() {
    isOpen = !isOpen;
    container?.classList.toggle('hidden', !isOpen);
    container?.classList.toggle('open', isOpen);
    if (isOpen) renderLogs();
}

function renderLogs() {
    if (!logList) return;
    const logs = getLogs();
    if (logs.length === 0) {
        logList.innerHTML = '<div class="log-empty">Aucun log à afficher</div>';
        return;
    }
    logList.innerHTML = logs.map(log => `
        <div class="log-entry log-${log.type}">
            <span class="log-time">[Cycle ${log.cycle} · Tick ${log.tick}]</span>
            <span class="log-message">${log.message}</span>
        </div>
    `).join('');
}

// Nettoyage
export function destroyLogs() {
    if (unsubscribe) unsubscribe();
}