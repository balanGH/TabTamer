# TabTamer (Time Tracker & Element Blocker) - Chrome Extension

A production-ready Chrome extension (Manifest V3) that tracks website usage time **persistently across sessions** and allows temporarily blocking webpage elements using an element picker. **Time tracking persists**, but picker blocks reset when Chrome closes.

---

## Features

✅ **Smart Time Tracking**

* Tracks active tab time only when browser window is focused
* Tracks any background tab playing audio (not YouTube-only)
* Stops counting when tab closes, audio stops, or browser is unfocused

✅ **Element Blocker**

* Click the ⛶ button to enter element picker mode
* Hover over webpage elements – shows gray dotted outline
* Click element to temporarily hide it
* Confirmation box appears on webpage with Block/Cancel buttons
* Works on dynamic websites (YouTube, SPAs) with MutationObserver

✅ **Session-Based Storage**

* All tracking data stored in-memory (resets when Chrome closes)
* No persistent storage for temporary picker blocks – privacy-friendly
* Supports analytics for the current session

✅ **Beautiful Analytics UI**

* Today/Week/Month tabs with interactive charts
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

```
TabTamer/
├── README.md                    # Project overview & documentation
├── PROJECT_SUMMARY.md           # High-level architecture & features
├── QUICK_START.md               # Installation & quick usage guide
├── TESTING_GUIDE.md             # Manual testing checklist
├── manifest.json                # Extension configuration (Manifest V3)
├── background.js                # Service worker: time tracking & limit enforcement
├── popup.html                   # Extension popup UI
├── popup.js                     # Popup logic & chart rendering
├── popup.css                    # Popup styling
├── options.html                 # Settings page UI
├── options.js                   # Settings logic (limits, rules, toggles)
├── options.css                  # Settings styling
├── blocked.html                 # Page shown when time limit is reached
├── blocked.js                   # Blocked page logic
├── contentScript.js             # Element picker & confirmation UI
├── contentBlocker.js            # Auto-hides blocked elements
├── contentToast.js              # In-page toast notifications
├── chart.min.js                 # Local Chart.js library (no CDN dependency)
├── icon16.png                   # Extension icon (16x16)
├── icon48.png                   # Extension icon (48x48)
├── icon128.png                  # Extension icon (128x128)
├── generate_icons.py            # Python script for generating icons
└── create-icons.html            # Icon creation/testing page
```

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
4. View analytics in Today/Week/Month tabs

---

## How Element Blocker Works

### Element Picker Mode

1. Click the ⛶ button in the popup
2. Popup closes automatically
3. Hover over webpage elements – gray dotted outline appears
4. Click an element to temporarily hide it
5. Confirmation box appears in top-right corner
6. Click **Block** to hide permanently, or **Cancel** to restore (temporary picker blocks reset on close)

### Confirmation Box

* Shows domain name
* Shows CSS selector of clicked element
* Block and Cancel buttons
* Auto-cancels after 10 seconds if no action is taken

### Automatic Element Blocking

* Block rules saved in `chrome.storage.local` (persistent if saved manually)
* Future visits to same domain auto-hide elements
* MutationObserver handles dynamically loaded content (YouTube, SPAs)

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

* Tracks only when browser window is focused
* Tracks only the currently active tab
* Stops immediately when switching tabs or unfocusing

### Audio Tab Tracking

* Tracks any tab playing audio (toggle on/off)
* Works for YouTube, Spotify, podcasts, any audio source
* Detects when audio starts/stops
* Continues tracking even if tab is in background

### Edge Cases Handled

✅ Muted tabs not tracked
✅ Multiple audio tabs tracked independently
✅ Service worker sleep handled via timers and in-memory storage
✅ Tab closed → stops tracking
✅ Chrome minimized → stops tracking

### Storage Architecture

```javascript
sessionData = {
  sites: {
    "example.com": {
      domain: "example.com",
      totalTime: 123456,        // Total milliseconds
      dailyTime: { "2025-12-23": 123456 }
    }
  },
  currentActiveTab: 123,
  currentAudioTabs: new Set([456]),
  isWindowFocused: true,
  lastUpdateTime: 1703345678900
}
```

### Time Update Cycle

* Timer runs every 1 second
* Calculates elapsed time since last update
* Adds time to active + audio tabs
* Updates in-memory storage only

---

## Analytics Calculations

**Today Tab:** total time for current date, top 10 sites
**Week Tab:** bar chart last 7 days (Mon → Sun), top 10 sites
**Month Tab:** bar chart last 30 days, top 10 sites

---

## Settings Page

* Site usage graphs (Today/Week/Month)
* Daily time limits per domain → warn at 5 & 2 minutes remaining
* Redirect to `blocked.html` when limit exceeded
* View/remove element block rules
* Backup & restore all settings

---

## Manifest V3 Compliance

✅ Service Worker (`background.js`) used instead of background page
✅ No `eval` or dynamic code execution
✅ Minimal permissions: tabs, storage, notifications, alarms, scripting
✅ Implements keep-alive via port connection
✅ Proper timer cleanup

---

## Privacy & Security

🔒 Privacy-first: No external data sent, time tracking persists, picker blocks reset, no personal info
🔒 Security: Ignores chrome:// URLs, safe error handling, CSP-compliant, no external dependencies

---

## Troubleshooting

* Element blocker not working → check console, reload, click ⛶
* Extension not tracking → verify toolbar icon, “Track Audio Tabs” enabled
* Charts not showing → verify `chart.min.js`, clear session data

---

## Testing Checklist

* Active & audio tab tracking works
* Element picker highlights correctly
* Clicking element shows confirmation box
* Blocked elements stay hidden if saved
* Dark mode toggle works
* Today/Week/Month analytics correct

---

## License

MIT License – free to use, modify, and distribute
