// Get current domain
const domain = location.hostname.replace(/^www\./, '');

// Remove elements by selector list
function removeBlockedElements(selectors) {
    selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => el.remove());
        console.log(`Removed ${elements.length} elements for selector:`, selector);
    });
}

// Load rules from storage
chrome.storage.local.get(['elementBlockRules'], ({ elementBlockRules = {} }) => {
    const rules = elementBlockRules[domain];
    if (!rules || !rules.length) return;

    // Run once
    removeBlockedElements(rules);

    // Observe dynamic changes (YouTube, SPA sites)
    const observer = new MutationObserver(() => {
        removeBlockedElements(rules);
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });
});
