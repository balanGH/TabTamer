// Popup script for Session ( Time Tracker )
// Handles UI updates and communication with background service worker

let weekChart = null;
let monthChart = null;
let focusTimerInterval = null;

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

// ==================== FOCUS MODE ====================
let focusPanelOpen = false;

document.getElementById('focusModeBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'getFocusState' }, (response) => {
    if (response?.focusState?.active) {
      // Already active — toggle stop
      if (confirm('Stop Focus Mode?')) {
        chrome.runtime.sendMessage({ action: 'stopFocusMode' }, () => {
          updateFocusUI({ active: false });
        });
      }
    } else {
      // Show setup panel
      const panel = document.getElementById('focusPanel');
      focusPanelOpen = !focusPanelOpen;
      panel.style.display = focusPanelOpen ? 'block' : 'none';
    }
  });
});

// Focus preset buttons
document.querySelectorAll('.focus-preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.focus-preset-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// Start Focus
document.getElementById('startFocusBtn').addEventListener('click', () => {
  const activePreset = document.querySelector('.focus-preset-btn.active');
  const duration = parseInt(activePreset?.dataset.minutes || '25');

  const blockedCategories = Array.from(
    document.querySelectorAll('.focus-categories input:checked')
  ).map(cb => cb.value);

  chrome.runtime.sendMessage({
    action: 'startFocusMode',
    duration,
    blockedCategories
  }, (response) => {
    if (response?.focusState) {
      updateFocusUI(response.focusState);
      document.getElementById('focusPanel').style.display = 'none';
      focusPanelOpen = false;
    }
  });
});

document.getElementById('cancelFocusBtn').addEventListener('click', () => {
  document.getElementById('focusPanel').style.display = 'none';
  focusPanelOpen = false;
});

document.getElementById('stopFocusBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'stopFocusMode' }, () => {
    updateFocusUI({ active: false });
  });
});

function updateFocusUI(focusState) {
  const banner = document.getElementById('focusBanner');
  const btn = document.getElementById('focusModeBtn');

  if (focusState?.active) {
    banner.style.display = 'block';
    btn.style.opacity = '1';
    btn.style.background = '#667eea';
    btn.style.color = 'white';
    btn.style.borderColor = '#667eea';
    startFocusTimer(focusState.endTime);
  } else {
    banner.style.display = 'none';
    btn.style.opacity = '';
    btn.style.background = '';
    btn.style.color = '';
    btn.style.borderColor = '';
    if (focusTimerInterval) {
      clearInterval(focusTimerInterval);
      focusTimerInterval = null;
    }
  }
}

function startFocusTimer(endTime) {
  if (focusTimerInterval) clearInterval(focusTimerInterval);

  function tick() {
    const remaining = Math.max(0, endTime - Date.now());
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    document.getElementById('focusTimer').textContent =
      `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    if (remaining <= 0) {
      clearInterval(focusTimerInterval);
      focusTimerInterval = null;
      updateFocusUI({ active: false });
    }
  }

  tick();
  focusTimerInterval = setInterval(tick, 1000);
}

// ==================== BLOCK ELEMENT BUTTON ====================
document.getElementById("blockElementBtn").onclick = async () => {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tabs[0] || !tabs[0].id) return;

  const url = tabs[0].url || '';
  const restrictedSchemes = [
    'chrome://', 'edge://', 'about:', 'chrome-extension://',
    'moz-extension://', 'view-source:', 'data:', 'brave://', 'opera://'
  ];

  if (restrictedSchemes.some(scheme => url.startsWith(scheme))) {
    alert("Element picker cannot be used on browser internal pages. Please navigate to a regular website.");
    return;
  }

  const btn = document.getElementById("blockElementBtn");
  btn.disabled = true;
  btn.style.opacity = "0.5";

  try {
    try {
      await chrome.tabs.sendMessage(tabs[0].id, { action: "START_ELEMENT_PICKER" });
    } catch {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          files: ['src/content/contentScript.js']
        });
        await new Promise(resolve => setTimeout(resolve, 150));
        await chrome.tabs.sendMessage(tabs[0].id, { action: "START_ELEMENT_PICKER" });
      } catch {
        alert("Element picker cannot be used on this page.");
        btn.disabled = false;
        btn.style.opacity = "1";
        return;
      }
    }
    window.close();
  } catch {
    btn.disabled = false;
    btn.style.opacity = "1";
    alert("Failed to start element picker.");
  }
};

// ==================== VIDEO SPEED CONTROLLER ====================
document.getElementById('videoSpeedBtn').addEventListener('click', () => {
  chrome.storage.local.get(['preferences'], ({ preferences = {} }) => {
    const enabled = !(preferences.videoControlEnabled ?? true);
    preferences.videoControlEnabled = enabled;

    chrome.storage.local.set({ preferences }, () => {
      const btn = document.getElementById('videoSpeedBtn');
      btn.style.opacity = enabled ? '1' : '0.5';
      btn.title = enabled ? 'Video Speed Controller (On)' : 'Video Speed Controller (Off)';

      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          if (tab.url && tab.url.startsWith('http')) {
            chrome.tabs.sendMessage(tab.id, {
              action: "TOGGLE_VIDEO_CONTROL",
              enabled
            }).catch(() => {});
          }
        });
      });
    });
  });
});

// Load initial video controller state
chrome.storage.local.get(['preferences'], ({ preferences = {} }) => {
  const enabled = preferences.videoControlEnabled ?? true;
  const btn = document.getElementById('videoSpeedBtn');
  if (btn) {
    btn.style.opacity = enabled ? '1' : '0.5';
    btn.title = enabled ? 'Video Speed Controller (On)' : 'Video Speed Controller (Off)';
  }
});

// ==================== AUDIO TRACKING ====================
document.getElementById('audioToggle').addEventListener('click', () => {
  chrome.storage.local.get(['preferences'], ({ preferences = {} }) => {
    const enabled = !preferences.audioTracking;
    preferences.audioTracking = enabled;

    chrome.storage.local.set({ preferences }, () => {
      chrome.runtime.sendMessage({ action: 'toggleAudioTracking', enabled });
      document.getElementById('audioToggle').textContent = enabled ? '🔊' : '🔇';
    });
  });
});

// Settings Button
document.getElementById('settingsBtn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// ==================== HELPERS ====================
function formatTime(ms) {
  if (ms < 1000) return '0s';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

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

function getDateKey(daysAgo = 0) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
}

function getDayName(dateKey) {
  const date = new Date(dateKey);
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

function getShortDate(dateKey) {
  const date = new Date(dateKey);
  return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
}

// ==================== PRODUCTIVITY SCORE ====================
const PRODUCTIVE_CATEGORIES = ['work', 'study'];
const DISTRACTING_CATEGORIES = ['social', 'entertainment', 'shopping'];

function calculateProductivityScore(sites, dateKey) {
  let productiveMs = 0;
  let distractingMs = 0;
  let totalMs = 0;

  sites.forEach(site => {
    const time = site.dailyTime[dateKey] || 0;
    if (time <= 0) return;
    totalMs += time;

    const cat = site.category || 'other';
    if (PRODUCTIVE_CATEGORIES.includes(cat)) {
      productiveMs += time;
    } else if (DISTRACTING_CATEGORIES.includes(cat)) {
      distractingMs += time;
    }
  });

  if (totalMs === 0) return null;

  // Score: 100 if all productive, 0 if all distracting
  // neutral sites contribute 50/100
  const neutralMs = totalMs - productiveMs - distractingMs;
  const score = Math.round(
    ((productiveMs * 100 + neutralMs * 50) / totalMs)
  );

  return Math.max(0, Math.min(100, score));
}

function updateProductivityUI(score) {
  const scoreEl = document.getElementById('productivityScore');
  const barEl = document.getElementById('productivityBar');

  if (score === null) {
    scoreEl.textContent = '--';
    barEl.style.width = '0%';
    barEl.className = 'productivity-bar';
    return;
  }

  scoreEl.textContent = score;
  barEl.style.width = score + '%';

  barEl.className = 'productivity-bar';
  if (score >= 70) barEl.classList.add('high');
  else if (score >= 40) barEl.classList.add('medium');
  else barEl.classList.add('low');
}

// ==================== COMPARISON STATS ====================
function updateComparisonStats(sites) {
  const today = getDateKey(0);
  const yesterday = getDateKey(1);

  let todayTotal = 0;
  let yesterdayTotal = 0;
  let lastWeekTotal = 0;

  sites.forEach(site => {
    todayTotal += site.dailyTime[today] || 0;
    yesterdayTotal += site.dailyTime[yesterday] || 0;
    for (let i = 1; i <= 7; i++) {
      lastWeekTotal += site.dailyTime[getDateKey(i)] || 0;
    }
  });

  const lastWeekAvg = lastWeekTotal / 7;

  const vsYesterdayEl = document.getElementById('vsYesterday');
  const vsLastWeekEl = document.getElementById('vsLastWeek');

  if (yesterdayTotal > 0) {
    const diff = todayTotal - yesterdayTotal;
    const pct = Math.round((diff / yesterdayTotal) * 100);
    const arrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '→';
    const cls = diff > 0 ? 'up' : diff < 0 ? 'down' : 'same';
    vsYesterdayEl.textContent = `${arrow} ${Math.abs(pct)}%`;
    vsYesterdayEl.className = `comparison-value ${cls}`;
  } else {
    vsYesterdayEl.textContent = todayTotal > 0 ? '↑ New' : '--';
    vsYesterdayEl.className = 'comparison-value';
  }

  if (lastWeekAvg > 0) {
    const diff = todayTotal - lastWeekAvg;
    const pct = Math.round((diff / lastWeekAvg) * 100);
    const arrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '→';
    const cls = diff > 0 ? 'up' : diff < 0 ? 'down' : 'same';
    vsLastWeekEl.textContent = `${arrow} ${Math.abs(pct)}%`;
    vsLastWeekEl.className = `comparison-value ${cls}`;
  } else {
    vsLastWeekEl.textContent = '--';
    vsLastWeekEl.className = 'comparison-value';
  }
}

// ==================== RENDER SITES ====================
function renderSites(sites, containerId, dateFilter = null) {
  const container = document.getElementById(containerId);

  if (!sites || sites.length === 0) {
    container.innerHTML = '<div class="empty-state">No data yet. Browse some websites!</div>';
    return;
  }

  let filteredSites = sites;
  if (dateFilter) {
    filteredSites = sites.map(site => {
      let totalTime = 0;
      if (dateFilter === 'today') {
        totalTime = site.dailyTime[getDateKey(0)] || 0;
      } else if (dateFilter === 'week') {
        for (let i = 0; i < 7; i++) totalTime += site.dailyTime[getDateKey(i)] || 0;
      } else if (dateFilter === 'month') {
        for (let i = 0; i < 30; i++) totalTime += site.dailyTime[getDateKey(i)] || 0;
      }
      return { ...site, filteredTime: totalTime };
    }).filter(site => site.filteredTime > 0);
  }

  const sortedSites = [...filteredSites].sort((a, b) => {
    const timeA = a.filteredTime !== undefined ? a.filteredTime : a.totalTime;
    const timeB = b.filteredTime !== undefined ? b.filteredTime : b.totalTime;
    return timeB - timeA;
  });

  const topSites = sortedSites.slice(0, 10);

  if (topSites.length === 0) {
    container.innerHTML = '<div class="empty-state">No data for this period</div>';
    return;
  }

  container.innerHTML = topSites.map(site => {
    const time = site.filteredTime !== undefined ? site.filteredTime : site.totalTime;
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(site.domain)}&sz=32`;
    const cat = site.category || 'other';
    const catLabel = cat.charAt(0).toUpperCase() + cat.slice(1);

    return `
    <div class="site-item">
      <div class="site-info">
        <img class="site-favicon" src="${faviconUrl}" alt="" loading="lazy" />
        <div class="site-domain" title="${site.domain}">${site.domain}</div>
        <span class="site-category cat-${cat}">${catLabel}</span>
      </div>
      <div class="site-time">${formatTime(time)}</div>
    </div>
  `;
  }).join('');
}

// ==================== CHARTS ====================
function cleanupCharts() {
  if (weekChart) { weekChart.destroy(); weekChart = null; }
  if (monthChart) { monthChart.destroy(); monthChart = null; }
}

function createWeekChart(sites) {
  const ctx = document.getElementById('weekChart');
  if (!ctx) return;

  const labels = [];
  const data = [];

  for (let i = 6; i >= 0; i--) {
    const dateKey = getDateKey(i);
    labels.push(getDayName(dateKey));
    let totalTime = 0;
    sites.forEach(site => { totalTime += site.dailyTime[dateKey] || 0; });
    data.push(Math.round(totalTime / 60000));
  }

  if (weekChart) {
    weekChart.data.labels = labels;
    weekChart.data.datasets[0].data = data;
    weekChart.update('none');
    return;
  }

  weekChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Minutes',
        data,
        backgroundColor: 'rgba(102, 126, 234, 0.8)',
        borderColor: 'rgba(102, 126, 234, 1)',
        borderWidth: 2,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ctx.parsed.y + ' minutes' } } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
    }
  });
}

function createMonthChart(sites) {
  const ctx = document.getElementById('monthChart');
  if (!ctx) return;

  const labels = [];
  const data = [];

  for (let i = 29; i >= 0; i--) {
    const dateKey = getDateKey(i);
    labels.push(getShortDate(dateKey));
    let totalTime = 0;
    sites.forEach(site => { totalTime += site.dailyTime[dateKey] || 0; });
    data.push(Math.round(totalTime / 60000));
  }

  if (monthChart) {
    monthChart.data.labels = labels;
    monthChart.data.datasets[0].data = data;
    monthChart.update('none');
    return;
  }

  monthChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Minutes',
        data,
        backgroundColor: 'rgba(102, 126, 234, 0.8)',
        borderColor: 'rgba(102, 126, 234, 1)',
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ctx.parsed.y + ' minutes' } } },
      scales: {
        x: { ticks: { maxRotation: 45, minRotation: 45, font: { size: 10 } } },
        y: { beginAtZero: true, ticks: { precision: 0 } }
      }
    }
  });
}

// ==================== UPDATE UI ====================
function updateUI(sessionData) {
  const sites = Object.values(sessionData.sites);
  const today = getDateKey(0);

  // Today's total
  let todayTotal = 0;
  sites.forEach(site => { todayTotal += site.dailyTime[today] || 0; });
  document.getElementById('todayTotal').textContent = formatTime(todayTotal);

  // Productivity score
  const score = calculateProductivityScore(sites, today);
  updateProductivityUI(score);

  // Comparison stats
  updateComparisonStats(sites);

  // Sites lists
  renderSites(sites, 'todaySites', 'today');
  renderSites(sites, 'weekSites', 'week');
  renderSites(sites, 'monthSites', 'month');

  // Charts
  createWeekChart(sites);
  createMonthChart(sites);

  // Focus mode
  if (sessionData.focusState) {
    updateFocusUI(sessionData.focusState);
  }
}

// ==================== LOAD DATA ====================
let refreshInterval;
async function loadData() {
  chrome.runtime.sendMessage({ action: 'getSessionData' }, (response) => {
    if (response) updateUI(response);
  });
}

// Clean up when popup closes
window.addEventListener('unload', () => {
  if (refreshInterval) clearInterval(refreshInterval);
  if (focusTimerInterval) clearInterval(focusTimerInterval);
  cleanupCharts();
});

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tabName = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
  });
});

// Clear session data
document.getElementById('clearBtn').addEventListener('click', () => {
  if (confirm('Are you sure you want to clear all session data? This cannot be undone.')) {
    chrome.runtime.sendMessage({ action: 'clearSession' }, () => loadData());
  }
});

// ==================== DARK MODE ====================
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

// Keep connection alive with background service worker
const port = chrome.runtime.connect({ name: 'keepAlive' });
port.onDisconnect.addListener(() => {});

// Load data on popup open
loadData();

// Refresh data every 5 seconds
setInterval(loadData, 5000);
