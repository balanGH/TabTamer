# Testing Guide – TabTamer (Time Tracker & Element Blocker)

<details>
<summary>📂 Pre-Installation Testing</summary>

### File Verification

* [ ] All files present in `extension/` folder (24 files)
* [ ] `chart.min.js` is 201KB
* [ ] Icons (16, 48, 128) are present
* [ ] `manifest.json` has correct structure
* [ ] `contentScript.js` exists (for Element Blocker)

</details>

<details>
<summary>🛠 Installation Testing</summary>

### Load Extension

* [ ] Loaded unpacked extension successfully
* [ ] No errors in `chrome://extensions/`
* [ ] Extension icon visible in toolbar (purple gradient clock)

### Service Worker

* [ ] Service worker shows "active" status
* [ ] Click "service worker" link opens console
* [ ] No errors in service worker console

</details>

<details>
<summary>🖱 Element Blocker Testing</summary>

#### Test 1: Element Picker Activation

* [ ] Click ⛶ button in popup
* [ ] Popup closes automatically
* [ ] Hover over webpage elements → elements highlight with gray dotted outline
* [ ] Cursor changes to crosshair

#### Test 2: Element Selection

* [ ] Activate picker (click ⛶)
* [ ] Hover over an image or button → click the element
* [ ] Element temporarily disappears
* [ ] Confirmation box appears in top-right corner

#### Test 3: Confirmation Box UI

* [ ] Shows domain name
* [ ] Shows CSS selector
* [ ] Has "Block" and "Cancel" buttons
* [ ] Purple "Block" button, gray "Cancel" button

#### Test 4: Block Element

* [ ] Select an element → click "Block"
* [ ] Element stays hidden
* [ ] Reload page → element still hidden

#### Test 5: Cancel Block

* [ ] Select an element → click "Cancel"
* [ ] Element reappears immediately
* [ ] Reload page → element visible

#### Test 6: ESC Key Cancel

* [ ] Activate picker → hover → press ESC
* [ ] Picker deactivates
* [ ] No element hidden

#### Test 7: Auto-Cancel Timeout

* [ ] Select element → wait 10s without action
* [ ] Confirmation box disappears
* [ ] Element reappears → block rule not saved

#### Test 8: Multiple Elements Blocking

* [ ] Block 3 elements → reload page → all hidden
* [ ] Settings page shows all 3 rules under domain

#### Test 9: Dynamic Content (YouTube)

* [ ] Block shorts/recommendations → scroll/navigate → elements remain hidden
* [ ] New dynamic content checked automatically

#### Test 10: Invalid Pages

* [ ] Go to `chrome://extensions/` → click ⛶
* [ ] Alert shown → picker does not activate

#### Test 11: Double-Click Protection

* [ ] Quickly double-click ⛶
* [ ] Picker activates only once
* [ ] No console errors

#### Test 12: Dark Mode in Confirmation Box

* [ ] Enable dark mode → block element
* [ ] Confirmation box uses dark theme
* [ ] Cancel button is dark gray

#### Test 13: Settings Page – View Block Rules

* [ ] Block elements across domains
* [ ] Open settings → see all domains and selectors

</details>

<details>
<summary>⏱ Core Time Tracking Testing</summary>

#### Test 14: Basic Active Tab Tracking

* [ ] Open popup → 0m
* [ ] Open `google.com` → wait 30s → popup shows ~30s

#### Test 15: Tab Switching

* [ ] Open google.com (tab 1) → wait 20s
* [ ] Switch to youtube.com (tab 2) → wait 20s
* [ ] Popup shows google.com ~20s, youtube.com ~20s

#### Test 16: Window Focus Loss

* [ ] Open google.com → wait 10s
* [ ] Minimize Chrome → wait 20s
* [ ] Restore → popup shows only ~10s

#### Test 17: YouTube Background Audio

* [ ] "Track Audio Tabs" enabled → play YouTube → switch tab → wait 30s
* [ ] YouTube tracked in background

#### Test 18: Multiple Audio Tabs

* [ ] Play YouTube + Spotify → switch tabs → wait 30s
* [ ] Both tracked

#### Test 19: Audio Toggle Off

* [ ] Disable "Track Audio Tabs" → play YouTube → switch tabs
* [ ] YouTube not tracked

</details>

<details>
<summary>🎨 UI Testing</summary>

#### Test 20: Tab Switching

* [ ] Today tab → shows today’s data
* [ ] Week tab → weekly chart
* [ ] Month tab → monthly chart
* [ ] Active tab highlighted

#### Test 21: Real-Time Updates

* [ ] Open popup → browse → data updates every 2s

#### Test 22: Charts Display

* [ ] Week chart → 7 bars (Mon-Sun)
* [ ] Month chart → 30 bars
* [ ] Hover shows tooltip with exact minutes

#### Test 23: Top Sites List

* [ ] Sorted by time (highest first, up to 10 sites)
* [ ] Each site shows favicon and formatted time

#### Test 24: Dark Mode

* [ ] Toggle dark mode → popup and confirmation boxes match theme
* [ ] Preference persists

#### Test 25: Clear Session

* [ ] Accumulate time → click "Clear Session Data" → confirm
* [ ] All time data cleared immediately

</details>

<details>
<summary>⚡ Edge Cases</summary>

#### Test 26: Chrome Internal Pages

* [ ] Open `chrome://extensions/` → 30s → no time tracked

#### Test 27: New Tab Page

* [ ] Open `chrome://newtab/` → 30s → no time tracked

#### Test 28: Multiple Windows

* [ ] Window 1: google.com → 20s
* [ ] Window 2: youtube.com → 20s
* [ ] Popup shows correct times

#### Test 29: Rapid Tab Switching

* [ ] 5 tabs → switch every 2s → 1 min
* [ ] Each tab shows ~10–12s

#### Test 30: Browser Restart

* [ ] Accumulate data → close Chrome → reopen
* [ ] Time resets → element block rules persist

</details>

<details>
<summary>⚙ Performance Testing</summary>

#### Test 31: CPU Usage

* [ ] Open Chrome Task Manager → check TabTamer CPU <1% after 5 min browsing

#### Test 32: Memory Usage

* [ ] Check memory before → after blocking 20+ elements → should stay <50MB

#### Test 33: Service Worker Sleep

* [ ] Load extension → wait 30s → popup still shows correct data

</details>

<details>
<summary>🔒 Security Testing</summary>

#### Test 34: No Data Leakage

* [ ] DevTools → Network → use extension 5 min
* [ ] No external requests

#### Test 35: URL Validation

* [ ] Attempt to block element on `chrome://extensions/` → alert shown, picker inactive
* [ ] Picker works on regular website

</details>

<details>
<summary>✅ Final Checks</summary>

* [ ] Extension icon looks correct in toolbar
* [ ] No console errors during normal use
* [ ] Time data persists while Chrome is open
* [ ] Time data resets when Chrome closes
* [ ] Element block rules persist after Chrome restart
* [ ] Dark mode preference persists
* [ ] All features work as documented
* [ ] UI responsive and smooth
* [ ] No memory leaks after extended use

</details>

<details>
<summary>🐞 Bug Report Template</summary>

**Issue:** Brief description
**Type:** [ ] Time tracking [ ] Element blocker [ ] UI [ ] Other
**Steps to Reproduce:**

1. Step one
2. Step two
3. Step three

**Expected:** What should happen
**Actual:** What actually happened
**Browser:** Chrome version
**Console Errors:** Any errors
**Screenshot:** If applicable

---

All tests passed → 🎉 You have a production-ready extension!

</details>
