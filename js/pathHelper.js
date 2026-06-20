// Shared path helper for local and GitHub Pages hosting
window.IS_GITHUB_PAGES = typeof window.IS_GITHUB_PAGES !== 'undefined'
    ? window.IS_GITHUB_PAGES
    : location.hostname.includes('github.io');

// Default to root paths for modern hosting (Vercel). Allow override via window.BASE_PATH when needed.
window.BASE_PATH = typeof window.BASE_PATH !== 'undefined'
    ? window.BASE_PATH
    : '/';

console.log('[pathHelper] IS_GITHUB_PAGES =', window.IS_GITHUB_PAGES, 'BASE_PATH =', window.BASE_PATH);
