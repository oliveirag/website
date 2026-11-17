// Sets --mouse-x/--mouse-y on every element matching `selector` to the pointer position relative
// to that element, which the .glow-border and .glow-divider styles use to place their glow.
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
