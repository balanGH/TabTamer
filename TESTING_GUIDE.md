# Testing Guide for TabTamer Time Tracker

## Pre-Installation Testing

### File Verification
- [ ] All files present in extension/ folder
- [ ] chart.min.js is 201KB
- [ ] Icons (16, 48, 128) are present
- [ ] manifest.json has correct structure

## Installation Testing

### Load Extension
- [ ] Loaded unpacked extension successfully
- [ ] No errors in chrome://extensions/
- [ ] Extension icon visible in toolbar
- [ ] Icon shows purple gradient clock

### Service Worker
- [ ] Service worker shows "active" status
- [ ] Click "service worker" link opens console
- [ ] No errors in service worker console

## Core Functionality Testing

### Active Tab Tracking

**Test 1: Basic Active Tab Tracking**
1. [ ] Open extension popup (should show 0m)
2. [ ] Open google.com in active tab
3. [ ] Wait 30 seconds (keep window focused)
4. [ ] Open popup again
5. [ ] Expected: google.com shows ~30s in "Today" tab

**Test 2: Tab Switching**
1. [ ] Open google.com in tab 1
2. [ ] Wait 20 seconds
3. [ ] Switch to tab 2 (youtube.com)
4. [ ] Wait 20 seconds
5. [ ] Check popup
6. [ ] Expected: google.com ~20s, youtube.com ~20s

**Test 3: Window Focus Loss**
1. [ ] Open google.com in active tab
2. [ ] Wait 10 seconds
3. [ ] Minimize Chrome window
4. [ ] Wait 20 seconds
5. [ ] Restore Chrome window
6. [ ] Check popup
7. [ ] Expected: google.com shows only ~10s (not 30s)

### Audio Tab Tracking

**Test 4: YouTube Background Audio**
1. [ ] Ensure "Track Audio Tabs" is enabled
2. [ ] Open YouTube, play a video
3. [ ] Switch to different tab (keep YouTube playing)
4. [ ] Wait 30 seconds
5. [ ] Check popup
6. [ ] Expected: YouTube tracked even in background

**Test 5: Multiple Audio Tabs**
1. [ ] Open YouTube in tab 1, play video
2. [ ] Open Spotify in tab 2, play music
3. [ ] Switch to tab 3 (different site)
4. [ ] Wait 30 seconds
5. [ ] Check popup
6. [ ] Expected: Both YouTube and Spotify tracked

**Test 6: Audio Toggle Off**
1. [ ] Open extension popup
2. [ ] Turn off "Track Audio Tabs" toggle
3. [ ] Open YouTube, play video
4. [ ] Switch to different tab
5. [ ] Wait 30 seconds
6. [ ] Check popup
7. [ ] Expected: YouTube NOT tracked in background

**Test 7: Muted Audio**
1. [ ] Open YouTube, play video
2. [ ] Mute the tab (right-click tab → Mute site)
3. [ ] Switch to different tab
4. [ ] Wait 30 seconds
5. [ ] Check popup
6. [ ] Expected: YouTube NOT tracked (muted = not audible)

**Test 8: Audio Stops**
1. [ ] Open YouTube, play video
2. [ ] Switch to different tab
3. [ ] Wait 20 seconds
4. [ ] Switch back to YouTube, pause video
5. [ ] Wait 20 seconds in different tab
6. [ ] Check popup
7. [ ] Expected: YouTube tracked for ~20s only (not 40s)

### Tab Lifecycle

**Test 9: Tab Close**
1. [ ] Open google.com
2. [ ] Wait 20 seconds
3. [ ] Close tab
4. [ ] Wait 20 seconds
5. [ ] Check popup
6. [ ] Expected: google.com shows only ~20s

**Test 10: Browser Restart**
1. [ ] Use extension, accumulate some data
2. [ ] Note total time tracked
3. [ ] Close Chrome completely
4. [ ] Reopen Chrome
5. [ ] Check extension popup
6. [ ] Expected: All data reset to 0

## UI Testing

### Popup Interface

**Test 11: Tab Switching**
- [ ] Click "Today" tab - shows today's data
- [ ] Click "Week" tab - shows weekly chart
- [ ] Click "Month" tab - shows monthly chart
- [ ] Active tab is highlighted in purple

**Test 12: Real-Time Updates**
1. [ ] Open popup
2. [ ] Keep popup open
3. [ ] Browse in another window/tab
4. [ ] Watch popup
5. [ ] Expected: Data updates every 2 seconds

**Test 13: Charts Display**
- [ ] Week chart shows 7 bars (Mon-Sun)
- [ ] Month chart shows 30 bars
- [ ] Bars have correct height (minutes)
- [ ] Hover shows tooltip with exact minutes

**Test 14: Top Sites List**
- [ ] Sites sorted by time (highest first)
- [ ] Shows up to 10 sites
- [ ] Each site shows domain initial in colored circle
- [ ] Time formatted correctly (e.g., "2h 15m" or "45m")

**Test 15: Empty States**
1. [ ] Clear session data
2. [ ] Check each tab
3. [ ] Expected: Shows "No data yet" message

### Settings & Controls

**Test 16: Audio Toggle**
- [ ] Toggle on - shows enabled state
- [ ] Toggle off - shows disabled state
- [ ] State persists when closing/reopening popup
- [ ] Actually stops/starts audio tracking

**Test 17: Clear Session**
1. [ ] Accumulate some tracking data
2. [ ] Click "Clear Session Data" button
3. [ ] Confirm dialog appears
4. [ ] Click "OK"
5. [ ] Expected: All data cleared immediately
6. [ ] All charts show empty/zero

**Test 18: Clear Session Cancel**
1. [ ] Accumulate some data
2. [ ] Click "Clear Session Data"
3. [ ] Click "Cancel" in dialog
4. [ ] Expected: Data NOT cleared

## Edge Cases

**Test 19: Chrome Internal Pages**
1. [ ] Open chrome://extensions/
2. [ ] Wait 30 seconds
3. [ ] Check popup
4. [ ] Expected: No time tracked for chrome:// pages

**Test 20: New Tab Page**
1. [ ] Open new tab (chrome://newtab/)
2. [ ] Wait 30 seconds
3. [ ] Check popup
4. [ ] Expected: No time tracked

**Test 21: Multiple Windows**
1. [ ] Open window 1 with google.com
2. [ ] Open window 2 with youtube.com
3. [ ] Focus window 1, wait 20 seconds
4. [ ] Focus window 2, wait 20 seconds
5. [ ] Check popup
6. [ ] Expected: google.com ~20s, youtube.com ~20s

**Test 22: Rapid Tab Switching**
1. [ ] Open 5 tabs with different sites
2. [ ] Rapidly switch between them (2s each)
3. [ ] Do this for 1 minute
4. [ ] Check popup
5. [ ] Expected: Each tab shows ~10-12 seconds

**Test 23: Long Session**
1. [ ] Open a website
2. [ ] Keep it active for 10+ minutes
3. [ ] Check popup periodically
4. [ ] Expected: Time increases correctly, no crashes

**Test 24: Many Sites**
1. [ ] Visit 20+ different websites
2. [ ] Spend time on each
3. [ ] Check popup
4. [ ] Expected: Top sites shows top 10, sorted correctly

## Analytics Testing

### Weekly Analytics

**Test 25: Week Chart Accuracy**
1. [ ] Track sites over multiple days (can't test in one session)
2. [ ] Or manually test: accumulate data today
3. [ ] Check "Week" tab
4. [ ] Expected: Today's bar shows correct minutes
5. [ ] Other days show 0 (or previous session data)

**Test 26: Week Chart Labels**
- [ ] X-axis shows Mon, Tue, Wed, Thu, Fri, Sat, Sun
- [ ] Days are in correct order
- [ ] Bars align with correct day

### Monthly Analytics

**Test 27: Month Chart**
- [ ] Shows 30 bars
- [ ] X-axis shows dates (MM/DD format)
- [ ] Today's date has data
- [ ] Dates are chronological

**Test 28: Time Formatting**
- [ ] Under 1 hour shows "Xm" (e.g., "45m")
- [ ] Over 1 hour shows "Xh Ym" (e.g., "2h 15m")
- [ ] Exactly 1 hour shows "1h"
- [ ] Exactly 2 hours shows "2h"

## Performance Testing

**Test 29: CPU Usage**
1. [ ] Open Chrome Task Manager (Shift+Esc)
2. [ ] Find "TabTamer Time Tracker" process
3. [ ] Browse normally for 5 minutes
4. [ ] Check CPU usage
5. [ ] Expected: Minimal CPU usage (<1%)

**Test 30: Memory Usage**
1. [ ] Open Chrome Task Manager
2. [ ] Note extension memory usage
3. [ ] Browse 50+ websites
4. [ ] Check memory again
5. [ ] Expected: Memory increases slightly but stays reasonable (<50MB)

**Test 31: Service Worker Sleep**
1. [ ] Load extension
2. [ ] Wait 30 seconds (don't use extension)
3. [ ] Service worker may show "inactive"
4. [ ] Open popup
5. [ ] Expected: Data still loads correctly, service worker reactivates

## Compatibility Testing

**Test 32: Chrome Version**
- [ ] Extension works on Chrome 88+
- [ ] No compatibility warnings
- [ ] All features functional

**Test 33: Different Screen Sizes**
- [ ] Popup displays correctly (450px width)
- [ ] Charts render properly
- [ ] No overflow or cutoff text
- [ ] Scrollbar appears if needed

## Security Testing

**Test 34: No Data Leakage**
1. [ ] Open Chrome DevTools → Network
2. [ ] Use extension for 5 minutes
3. [ ] Check network tab
4. [ ] Expected: No external requests from extension

**Test 35: Content Security Policy**
- [ ] No CSP errors in console
- [ ] Charts render correctly (Chart.js is local)
- [ ] No inline script violations

## Final Checks

- [ ] Extension icon looks good in toolbar
- [ ] No console errors during normal use
- [ ] Data persists while Chrome is open
- [ ] Data resets when Chrome closes
- [ ] All features work as documented
- [ ] UI is responsive and smooth
- [ ] No memory leaks after extended use

## Bug Report Template

If you find issues, report with:

```
**Issue:** Brief description
**Steps to Reproduce:**
1. Step one
2. Step two
3. Step three
**Expected:** What should happen
**Actual:** What actually happened
**Browser:** Chrome version
**Console Errors:** Any errors in console
**Screenshot:** If applicable
```

---

All tests passed? You have a production-ready extension!
