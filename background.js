// Session-based time tracking for Chrome extension (Manifest V3)
// All data is stored in-memory and resets when Chrome closes

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

// Helper function
function minutes(ms) {
  return Math.floor(ms / 60000);
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


// Update time for active tabs
function updateTime() {
  persistSites();
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

      // -------- LIMIT WARNING CHECK --------
      chrome.storage.local.get(
        ['siteLimits', 'limitWarningsSent'],
        ({ siteLimits = {}, limitWarningsSent = {} }) => {

          const limitMinutes = siteLimits[domain];
          if (!limitMinutes) return;

          const usedMinutes = minutes(site.dailyTime[dateKey]);
          const remaining = limitMinutes - usedMinutes;

          const warningKey = getWarningKey(domain);

          if (
            remaining <= 5 &&
            remaining > 0 &&
            !limitWarningsSent[warningKey]
          ) {
            chrome.notifications.create(
              `limit-${domain}-${Date.now()}`,
              {
                type: 'basic',
                iconUrl: 'icon128.png',
                title: 'TabTamer – Time Limit Warning',
                message: `${domain}\n${remaining} minute(s) remaining`
              }
            );
            limitWarningsSent[warningKey] = true;
            chrome.storage.local.set({ limitWarningsSent });
          }
        }
      );
    });
  });
}

// Start the update timer
function startTimer() {
  if (updateTimer) return;

  sessionData.lastUpdateTime = Date.now();
  updateTimer = setInterval(updateTime, UPDATE_INTERVAL);
}

// Stop the update timer
function stopTimer() {
  if (updateTimer) {
    clearInterval(updateTimer);
    updateTimer = null;
  }
}

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
    // Update time before sending data
    updateTime();

    sendResponse({
      sites: sessionData.sites,
      trackAudioEnabled: sessionData.trackAudioEnabled
    });
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
  startTimer();
});

// Start timer on service worker activation
chrome.runtime.onStartup.addListener(() => {
  cleanupOldWarnings();
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
