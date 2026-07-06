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

// ------------------ USAGE GRAPH ------------------
function loadUsageGraph() {
  const range = document.getElementById('usageRange').value;

  chrome.storage.local.get(['sites'], ({ sites = {} }) => {
    const labels = [];
    const rawData = [];
    const domainsForLimits = [];

    let maxValue = 0;

    Object.entries(sites).forEach(([domain, info]) => {
      let totalMs = 0;

      if (range === 'today') {
        totalMs = info.dailyTime?.[getDateKey()] || 0;
      }

      if (range === 'week') {
        for (let i = 0; i < 7; i++) {
          totalMs += info.dailyTime?.[getDateKey(i)] || 0;
        }
      }

      if (range === 'month') {
        for (let i = 0; i < 30; i++) {
          totalMs += info.dailyTime?.[getDateKey(i)] || 0;
        }
      }

      if (totalMs > 0) {
        const normalized = domain.replace(/^www\./, '');
        labels.push(normalized);
        rawData.push(totalMs);
        domainsForLimits.push(normalized);
        maxValue = Math.max(maxValue, totalMs);
      }
    });

    populateDomainSelect([...new Set(domainsForLimits)]);
    if (!labels.length) return;

    let unit, divisor, yMax;

    if (range === 'today') {
      unit = 'Minutes';
      divisor = 60000;
      yMax = maxValue / divisor;
    } else if (maxValue >= 1000 * 60 * 60 * 24) {
      unit = 'Days';
      divisor = 1000 * 60 * 60 * 24;
      yMax = maxValue / divisor;
    } else if (maxValue >= 1000 * 60 * 60) {
      unit = 'Hours';
      divisor = 1000 * 60 * 60;
      yMax = maxValue / divisor;
    } else {
      unit = 'Minutes';
      divisor = 60000;
      yMax = maxValue / divisor;
    }

    const data = rawData.map(ms => +(ms / divisor).toFixed(1));

    if (chart) chart.destroy();

    chart = new Chart(chartCtx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: unit,
          data
        }]
      },
      options: {
        scales: {
          y: {
            beginAtZero: true,
            max: yMax,
            title: { display: true, text: unit }
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: function (context) {
                const ms = rawData[context.dataIndex];
                const minutes = Math.floor(ms / 60000);
                const hours = Math.floor(minutes / 60);
                const days = Math.floor(hours / 24);

                if (days >= 1) return `${days}d ${hours % 24}h`;
                else if (hours >= 1) return `${hours}h ${minutes % 60}m`;
                else return `${minutes}m`;
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

  select.innerHTML = domains
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
      limitsList.innerHTML = '<p>No limits set</p>';
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
          <button class="remove-btn" data-domain="${domain}">✖</button>
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

    // Collect all unique dates
    const allDates = new Set();
    Object.values(sites).forEach(info => {
      Object.keys(info.dailyTime || {}).forEach(date => allDates.add(date));
    });

    const sortedDates = [...allDates].sort();
    const domains = Object.keys(sites).sort();

    // CSV header
    const header = ['Domain', 'Total (minutes)', ...sortedDates.map(d => d)];
    const rows = [header.join(',')];

    // CSV rows
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

    // Total row
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

// ------------------ INIT ------------------
function loadAll() {
  loadUsageGraph();
  loadLimits();
  loadCssList();
  loadBreakSettings();
}

loadAll();
