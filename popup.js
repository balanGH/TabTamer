// Popup script for Session ( Time Tracker )
// Handles UI updates and communication with background service worker

let weekChart = null;
let monthChart = null;

// Dark mode Toggle
chrome.storage.local.get(['preferences'], (result) => {
  const preferences = result.preferences || { darkMode: false, checkAudio: false };

  if (preferences.darkMode) {
    document.body.classList.add('dark');
    document.getElementById('darkModeToggle').textContent = '☀';
  }

  if (preferences.checkAudio) {
    document.getElementById('audioToggle').textContent = '🔊';
  }
});

document.getElementById('darkModeToggle').addEventListener('click', () => {
  chrome.storage.local.get(['preferences'], (result) => {
    const preferences = result.preferences || {};
    preferences.darkMode = !preferences.darkMode;

    chrome.storage.local.set({ preferences }, () => {
      document.body.classList.toggle('dark');
      document.getElementById('darkModeToggle').textContent = preferences.darkMode ? '☀' : '⏾';
      updateChart();
    });
  });
});

// Settings and Clear Data Buttons
document.getElementById('settingsBtn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// Format milliseconds to human-readable time
function formatTime(ms) {
  if (ms < 1000) return '0m';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  return `${minutes}m`;
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

// Create week chart
function createWeekChart(sites) {
  const ctx = document.getElementById('weekChart');
  if (!ctx) return;

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
async function loadData() {
  chrome.runtime.sendMessage({ action: 'getSessionData' }, (response) => {
    if (response) {
      updateUI(response);

      // Update audio toggle
      document.getElementById('audioToggle').checked = response.trackAudioEnabled;
    }
  });
}

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

// Audio toggle
document.getElementById('audioToggle').addEventListener('change', (e) => {
  const enabled = e.target.checked;
  chrome.runtime.sendMessage({
    action: 'toggleAudioTracking',
    enabled: enabled
  }, () => {
    // Save to local storage for persistence across sessions
    chrome.storage.local.set({ trackAudioEnabled: enabled });
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

// Keep connection alive with background service worker
const port = chrome.runtime.connect({ name: 'keepAlive' });
port.onDisconnect.addListener(() => {
  // Will reconnect automatically if needed
});

// Load data on popup open
loadData();

// Refresh data every 2 seconds
setInterval(loadData, 2000);
