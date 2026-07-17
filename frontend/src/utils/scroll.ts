export const scrollToElement = (element: HTMLElement | null) => {
    if (!element) return;
    const container = element.closest('.sidebar-embedded');
    if (container) {
        const containerRect = container.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        const relativeTop = elementRect.top - containerRect.top + container.scrollTop;
        container.scrollTo({
            top: relativeTop - containerRect.height / 2 + elementRect.height / 2,
            behavior: 'smooth'
        });
    } else {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
};
