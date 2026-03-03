# Quick Start Guide – TabTamer Chrome Extension

## Load Extension in 3 Steps

### 1. Open Chrome Extensions Page

* Navigate to `chrome://extensions/`
* Or click the puzzle icon → **Manage Extensions**

### 2. Enable Developer Mode

* Toggle **Developer mode** switch in the top-right corner

### 3. Load Extension

* Click **Load unpacked**
* Select the `extension/` folder
* ✅ Done! Extension icon appears in the toolbar

---

## Test It Out

### Basic Time Tracking Test (~1 min)

1. Click the extension icon to open the popup
2. Browse to any website (e.g., `google.com`)
3. Wait 10 seconds
4. Click the extension icon again
5. ✅ Time tracked appears under the **Today** tab

### Element Blocker Test (~2 min)

1. Click the ⛶ button in the popup
2. Popup closes automatically
3. Hover over any element on the webpage
4. ✅ Element highlights with a gray dotted outline
5. Click an element to temporarily hide it
6. ✅ Confirmation box appears in the top-right corner
7. Click **Block** to permanently hide the element
8. Reload the page – blocked element stays hidden

### Audio Tracking Test (~2 min)

1. Open YouTube in a new tab
2. Play any video
3. Switch to a different tab (leave YouTube tab open)
4. Wait 30 seconds
5. ✅ Extension tracks YouTube even in background

### Analytics Test

1. Browse multiple websites for a few minutes
2. Open the extension popup
3. Click **Week** tab → see weekly bar chart
4. Click **Month** tab → see 30-day chart
5. Scroll down → see top sites list

---

## Features to Try

* ✅ **Element Blocker**: Click ⛶ → hover → click to block
* ✅ **Toggle Audio Tracking**: Stop tracking background tabs
* ✅ **Dark Mode**: Toggle with ☀ / ⏾ button
* ✅ **Clear Session**: Reset session time tracking data
* ✅ **Multiple Audio Tabs**: Tracks all audio tabs simultaneously
* ✅ **Window Focus Awareness**: Pauses active tab tracking when minimized

---

## Troubleshooting

### Element Blocker Not Working?

* Ensure you are on a regular website (not `chrome://` or `edge://`)
* Verify `contentScript.js` is loaded (F12 → Console)
* Reload page and click ⛶ again
* Extension cannot block elements on browser internal pages

### Extension Not Tracking?

* Check toolbar icon presence
* Open popup → ensure **Track Audio Tabs** is enabled
* Open Chrome DevTools → **Background page** → check console logs
* Reload extension: `chrome://extensions/` → **Reload** button

### Confirmation Box Not Appearing?

* Popup closes automatically – confirmation appears on webpage
* Look in top-right corner
* If missing, check DevTools console for errors

---

## Debug Console

To see background logs:

1. Go to `chrome://extensions/`
2. Find **TabTamer**
3. Click **service worker** link
4. DevTools opens → view console logs

---

## What Gets Tracked?

**✅ Tracked:**

* Active tab (window focused)
* Any tab playing audio (if enabled)
* Regular websites (http/https)
* Saved element block rules

**❌ Not Tracked:**

* Chrome internal pages (`chrome://`)
* Extension pages
* New Tab page
* Minimized or unfocused browser
* Muted tabs (even if media playing)

---

## Session Data

**Persists Across Sessions:**

* Element block rules (manually saved)
* Site time limits
* Dark mode preference

**Resets:**

* Time tracking data when Chrome closes
* Time tracking data when clicking **Clear Session Data**

---

✅ Enjoy tracking and taming your browsing experience with TabTamer!
