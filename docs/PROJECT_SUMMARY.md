# TabTamer (Time Tracker & Element Blocker) - Chrome Extension

A production-ready Chrome extension (Manifest V3) that tracks website usage time persistently across sessions and allows temporarily blocking webpage elements with the element picker. Time tracking is saved **across sessions**, but picker blocks reset when Chrome closes.

---

## Features

✅ **Smart Time Tracking**

* Tracks active tab time only when browser window is focused
* Tracks any background tab playing audio (not limited to YouTube)
* Stops counting when tab closes, audio stops, or browser is unfocused

✅ **Element Blocker**

* Click the ⛶ button to enter element picker mode
* Hover over any webpage element – shows gray dotted outline
* Click element to temporarily hide it
* Confirmation box appears on webpage with Block/Cancel buttons
* Blocked elements are permanently hidden on future visits
* Works on dynamic websites (YouTube, SPAs) with MutationObserver

✅ **Session-Based Storage**

* All data stored in-memory
* No persistent storage – privacy-friendly
* Supports analytics for the current session

✅ **Beautiful Analytics UI**

* Today / Week / Month tabs with interactive charts
* Weekly bar chart (Mon → Sun) showing total minutes per day
* Monthly bar chart (last 30 days) showing total minutes per day
* Top sites section sorted by total time

✅ **User Controls**

* Toggle for tracking background audio
* Clear session data button
* Real-time updates every 2 seconds
* Dark mode toggle with persistent preferences

---

## File Structure
<details>

```
extension/
├── manifest.json         # Extension configuration (MV3)
├── background.js         # Service worker with time tracking & element blocking logic
├── popup.html            # Extension popup UI
├── popup.css             # Modern, minimal styling
├── popup.js              # UI logic and chart rendering
├── options.html          # Settings page for limits & element blocks
├── options.js            # Settings logic
├── options.css           # Settings styling
├── contentScript.js      # Element picker & confirmation UI
├── contentBlocker.js     # Auto-hides blocked elements
├── contentToast.js       # Shows toast notifications
├── blocked.html          # Time limit reached page
├── blocked.js            # Blocked page logic
├── chart.min.js          # Chart.js library (local, no CDN)
├── icon16.png            # Extension icon (16x16)
├── icon48.png            # Extension icon (48x48)
├── icon128.png           # Extension icon (128x128)
└── README.md             # This file
```
</details>

---

## Installation Instructions

### Step 1: Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select the `extension/` folder
5. The extension icon will appear in your toolbar

### Step 2: Start Using

1. Click the extension icon to open the popup
2. Browse websites normally – time tracking happens automatically
3. Click the ⛶ button to block distracting elements
4. View analytics in Today / Week / Month tabs

---

## How Element Blocker Works

### Element Picker Mode

1. Click the ⛶ button in the popup
2. Popup closes automatically
3. Hover over webpage elements – they highlight with a gray dotted outline
4. Click an element you want to block
5. The element temporarily disappears
6. A confirmation box appears in the top-right corner of the webpage
7. Click **Block** to permanently hide the element, or **Cancel** to restore it

### Confirmation Box

The confirmation box shows:

* Domain name
* CSS selector of the clicked element
* Block and Cancel buttons
* Auto-cancels after 10 seconds if no action is taken

### Automatic Element Blocking

* Block rules are saved in `chrome.storage.local`
* On future visits to the same domain, elements are automatically hidden
* Uses MutationObserver to handle dynamically loaded content (YouTube, SPAs, etc.)

### Storage Format

```javascript
elementBlockRules = {
  "youtube.com": [
    "#shorts",
    ".ytd-reel-shelf-renderer",
    "ytd-rich-section-renderer"
  ],
  "facebook.com": [
    "[aria-label=\"Stories\"]",
    "div[role=\"complementary\"]"
  ]
}
```

---

## Time Tracking Logic

### Active Tab Tracking

* Tracks **only** when the browser window is focused
* Tracks **only** the currently active tab
* Stops immediately when switching tabs or unfocusing window

### Audio Tab Tracking

* Tracks **any tab** playing audio (toggle on/off)
* Works for YouTube, Spotify, podcasts, any audio source
* Automatically detects when audio starts/stops
* Continues tracking even if tab is in the background

### Edge Cases Handled

✅ Muted tabs: Not tracked
✅ Multiple audio tabs: All tracked independently
✅ Service worker sleep: Uses timers and in-memory storage
✅ Tab closed: Immediately stops tracking
✅ Chrome minimized: Stops all tracking

---

## Storage Architecture

### In-Memory Storage

```javascript
sessionData = {
  sites: {
    "example.com": {
      domain: "example.com",
      totalTime: 123456,        // Total milliseconds
      dailyTime: {
        "2025-12-23": 123456    // Per-day breakdown
      }
    }
  },
  currentActiveTab: 123,         // Tab ID
  currentAudioTabs: new Set([456]), // Set of tab IDs
  isWindowFocused: true,
  lastUpdateTime: 1703345678900
}
```

### Time Update Cycle

* Timer runs every 1 second (1000ms)
* Calculates elapsed time since last update
* Adds time to tracked tabs (active + audio tabs)
* Stores in daily breakdown for analytics
* Updates in-memory storage only

---

## Analytics Calculations

**Today Tab:**

* Shows total time for current date
* Displays top 10 sites for today

**Week Tab:**

* Bar chart: Last 7 days (Mon → Sun)
* Shows minutes per day
* Top 10 sites for past 7 days

**Month Tab:**

* Bar chart: Last 30 days
* Shows minutes per day
* Top 10 sites for past 30 days

---

## Settings Page

Access by clicking the ⚙️ button in the popup.

* **Site Usage Graph** – View usage for Today/Week/Month (interactive bar chart)
* **Daily Time Limits** – Set per-domain limits, get warnings at 5 & 2 minutes remaining, page redirects to `blocked.html` when limit exceeded
* **Element Block Rules** – View/remove saved block rules
* **Backup & Restore** – Export/import all settings (time limits, element blocks, preferences)

---

## Manifest V3 Compliance

✅ Service Worker (`background.js`) used instead of background page
✅ No `eval` or dynamic code execution
✅ Minimal permissions: tabs, storage, notifications, alarms, scripting
✅ Implements keep-alive via port connection to prevent service worker sleep
✅ Timer management with proper cleanup

---

## Privacy & Security

🔒 **Privacy-First Design**

* No data sent to external servers
* No persistent storage (resets on close)
* No tracking across sessions
* No personal information collected

🔒 **Security Features**

* Ignores `chrome://` and `chrome-extension://` URLs
* Safe error handling for all operations
* No external dependencies (Chart.js is local)
* Content Security Policy compliant

---

## Troubleshooting

**Element Blocker Not Working**

* Make sure you're on a regular website (not `chrome://` or `edge://`)
* Check console for errors (`F12 → Console`)
* Verify `contentScript.js` is loaded
* Reload page and click ⛶ again

**Extension Not Tracking**

* Check if icon is present in toolbar
* Verify "Track Audio Tabs" is enabled
* Open Chrome DevTools → Background page → Check console for errors
* Reload extension: `chrome://extensions/` → Reload button

**Charts Not Showing**

* Verify `chart.min.js` exists in extension folder
* Check browser console for errors
* Clear session data and track again

---

## Testing Checklist

* Active tab tracking works when window is focused
* Audio tab tracking works (play YouTube video in background)
* Element picker highlights elements with gray dotted outline
* Clicking element shows confirmation box
* Blocked elements stay hidden on reload
* Block rules persist in storage
* Settings page shows all block rules
* Dark mode toggle works consistently
* Today tab shows correct total time
* Week chart displays 7 days correctly
* Month chart displays 30 days correctly

---

## License

MIT License – free to use, modify, and distribute
