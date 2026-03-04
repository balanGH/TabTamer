// contentScript.js

console.log("📢 TabTamer contentScript loaded");

// Check if already initialized
if (window.tabTamerInitialized) {
    console.log("TabTamer content script already initialized");
} else {
    window.tabTamerInitialized = true;

    // Use window object to store state
    window.tabTamer = window.tabTamer || {
        pickerActive: false,
        hoveredEl: null,
        hiddenElements: [], // Array to store multiple hidden elements
        pickerStartTime: null,
        currentDomain: null,
        selectionCount: 0
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
        
        .tabtamer-counter {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #667eea;
            color: white;
            padding: 8px 16px;
            border-radius: 30px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            font-weight: 600;
            z-index: 999999;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            animation: slideIn 0.3s ease;
            pointer-events: none;
        }
        
        .tabtamer-counter.dark {
            background: #5a67d8;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
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
            max-width: 350px;
            animation: slideIn 0.3s ease;
            border: 1px solid #e0e0e0;
            pointer-events: auto !important;
        }
        
        .tabtamer-confirm-overlay * {
            pointer-events: auto !important;
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
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .tabtamer-confirm-overlay.dark .tabtamer-confirm-title {
            color: #e0e0e0;
        }
        
        .tabtamer-badge {
            background: #667eea;
            color: white;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 12px;
        }
        
        .tabtamer-selector-list {
            max-height: 200px;
            overflow-y: auto;
            margin: 10px 0;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
        }
        
        .tabtamer-confirm-overlay.dark .tabtamer-selector-list {
            border-color: #444;
        }
        
        .tabtamer-selector-item {
            display: flex;
            align-items: center;
            padding: 8px;
            border-bottom: 1px solid #e0e0e0;
            font-size: 11px;
            font-family: monospace;
            word-break: break-all;
            cursor: default;
        }
        
        .tabtamer-confirm-overlay.dark .tabtamer-selector-item {
            border-bottom-color: #444;
        }
        
        .tabtamer-selector-item:last-child {
            border-bottom: none;
        }
        
        .tabtamer-selector-item input[type="checkbox"] {
            margin-right: 8px;
            cursor: pointer;
            pointer-events: auto !important;
        }
        
        .tabtamer-selector-text {
            flex: 1;
            cursor: default;
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
            pointer-events: auto !important;
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
        
        .tabtamer-help-text {
            font-size: 11px;
            color: #888;
            margin-top: 8px;
            text-align: center;
            cursor: default;
        }
        
        .tabtamer-finish-button {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 30px;
            padding: 12px 24px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            z-index: 999999;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            animation: slideIn 0.3s ease;
            display: flex;
            align-items: center;
            gap: 8px;
            border: 2px solid white;
        }
        
        .tabtamer-finish-button.dark {
            background: #5a67d8;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        
        .tabtamer-finish-button:hover {
            transform: scale(1.05);
        }
        
        .tabtamer-finish-button .count {
            background: white;
            color: #667eea;
            border-radius: 20px;
            padding: 2px 8px;
            font-size: 12px;
            font-weight: 700;
        }
        `;
        document.documentElement.appendChild(style);
    }

    // Listen for messages
    chrome.runtime.onMessage.addListener(msg => {
        if (msg.action === "START_ELEMENT_PICKER") {
            console.log("Starting element picker...");

            // Reset hidden elements array
            window.tabTamer.hiddenElements = [];
            window.tabTamer.selectionCount = 0;

            // Remove any existing UI elements
            removeUI();

            if (window.tabTamerPickerActive) {
                forceStopPicker();
            }

            setTimeout(() => {
                startPicker();
                showCounter();
                showFinishButton();
            }, 50);
        }
        else if (msg.action === "UNDO_ELEMENT_BLOCK") {
            undoLast();
        }
        else if (msg.action === "UNDO_ALL_ELEMENTS") {
            undoAllElements(msg.selectors);
        }
        else if (msg.action === "SHOW_BLOCK_CONFIRMATION") {
            // Remove counter and finish button
            removeUI();
            // Show confirmation
            showBlockConfirmation(msg.selectors, msg.domain, msg.count);
        }
        else if (msg.action === "UPDATE_CONFIRMATION") {
            updateConfirmationUI(msg.selectors, msg.count);
        }
        else if (msg.action === "UNDO_SPECIFIC_ELEMENT") {
            // Restore a specific element by selector
            const selector = msg.selector;
            const elementIndex = window.tabTamer.hiddenElements.findIndex(item => item.selector === selector);

            if (elementIndex !== -1) {
                const item = window.tabTamer.hiddenElements[elementIndex];
                if (item.element && item.element.parentNode) {
                    item.element.style.display = item.originalDisplay || "";
                }
                window.tabTamer.hiddenElements.splice(elementIndex, 1);
                window.tabTamer.selectionCount = window.tabTamer.hiddenElements.length;
                console.log(`Restored element: ${selector}`);
            }
        }
    });

    // Show selection counter
    function showCounter() {
        removeCounter();

        chrome.storage.local.get(['preferences'], ({ preferences = {} }) => {
            const isDark = preferences.darkMode || false;

            const counter = document.createElement('div');
            counter.id = 'tabtamer-counter';
            counter.className = `tabtamer-counter ${isDark ? 'dark' : ''}`;
            counter.textContent = '✨ Select elements to block (0)';
            document.body.appendChild(counter);
        });
    }

    function updateCounter(count) {
        const counter = document.getElementById('tabtamer-counter');
        if (counter) {
            counter.textContent = `✨ Selected: ${count} element${count !== 1 ? 's' : ''}`;
        }
    }

    function removeCounter() {
        const counter = document.getElementById('tabtamer-counter');
        if (counter) counter.remove();
    }

    // Show finish button
    function showFinishButton() {
        removeFinishButton();

        chrome.storage.local.get(['preferences'], ({ preferences = {} }) => {
            const isDark = preferences.darkMode || false;

            const button = document.createElement('button');
            button.id = 'tabtamer-finish-button';
            button.className = `tabtamer-finish-button ${isDark ? 'dark' : ''}`;
            button.innerHTML = '✅ Done Selecting <span class="count" id="finish-count">0</span>';

            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                finishSelection();
            });

            document.body.appendChild(button);
        });
    }

    function updateFinishButton(count) {
        const button = document.getElementById('tabtamer-finish-button');
        if (button) {
            const countSpan = document.getElementById('finish-count');
            if (countSpan) countSpan.textContent = count;

            if (count === 0) {
                button.innerHTML = '❌ Cancel <span class="count" id="finish-count">0</span>';
            } else {
                button.innerHTML = '✅ Block Selected <span class="count" id="finish-count">' + count + '</span>';
            }
        }
    }

    function removeFinishButton() {
        const button = document.getElementById('tabtamer-finish-button');
        if (button) button.remove();
    }

    function removeUI() {
        removeCounter();
        removeFinishButton();
    }

    // Finish selection - show confirmation
    function finishSelection() {
        if (window.tabTamer.hiddenElements.length === 0) {
            // Nothing selected, just cancel
            chrome.runtime.sendMessage({ action: "CANCEL_ELEMENT_BLOCK" });
            removeUI();
            stopPicker();
            return;
        }

        // Stop picker
        stopPicker();

        // Remove UI elements
        removeUI();

        // Get all selectors
        const selectors = window.tabTamer.hiddenElements.map(item => item.selector);
        const domain = window.location.hostname.replace(/^www\./, '');

        // Send to background for confirmation
        chrome.runtime.sendMessage({
            action: "SHOW_BLOCK_CONFIRMATION_FROM_FINISH",
            selectors: selectors,
            domain: domain,
            count: selectors.length
        });
    }

    // Show confirmation UI on the webpage
    function showBlockConfirmation(selectors, domain, count) {
        // Remove any existing overlay
        const existingOverlay = document.getElementById('tabtamer-confirm-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }

        // Check if dark mode is enabled
        chrome.storage.local.get(['preferences'], ({ preferences = {} }) => {
            const isDark = preferences.darkMode || false;

            const overlay = document.createElement('div');
            overlay.id = 'tabtamer-confirm-overlay';
            overlay.className = `tabtamer-confirm-overlay ${isDark ? 'dark' : ''}`;

            // Create selector list HTML
            const selectorItems = selectors.map((selector, index) => {
                const truncated = selector.length > 40 ? selector.substring(0, 40) + '...' : selector;
                return `
                    <div class="tabtamer-selector-item">
                        <input type="checkbox" class="tabtamer-selector-checkbox" data-selector="${selector}" data-index="${index}" checked>
                        <span class="tabtamer-selector-text" title="${selector}">${truncated}</span>
                    </div>
                `;
            }).join('');

            overlay.innerHTML = `
                <div class="tabtamer-confirm-title">
                    <span>🔒 Block Elements on ${domain}</span>
                    <span class="tabtamer-badge">${count}</span>
                </div>
                <div class="tabtamer-selector-list" id="tabtamer-selector-list">
                    ${selectorItems}
                </div>
                <div class="tabtamer-confirm-buttons">
                    <button class="tabtamer-btn-block" id="tabtamerConfirmBlock">Block Selected (${count})</button>
                    <button class="tabtamer-btn-cancel ${isDark ? 'dark' : ''}" id="tabtamerConfirmCancel">Cancel All</button>
                </div>
                <div class="tabtamer-help-text">Uncheck any elements you don't want to block</div>
            `;

            document.body.appendChild(overlay);

            // Handle checkbox changes
            document.querySelectorAll('.tabtamer-selector-checkbox').forEach(checkbox => {
                checkbox.addEventListener('change', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    const selector = e.target.dataset.selector;
                    const isChecked = e.target.checked;

                    if (!isChecked) {
                        // Immediately restore the element visually
                        const hiddenElements = window.tabTamer.hiddenElements;
                        const elementIndex = hiddenElements.findIndex(item => item.selector === selector);

                        if (elementIndex !== -1) {
                            const item = hiddenElements[elementIndex];
                            if (item.element && item.element.parentNode) {
                                item.element.style.display = item.originalDisplay || "";
                            }
                            // Remove from hiddenElements array
                            hiddenElements.splice(elementIndex, 1);
                        }

                        // Send message to background to remove from stack
                        chrome.runtime.sendMessage({
                            action: "REMOVE_FROM_STACK",
                            selector: selector
                        }).catch(error => {
                            console.error("Failed to send remove from stack:", error);
                        });
                    }

                    // Update count in UI
                    setTimeout(() => {
                        const checkedCount = document.querySelectorAll('.tabtamer-selector-checkbox:checked').length;
                        const badge = overlay.querySelector('.tabtamer-badge');
                        if (badge) badge.textContent = checkedCount;

                        const blockBtn = document.getElementById('tabtamerConfirmBlock');
                        if (blockBtn) {
                            blockBtn.textContent = `Block Selected (${checkedCount})`;
                        }
                    }, 50);
                });
            });

            // Handle block button
            document.getElementById('tabtamerConfirmBlock').addEventListener('click', (e) => {
                e.stopPropagation();

                // Get all checked checkboxes
                const checkedSelectors = Array.from(document.querySelectorAll('.tabtamer-selector-checkbox:checked'))
                    .map(cb => cb.dataset.selector);

                if (checkedSelectors.length === 0) {
                    // If nothing checked, treat as cancel
                    chrome.runtime.sendMessage({ action: "CANCEL_ELEMENT_BLOCK" });
                } else {
                    chrome.runtime.sendMessage({ action: "CONFIRM_ELEMENT_BLOCK" });
                }
                overlay.remove();
            });

            // Handle cancel button
            document.getElementById('tabtamerConfirmCancel').addEventListener('click', (e) => {
                e.stopPropagation();
                chrome.runtime.sendMessage({ action: "CANCEL_ELEMENT_BLOCK" });
                overlay.remove();
            });

            // Auto-remove after 30 seconds
            setTimeout(() => {
                if (document.body.contains(overlay)) {
                    overlay.remove();
                    chrome.runtime.sendMessage({ action: "CANCEL_ELEMENT_BLOCK" });
                }
            }, 30000);
        });
    }

    // Update confirmation UI when items are removed
    function updateConfirmationUI(selectors, count) {
        const overlay = document.getElementById('tabtamer-confirm-overlay');
        if (!overlay) return;

        // Update badge
        const badge = overlay.querySelector('.tabtamer-badge');
        if (badge) badge.textContent = count;

        // Update button text
        const blockBtn = overlay.querySelector('#tabtamerConfirmBlock');
        if (blockBtn) {
            blockBtn.textContent = `Block Selected (${count})`;
        }
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
        if (window.tabTamerPickerActive) {
            const now = Date.now();
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

        document.addEventListener("mousemove", onHover, true);
        document.addEventListener("click", onClick, true);
        document.addEventListener("keydown", onKeyDown, true);

        console.log("✅ Element picker started - Click multiple elements to add to stack");
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

    // hover highlight - EXCLUDE overlay and its children
    function onHover(e) {
        if (!window.tabTamer.pickerActive) return;

        // Don't highlight if target is the overlay or its children
        const target = e.target;
        if (target.closest && (
            target.closest('#tabtamer-confirm-overlay') ||
            target.closest('#tabtamer-counter') ||
            target.closest('#tabtamer-finish-button')
        )) {
            if (window.tabTamer.hoveredEl) {
                window.tabTamer.hoveredEl.classList.remove(HOVER_CLASS);
                window.tabTamer.hoveredEl = null;
            }
            return;
        }

        if (window.tabTamer.hoveredEl) window.tabTamer.hoveredEl.classList.remove(HOVER_CLASS);
        window.tabTamer.hoveredEl = target;
        window.tabTamer.hoveredEl.classList.add(HOVER_CLASS);
    }

    function clearHover() {
        if (window.tabTamer.hoveredEl) window.tabTamer.hoveredEl.classList.remove(HOVER_CLASS);
        window.tabTamer.hoveredEl = null;
    }

    // click - EXCLUDE overlay and its children
    function onClick(e) {
        if (!window.tabTamer.pickerActive) return;

        // Don't select if target is the overlay or its children
        const target = e.target;
        if (target.closest && (
            target.closest('#tabtamer-confirm-overlay') ||
            target.closest('#tabtamer-counter') ||
            target.closest('#tabtamer-finish-button')
        )) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        const element = target;
        const selector = getUniqueSelector(element);

        // Store element and selector
        window.tabTamer.hiddenElements.push({
            element: element,
            selector: selector,
            originalDisplay: element.style.display
        });

        // Hide the element
        element.style.display = "none";

        // Update count
        window.tabTamer.selectionCount = window.tabTamer.hiddenElements.length;
        updateCounter(window.tabTamer.selectionCount);
        updateFinishButton(window.tabTamer.selectionCount);

        console.log(`Element ${window.tabTamer.selectionCount} added to stack:`, selector);

        // Send message to background (just for tracking, not for confirmation yet)
        try {
            chrome.runtime.sendMessage({
                action: "ELEMENT_ADDED_TO_STACK",
                selector: selector,
                count: window.tabTamer.selectionCount
            });
        } catch (error) {
            console.error("Failed to send message to background:", error);
        }

        // Keep picker active for more selections
    }

    // ESC → cancel all
    function onKeyDown(e) {
        if (e.key === "Escape") {
            // Restore all hidden elements
            window.tabTamer.hiddenElements.forEach(item => {
                if (item.element && item.element.parentNode) {
                    item.element.style.display = item.originalDisplay || "";
                }
            });

            window.tabTamer.hiddenElements = [];
            window.tabTamer.selectionCount = 0;

            removeUI();
            stopPicker();
        }
    }

    function undoLast() {
        if (window.tabTamer.hiddenElements.length > 0) {
            const last = window.tabTamer.hiddenElements.pop();
            if (last.element && last.element.parentNode) {
                last.element.style.display = last.originalDisplay || "";
            }
            window.tabTamer.selectionCount = window.tabTamer.hiddenElements.length;
            updateCounter(window.tabTamer.selectionCount);
            updateFinishButton(window.tabTamer.selectionCount);
            console.log(`Undid last element. Remaining: ${window.tabTamer.selectionCount}`);
        }
    }

    function undoAllElements(selectorsToUndo = null) {
        if (selectorsToUndo) {
            // Undo specific selectors
            window.tabTamer.hiddenElements = window.tabTamer.hiddenElements.filter(item => {
                if (selectorsToUndo.includes(item.selector)) {
                    if (item.element && item.element.parentNode) {
                        item.element.style.display = item.originalDisplay || "";
                    }
                    return false;
                }
                return true;
            });
        } else {
            // Undo all
            window.tabTamer.hiddenElements.forEach(item => {
                if (item.element && item.element.parentNode) {
                    item.element.style.display = item.originalDisplay || "";
                }
            });
            window.tabTamer.hiddenElements = [];
        }

        window.tabTamer.selectionCount = window.tabTamer.hiddenElements.length;
        updateCounter(window.tabTamer.selectionCount);
        updateFinishButton(window.tabTamer.selectionCount);
        console.log(`Elements restored. Remaining: ${window.tabTamer.selectionCount}`);
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
        removeUI();
    });
}