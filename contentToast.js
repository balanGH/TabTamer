// Injected into all pages
chrome.runtime.onMessage.addListener(msg => {
    if (msg.action === 'showToast' && msg.message) {
        const div = document.createElement('div');
        div.textContent = msg.message;
        div.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #ff4757;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 999999;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            opacity: 0;
            transition: opacity 0.3s;
        `;
        document.body.appendChild(div);
        requestAnimationFrame(() => div.style.opacity = 1);
        setTimeout(() => {
            div.style.opacity = 0;
            setTimeout(() => div.remove(), 300);
        }, 5000);
    }
});
