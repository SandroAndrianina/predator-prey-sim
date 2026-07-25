export function loadSidebar() {
    return fetch('/static/templates/sidebar.html')
        .then(response => response.text())
        .then(html => {
            document.getElementById('sidebar-container').innerHTML = html;
        })
        .catch(err => console.error('Erreur chargement sidebar:', err));
}