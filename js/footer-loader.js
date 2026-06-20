(function() {
    const placeholder = document.querySelector('[data-footer-placeholder]');
    if (!placeholder) return;
    const BASE_PATH = window.BASE_PATH || (location.hostname.includes('github.io') ? '/KingdomGathering_Website/' : '/');

    const normalizedPath = location.pathname.startsWith(BASE_PATH)
        ? location.pathname.slice(BASE_PATH.length)
        : location.pathname.replace(/^\//, '');

    const pathSegments = normalizedPath.split('/').filter(Boolean);
    const isFile = pathSegments.length && pathSegments[pathSegments.length - 1].includes('.');
    const depth = Math.max(0, pathSegments.length - (isFile ? 1 : 0));
    const prefix = depth > 0 ? '../'.repeat(depth) : '';
    const footerUrl = `${BASE_PATH}footer.html`;

    console.log('[footer-loader] BASE_PATH =', BASE_PATH, 'footerUrl =', footerUrl, 'prefix =', prefix, 'pathname =', location.pathname);

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
            console.error('[footer-loader] Footer load failed:', error);
        });
})();
