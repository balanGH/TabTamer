// contentScript.js

console.log("Content script loaded");
// Debug: Check if script is loaded
console.log("📢 contentScript.js loaded at:", new Date().toISOString());
console.log("Current URL:", window.location.href);
console.log("Chrome runtime valid:", !!chrome.runtime);

// Check if already initialized
if (window.tabTamerInitialized) {
    console.log("TabTamer content script already initialized");
} else {
    window.tabTamerInitialized = true;

    // Use window object to store state
    window.tabTamer = window.tabTamer || {
        pickerActive: false,
        hoveredEl: null,
        lastHiddenEl: null,
        lastSelector: null,
        pickerStartTime: null
    };

    const HOVER_CLASS = "tabtamer-hover";

    // Add picker styles
    if (!document.getElementById('tabtamer-picker-style')) {
        const style = document.createElement("style");
        style.id = 'tabtamer-picker-style';
        style.textContent = `
        .${HOVER_CLASS} {
            outline: 2px dashed #888 !important;
            outline-offset: 2px !important;
            background-color: rgba(128, 128, 128, 0.15) !important;
            cursor: crosshair !important;
        }
        
        .tabtamer-confirm-overlay {
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            padding: 16px;
            z-index: 1000000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 300px;
            animation: slideIn 0.3s ease;
            border: 1px solid #e0e0e0;
        }
        
        .tabtamer-confirm-overlay.dark {
            background: #2a2a2a;
            color: #e0e0e0;
            border-color: #444;
        }
        
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        .tabtamer-confirm-title {
            font-weight: 600;
            margin-bottom: 10px;
            color: #333;
        }
        
        .tabtamer-confirm-overlay.dark .tabtamer-confirm-title {
            color: #e0e0e0;
        }
        
        .tabtamer-confirm-selector {
            background: #f5f5f5;
            padding: 8px;
            border-radius: 6px;
            font-family: monospace;
            font-size: 12px;
            word-break: break-all;
            margin: 10px 0;
            color: #333;
        }
        
        .tabtamer-confirm-overlay.dark .tabtamer-confirm-selector {
            background: #1e1e1e;
            color: #8fbaff;
        }
        
        .tabtamer-confirm-buttons {
            display: flex;
            gap: 8px;
            margin-top: 12px;
        }
        
        .tabtamer-confirm-buttons button {
            flex: 1;
            padding: 8px 12px;
            border: none;
            border-radius: 6px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .tabtamer-btn-block {
            background: #667eea;
            color: white;
        }
        
        .tabtamer-btn-block:hover {
            background: #5a67d8;
        }
        
        .tabtamer-btn-cancel {
            background: #e0e0e0;
            color: #333;
        }
        
        .tabtamer-btn-cancel:hover {
            background: #d0d0d0;
        }
        
        .tabtamer-btn-cancel.dark {
            background: #444;
            color: #e0e0e0;
        }
        
        .tabtamer-btn-cancel.dark:hover {
            background: #555;
        }
        `;
        document.documentElement.appendChild(style);
    }

    // Listen for messages
    chrome.runtime.onMessage.addListener(msg => {
        console.log("Content script received message:", msg.action);

        if (msg.action === "START_ELEMENT_PICKER") {
            console.log("Starting element picker...");

            // Reset any existing picker state first
            if (window.tabTamerPickerActive) {
                console.log("Picker already active, resetting...");
                forceStopPicker();
            }

            // Small delay to ensure clean state
            setTimeout(() => {
                startPicker();
                console.log("Picker started function called");
            }, 50);
        } else if (msg.action === "UNDO_ELEMENT_BLOCK") {
            undoLast();
        } else if (msg.action === "SHOW_BLOCK_CONFIRMATION") {
            showBlockConfirmation(msg.selector, msg.domain);
        }
    });

    // Show confirmation UI on the webpage
    function showBlockConfirmation(selector, domain) {
        // Check if dark mode is enabled
        chrome.storage.local.get(['preferences'], ({ preferences = {} }) => {
            const isDark = preferences.darkMode || false;

            const overlay = document.createElement('div');
            overlay.className = `tabtamer-confirm-overlay ${isDark ? 'dark' : ''}`;
            overlay.innerHTML = `
                <div class="tabtamer-confirm-title">🔒 Block Element on ${domain}?</div>
                <div class="tabtamer-confirm-selector">${selector}</div>
                <div class="tabtamer-confirm-buttons">
                    <button class="tabtamer-btn-block" id="tabtamerConfirmBlock">Block</button>
                    <button class="tabtamer-btn-cancel ${isDark ? 'dark' : ''}" id="tabtamerConfirmCancel">Cancel</button>
                </div>
            `;

            document.body.appendChild(overlay);

            // Handle buttons
            document.getElementById('tabtamerConfirmBlock').addEventListener('click', () => {
                chrome.runtime.sendMessage({ action: "CONFIRM_ELEMENT_BLOCK" });
                overlay.remove();
            });

            document.getElementById('tabtamerConfirmCancel').addEventListener('click', () => {
                chrome.runtime.sendMessage({ action: "CANCEL_ELEMENT_BLOCK" });
                overlay.remove();
            });

            // Auto-remove if user clicks outside
            setTimeout(() => {
                if (document.body.contains(overlay)) {
                    overlay.remove();
                    chrome.runtime.sendMessage({ action: "CANCEL_ELEMENT_BLOCK" });
                }
            }, 10000); // Auto-cancel after 10 seconds
        });
    }

    // Force stop picker (for reset)
    function forceStopPicker() {
        if (window.tabTamerPickerActive) {
            window.tabTamerPickerActive = false;
            window.tabTamer.pickerActive = false;
            clearHover();

            document.removeEventListener("mousemove", onHover, true);
            document.removeEventListener("click", onClick, true);
            document.removeEventListener("keydown", onKeyDown, true);
        }
    }

    window.tabTamerPickerActive = false;

    // picker lifecycle
    function startPicker() {
        console.log("startPicker() called");

        // Check if already active with debounce
        if (window.tabTamerPickerActive) {
            const now = Date.now();
            // If it's been less than 500ms since last start, ignore (prevents double-click)
            if (window.tabTamer.pickerStartTime && (now - window.tabTamer.pickerStartTime < 500)) {
                console.log("Picker start debounced");
                return;
            }
            console.log("Picker already active, restarting...");
            forceStopPicker();
        }

        window.tabTamer.pickerStartTime = Date.now();
        window.tabTamerPickerActive = true;
        window.tabTamer.pickerActive = true;

        // Add event listeners
        document.addEventListener("mousemove", onHover, true);
        document.addEventListener("click", onClick, true);
        document.addEventListener("keydown", onKeyDown, true);

        console.log("✅ Element picker started - hover over elements to see dotted outline");
        console.log("Click any element to block it");
    }

    function stopPicker() {
        if (!window.tabTamerPickerActive) return;

        window.tabTamerPickerActive = false;
        window.tabTamer.pickerActive = false;
        clearHover();

        document.removeEventListener("mousemove", onHover, true);
        document.removeEventListener("click", onClick, true);
        document.removeEventListener("keydown", onKeyDown, true);

        console.log("Element picker stopped");
    }

    // hover highlight
    function onHover(e) {
        if (!window.tabTamer.pickerActive) return;

        if (window.tabTamer.hoveredEl) window.tabTamer.hoveredEl.classList.remove(HOVER_CLASS);
        window.tabTamer.hoveredEl = e.target;
        window.tabTamer.hoveredEl.classList.add(HOVER_CLASS);
    }

    function clearHover() {
        if (window.tabTamer.hoveredEl) window.tabTamer.hoveredEl.classList.remove(HOVER_CLASS);
        window.tabTamer.hoveredEl = null;
    }

    // click → preview hide ONLY
    function onClick(e) {
        if (!window.tabTamer.pickerActive) return;

        e.preventDefault();
        e.stopPropagation();

        window.tabTamer.lastHiddenEl = e.target;
        window.tabTamer.lastSelector = getUniqueSelector(window.tabTamer.lastHiddenEl);

        window.tabTamer.lastHiddenEl.style.display = "none";

        // Stop picker first
        stopPicker();

        // Send message to background
        try {
            chrome.runtime.sendMessage({
                action: "ELEMENT_BLOCK_PREVIEW",
                selector: window.tabTamer.lastSelector
            });
        } catch (error) {
            console.error("Failed to send message to background:", error);
            undoLast();
        }
    }

    // ESC → cancel
    function onKeyDown(e) {
        if (e.key === "Escape") {
            undoLast();
            stopPicker();
        }
    }

    function undoLast() {
        if (window.tabTamer.lastHiddenEl) {
            window.tabTamer.lastHiddenEl.style.display = "";
            window.tabTamer.lastHiddenEl = null;
            window.tabTamer.lastSelector = null;
        }
    }

    // selector generator
    function getUniqueSelector(el) {
        if (!el || !el.tagName) return '';

        if (el.id) {
            const escapedId = CSS.escape(el.id);
            return `#${escapedId}`;
        }

        const path = [];
        let current = el;
        let depth = 0;

        while (current && current.nodeType === 1 && depth < 4) {
            let sel = current.tagName.toLowerCase();

            if (current.classList.length) {
                const classes = [...current.classList]
                    .filter(c => !c.startsWith("tabtamer"))
                    .slice(0, 2)
                    .join(".");
                if (classes) {
                    sel += `.${classes}`;
                }
            }

            const siblings = [...current.parentNode.children].filter(child =>
                child.nodeType === 1 && child.tagName === current.tagName
            );
            if (siblings.length > 1) {
                const index = siblings.indexOf(current) + 1;
                sel += `:nth-child(${index})`;
            }

            path.unshift(sel);
            current = current.parentElement;
            depth++;
        }

        return path.join(' > ');
    }

    // auto-apply saved rules
    chrome.storage.local.get(["elementBlockRules"], ({ elementBlockRules = {} }) => {
        const domain = location.hostname.replace(/^www\./, "");
        (elementBlockRules[domain] || []).forEach(sel => {
            try {
                document.querySelectorAll(sel).forEach(el => {
                    el.style.display = "none";
                });
            } catch (error) {
                console.warn(`Invalid selector for ${domain}: ${sel}`, error);
            }
        });
    });

    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
        if (window.tabTamerPickerActive) {
            stopPicker();
        }
    });
}