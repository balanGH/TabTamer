# Session ( Time Tracker ) - Documentation Index

Welcome! This index helps you navigate all documentation files.

## Getting Started (Start Here!)

### 1. Quick Installation
**File:** `QUICK_START.md` (2 KB)
- 3-step installation guide
- Basic testing instructions
- Feature overview
- Quick troubleshooting

**Read this first if you want to start using the extension immediately.**

### 2. Complete Documentation
**File:** `README.md` (8.3 KB)
- Full feature list
- How it works (detailed)
- Storage architecture
- Edge case handling
- Customization guide
- Troubleshooting

**Read this for complete understanding of the extension.**

### 3. Testing & Validation
**File:** `TESTING_GUIDE.md` (10.5 KB)
- 35 detailed test cases
- Performance testing
- Security testing
- Bug report template

**Read this if you want to thoroughly test the extension.**

### 4. Project Overview
**File:** `PROJECT_SUMMARY.md` (13 KB)
- High-level architecture
- Implementation details
- Code statistics
- Design decisions
- Known limitations

**Read this if you're interested in technical details.**

## File Reference

### Core Extension Files

| File | Size | Purpose |
|------|------|---------|
| `manifest.json` | 27 lines | Extension configuration (MV3) |
| `background.js` | 220 lines | Time tracking service worker |
| `popup.html` | 72 lines | Extension popup structure |
| `popup.css` | 296 lines | Modern UI styling |
| `popup.js` | 337 lines | UI logic and analytics |
| `chart.min.js` | 201 KB | Chart.js library (local) |

### Asset Files

| File | Size | Purpose |
|------|------|---------|
| `icon16.png` | 198 bytes | Toolbar icon (16x16) |
| `icon48.png` | 467 bytes | Extension icon (48x48) |
| `icon128.png` | 1199 bytes | Store icon (128x128) |

### Helper Files

| File | Purpose |
|------|---------|
| `create-icons.html` | HTML-based icon generator |
| `generate_icons.py` | Python icon generator (used) |

## Quick Reference

### Installation
```
1. Navigate to chrome://extensions/
2. Enable Developer mode
3. Click "Load unpacked"
4. Select extension/ folder
```

### Testing
```
1. Open any website
2. Wait 10 seconds
3. Click extension icon
4. See time tracked
```

### Troubleshooting
```
1. Check chrome://extensions/ for errors
2. Click "service worker" to see console
3. Verify Developer mode is enabled
4. Reload extension if needed
```

## Documentation Map

```
├── INDEX.md (this file)
│   └── Navigation hub for all docs
│
├── QUICK_START.md
│   ├── Installation (3 steps)
│   ├── Basic testing
│   └── Quick troubleshooting
│
├── README.md
│   ├── Features overview
│   ├── How it works
│   ├── Storage architecture
│   ├── Edge cases
│   ├── Customization
│   └── Full troubleshooting
│
├── TESTING_GUIDE.md
│   ├── Installation testing (5 tests)
│   ├── Core functionality (10 tests)
│   ├── UI testing (8 tests)
│   ├── Edge cases (8 tests)
│   ├── Analytics (4 tests)
│   └── Performance (3 tests)
│
└── PROJECT_SUMMARY.md
    ├── Architecture overview
    ├── Implementation details
    ├── Code statistics
    ├── Design decisions
    └── Known limitations
```

## Common Tasks

### I want to install the extension
→ Read: `QUICK_START.md`

### I want to understand how it works
→ Read: `README.md` (How It Works section)

### I want to test all features
→ Read: `TESTING_GUIDE.md`

### I want to customize the code
→ Read: `README.md` (Customization section)

### I want technical details
→ Read: `PROJECT_SUMMARY.md`

### I found a bug
→ Read: `TESTING_GUIDE.md` (Bug Report Template)

### Extension not working
→ Read: `QUICK_START.md` (Troubleshooting)

## Key Features Summary

✅ Session-based storage (resets when Chrome closes)
✅ Active tab tracking (only when focused)
✅ Audio tab tracking (background YouTube, Spotify, etc.)
✅ Weekly & monthly analytics with charts
✅ Top sites list sorted by time
✅ Toggle for audio tracking
✅ Real-time updates every 2 seconds
✅ Modern, clean UI design
✅ Manifest V3 compliant
✅ Privacy-focused (no external requests)

## Support

**Questions?** Check the documentation files above.
**Bugs?** Use the bug report template in `TESTING_GUIDE.md`.
**Customization?** See customization section in `README.md`.

## File Size Summary

- **Documentation:** 34 KB (4 markdown files)
- **Code:** 1,040 lines (5 code files)
- **Assets:** 201 KB (Chart.js + 3 icons)
- **Total:** ~275 KB complete extension

---

**Next Step:** Read `QUICK_START.md` to install in 2 minutes!
