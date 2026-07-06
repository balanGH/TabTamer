// Get current domain
const domain = location.hostname.replace(/^www\./, '');

// Hide elements by selector list (display:none, not remove, so they can be restored)
function hideBlockedElements(selectors) {
    selectors.forEach(selector => {
        try {
            document.querySelectorAll(selector).forEach(el => {
                el.style.display = 'none';
            });
        } catch (e) {
            console.warn(`Invalid selector: ${selector}`, e);
        }
    });
}

// Load rules from storage
chrome.storage.local.get(['elementBlockRules'], ({ elementBlockRules = {} }) => {
    const rules = elementBlockRules[domain];
    if (!rules || !rules.length) return;

    // Run once
    hideBlockedElements(rules);

    // Observe dynamic changes with debounce via requestAnimationFrame
    let rafPending = false;
    const observer = new MutationObserver(() => {
        if (!rafPending) {
            rafPending = true;
            requestAnimationFrame(() => {
                hideBlockedElements(rules);
                rafPending = false;
            });
        }
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });
});
