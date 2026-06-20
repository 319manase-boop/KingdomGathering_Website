// Shared path helper for local and GitHub Pages hosting
window.IS_GITHUB_PAGES = typeof window.IS_GITHUB_PAGES !== 'undefined'
    ? window.IS_GITHUB_PAGES
    : location.hostname.includes('github.io');

window.BASE_PATH = typeof window.BASE_PATH !== 'undefined'
    ? window.BASE_PATH
    : (window.IS_GITHUB_PAGES ? '/KingdomGathering_Website/' : '/');

console.log('[pathHelper] IS_GITHUB_PAGES =', window.IS_GITHUB_PAGES, 'BASE_PATH =', window.BASE_PATH);
