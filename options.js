const chartCtx = document.getElementById("usageChart").getContext("2d");
let chart;

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

    let maxValue = 0; // track max in ms

    Object.entries(sites).forEach(([domain, info]) => {
      let totalMs = 0;

      if (range === 'today') {
        totalMs = info.dailyTime?.[getDateKey()] || 0;
      }

      if (range === 'week') {
        for (let i = 0; i < 7; i++) {
          const dateKey = getDateKey(i);
          totalMs += info.dailyTime?.[dateKey] || 0;
        }
      }

      if (range === 'month') {
        for (let i = 0; i < 30; i++) {
          const dateKey = getDateKey(i);
          totalMs += info.dailyTime?.[dateKey] || 0;
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

    // Decide unit + divisor for conversion
    let unit, divisor, yMax;

    if (range === 'today') {
      unit = 'Minutes';
      divisor = 60000; // ms → minutes
      yMax = maxValue / divisor;     // cap at 24h in minutes
    } else if (maxValue >= 1000 * 60 * 60 * 24) {
      unit = 'Days';
      divisor = 1000 * 60 * 60 * 24; // ms → days
      yMax = maxValue / divisor;
    } else if (maxValue >= 1000 * 60 * 60) {
      unit = 'Hours';
      divisor = 1000 * 60 * 60; // ms → hours
      yMax = maxValue / divisor;
    } else {
      unit = 'Minutes';
      divisor = 60000; // ms → minutes
      yMax = maxValue / divisor;
    }

    // Convert all rawData into chosen unit
    const data = rawData.map(ms => +(ms / divisor).toFixed(1));

    // Destroy existing chart if present
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
            title: {
              display: true,
              text: unit
            }
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

                if (days >= 1) {
                  const remHours = hours % 24;
                  return `${days}d ${remHours}h`;
                } else if (hours >= 1) {
                  const remMin = minutes % 60;
                  return `${hours}h ${remMin}m`;
                } else {
                  return `${minutes}m`;
                }
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
  const domain = domainSelect.value.replace(/^www\./, '');
  const minutes = parseInt(limitMinutes.value);

  if (!domain || !minutes) return alert("Invalid input");

  chrome.storage.local.get(["siteLimits"], ({ siteLimits = {} }) => {
    siteLimits[domain] = minutes;
    chrome.storage.local.set({ siteLimits }, loadLimits);
  });
};

// ------------------ LOAD LIMITS ------------------
function loadLimits() {
  chrome.storage.local.get(['siteLimits'], ({ siteLimits = {} }) => {

    if (Object.keys(siteLimits).length === 0) {
      limitsList.innerHTML = '<p>No limits set</p>';
      return;
    }

    // Normalize + clean
    const cleaned = {};
    Object.entries(siteLimits).forEach(([domain, minutes]) => {
      const normalized = domain.replace(/^www\./, '');
      cleaned[normalized] = minutes;
    });

    // Persist cleaned limits (IMPORTANT)
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
  const normalized = domain.replace(/^www\./, '');

  chrome.storage.local.get(['siteLimits'], ({ siteLimits = {} }) => {
    delete siteLimits[normalized];

    chrome.storage.local.set({ siteLimits }, () => {
      loadLimits();
    });
  });
}

// ------------------ CSS / ELEMENT BLOCK ------------------
document.getElementById("saveCssBtn").onclick = () => {
  const domain = cssDomain.value.trim().replace(/^www\./, '');
  const rules = cssRules.value.trim();

  if (!domain || !rules) return alert("Missing input");

  chrome.storage.local.get(["elementBlockRules"], ({ elementBlockRules = {} }) => {
    elementBlockRules[domain] = rules
      .split(",")
      .map(r => r.trim());

    chrome.storage.local.set({ elementBlockRules }, loadCssList);
  });
};

function loadCssList() {
  chrome.storage.local.get(["elementBlockRules"], ({ elementBlockRules = {} }) => {
    cssList.innerHTML = Object.entries(elementBlockRules)
      .map(([d, r]) => `<div class="list-item">${d} – ${r.join(", ")}</div>`)
      .join("");
  });
}

// ------------------ EXPORT ------------------
exportBtn.onclick = () => {
  chrome.storage.local.get(null, data => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tabtamer-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  });
};

// ------------------ IMPORT ------------------
importBtn.onclick = () => importFile.click();

importFile.onchange = e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {
    let data;

    try {
      data = JSON.parse(reader.result);
    } catch (err) {
      alert("Invalid backup file");
      return;
    }

    // Validate expected structure
    const safeData = {
      sites: data.sites || {},
      siteLimits: data.siteLimits || {},
      elementBlockRules: data.elementBlockRules || {},
      preferences: data.preferences || {
        darkMode: false,
        audioTracking: true
      },
      limitWarningsSent: {} // reset warnings safely
    };

    chrome.storage.local.set(safeData, () => {
      // Notify background to reload in-memory state
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
}

loadAll();
