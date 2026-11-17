// Moves the radial glow on .glow-border and .glow-divider elements to follow the pointer.
export function initializeHover(selector) {
    const update = (e) => {
        document.querySelectorAll(selector).forEach((el) => {
            const rect = el.getBoundingClientRect();
            el.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
            el.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
        });
    };

    document.addEventListener('mousemove', update);
    document.addEventListener('click', update);
}
