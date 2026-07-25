// Charge la sidebar dynamiquement
document.addEventListener('DOMContentLoaded', function() {
    fetch('/static/sidebar.html')
        .then(response => response.text())
        .then(html => {
            document.getElementById('sidebar-container').innerHTML = html;

            if (window.onSidebarLoaded) {
                window.onSidebarLoaded();
            }
        })
        .catch(err => console.error('Erreur chargement sidebar:', err));
});