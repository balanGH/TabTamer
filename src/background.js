// Session-based time tracking for Chrome extension (Manifest V3)

// Clear any existing listeners on startup
if (chrome.runtime.onMessage.hasListeners()) {
  // Force remove all listeners (though we can't directly)
  console.log("Cleaning up old message listeners...");
}

// Add this helper function near the top of background.js
function isValidHttpUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
// Persistent local storage
function persistSites() {
  chrome.storage.local.set({
    sites: sessionData.sites
  });
}

// In-memory storage for tracking data
let sessionData = {
  sites: {},
  currentActiveTab: null,
  currentAudioTabs: new Set(),
  isWindowFocused: true,
  lastUpdateTime: Date.now(),
  trackAudioEnabled: true
};

// Timer interval (update every second)
const UPDATE_INTERVAL = 1000;
let updateTimer = null;

// Initialize session data structure for a site
function initializeSite(domain) {
  if (!sessionData.sites[domain]) {
    sessionData.sites[domain] = {
      domain: domain,
      totalTime: 0,
      dailyTime: {},
      activeIntervals: []
    };
  }
  return sessionData.sites[domain];
}

// blocked Tabs set — persisted to survive service worker restarts
let blockedTabs = new Set();

function persistBlockedTabs() {
  chrome.storage.local.set({ blockedTabs: [...blockedTabs] });
}

function restoreBlockedTabs() {
  chrome.storage.local.get(['blockedTabs'], ({ blockedTabs: stored = [] }) => {
    blockedTabs = new Set(stored);
  });
}

// Get domain from URL
function getDomain(url) {
  try {
    if (
      !url ||
      url.startsWith('chrome://') ||
      url.startsWith('edge://') ||
      url.startsWith('chrome-extension://')
    ) {
      return null;
    }

    const { hostname } = new URL(url);

    // Normalize domain (remove www.)
    return hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

// Get current date key (YYYY-MM-DD)
function getDateKey() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

function getWarningKey(domain) {
  return `${domain}_${getDateKey()}`;
}

function cleanupOldWarnings() {
  chrome.storage.local.get(['limitWarningsSent'], ({ limitWarningsSent = {} }) => {
    const today = getDateKey();
    const cleaned = {};

    Object.keys(limitWarningsSent).forEach(key => {
      if (key.endsWith(today)) {
        cleaned[key] = true;
      }
    });

    chrome.storage.local.set({ limitWarningsSent: cleaned });
  });
}

// ==================== SITE CATEGORIES ====================
const SITE_CATEGORIES = {
  social: ['facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'tiktok.com', 'snapchat.com', 'reddit.com', 'linkedin.com', 'pinterest.com', 'tumblr.com', 'discord.com', 'threads.net', 'mastodon.social'],
  entertainment: ['youtube.com', 'netflix.com', 'twitch.tv', 'hulu.com', 'disneyplus.com', 'spotify.com', 'soundcloud.com', 'primevideo.com', 'crunchyroll.com', 'vimeo.com'],
  news: ['cnn.com', 'bbc.com', 'bbc.co.uk', 'nytimes.com', 'foxnews.com', 'reuters.com', 'apnews.com', 'theguardian.com', 'washingtonpost.com'],
  work: ['dev.azure.com', 'github.com', 'gitlab.com', 'bitbucket.org', 'stackoverflow.com', 'docs.google.com', 'drive.google.com', 'notion.so', 'slack.com', 'trello.com', 'jira.atlassian.com', 'confluence.atlassian.com', 'figma.com', 'linear.app', 'vercel.com', 'netlify.com'],
  shopping: ['amazon.com', 'amazon.in', 'ebay.com', 'walmart.com', 'etsy.com', 'aliexpress.com', 'flipkart.com', 'myntra.com']
};

function domainMatchesPattern(domain, pattern) {
  // Wildcard subdomain: *.corestack.io → matches anything.corestack.io
  if (pattern.startsWith('*.')) {
    const suffix = pattern.slice(2);
    return domain === suffix || domain.endsWith('.' + suffix);
  }
  // Wildcard port: localhost:* → matches "localhost" (port is stripped by getDomain)
  if (pattern.endsWith(':*')) {
    const base = pattern.slice(0, -2);
    return domain === base;
  }
  return domain === pattern || domain.endsWith('.' + pattern);
}

function getCategoryForDomain(domain) {
  for (const [category, domains] of Object.entries(SITE_CATEGORIES)) {
    if (domains.some(pattern => domainMatchesPattern(domain, pattern))) {
      return category;
    }
  }
  return 'other';
}

// ==================== FOCUS MODE ====================
let focusState = {
  active: false,
  endTime: null,
  duration: 0,
  blockedDomains: []
};

function startFocusMode(durationMinutes, blockedCategories = ['social', 'entertainment', 'shopping']) {
  const endTime = Date.now() + durationMinutes * 60000;
  focusState = {
    active: true,
    endTime,
    duration: durationMinutes,
    blockedDomains: blockedCategories
  };
  chrome.storage.local.set({ focusState });
  chrome.alarms.create('focusModeEnd', { delayInMinutes: durationMinutes });

  chrome.notifications.create('focus-start', {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('assets/icons/icon48.png'),
    title: 'TabTamer – Focus Mode',
    message: `Focus mode started for ${durationMinutes} minutes. Distracting sites are blocked.`
  });
}

function stopFocusMode() {
  focusState = { active: false, endTime: null, duration: 0, blockedDomains: [] };
  chrome.storage.local.set({ focusState });
  chrome.alarms.clear('focusModeEnd');

  chrome.notifications.create('focus-end', {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('assets/icons/icon48.png'),
    title: 'TabTamer – Focus Mode Ended',
    message: 'Focus session complete! Great work.'
  });
}

function isFocusBlocked(domain) {
  if (!focusState.active) return false;
  if (Date.now() > focusState.endTime) {
    stopFocusMode();
    return false;
  }
  const category = getCategoryForDomain(domain);
  return focusState.blockedDomains.includes(category);
}

// ==================== BREAK REMINDERS ====================
let continuousBrowsingStart = Date.now();

function checkBreakReminder() {
  if (!sessionData.isWindowFocused) return;

  chrome.storage.local.get(['preferences'], ({ preferences = {} }) => {
    const breakInterval = preferences.breakReminderMinutes || 0;
    if (!breakInterval) return;

    const elapsed = (Date.now() - continuousBrowsingStart) / 60000;
    if (elapsed >= breakInterval) {
      // Reset timer for next reminder cycle
      continuousBrowsingStart = Date.now();

      chrome.notifications.create('break-reminder-' + Date.now(), {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('assets/icons/icon48.png'),
        title: 'TabTamer – Take a Break!',
        message: `You've been browsing for ${Math.round(elapsed)} minutes. Time to stretch!`
      });

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'showToast',
            message: `You've been browsing for ${Math.round(elapsed)} min. Take a break!`
          }).catch(() => {});
        }
      });
    }
  });
}

// ==================== CONTEXT MENU ====================
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'blockElement' && tab?.id) {
    chrome.tabs.sendMessage(tab.id, { action: 'START_ELEMENT_PICKER' }).catch(() => {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['src/content/contentScript.js']
      }).then(() => {
        setTimeout(() => {
          chrome.tabs.sendMessage(tab.id, { action: 'START_ELEMENT_PICKER' }).catch(() => {});
        }, 200);
      }).catch(() => {});
    });
  }
});

// ==================== KEYBOARD SHORTCUTS ====================
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-focus-mode') {
    if (focusState.active) {
      stopFocusMode();
    } else {
      startFocusMode(25);
    }
  } else if (command === 'start-element-picker') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id && tab.url && isValidHttpUrl(tab.url)) {
      chrome.tabs.sendMessage(tab.id, { action: 'START_ELEMENT_PICKER' }).catch(() => {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['src/content/contentScript.js']
        }).then(() => {
          setTimeout(() => {
            chrome.tabs.sendMessage(tab.id, { action: 'START_ELEMENT_PICKER' }).catch(() => {});
          }, 200);
        }).catch(() => {});
      });
    }
  }
});

// Save element selector in background.js - Updated for multiple elements
let pendingElementBlocks = []; // Array to store multiple elements
let currentBlockTabId = null;
let currentBlockDomain = null;

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  try {
    // Handle element added to stack (no confirmation yet)
    if (req.action === "ELEMENT_ADDED_TO_STACK") {
      if (!sender.tab) {
        console.error("No sender tab for element block preview");
        return;
      }

      // Check if the tab URL is valid
      if (!sender.tab.url || !isValidHttpUrl(sender.tab.url)) {
        console.log("Cannot block elements on this page type");
        return;
      }

      const domain = new URL(sender.tab.url).hostname.replace(/^www\./, "");

      // If this is a new tab/domain, reset the stack
      if (currentBlockTabId !== sender.tab.id || currentBlockDomain !== domain) {
        pendingElementBlocks = [];
        currentBlockTabId = sender.tab.id;
        currentBlockDomain = domain;
      }

      // Add the new selector to the stack (avoid duplicates)
      const exists = pendingElementBlocks.some(item => item.selector === req.selector);
      if (!exists) {
        pendingElementBlocks.push({
          selector: req.selector,
          tabId: sender.tab.id,
          domain: domain,
          timestamp: Date.now()
        });
        console.log(`Element added to stack. Total: ${pendingElementBlocks.length}`);
      } else {
        console.log(`Element already in stack: ${req.selector}`);
      }
      return true;
    }

    // Handle finish selection - show confirmation
    else if (req.action === "SHOW_BLOCK_CONFIRMATION_FROM_FINISH") {
      if (!sender.tab) {
        console.error("No sender tab for element block confirmation");
        return;
      }

      // Send confirmation with all selected elements
      chrome.tabs.sendMessage(sender.tab.id, {
        action: "SHOW_BLOCK_CONFIRMATION",
        selectors: pendingElementBlocks.map(item => item.selector),
        domain: req.domain || currentBlockDomain,
        count: pendingElementBlocks.length
      }).catch(error => {
        console.debug("Failed to show confirmation:", error.message);
      });

      return true;
    }

    // Handle confirm block
    else if (req.action === "CONFIRM_ELEMENT_BLOCK") {
      if (pendingElementBlocks.length === 0) {
        console.warn("No pending elements to confirm");
        return;
      }

      // Save all element block rules
      chrome.storage.local.get(["elementBlockRules"], ({ elementBlockRules = {} }) => {
        if (currentBlockDomain) {
          elementBlockRules[currentBlockDomain] ||= [];

          // Add all new selectors (avoid duplicates)
          pendingElementBlocks.forEach(item => {
            if (!elementBlockRules[currentBlockDomain].includes(item.selector)) {
              elementBlockRules[currentBlockDomain].push(item.selector);
            }
          });

          chrome.storage.local.set({ elementBlockRules }, () => {
            console.log(`${pendingElementBlocks.length} elements blocked on ${currentBlockDomain}`);

            chrome.notifications.create(`block-success-${Date.now()}`, {
              type: 'basic',
              iconUrl: chrome.runtime.getURL('assets/icons/icon128.png'),
              title: 'TabTamer – Elements Blocked',
              message: `${pendingElementBlocks.length} element(s) blocked on ${currentBlockDomain}`
            });
          });
        }
      });

      // Clear the stack
      pendingElementBlocks = [];
      currentBlockTabId = null;
      currentBlockDomain = null;
      return true;
    }

    // Handle cancel block
    else if (req.action === "CANCEL_ELEMENT_BLOCK") {
      // Send undo message for all hidden elements
      if (currentBlockTabId && pendingElementBlocks.length > 0) {
        chrome.tabs.sendMessage(currentBlockTabId, {
          action: "UNDO_ALL_ELEMENTS",
          selectors: pendingElementBlocks.map(item => item.selector)
        }).catch(() => { });
      }

      console.log(`${pendingElementBlocks.length} element(s) cancelled`);

      // Clear the stack
      pendingElementBlocks = [];
      currentBlockTabId = null;
      currentBlockDomain = null;
      return true;
    }

    // Handle remove from stack (when user unchecks in confirmation)
    else if (req.action === "REMOVE_FROM_STACK") {
      if (!req.selector) {
        console.warn("No selector provided for REMOVE_FROM_STACK");
        return;
      }

      if (pendingElementBlocks.length === 0) {
        console.warn("No pending elements to remove from");
        return;
      }

      // Find and remove the selector from stack
      const initialLength = pendingElementBlocks.length;
      pendingElementBlocks = pendingElementBlocks.filter(item => item.selector !== req.selector);

      if (pendingElementBlocks.length < initialLength) {
        console.log(`Removed from stack. Remaining: ${pendingElementBlocks.length}`);

        // Send message to content script to restore this specific element visually
        if (currentBlockTabId) {
          chrome.tabs.sendMessage(currentBlockTabId, {
            action: "UNDO_SPECIFIC_ELEMENT",
            selector: req.selector
          }).catch(error => {
            console.debug("Failed to restore element:", error.message);
          });
        }

        // Update the confirmation UI with new count
        if (currentBlockTabId) {
          chrome.tabs.sendMessage(currentBlockTabId, {
            action: "UPDATE_CONFIRMATION",
            selectors: pendingElementBlocks.map(item => item.selector),
            count: pendingElementBlocks.length
          }).catch(error => {
            console.debug("Failed to update confirmation UI:", error.message);
          });
        }
      } else {
        console.log(`Selector not found in stack: ${req.selector}`);
      }
      return true;
    }
  } catch (error) {
    console.error("Error in message handler:", error);
  }
});

// Update time for active tabs
function updateTime() {
  const now = Date.now();
  const elapsed = now - sessionData.lastUpdateTime;
  sessionData.lastUpdateTime = now;

  const dateKey = getDateKey();
  const tabsToTrack = new Set();

  // Track active tab if window is focused
  if (sessionData.isWindowFocused && sessionData.currentActiveTab) {
    tabsToTrack.add(sessionData.currentActiveTab);
  }

  // Track audio tabs if enabled
  if (sessionData.trackAudioEnabled) {
    sessionData.currentAudioTabs.forEach(tabId => {
      tabsToTrack.add(tabId);
    });
  }

  // Update time for all tracked tabs
  tabsToTrack.forEach(tabId => {
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError || !tab) return;

      const domain = getDomain(tab.url);
      if (!domain) return;

      const site = initializeSite(domain);
      site.totalTime += elapsed;

      if (!site.dailyTime[dateKey]) {
        site.dailyTime[dateKey] = 0;
      }
      site.dailyTime[dateKey] += elapsed;

      // -------- FOCUS MODE CHECK --------
      if (isFocusBlocked(domain)) {
        chrome.tabs.update(tabId, {
          url: chrome.runtime.getURL(
            `pages/blocked.html?domain=${encodeURIComponent(domain)}&reason=focus`
          )
        });
        return;
      }

      // -------- LIMIT WARNING + ENFORCEMENT (single read) --------
      chrome.storage.local.get(
        ['siteLimits', 'limitWarningsSent'],
        ({ siteLimits = {}, limitWarningsSent = {} }) => {

          const limitMinutes = siteLimits[domain];
          if (!limitMinutes) return;

          const limitMs = limitMinutes * 60000;
          const usedMs = site.dailyTime[dateKey];
          const remainingMs = limitMs - usedMs;
          const remainingMinutes = Math.ceil(remainingMs / 60000);

          const warningKey = `${domain}_${getDateKey()}_${remainingMinutes}`;

          if (
            (remainingMinutes <= 5 && remainingMinutes > 4 || remainingMinutes <= 2 && remainingMinutes > 1) &&
            !limitWarningsSent[warningKey]
          ) {
            chrome.notifications.create(
              `limit-${domain}-${Date.now()}`,
              {
                type: 'basic',
                iconUrl: chrome.runtime.getURL('assets/icons/icon48.png'),
                title: 'TabTamer – Time Limit Warning',
                message: `${domain}\n${remainingMinutes} minute(s) remaining`
              }
            );

            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                  action: 'showToast',
                  message: `${domain}: ${remainingMinutes} minute(s) remaining`
                }).catch(() => { });
              }
            });

            limitWarningsSent[warningKey] = true;
            chrome.storage.local.set({ limitWarningsSent });
          }

          // Enforcement
          if (usedMs >= limitMs && !blockedTabs.has(tabId)) {
            blockedTabs.add(tabId);
            persistBlockedTabs();

            chrome.tabs.update(tabId, {
              url: chrome.runtime.getURL(
                `pages/blocked.html?domain=${encodeURIComponent(domain)}`
              )
            });

            chrome.notifications.create(
              `limit-exceeded-${tabId}-${Date.now()}`,
              {
                type: 'basic',
                iconUrl: chrome.runtime.getURL('assets/icons/icon48.png'),
                title: 'TabTamer – Limit Reached',
                message: `${domain} has reached your daily time limit.`
              }
            );
          }
        }
      );
    });
  });

  persistSites();
  checkBreakReminder();
}

// Start the update timer
function startTimer() {
  if (updateTimer) return;

  sessionData.lastUpdateTime = Date.now();
  updateTimer = setInterval(updateTime, UPDATE_INTERVAL);
}

function resetBlockedTabs() {
  blockedTabs.clear();
  persistBlockedTabs();
}

// Align daily reset to next midnight
const now = new Date();
const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
const delayToMidnight = (nextMidnight - now) / 60000;
chrome.alarms.create('dailyResetBlockedTabs', {
  delayInMinutes: delayToMidnight,
  periodInMinutes: 1440
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'dailyResetBlockedTabs') {
    resetBlockedTabs();
  } else if (alarm.name === 'focusModeEnd') {
    stopFocusMode();
  }
});

// Handle tab activation
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  sessionData.currentActiveTab = activeInfo.tabId;
  sessionData.lastUpdateTime = Date.now();

  // Check if new active tab has audio
  const tab = await chrome.tabs.get(activeInfo.tabId);
  if (tab.audible) {
    sessionData.currentAudioTabs.add(activeInfo.tabId);
  }
});

// Handle tab updates (URL changes, audio state changes)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Track audio state changes
  if (changeInfo.audible !== undefined) {
    if (changeInfo.audible) {
      sessionData.currentAudioTabs.add(tabId);
    } else {
      sessionData.currentAudioTabs.delete(tabId);
    }
  }

  // Update last update time when tab changes
  if (changeInfo.url || changeInfo.audible !== undefined) {
    sessionData.lastUpdateTime = Date.now();
  }
});

// Handle tab removal
chrome.tabs.onRemoved.addListener((tabId) => {
  sessionData.currentAudioTabs.delete(tabId);
  if (sessionData.currentActiveTab === tabId) {
    sessionData.currentActiveTab = null;
  }
});

// Handle window focus changes
chrome.windows.onFocusChanged.addListener((windowId) => {
  sessionData.isWindowFocused = windowId !== chrome.windows.WINDOW_ID_NONE;
  sessionData.lastUpdateTime = Date.now();

  // Reset break timer when browser regains focus (returning from alt-tab)
  if (sessionData.isWindowFocused) {
    continuousBrowsingStart = Date.now();
  }

  if (sessionData.isWindowFocused) {
    // Get the active tab in the focused window
    chrome.tabs.query({ active: true, windowId: windowId }, (tabs) => {
      if (tabs[0]) {
        sessionData.currentActiveTab = tabs[0].id;
      }
    });
  }
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSessionData') {
    updateTime();

    // Add category info to each site
    const sitesWithCategories = {};
    for (const [domain, data] of Object.entries(sessionData.sites)) {
      sitesWithCategories[domain] = { ...data, category: getCategoryForDomain(domain) };
    }

    sendResponse({
      sites: sitesWithCategories,
      trackAudioEnabled: sessionData.trackAudioEnabled,
      focusState
    });
  } else if (request.action === 'startFocusMode') {
    startFocusMode(request.duration, request.blockedCategories);
    sendResponse({ success: true, focusState });
  } else if (request.action === 'stopFocusMode') {
    stopFocusMode();
    sendResponse({ success: true, focusState });
  } else if (request.action === 'getFocusState') {
    if (focusState.active && Date.now() > focusState.endTime) {
      stopFocusMode();
    }
    sendResponse({ focusState });
  } else if (request.action === 'toggleAudioTracking') {
    sessionData.trackAudioEnabled = request.enabled;

    chrome.storage.local.get(['preferences'], ({ preferences = {} }) => {
      preferences.audioTracking = request.enabled;
      chrome.storage.local.set({ preferences });
    });

    sendResponse({ success: true });
  } else if (request.action === 'reloadFromStorage') {
    chrome.storage.local.get(
      ['sites', 'preferences'],
      ({ sites = {}, preferences = {} }) => {
        sessionData.sites = sites;
        sessionData.currentAudioTabs.clear();
        sessionData.trackAudioEnabled = preferences.audioTracking ?? true;
        sessionData.lastUpdateTime = Date.now();
        sendResponse({ success: true });
      }
    );
  } else if (request.action === 'clearSession') {
    sessionData.sites = {};
    sessionData.lastUpdateTime = Date.now();
    chrome.storage.local.remove('sites');
    sendResponse({ success: true });
  }

  return true;
});

// Initialize on install
chrome.runtime.onInstalled.addListener(async () => {
  // Create context menu
  chrome.contextMenus.create({
    id: 'blockElement',
    title: 'Block this element',
    contexts: ['all'],
    documentUrlPatterns: ['http://*/*', 'https://*/*']
  });

  // Load stored session data
  const stored = await chrome.storage.local.get(['sites']);
  if (stored.sites) {
    sessionData.sites = stored.sites;
  }

  // Get current active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    sessionData.currentActiveTab = tab.id;
    if (tab.audible) {
      sessionData.currentAudioTabs.add(tab.id);
    }
  }

  // Check window focus
  const window = await chrome.windows.getCurrent();
  sessionData.isWindowFocused = window.focused;

  // Load audio tracking preference
  const { preferences } = await chrome.storage.local.get(['preferences']);

  if (preferences) {
    sessionData.trackAudioEnabled = preferences.audioTracking ?? true;
  }
  cleanupOldWarnings();
  restoreBlockedTabs();
  startTimer();
});

// Start timer on service worker activation
chrome.runtime.onStartup.addListener(async () => {
  cleanupOldWarnings();
  restoreBlockedTabs();
  const { sites = {}, preferences = {} } =
    await chrome.storage.local.get(['sites', 'preferences']);

  sessionData.sites = sites;
  sessionData.trackAudioEnabled = preferences.audioTracking ?? true;
  sessionData.lastUpdateTime = Date.now();

  startTimer();
});


// Keep service worker alive (MV3 workaround)
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'keepAlive') {
    port.onDisconnect.addListener(() => {
      // Reconnect if needed
    });
  }
});

// Start timer immediately
startTimer();

(async function restoreStateOnLoad() {
  const { sites = {}, preferences = {} } =
    await chrome.storage.local.get(['sites', 'preferences']);

  sessionData.sites = sites;
  sessionData.trackAudioEnabled = preferences.audioTracking ?? true;
  sessionData.lastUpdateTime = Date.now();
})();

