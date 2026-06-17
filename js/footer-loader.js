(function() {
    const placeholder = document.querySelector('[data-footer-placeholder]');
    if (!placeholder) return;

    const pathSegments = location.pathname.split('/').filter(Boolean);
    const isFile = pathSegments.length && pathSegments[pathSegments.length - 1].includes('.');
    const depth = Math.max(0, pathSegments.length - (isFile ? 1 : 0));
    const prefix = depth > 0 ? '../'.repeat(depth) : '';
    const footerUrl = (prefix || './') + 'footer.html';

    fetch(footerUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Footer fetch failed: ${response.status} ${response.statusText}`);
            }
            return response.text();
        })
        .then(html => {
            html = html.replace(/{{prefix}}/g, prefix);
            placeholder.insertAdjacentHTML('beforebegin', html);
            placeholder.remove();
        })
        .catch(error => {
            console.error('[footer-loader]', error);
        });
})();
