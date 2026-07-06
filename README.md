# TabTamer – Chrome Extension

A Chrome extension (Manifest V3) for tracking browsing time, blocking distracting elements, and staying focused. Tracks active and audio tabs, enforces daily time limits, and includes Focus Mode to block distracting sites during work sessions.

---

## Features

### Time Tracking
- Tracks active tab time only when the browser window is focused
- Tracks background tabs playing audio (YouTube, Spotify, podcasts, etc.)
- Persistent storage – data survives Chrome restarts and service worker sleep
- Real-time updates in the popup (synchronous in-memory tracking)
- Daily time data with automatic pruning of entries older than 90 days

### Focus Mode
- Block distracting site categories (social, entertainment, shopping, news) during timed sessions
- Preset durations: 25m, 50m, 90m, 2h
- Active session banner with countdown timer in the popup
- Blocked sites redirect to a focus-blocked page
- Toggle with `Alt+F` keyboard shortcut

### Site Categories & Productivity Score
- Built-in categorization of popular sites (work, social, entertainment, shopping, news, learning)
- Wildcard domain matching (`*.domain.com`, `localhost:*`)
- Productivity score calculated from time spent across categories
- Today vs yesterday and vs last week average comparison stats

### Element Blocker
- Visual element picker – click ⛶ or press `Alt+P`
- Hover highlights with gray dotted outline, click to block
- Confirmation overlay with Block/Cancel buttons (auto-cancels after 10s)
- Right-click context menu: "Block this element with TabTamer"
- Persistent block rules via `chrome.storage.local`
- MutationObserver with requestAnimationFrame debounce for dynamic content

### Time Limits
- Set daily time limits per domain from the options page
- Warnings at 5 minutes and 2 minutes remaining
- Redirects to a blocked page when the limit is exceeded
- Manage limits from the options page

### Break Reminders
- Configurable break reminder notifications (3m, 30m, 45m, 60m, 90m, 2h intervals)
- Tracks continuous browsing time and notifies when it's time to take a break
- Configure from the options page

### Analytics
- Today/Week/Month tabs with interactive Chart.js bar charts
- Top sites sorted by time spent with category color indicators
- Weekly chart (Mon–Sun) and monthly chart (last 30 days)
- CSV and JSON export from the options page

### Other
- Dark mode with persistent preference
- Audio tab tracking toggle
- Service worker restart resilience (tab domain cache, blocked tabs persistence)
- XSS-safe UI rendering (createElement + textContent)

---

## File Structure

```
TabTamer/
├── manifest.json
├── assets/
│   ├── chart.min.js
│   └── icons/
│       ├── icon16.png
│       ├── icon48.png
│       └── icon128.png
├── pages/
│   ├── blocked.html
│   └── blocked.js
└── src/
    ├── background.js
    ├── content/
    │   ├── contentScript.js
    │   ├── contentBlocker.js
    │   └── contentToast.js
    ├── options/
    │   ├── options.html
    │   ├── options.js
    │   └── options.css
    └── popup/
        ├── popup.html
        ├── popup.js
        └── popup.css
```

---

## Installation

1. Open Chrome → `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** and select the project folder
4. The TabTamer icon appears in the toolbar

---

## Usage

| Action | How |
|---|---|
| Track time | Automatic – browse normally |
| Block an element | Click ⛶ in popup or press `Alt+P`, then click the element |
| Block via right-click | Right-click any element → "Block this element with TabTamer" |
| Start Focus Mode | Click 🎯 in popup, pick duration & categories, click Start |
| Set a time limit | Options page → Set Daily Time Limit |
| Export data | Options page → Export JSON or Export CSV |
| Toggle dark mode | Click ⏾ in popup |

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Alt+F` | Toggle Focus Mode |
| `Alt+P` | Start Element Picker |

---

## Permissions

| Permission | Reason |
|---|---|
| `tabs` | Track active tab and domain |
| `storage` | Persist time data, block rules, preferences |
| `notifications` | Break reminders and time limit warnings |
| `alarms` | Daily reset, focus mode timer, break reminders |
| `scripting` | Inject content scripts for element blocking |
| `contextMenus` | Right-click "Block this element" |

---

## Privacy

- All data stored locally in `chrome.storage.local`
- No external network requests
- No personal information collected
- Ignores `chrome://` and internal URLs

---

## License

MIT License – free to use, modify, and distribute
