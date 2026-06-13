// Contact page helpers
document.addEventListener('click', function(e) {
    const target = e.target.closest('[data-focus]');
    if (!target) return;
    e.preventDefault();
    const selector = target.getAttribute('data-focus');
    const el = document.querySelector(selector);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => { el.focus({ preventScroll: true }); }, 400);
    }
});