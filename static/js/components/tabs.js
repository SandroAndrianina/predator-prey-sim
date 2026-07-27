// ============================================================
// tabs.js - Gestion du panneau de graphiques (rétractable)
// ============================================================

const container = document.getElementById('tabContainer');
const toggleBtn = document.getElementById('tabToggle');

let isCollapsed = false;

export function initTabs() {
    if (!container) return;

    toggleBtn?.addEventListener('click', () => {
        if (isCollapsed) {
            expandTab();
        } else {
            collapseTab();
        }
    });

    // État initial : déplié
    expandTab();
}

function collapseTab() {
    if (isCollapsed) return;
    isCollapsed = true;
    container?.classList.add('collapsed');
    const icon = toggleBtn?.querySelector('i');
    if (icon) icon.className = 'fa-solid fa-chevron-left';
}

function expandTab() {
    if (!isCollapsed) return;
    isCollapsed = false;
    container?.classList.remove('collapsed');
    const icon = toggleBtn?.querySelector('i');
    if (icon) icon.className = 'fa-solid fa-chevron-right';
}

export function isTabCollapsed() {
    return isCollapsed;
}