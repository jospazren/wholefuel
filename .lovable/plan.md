

## Fix: Android Home Screen App Showing Stale Version

### Root Cause

The app was previously set up as a PWA with `vite-plugin-pwa`, which registered a service worker and cached assets. Although the PWA plugin was later removed from the Vite config, three things remain that keep the installed home-screen app stuck on an old build:

1. **`vite-plugin-pwa` is still in `package.json`** -- it should be fully removed
2. **PWA meta tags in `index.html`** (`mobile-web-app-capable`, `apple-mobile-web-app-capable`) tell Android to treat the app as standalone, which can aggressively cache the initial shell
3. **A stale service worker** may still be registered on the phone from the original PWA install. The current cache-clearing logic in `main.tsx` only does a forced reload if it finds active registrations AND a session flag hasn't been set -- meaning after the first successful clear, subsequent visits skip the reload even if stale content persists

The combined effect: the home-screen shortcut launches the app in standalone mode with a cached old build, and the cleanup code doesn't re-trigger.

### Plan

**1. Remove `vite-plugin-pwa` dependency from `package.json`**
- Delete the `"vite-plugin-pwa": "^1.2.0"` line

**2. Clean up `index.html`**
- Remove `<link rel="apple-touch-icon" href="/pwa-192x192.png">`
- Remove `<meta name="mobile-web-app-capable" content="yes">`
- Remove `<meta name="apple-mobile-web-app-capable" content="yes">`
- Remove `<meta name="apple-mobile-web-app-status-bar-style" content="default">`
- Keep the `theme-color` meta (harmless, good for browser chrome)

**3. Harden the cache-busting in `main.tsx`**
- Always attempt to unregister service workers and clear caches on every page load (not gated behind `isPreviewHost` or iframe checks)
- Remove the `sessionStorage` guard so the cleanup runs every time until there are truly no stale workers or caches
- After clearing, use a versioned cache-bust key (e.g. `wholefuel-cache-reset-v2`) so existing installs with the old key re-trigger the cleanup

**4. Publish the updated version**
- After publishing, the user will need to open the home-screen app once. The cleanup code will unregister the old service worker and clear caches, then reload with the latest build.
- If the home-screen app still shows the old version after one open, the user should uninstall the app from their home screen and re-add it from Chrome.

### What the User Needs to Do After Publishing

Open the home-screen app once -- it should auto-refresh with the latest version. If it still looks old, remove the shortcut from the home screen and add it fresh from Chrome (Menu > Add to Home Screen).

