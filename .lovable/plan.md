

## Add PWA Support for Android Installation

### Overview
Make the app installable as a Progressive Web App (PWA) on Android devices by adding `vite-plugin-pwa` with a proper manifest and service worker.

### Changes

**1. Install dependency**
- `vite-plugin-pwa`

**2. Configure PWA plugin (`vite.config.ts`)**
- Add `VitePWA()` plugin with:
  - `registerType: 'autoUpdate'`
  - Manifest with app name "Whole", theme color, icons, display: standalone
  - Workbox config with `navigateFallbackDenylist: [/^\/~oauth/]` to avoid caching auth redirects
  - Runtime caching for API calls

**3. Add PWA icons (`public/`)**
- Create `pwa-192x192.png` and `pwa-512x512.png` placeholder icons (simple colored squares with "W" letter, or use the existing favicon as a base)

**4. Update `index.html`**
- Add mobile-optimized meta tags:
  - `<meta name="theme-color" content="...">`
  - `<link rel="apple-touch-icon" href="/pwa-192x192.png">`
  - `<meta name="mobile-web-app-capable" content="yes">`

**5. No separate manifest.json file needed**
- `vite-plugin-pwa` auto-generates and injects the manifest from the Vite config, so no manual `manifest.json` is required.

### Result
After visiting the app on Android Chrome, users will see the "Add to Home Screen" / "Install app" prompt. The app will launch in standalone mode (no browser chrome) and work offline for cached pages.

