const chartCtx = document.getElementById("usageChart").getContext("2d");
let chart;

// Dark Mode get from storage
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get('preferences', ({ preferences }) => {
    if (preferences && preferences.darkMode === true) {
      document.body.classList.add('dark');
    }
  });
});

// Helper function to get the date key (YYYY-MM-DD format)
function getDateKey(daysAgo = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

function formatTimeHuman(ms) {
  if (ms < 1000) return '0s';
  const totalSec = Math.floor(ms / 1000);
  const mins = Math.floor(totalSec / 60);
  const hrs = Math.floor(mins / 60);

  if (hrs >= 1) {
    const remMins = mins % 60;
    return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`;
  }
  if (mins >= 1) {
    const remSec = totalSec % 60;
    return remSec > 0 ? `${mins}m ${remSec}s` : `${mins}m`;
  }
  return `${totalSec}s`;
}

// ------------------ USAGE GRAPH ------------------
function loadUsageGraph() {
  const range = document.getElementById('usageRange').value;

  chrome.storage.local.get(['sites'], ({ sites = {} }) => {
    const entries = [];

    Object.entries(sites).forEach(([domain, info]) => {
      let totalMs = 0;

      if (range === 'today') {
        totalMs = info.dailyTime?.[getDateKey()] || 0;
      } else if (range === 'week') {
        for (let i = 0; i < 7; i++) {
          totalMs += info.dailyTime?.[getDateKey(i)] || 0;
        }
      } else if (range === 'month') {
        for (let i = 0; i < 30; i++) {
          totalMs += info.dailyTime?.[getDateKey(i)] || 0;
        }
      }

      if (totalMs > 0) {
        entries.push({
          domain: domain.replace(/^www\./, ''),
          ms: totalMs
        });
      }
    });

    entries.sort((a, b) => b.ms - a.ms);

    populateDomainSelect(entries.map(e => e.domain));

    if (!entries.length) {
      if (chart) { chart.destroy(); chart = null; }
      return;
    }

    const labels = entries.map(e => e.domain);
    const rawMs = entries.map(e => e.ms);
    const maxMs = Math.max(...rawMs);

    // Auto-scale: use hours if max >= 60min, otherwise minutes
    let unit, divisor;
    if (maxMs >= 60 * 60 * 1000) {
      unit = 'Hours';
      divisor = 60 * 60 * 1000;
    } else {
      unit = 'Minutes';
      divisor = 60 * 1000;
    }

    const data = rawMs.map(ms => +(ms / divisor).toFixed(2));

    const isDark = document.body.classList.contains('dark');
    const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    const tickColor = isDark ? '#a1a1c7' : '#64748b';

    // Gradient fill
    const gradient = chartCtx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.85)');
    gradient.addColorStop(1, 'rgba(139, 92, 246, 0.6)');

    if (chart) chart.destroy();

    chart = new Chart(chartCtx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: unit,
          data,
          backgroundColor: gradient,
          borderColor: 'rgba(99, 102, 241, 1)',
          borderWidth: 0,
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: { top: 10 }
        },
        scales: {
          x: {
            ticks: {
              maxRotation: 45,
              minRotation: 30,
              font: { size: 11, weight: '500' },
              color: tickColor
            },
            grid: { display: false }
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: unit,
              font: { size: 12, weight: '600' },
              color: tickColor
            },
            ticks: {
              precision: 1,
              font: { size: 11 },
              color: tickColor,
              callback: function(value) {
                if (unit === 'Hours') {
                  if (value >= 1) return value + 'h';
                  return Math.round(value * 60) + 'm';
                }
                return value + 'm';
              }
            },
            grid: {
              color: gridColor,
              drawBorder: false
            }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: isDark ? '#2a2a3d' : '#1e293b',
            titleColor: '#fff',
            bodyColor: '#e2e8f0',
            titleFont: { weight: '600', size: 13 },
            bodyFont: { size: 12 },
            padding: 12,
            cornerRadius: 8,
            displayColors: false,
            callbacks: {
              title: function(items) {
                return items[0].label;
              },
              label: function(context) {
                return formatTimeHuman(rawMs[context.dataIndex]);
              }
            }
          }
        }
      }
    });
  });
}

document.getElementById('usageRange').addEventListener('change', loadUsageGraph);

// ------------------ DOMAIN SELECT ------------------
function populateDomainSelect(domains) {
  const select = document.getElementById('domainSelect');

  if (!domains.length) {
    select.innerHTML = '<option value="">No data</option>';
    return;
  }

  select.innerHTML = [...new Set(domains)]
    .sort()
    .map(d => `<option value="${d}">${d}</option>`)
    .join('');
}

// ------------------ SET LIMIT ------------------
document.getElementById("setLimitBtn").onclick = () => {
  const domain = document.getElementById('domainSelect').value.replace(/^www\./, '');
  const minutes = parseInt(document.getElementById('limitMinutes').value);

  if (!domain || !minutes) return alert("Invalid input");

  chrome.storage.local.get(["siteLimits"], ({ siteLimits = {} }) => {
    siteLimits[domain] = minutes;
    chrome.storage.local.set({ siteLimits }, loadLimits);
  });
};

// ------------------ LOAD LIMITS ------------------
function loadLimits() {
  chrome.storage.local.get(['siteLimits'], ({ siteLimits = {} }) => {
    const limitsList = document.getElementById('limitsList');

    if (Object.keys(siteLimits).length === 0) {
      limitsList.innerHTML = '<p style="color:var(--text-muted);font-size:13px;padding:12px 0;">No limits set</p>';
      return;
    }

    const cleaned = {};
    Object.entries(siteLimits).forEach(([domain, minutes]) => {
      cleaned[domain.replace(/^www\./, '')] = minutes;
    });

    chrome.storage.local.set({ siteLimits: cleaned });

    limitsList.innerHTML = Object.entries(cleaned)
      .map(([domain, minutes]) => `
        <div class="list-item">
          <span>${domain} – ${minutes} min</span>
          <button class="remove-btn" data-domain="${domain}">&#10006;</button>
        </div>
      `)
      .join('');

    document.querySelectorAll('.remove-btn').forEach(btn => {
      btn.onclick = () => removeLimit(btn.dataset.domain);
    });
  });
}

// ------------------ REMOVE LIMIT ------------------
function removeLimit(domain) {
  chrome.storage.local.get(['siteLimits'], ({ siteLimits = {} }) => {
    delete siteLimits[domain.replace(/^www\./, '')];
    chrome.storage.local.set({ siteLimits }, loadLimits);
  });
}

// ------------------ BREAK REMINDERS ------------------
function loadBreakSettings() {
  chrome.storage.local.get(['preferences'], ({ preferences = {} }) => {
    const interval = preferences.breakReminderMinutes || 0;
    document.getElementById('breakInterval').value = String(interval);
  });
}

document.getElementById('saveBreakBtn').onclick = () => {
  const minutes = parseInt(document.getElementById('breakInterval').value);
  chrome.storage.local.get(['preferences'], ({ preferences = {} }) => {
    preferences.breakReminderMinutes = minutes;
    chrome.storage.local.set({ preferences }, () => {
      const status = document.getElementById('status');
      status.textContent = minutes > 0
        ? `Break reminder set to every ${minutes} minutes`
        : 'Break reminders disabled';
      setTimeout(() => { status.textContent = ''; }, 3000);
    });
  });
};

// ------------------ CSS / ELEMENT BLOCK ------------------
document.getElementById("saveCssBtn").onclick = () => {
  const domain = document.getElementById('cssDomain').value.trim().replace(/^www\./, '');
  const rules = document.getElementById('cssRules').value.trim();

  if (!domain || !rules) return alert("Missing input");

  chrome.storage.local.get(["elementBlockRules"], ({ elementBlockRules = {} }) => {
    elementBlockRules[domain] = rules.split(",").map(r => r.trim());
    chrome.storage.local.set({ elementBlockRules }, loadCssList);
  });
};

function loadCssList() {
  chrome.storage.local.get(["elementBlockRules"], ({ elementBlockRules = {} }) => {
    const cssList = document.getElementById('cssList');
    cssList.innerHTML = Object.entries(elementBlockRules)
      .map(([d, r]) => `<div class="list-item">${d} – ${r.join(", ")}</div>`)
      .join("");
  });
}

// ------------------ JSON EXPORT ------------------
document.getElementById('exportBtn').onclick = () => {
  chrome.storage.local.get(null, data => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tabtamer-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });
};

// ------------------ CSV EXPORT ------------------
document.getElementById('csvExportBtn').onclick = () => {
  chrome.storage.local.get(['sites'], ({ sites = {} }) => {
    if (Object.keys(sites).length === 0) {
      alert('No data to export');
      return;
    }

    const allDates = new Set();
    Object.values(sites).forEach(info => {
      Object.keys(info.dailyTime || {}).forEach(date => allDates.add(date));
    });

    const sortedDates = [...allDates].sort();
    const domains = Object.keys(sites).sort();

    const header = ['Domain', 'Total (minutes)', ...sortedDates.map(d => d)];
    const rows = [header.join(',')];

    domains.forEach(domain => {
      const info = sites[domain];
      const totalMinutes = Math.round((info.totalTime || 0) / 60000);
      const dailyValues = sortedDates.map(date => {
        return Math.round((info.dailyTime?.[date] || 0) / 60000);
      });
      rows.push([
        `"${domain}"`,
        totalMinutes,
        ...dailyValues
      ].join(','));
    });

    const totals = sortedDates.map(date => {
      let total = 0;
      Object.values(sites).forEach(info => {
        total += info.dailyTime?.[date] || 0;
      });
      return Math.round(total / 60000);
    });
    const grandTotal = Math.round(
      Object.values(sites).reduce((sum, info) => sum + (info.totalTime || 0), 0) / 60000
    );
    rows.push(['TOTAL', grandTotal, ...totals].join(','));

    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tabtamer-data-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });
};

// ------------------ IMPORT ------------------
document.getElementById('importBtn').onclick = () => document.getElementById('importFile').click();

document.getElementById('importFile').onchange = e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {
    let data;

    try {
      data = JSON.parse(reader.result);
    } catch {
      alert("Invalid backup file");
      return;
    }

    const safeData = {
      sites: data.sites || {},
      siteLimits: data.siteLimits || {},
      elementBlockRules: data.elementBlockRules || {},
      preferences: data.preferences || { darkMode: false, audioTracking: true },
      limitWarningsSent: {}
    };

    chrome.storage.local.set(safeData, () => {
      chrome.runtime.sendMessage({ action: 'reloadFromStorage' }, () => {
        loadAll();
        alert("Backup restored successfully");
      });
    });
  };

  reader.readAsText(file);
};

// ------------------ DAILY GOAL ------------------
function loadDailyGoal() {
  chrome.storage.local.get(['preferences'], ({ preferences = {} }) => {
    const goal = preferences.dailyGoalMinutes || 0;
    document.getElementById('dailyGoal').value = String(goal);
  });
}

document.getElementById('saveGoalBtn').onclick = () => {
  const minutes = parseInt(document.getElementById('dailyGoal').value);
  chrome.storage.local.get(['preferences'], ({ preferences = {} }) => {
    preferences.dailyGoalMinutes = minutes;
    chrome.storage.local.set({ preferences }, () => {
      const status = document.getElementById('status');
      status.textContent = minutes > 0
        ? `Daily goal set to ${minutes >= 60 ? (minutes / 60) + ' hours' : minutes + ' minutes'}`
        : 'Daily goal disabled';
      setTimeout(() => { status.textContent = ''; }, 3000);
    });
  });
};

// ------------------ CLEAR ALL DATA ------------------
document.getElementById('clearAllBtn').onclick = () => {
  if (!confirm('Are you sure you want to clear ALL data? This cannot be undone.')) return;
  if (!confirm('This will permanently delete all browsing history, time limits, and settings. Are you really sure?')) return;

  chrome.storage.local.clear(() => {
    chrome.runtime.sendMessage({ action: 'clearSession' }, () => {
      const status = document.getElementById('status');
      status.textContent = 'All data has been cleared';
      status.style.color = '#ef4444';
      loadAll();
      setTimeout(() => {
        status.textContent = '';
        status.style.color = '';
      }, 3000);
    });
  });
};

// ------------------ INIT ------------------
function loadAll() {
  loadUsageGraph();
  loadLimits();
  loadCssList();
  loadBreakSettings();
  loadDailyGoal();
}

loadAll();
