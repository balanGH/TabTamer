// Popup script for Session ( Time Tracker )
// Handles UI updates and communication with background service worker

let weekChart = null;
let monthChart = null;

// Load user preferences from local storage
chrome.storage.local.get(['preferences'], ({ preferences }) => {
  const prefs = {
    darkMode: false,
    audioTracking: true,
    ...preferences
  };

  document.body.classList.toggle('dark', prefs.darkMode);
  document.getElementById('darkModeToggle').textContent =
    prefs.darkMode ? '☀' : '⏾';

  document.getElementById('audioToggle').textContent =
    prefs.audioTracking ? '🔊' : '🔇';
});

// -------------------- Block Element Button (MV3 safe) --------------------
document.getElementById("blockElementBtn").onclick = async () => {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tabs[0] || !tabs[0].id) return;

  // Check if we're on a valid URL (not chrome://, edge://, about:, etc.)
  const url = tabs[0].url || '';

  // List of restricted URL schemes
  const restrictedSchemes = [
    'chrome://',
    'edge://',
    'about:',
    'chrome-extension://',
    'moz-extension://',
    'view-source:',
    'data:',
    'brave://',
    'opera://'
  ];

  // Check if URL is restricted
  const isRestricted = restrictedSchemes.some(scheme => url.startsWith(scheme));

  if (isRestricted) {
    // Show user-friendly message
    alert("Element picker cannot be used on browser internal pages (chrome://, edge://, etc.). Please navigate to a regular website and try again.");

    // Re-enable button
    const btn = document.getElementById("blockElementBtn");
    btn.disabled = false;
    btn.style.opacity = "1";
    return;
  }

  // Disable button to prevent double clicks
  const btn = document.getElementById("blockElementBtn");
  btn.disabled = true;
  btn.style.opacity = "0.5";

  try {
    // Try to send message first (while popup is still open)
    try {
      await chrome.tabs.sendMessage(tabs[0].id, { action: "START_ELEMENT_PICKER" });
      console.log("Picker message sent to existing content script");
    } catch (error) {
      // Content script not loaded, inject it
      console.log("Content script not found, injecting...");

      // Check if we can inject scripts on this page
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          files: ['src/content/contentScript.js']
        });

        // Wait for script to initialize
        await new Promise(resolve => setTimeout(resolve, 150));

        // Send message again
        await chrome.tabs.sendMessage(tabs[0].id, { action: "START_ELEMENT_PICKER" });
        console.log("Picker message sent after injection");
      } catch (injectError) {
        console.error("Cannot inject script on this page:", injectError);
        alert("Element picker cannot be used on this type of page. Please navigate to a regular website.");

        // Re-enable button
        btn.disabled = false;
        btn.style.opacity = "1";
        return;
      }
    }

    // Close popup after message is sent
    window.close();

  } catch (error) {
    console.error("Failed to start element picker:", error);
    // Re-enable button if there's an error
    btn.disabled = false;
    btn.style.opacity = "1";
    alert("Failed to start element picker. Please try again on a regular website.");
  }
};

// Video Speed Controller Toggle
document.getElementById('videoSpeedBtn').addEventListener('click', () => {
  chrome.storage.local.get(['preferences'], ({ preferences = {} }) => {
    const enabled = !(preferences.videoControlEnabled ?? true);

    preferences.videoControlEnabled = enabled;

    chrome.storage.local.set({ preferences }, () => {
      // Send message to all tabs to toggle video controller
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          if (tab.url && (tab.url.startsWith('http') || tab.url.startsWith('https'))) {
            chrome.tabs.sendMessage(tab.id, {
              action: "TOGGLE_VIDEO_CONTROL",
              enabled: enabled
            }).catch(() => {
              // Ignore errors - content script might not be loaded
            });
          }
        });
      });

      // Update button appearance
      const btn = document.getElementById('videoSpeedBtn');
      btn.style.opacity = enabled ? '1' : '0.5';
      btn.title = enabled ? 'Video Speed Controller (On)' : 'Video Speed Controller (Off)';
    });
  });
});

// Load initial state
chrome.storage.local.get(['preferences'], ({ preferences = {} }) => {
  const enabled = preferences.videoControlEnabled ?? true;
  const btn = document.getElementById('videoSpeedBtn');
  btn.style.opacity = enabled ? '1' : '0.5';
  btn.title = enabled ? 'Video Speed Controller (On)' : 'Video Speed Controller (Off)';
});

// Dark Mode Toggle
document.getElementById('darkModeToggle').addEventListener('click', () => {
  chrome.storage.local.get(['preferences'], ({ preferences = {} }) => {
    preferences.darkMode = !preferences.darkMode;

    chrome.storage.local.set({ preferences }, () => {
      document.body.classList.toggle('dark', preferences.darkMode);
      document.getElementById('darkModeToggle').textContent =
        preferences.darkMode ? '☀' : '⏾';
    });
  });
});

// Audio Tracking Toggle
document.getElementById('audioToggle').addEventListener('click', () => {
  chrome.storage.local.get(['preferences'], ({ preferences = {} }) => {
    const enabled = !preferences.audioTracking;

    preferences.audioTracking = enabled;

    chrome.storage.local.set({ preferences }, () => {
      chrome.runtime.sendMessage({
        action: 'toggleAudioTracking',
        enabled
      });

      document.getElementById('audioToggle').textContent =
        enabled ? '🔊' : '🔇';
    });
  });
});

// Settings and Clear Data Buttons
document.getElementById('settingsBtn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// Format milliseconds to human-readable time
// Replace formatTime function with improved version:

function formatTime(ms) {
  if (ms < 1000) return '0s';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  // Return appropriate format
  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  } else if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  } else {
    return `${seconds}s`;
  }
}

// Get date key (YYYY-MM-DD)
function getDateKey(daysAgo = 0) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
}

// Get day name from date key
function getDayName(dateKey) {
  const date = new Date(dateKey);
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

// Get short date (MM/DD) from date key
function getShortDate(dateKey) {
  const date = new Date(dateKey);
  return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
}

// Get first letter of domain for favicon
function getInitial(domain) {
  return domain.charAt(0).toUpperCase();
}

// Render sites list
function renderSites(sites, containerId, dateFilter = null) {
  const container = document.getElementById(containerId);

  if (!sites || sites.length === 0) {
    container.innerHTML = '<div class="empty-state">No data yet. Browse some websites!</div>';
    return;
  }

  // Filter sites by date if needed
  let filteredSites = sites;
  if (dateFilter) {
    filteredSites = sites.map(site => {
      let totalTime = 0;
      if (dateFilter === 'today') {
        const today = getDateKey(0);
        totalTime = site.dailyTime[today] || 0;
      } else if (dateFilter === 'week') {
        for (let i = 0; i < 7; i++) {
          const dateKey = getDateKey(i);
          totalTime += site.dailyTime[dateKey] || 0;
        }
      } else if (dateFilter === 'month') {
        for (let i = 0; i < 30; i++) {
          const dateKey = getDateKey(i);
          totalTime += site.dailyTime[dateKey] || 0;
        }
      }
      return { ...site, filteredTime: totalTime };
    }).filter(site => site.filteredTime > 0);
  }

  // Sort by time (descending)
  const sortedSites = [...filteredSites].sort((a, b) => {
    const timeA = a.filteredTime !== undefined ? a.filteredTime : a.totalTime;
    const timeB = b.filteredTime !== undefined ? b.filteredTime : b.totalTime;
    return timeB - timeA;
  });

  // Take top 10
  const topSites = sortedSites.slice(0, 10);

  if (topSites.length === 0) {
    container.innerHTML = '<div class="empty-state">No data for this period</div>';
    return;
  }

  container.innerHTML = topSites.map(site => {
    const time = site.filteredTime !== undefined ? site.filteredTime : site.totalTime;
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${site.domain}&sz=32`;

    return `
    <div class="site-item">
      <div class="site-info">
        <img 
          class="site-favicon" 
          src="${faviconUrl}" 
          alt="${site.domain} favicon"
          loading="lazy"
        />
        <div class="site-domain" title="${site.domain}">
          ${site.domain}
        </div>
      </div>
      <div class="site-time">${formatTime(time)}</div>
    </div>
  `;
  }).join('');

}

// Add cleanup function before creating new charts
function cleanupCharts() {
  if (weekChart) {
    weekChart.destroy();
    weekChart = null;
  }
  if (monthChart) {
    monthChart.destroy();
    monthChart = null;
  }
}

// Create week chart
function createWeekChart(sites) {
  const ctx = document.getElementById('weekChart');
  if (!ctx) return;

  // Cleanup existing charts
  cleanupCharts();

  // Prepare data for last 7 days (Mon-Sun)
  const labels = [];
  const data = [];

  for (let i = 6; i >= 0; i--) {
    const dateKey = getDateKey(i);
    const dayName = getDayName(dateKey);
    labels.push(dayName);

    // Sum time for all sites on this day
    let totalTime = 0;
    sites.forEach(site => {
      totalTime += site.dailyTime[dateKey] || 0;
    });

    // Convert to minutes
    data.push(Math.round(totalTime / 60000));
  }

  // Destroy existing chart
  if (weekChart) {
    weekChart.destroy();
  }

  // Create new chart
  weekChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Minutes',
        data: data,
        backgroundColor: 'rgba(102, 126, 234, 0.8)',
        borderColor: 'rgba(102, 126, 234, 1)',
        borderWidth: 2,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return context.parsed.y + ' minutes';
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0
          }
        }
      }
    }
  });
}

// Create month chart
function createMonthChart(sites) {
  const ctx = document.getElementById('monthChart');
  if (!ctx) return;

  // Prepare data for last 30 days
  const labels = [];
  const data = [];

  for (let i = 29; i >= 0; i--) {
    const dateKey = getDateKey(i);
    const shortDate = getShortDate(dateKey);
    labels.push(shortDate);

    // Sum time for all sites on this day
    let totalTime = 0;
    sites.forEach(site => {
      totalTime += site.dailyTime[dateKey] || 0;
    });

    // Convert to minutes
    data.push(Math.round(totalTime / 60000));
  }

  // Destroy existing chart
  if (monthChart) {
    monthChart.destroy();
  }

  // Create new chart
  monthChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Minutes',
        data: data,
        backgroundColor: 'rgba(102, 126, 234, 0.8)',
        borderColor: 'rgba(102, 126, 234, 1)',
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return context.parsed.y + ' minutes';
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            maxRotation: 45,
            minRotation: 45,
            font: {
              size: 10
            }
          }
        },
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0
          }
        }
      }
    }
  });
}

// Update all UI
function updateUI(sessionData) {
  const sites = Object.values(sessionData.sites);

  // Update today's total
  const today = getDateKey(0);
  let todayTotal = 0;
  sites.forEach(site => {
    todayTotal += site.dailyTime[today] || 0;
  });
  document.getElementById('todayTotal').textContent = formatTime(todayTotal);

  // Update sites lists
  renderSites(sites, 'todaySites', 'today');
  renderSites(sites, 'weekSites', 'week');
  renderSites(sites, 'monthSites', 'month');

  // Update charts
  createWeekChart(sites);
  createMonthChart(sites);
}

// Load session data
let refreshInterval;
async function loadData() {
  chrome.runtime.sendMessage({ action: 'getSessionData' }, (response) => {
    if (response) {
      updateUI(response);
    }
  });
}
// Clean up when popup closes
window.addEventListener('unload', () => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
  cleanupCharts();
});

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tabName = btn.dataset.tab;

    // Update buttons
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Update panels
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
  });
});

// Clear session data
document.getElementById('clearBtn').addEventListener('click', () => {
  if (confirm('Are you sure you want to clear all session data? This cannot be undone.')) {
    chrome.runtime.sendMessage({ action: 'clearSession' }, () => {
      loadData();
    });
  }
});

// Wrap all storage operations with error handling
async function safeStorageOperation(operation) {
  try {
    return await operation();
  } catch (error) {
    console.error('Storage operation failed:', error);
    showError('Failed to save settings. Please try again.');
    return null;
  }
}

function showError(message) {
  const errorEl = document.createElement('div');
  errorEl.className = 'error-toast';
  errorEl.textContent = message;
  errorEl.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: #ff4757;
    color: white;
    padding: 12px;
    border-radius: 6px;
    z-index: 9999;
  `;
  document.body.appendChild(errorEl);
  setTimeout(() => errorEl.remove(), 3000);
}

// Update storage operations example
document.getElementById('darkModeToggle').addEventListener('click', () => {
  safeStorageOperation(async () => {
    const { preferences = {} } = await chrome.storage.local.get(['preferences']);
    preferences.darkMode = !preferences.darkMode;

    await chrome.storage.local.set({ preferences });

    document.body.classList.toggle('dark', preferences.darkMode);
    document.getElementById('darkModeToggle').textContent =
      preferences.darkMode ? '☀' : '⏾';
  });
});

// Keep connection alive with background service worker
const port = chrome.runtime.connect({ name: 'keepAlive' });
port.onDisconnect.addListener(() => {
  // Will reconnect automatically if needed
});

// Load data on popup open
loadData();

// Refresh data every x seconds
setInterval(loadData, 1000);
