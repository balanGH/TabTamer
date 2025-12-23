# Quick Start Guide

## Load Extension in 3 Steps

### 1. Open Chrome Extensions Page
- Navigate to `chrome://extensions/`
- Or click the puzzle icon → Manage Extensions

### 2. Enable Developer Mode
- Toggle **Developer mode** switch in top-right corner

### 3. Load Extension
- Click **Load unpacked** button
- Select the `extension/` folder
- Done! Extension icon appears in toolbar

## Test It Out

### Basic Test (1 minute)
1. Click extension icon to open popup
2. Browse to any website (e.g., google.com)
3. Wait 10 seconds
4. Click extension icon again
5. See time tracked under "Today" tab

### Audio Tracking Test (2 minutes)
1. Open YouTube in a new tab
2. Play any video
3. Switch to a different tab (keep YouTube tab open)
4. Wait 30 seconds
5. Check extension - YouTube should be tracked!

### Analytics Test
1. Browse multiple websites for a few minutes
2. Open extension popup
3. Click "Week" tab - see bar chart
4. Click "Month" tab - see 30-day chart
5. Scroll down to see top sites list

## Features to Try

- ✅ **Toggle Audio Tracking**: Turn off to stop tracking background audio
- ✅ **Clear Session**: Reset all data (test the fresh start)
- ✅ **Multiple Audio Tabs**: Play audio in 2+ tabs, all tracked
- ✅ **Window Focus**: Minimize Chrome, tracking stops for active tab
- ✅ **Real-time Updates**: Popup refreshes every 2 seconds

## Troubleshooting

**Extension not loading?**
- Make sure all files are in the extension/ folder
- Check Developer mode is enabled
- Look for error messages in chrome://extensions/

**No data showing?**
- Browse a normal website (not chrome:// pages)
- Keep browser window focused
- Wait at least 10 seconds

**Service worker inactive?**
- This is normal for Manifest V3
- Extension auto-restarts when needed
- Your data is safe in memory

## Debug Console

To see background logs:
1. Go to `chrome://extensions/`
2. Find "Session Time Tracker"
3. Click "service worker" link
4. DevTools opens with console logs

## What Gets Tracked?

✅ **Tracked:**
- Active tab when window is focused
- Any tab playing audio (if enabled)
- Regular websites (http/https)

❌ **Not Tracked:**
- Chrome internal pages (chrome://)
- Extension pages
- New Tab page
- Browser when minimized/unfocused
- Muted tabs (even if playing media)

## Session Data

**Persists:**
- While Chrome is running
- Across tab closes
- Across extension reloads

**Resets:**
- When Chrome fully closes
- When clicking "Clear Session Data"

---

Enjoy tracking your browsing time!
