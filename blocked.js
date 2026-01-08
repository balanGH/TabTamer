document.addEventListener("DOMContentLoaded", () => {
    // Show blocked domain from URL
    const params = new URLSearchParams(window.location.search);
    const domain = params.get("domain");

    if (domain) {
        const domainEl = document.getElementById("blockedDomain");
        domainEl.textContent = domain;
        document.title = `${domain} – Blocked by TabTamer`;
    }

    // Open extension options page
    const btn = document.getElementById("manageSettings");
    btn.addEventListener("click", () => {
        chrome.runtime.openOptionsPage();
    });
});
