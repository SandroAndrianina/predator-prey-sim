// ============================================================
// sidebar.js - Sidebar rétractable (GSAP)
// ============================================================

let isCollapsed = false;
const SIDEBAR_W = 240;
const COLLAPSED_W = 60;

export function loadSidebar() {
    return fetch('/static/templates/sidebar.html')
        .then(response => response.text())
        .then(html => {
            document.getElementById('sidebar-container').innerHTML = html;
            initSidebarToggle();
            // Initialiser les logs après le chargement
            import('./logs.js').then(({ initLogs }) => initLogs());
        })
        .catch(err => console.error('Erreur chargement sidebar:', err));
}

function initSidebarToggle() {
    const sidebar = document.querySelector('.app-sidebar');
    const toggleBtn = document.getElementById('sidebarToggle');

    if (!sidebar || !toggleBtn) return;

    toggleBtn.addEventListener('click', () => {
        isCollapsed = !isCollapsed;
        const targetW = isCollapsed ? COLLAPSED_W : SIDEBAR_W;

        // ✅ Ajouter/retirer la classe CSS pour le centrage des icônes
        sidebar.classList.toggle('collapsed', isCollapsed);

        // Animation GSAP
        gsap.to(sidebar, {
            width: targetW,
            duration: 0.1,
            ease: 'power2.inOut',
            onUpdate: () => {
                // Cacher les labels quand rétracté
                const labels = sidebar.querySelectorAll('.nav-link span, .brand span, .nav-section-label');
                gsap.to(labels, {
                    opacity: isCollapsed ? 0 : 1,
                    duration: 0.2,
                    ease: 'power2.out',
                });
            }
        });
    });
}