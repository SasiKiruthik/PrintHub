# Cross-Device Compatibility & Testing Guide

## Device Testing Matrix

### Desktop Browsers
- ✅ Chrome 120+ (Recommended)
- ✅ Firefox 121+
- ✅ Safari 17+ (macOS)
- ✅ Edge 120+

### Mobile Browsers
- ✅ Chrome Android 120+
- ✅ Safari iOS 17+
- ✅ Firefox Mobile
- ✅ Samsung Internet

### Tablets
- ✅ iPad (11-inch, 12.9-inch)
- ✅ Android Tablets 10+
- ✅ Windows Tablets (with Edge)

## Screen Size Testing

### Critical Breakpoints
```
Mobile Phones:      320px - 480px   (Portrait)
Tablets:            480px - 1024px  (Portrait & Landscape)
Laptops:            1024px - 1920px
Desktops:           1920px+
```

### Test Scenarios

#### 1. **Mobile Phone (iPhone 12 / 375px)**
```
Test Content:
✓ Header fits without overflow
✓ Buttons are 44px min height (accessibility)
✓ Input fields have 16px font (prevents zoom)
✓ Video aspect ratio 16:9 displayed properly
✓ Forms stack vertically
✓ Textarea scrollable without page scroll
✓ Print dialog accessible
✓ No horizontal scroll
```

#### 2. **Tablet Landscape (iPad / 1024px)**
```
Test Content:
✓ Two-column layout where applicable
✓ Buttons accessible with 44px spacing
✓ Video displays full width
✓ Forms side-by-side if space allows
✓ Print preview fits screen
```

#### 3. **Desktop (1920px)**
```
Test Content:
✓ Max-width containers (80rem) centered
✓ Multiple columns visible
✓ Hover effects on buttons
✓ Sidebars visible
✓ Print layout optimized
```

## Feature Testing Checklist

### Classroom Environment
- [ ] WiFi connection stable
- [ ] Students can upload PDFs, images, text files
- [ ] Shop can receive encrypted data
- [ ] Print dialog opens without errors
- [ ] Mobile hotspot works (tether to phone)

### Encryption/Decryption
- [ ] Files decrypt correctly (cross-browser)
- [ ] SHA-256 hash verification works
- [ ] Passcodes expire after 2m 30s
- [ ] No plaintext cached in browser
- [ ] Memory properly zeroed after print

### Print Functionality
- [ ] **PDF**: Prints correctly with all pages
- [ ] **Text (.txt)**: Formatted readably
- [ ] **Word (.docx)**: Shows office warning, download option
- [ ] **Images (.jpg/.png)**: Scales properly
- [ ] **HTML files**: Loads and prints content
- [ ] Print quality: Dark text, no encrypted data visible

### WebRTC P2P Connectivity
- [ ] Offer/Answer exchange works
- [ ] ICE candidates gathered
- [ ] DataChannel opens within 15s
- [ ] Large files (50MB+) transfer without timeout
- [ ] Connection survives brief network interruptions
- [ ] Graceful reconnection possible

## Network Conditions Testing

### Test with Network Throttling
Chrome DevTools → Network tab → Throttling

```
Test Conditions:
1. Fast 4G (2-3 Mbps)
2. 4G (1-2 Mbps)
3. 3G (0.5-1 Mbps)
4. Poor Network (2G, <100kbps)
```

Expected Results:
- ✅ App loads (may be slow on 2G)
- ✅ WebRTC establishes connection
- ✅ File transfer succeeds (with progress indication)
- ✅ UI responsive (chunked transfer provides feedback)

## Browser Compatibility Details

### Web Crypto API Support
All tested browsers support:
- ✅ AES-256-GCM encryption
- ✅ SHA-256 hashing
- ✅ PBKDF2 key derivation
- ✅ Random value generation

### WebRTC Support
All tested browsers support:
- ✅ RTCPeerConnection
- ✅ RTCDataChannel
- ✅ STUN servers
- ✅ SDP offer/answer exchange

### Local Storage
- ✅ IndexedDB (future caching)
- ✅ sessionStorage (temporary)
- ⚠️ localStorage (not recommended for sensitive data)

## Print Testing

### Print Quality Verification
1. Print a test document to PDF
2. Verify:
   - [ ] Encrypted data NOT visible
   - [ ] Decrypted content readable
   - [ ] Formatting preserved
   - [ ] Images scale properly
   - [ ] No truncated text

### Printer Compatibility
Tested and working with:
- ✅ HP LaserJet
- ✅ Canon inkjet
- ✅ Brother laser
- ✅ PDF printer (Save as PDF)
- ✅ Microsoft Print to PDF
- ✅ Print to file

## Accessibility Testing

### Screen Readers
Test with:
- NVDA (Windows)
- JAWS (Windows, paid)
- VoiceOver (macOS/iOS)
- TalkBack (Android)

### Keyboard Navigation
- [ ] All buttons focusable with Tab
- [ ] Enter/Space activates buttons
- [ ] No keyboard traps
- [ ] Focus indicator visible

### Color Contrast
- [ ] WCAG AA compliance (4.5:1 text contrast)
- [ ] No color-only information
- [ ] Text resizable (Ctrl+/Ctrl-)

## Performance Metrics

### Lighthouse Scores (Target)
- Performance: 90+
- Accessibility: 90+
- Best Practices: 90+
- SEO: 90+

### Load Times
- First Contentful Paint (FCP): < 2.5s
- Largest Contentful Paint (LCP): < 4s
- Cumulative Layout Shift (CLS): < 0.1

### Test with Lighthouse
Chrome DevTools → Lighthouse → Generate Report

## Security Testing

### SSL/TLS
- [ ] HTTPS enforced (Vercel default)
- [ ] Certificate valid and trusted
- [ ] No mixed content warnings

### CSP Headers
- [ ] Content Security Policy set
- [ ] No inline scripts allowed (except style)
- [ ] External resources whitelisted

### XSS Protection
- [ ] HTML entity encoding
- [ ] No eval() or innerHTML with user input
- [ ] Paste functionality safe

## Regression Testing Checklist

After each update, verify:
- [ ] Upload page loads
- [ ] Can generate passcode
- [ ] WebRTC connection establishes
- [ ] File encryption works
- [ ] File transfer completes
- [ ] Shop can receive file
- [ ] Decryption works correctly
- [ ] Print dialog opens
- [ ] Print produces correct output
- [ ] Mobile layout doesn't break
- [ ] No console errors

## Quick Local Testing Commands

```bash
# Install dependencies
cd frontend
npm install

# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Test on mobile (same network)
# 1. Find local IP: ipconfig getifaddr en0 (Mac)
# 2. Visit http://YOUR_IP:5173 on phone
```

## Reporting Issues

When reporting a bug, include:
- Device (iPhone 12, Samsung Galaxy S21, etc.)
- Browser (Chrome 120, Safari 17, etc.)
- OS (iOS 17, Android 13, etc.)
- Network (WiFi, 4G, etc.)
- Screenshot or screen recording
- Console errors (F12 → Console tab)
- Steps to reproduce

## Device Lab Recommendations

For comprehensive testing, use:
1. **BrowserStack** (cloud testing, multiple devices)
2. **Sauce Labs** (enterprise testing)
3. **Real Device Lab** (physical devices)
4. **Chrome DevTools** (free chrome simulation)

## Success Criteria

✅ App functions on:
- 3 mobile phones (iOS + Android)
- 2 tablets (iPad + Android)
- 3 desktop browsers (Chrome, Firefox, Safari)
- 2 network conditions (WiFi, 4G)
- Mobile hotspot (P2P with network sharing)

✅ Print output:
- Shows decrypted content only
- Quality matches original file
- All pages included
- Formatting preserved

✅ Performance:
- Loads in < 5 seconds
- P2P connection < 10 seconds
- File transfer < 30 seconds (typical file)
- Print dialog opens immediately

---

**Last Updated**: March 2026
**Tested By**: Development Team
