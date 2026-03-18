# Deployment Guide for SecurePrintHub on Vercel

## Quick Deploy to Vercel

### Option 1: Automatic Deployment (Recommended)

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/secureprintub.git
   git push -u origin main
   ```

2. **Connect to Vercel**
   - Go to https://vercel.com/new
   - Import your GitHub repository
   - Select the `frontend` folder as the root directory
   - Click Deploy

3. **Configure Environment**
   - Vercel will automatically detect Vite and build settings
   - No environment variables needed for frontend-only deployment

### Option 2: Command Line Deploy

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd frontend
vercel

# For production
vercel --prod
```

## Mobile & Desktop Testing

### Desktop Testing
- Chrome DevTools: F12 → Device Toolbar
- Test viewport sizes: 1920×1080 (laptop), 1366×768 (tablet)
- Print Test: Ctrl+P / Cmd+P

### Mobile Testing
- **iOS**: Use Safari on actual iPhone/iPad
- **Android**: Use Chrome

#### Local Network Testing
```bash
# Your local machine
cd frontend
npm run dev

# Access from mobile on same WiFi
# Find your machine's IP: ipconfig getifaddr en0 (Mac) or ipconfig (Windows)
# Visit: http://192.168.x.x:5173
```

## Vercel URL & Domains

After deployment:
- **Vercel URL**: `https://secureprintub.vercel.app`
- **Custom Domain**: Add in Vercel project settings → Domains
  - Update DNS records with Vercel's nameservers
  - Or point CNAME to Vercel

## Security Headers (Pre-configured)

The `vercel.json` includes:
- X-Content-Type-Options: Prevents MIME type sniffing
- X-Frame-Options: Blocks clickjacking
- X-XSS-Protection: Enables XSS filter
- Referrer-Policy: Controls referrer info
- Permissions-Policy: Disables geolocation, microphone, camera access

## Performance Optimization

### Build Optimization
```bash
# Check bundle size
npm run build
# Output: frontend/dist

# Analyze build
npm install --save-dev vite-plugin-visualizer
```

### Caching Strategy (Set in vercel.json)
- HTML: Cache=0 (always fresh)
- Assets (/dist): Cache=31536000s (1 year)
- Service Worker: Cache=0

## Troubleshooting

### Issue: "Network timeout on mobile"
**Solution**: 
- Check WebRTC connectivity
- Verify STUN servers in p2p.js
- Test with different networks (4G, WiFi)

### Issue: "Print shows encrypted data"
**Solution**:
- Use the new `printHandler.js` utility
- Verify file MIME type detection
- Check browser print dialog settings

### Issue: "Passcode expires too quickly"
**Solution**:
- Passcode timeout: 150 seconds (2:30 min)
- Edit in `crypto.js`: `maxAgeMs = 150000`
- Increase for slower networks

### Issue: "Videos not loading"
**Solution**:
- Add video files to `/frontend/public/`
- Verify video codec compatibility
- Check CORS headers

## Progressive Web App (PWA)

SecurePrintHub is installable as a PWA:

1. **iOS**: Share → Add to Home Screen
2. **Android**: Menu → Install App
3. **Desktop**: URL bar icon or Menu → Install

### Features after installation:
- ✅ Home screen icon
- ✅ Standalone app experience
- ✅ Works offline (partial - crypto loads from cache)
- ✅ Custom splash screen

## Monitoring & Analytics

### Add Google Analytics (optional)
```bash
npm install react-google-analytics-4

# Update App.jsx
import { GA4React } from "react-google-analytics-4";

// In your app init
const ga4 = new GA4React({ measurmentId: "G-XXXXXXXXXX" });
```

### Vercel Analytics
- Dashboard: https://vercel.com/[username]/secureprintub
- Real-time logs and performance metrics
- Error tracking

## Scaling Notes

- **Current**: Frontend-only, P2P architecture (no server strain)
- **Future**: Add backend servers at `api.yourdomain.com`
- **Database**: MongoDB for encrypted file storage
- **Storage**: S3-compatible object storage for encrypted blobs

## Support & Issues

- File issues: https://github.com/yourusername/secureprintub/issues
- Security concerns: [contact info]
- Performance: Monitor Vercel analytics dashboard
