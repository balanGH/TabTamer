function loadLimits() {
  chrome.storage.local.get(['siteLimits'], (result) => {
    const siteLimits = result.siteLimits || {};
    const container = document.getElementById('limitsList');

    if (Object.keys(siteLimits).length === 0) {
      container.innerHTML = '<div class="empty-state">No time limits set yet</div>';
      return;
    }

    container.innerHTML = Object.entries(siteLimits).map(([domain, minutes]) => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

      return `
        <div class="list-item">
          <div class="list-item-content">
            <div class="list-item-domain">${domain}</div>
            <div class="list-item-value">Limit: ${timeStr} per day</div>
          </div>
          <button class="btn-remove" data-domain="${domain}" data-type="limit">Remove</button>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.btn-remove[data-type="limit"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const domain = e.target.dataset.domain;
        removeLimitForDomain(domain);
      });
    });
  });
}

function loadElementRules() {
  chrome.storage.local.get(['elementBlockRules'], (result) => {
    const elementBlockRules = result.elementBlockRules || {};
    const container = document.getElementById('elementsList');

    if (Object.keys(elementBlockRules).length === 0) {
      container.innerHTML = '<div class="empty-state">No element removal rules set yet</div>';
      return;
    }

    container.innerHTML = Object.entries(elementBlockRules).map(([domain, selectors]) => {
      return `
        <div class="list-item">
          <div class="list-item-content">
            <div class="list-item-domain">${domain}</div>
            <div class="list-item-selectors">
              ${selectors.map(sel => `<span class="selector-tag">${sel}</span>`).join('')}
            </div>
          </div>
          <button class="btn-remove" data-domain="${domain}" data-type="element">Remove</button>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.btn-remove[data-type="element"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const domain = e.target.dataset.domain;
        removeElementRulesForDomain(domain);
      });
    });
  });
}

function addLimit() {
  const domain = document.getElementById('limitDomain').value.trim().toLowerCase();
  const hours = parseInt(document.getElementById('limitHours').value) || 0;
  const minutes = parseInt(document.getElementById('limitMinutes').value) || 0;

  if (!domain) {
    alert('Please enter a domain');
    return;
  }

  if (hours === 0 && minutes === 0) {
    alert('Please enter a time limit');
    return;
  }

  const totalMinutes = hours * 60 + minutes;

  chrome.storage.local.get(['siteLimits'], (result) => {
    const siteLimits = result.siteLimits || {};
    siteLimits[domain] = totalMinutes;

    chrome.storage.local.set({ siteLimits }, () => {
      document.getElementById('limitDomain').value = '';
      document.getElementById('limitHours').value = '';
      document.getElementById('limitMinutes').value = '';
      loadLimits();
    });
  });
}

function removeLimitForDomain(domain) {
  chrome.storage.local.get(['siteLimits'], (result) => {
    const siteLimits = result.siteLimits || {};
    delete siteLimits[domain];

    chrome.storage.local.set({ siteLimits }, () => {
      loadLimits();
    });
  });
}

function addElementRule() {
  const domain = document.getElementById('elementDomain').value.trim().toLowerCase();
  const selector = document.getElementById('elementSelector').value.trim();

  if (!domain) {
    alert('Please enter a domain');
    return;
  }

  if (!selector) {
    alert('Please enter a CSS selector');
    return;
  }

  chrome.storage.local.get(['elementBlockRules'], (result) => {
    const elementBlockRules = result.elementBlockRules || {};

    if (!elementBlockRules[domain]) {
      elementBlockRules[domain] = [];
    }

    if (!elementBlockRules[domain].includes(selector)) {
      elementBlockRules[domain].push(selector);
    }

    chrome.storage.local.set({ elementBlockRules }, () => {
      document.getElementById('elementDomain').value = '';
      document.getElementById('elementSelector').value = '';
      loadElementRules();
    });
  });
}

function removeElementRulesForDomain(domain) {
  chrome.storage.local.get(['elementBlockRules'], (result) => {
    const elementBlockRules = result.elementBlockRules || {};
    delete elementBlockRules[domain];

    chrome.storage.local.set({ elementBlockRules }, () => {
      loadElementRules();
    });
  });
}

function exportData() {
  chrome.storage.local.get(null, (result) => {
    const dataStr = JSON.stringify(result, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `tabtamer-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showStatus('Data exported successfully', 'success');
  });
}

function importData(file) {
  const reader = new FileReader();

  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);

      if (!data || typeof data !== 'object') {
        throw new Error('Invalid data format');
      }

      chrome.storage.local.clear(() => {
        chrome.storage.local.set(data, () => {
          showStatus('Data imported successfully', 'success');
          loadLimits();
          loadElementRules();
        });
      });
    } catch (error) {
      showStatus('Failed to import data: ' + error.message, 'error');
    }
  };

  reader.readAsText(file);
}

function showStatus(message, type) {
  const statusEl = document.getElementById('importStatus');
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;

  setTimeout(() => {
    statusEl.className = 'status';
  }, 5000);
}

document.getElementById('addLimitBtn').addEventListener('click', addLimit);

document.getElementById('limitDomain').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addLimit();
});

document.getElementById('limitMinutes').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addLimit();
});

document.getElementById('addElementBtn').addEventListener('click', addElementRule);

document.getElementById('elementSelector').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addElementRule();
});

document.getElementById('exportBtn').addEventListener('click', exportData);

document.getElementById('importFile').addEventListener('change', (e) => {
  if (e.target.files.length > 0) {
    importData(e.target.files[0]);
  }
});

loadLimits();
loadElementRules();
