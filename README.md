# TabTamer Time Tracker - Chrome Extension

A production-ready Chrome extension (Manifest V3) that tracks website usage time using **session-based storage** (in-memory). All data resets when Chrome closes.

## Features

✅ **Smart Time Tracking**
- Tracks active tab time only when browser window is focused
- Tracks ANY background tab playing audio (not YouTube-only)
- Stops counting when tab closes, audio stops, or browser is unfocused

✅ **Session-Based Storage**
- All data stored in-memory (resets when Chrome closes)
- No persistent storage - privacy-friendly
- Supports analytics for current session

✅ **Beautiful Analytics UI**
- Today/Week/Month tabs with interactive charts
- Weekly bar chart (Mon → Sun) showing total minutes per day
- Monthly bar chart (last 30 days) showing total minutes per day
- Top sites section sorted by total time

✅ **User Controls**
- Toggle for tracking background audio
- Clear session data button
- Real-time updates every 2 seconds

## File Structure

```
extension/
├── manifest.json          # Extension configuration (MV3)
├── background.js          # Service worker with time tracking logic
├── popup.html            # Extension popup UI
├── popup.css             # Modern, minimal styling
├── popup.js              # UI logic and chart rendering
├── chart.min.js          # Chart.js library (local, no CDN)
├── icon16.png            # Extension icon (16x16)
├── icon48.png            # Extension icon (48x48)
├── icon128.png           # Extension icon (128x128)
├── create-icons.html     # Helper to generate icons
└── README.md             # This file
```

## Installation Instructions

### Step 1: Generate Icons

1. Open `create-icons.html` in Chrome
2. Three PNG icons will download automatically (icon16.png, icon48.png, icon128.png)
3. Move the downloaded icons to the `extension/` folder

**Alternative:** Use any 16x16, 48x48, and 128x128 PNG icons you prefer

### Step 2: Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select the `extension/` folder
5. The extension icon will appear in your toolbar

### Step 3: Start Tracking

1. Click the extension icon to open the popup
2. Browse websites normally
3. Time tracking happens automatically
4. View analytics in Today/Week/Month tabs

## How It Works

### Time Tracking Logic

**Active Tab Tracking:**
- Tracks ONLY when browser window is focused
- Tracks ONLY the currently active tab
- Stops immediately when you switch tabs or unfocus window

**Audio Tab Tracking:**
- Tracks ANY tab playing audio (can be toggled on/off)
- Works for YouTube, Spotify, podcasts, any audio source
- Automatically detects when audio starts/stops
- Continues tracking even if tab is in background

**Edge Cases Handled:**
- ✅ Muted tabs: Not tracked (audio must be audible)
- ✅ Multiple audio tabs: All tracked independently
- ✅ Service worker sleep: Uses timers and in-memory storage
- ✅ Tab closed: Immediately stops tracking
- ✅ Chrome minimized: Stops all tracking

### Storage Architecture

**In-Memory Storage:**
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
  currentAudioTabs: Set([456]), // Set of tab IDs
  isWindowFocused: true,
  lastUpdateTime: 1703345678900
}
```

**Time Update Cycle:**
1. Timer runs every 1 second (1000ms)
2. Calculates elapsed time since last update
3. Adds time to tracked tabs (active + audio tabs)
4. Stores in daily breakdown for analytics
5. Updates in-memory storage only

**Session Persistence:**
- ✅ Data persists while Chrome is running
- ✅ Survives tab closes and reopens
- ✅ Survives extension reload
- ❌ Resets when Chrome closes (by design)

### Analytics Calculations

**Today Tab:**
- Shows total time for current date
- Displays top 10 sites for today

**Week Tab:**
- Bar chart: Last 7 days (Mon → Sun)
- Shows minutes per day
- Top 10 sites for past 7 days

**Month Tab:**
- Bar chart: Last 30 days
- Shows minutes per day
- Top 10 sites for past 30 days

## Manifest V3 Compliance

✅ **Service Worker:** Uses background.js as service worker (not background page)
✅ **No Eval:** No dynamic code execution
✅ **Minimal Permissions:** Only `tabs` and `storage.local` for preferences
✅ **Keepalive:** Implements port connection to prevent service worker sleep
✅ **Timer Management:** Uses setInterval with proper cleanup

## Privacy & Security

🔒 **Privacy-First Design:**
- No data sent to external servers
- No persistent storage (resets on close)
- No tracking across browser sessions
- No personal information collected

🔒 **Security Features:**
- Ignores chrome:// and chrome-extension:// URLs
- Safe error handling for all operations
- No external dependencies (Chart.js is local)
- Content Security Policy compliant

## Customization

### Change Update Interval

In `background.js`, modify:
```javascript
const UPDATE_INTERVAL = 1000; // Change to 5000 for 5 seconds
```

### Change Chart Colors

In `popup.js`, modify chart creation:
```javascript
backgroundColor: 'rgba(102, 126, 234, 0.8)', // Change color here
borderColor: 'rgba(102, 126, 234, 1)',       // And here
```

### Change UI Theme

In `popup.css`, modify header gradient:
```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

## Troubleshooting

### Extension Not Tracking

1. Check if icon is present in toolbar
2. Open popup - verify "Track Audio Tabs" is enabled
3. Open Chrome DevTools → Background page → Check console for errors
4. Reload extension: chrome://extensions/ → Reload button

### Charts Not Showing

1. Verify chart.min.js is in extension folder
2. Check browser console for errors (F12)
3. Try clearing session data and tracking again

### Service Worker Stopped

This is normal for MV3. The extension automatically restarts tracking when needed.

## Testing Checklist

- [ ] Active tab tracking works when window is focused
- [ ] Active tab tracking stops when window is unfocused
- [ ] Audio tab tracking works (play YouTube video in background)
- [ ] Audio tab tracking stops when audio is muted
- [ ] Multiple audio tabs are tracked simultaneously
- [ ] Time updates in real-time (every 2 seconds in UI)
- [ ] Today tab shows correct total time
- [ ] Week chart displays 7 days correctly
- [ ] Month chart displays 30 days correctly
- [ ] Top sites list shows correct rankings
- [ ] Toggle for audio tracking works
- [ ] Clear session data button works
- [ ] Extension icon shows in toolbar
- [ ] Data persists when popup is closed/reopened
- [ ] Data resets when Chrome is restarted

## Technical Specifications

**Chrome Version:** 88+ (Manifest V3 support)
**Permissions:** tabs, storage
**Storage:** In-memory only (session-based)
**Chart Library:** Chart.js v4.4.0 (local)
**Update Frequency:** 1 second (configurable)
**UI Update:** 2 seconds
**Icons:** 16x16, 48x48, 128x128 PNG

## Code Explanation

### Edge Cases Handled

1. **Muted Tabs:**
   - Only tracks tabs with `audible: true`
   - Muted tabs are ignored even if playing media

2. **Multiple Audio Tabs:**
   - Uses `Set()` to track multiple tab IDs
   - Each tab tracked independently
   - No double-counting

3. **Service Worker Sleep (MV3):**
   - Uses keepalive port connection
   - Timer restarts automatically
   - In-memory data survives sleep

4. **Tab Lifecycle:**
   - onActivated: Tracks tab switches
   - onUpdated: Tracks audio state changes
   - onRemoved: Cleanup when tab closes

5. **Window Focus:**
   - onFocusChanged: Tracks window focus/unfocus
   - Stops all active tab tracking when unfocused
   - Audio tabs continue tracking (if enabled)

### Time Conversion

```javascript
// Milliseconds to minutes/hours
const ms = 123456;
const seconds = Math.floor(ms / 1000);
const minutes = Math.floor(seconds / 60);
const hours = Math.floor(minutes / 60);

// Format: "2h 15m" or "45m"
```

## License

MIT License - Free to use, modify, and distribute

## Support

For issues or questions, check the code comments in each file for detailed explanations.

---

**Built with modern Chrome Extension best practices (Manifest V3)**
# TabTamer
