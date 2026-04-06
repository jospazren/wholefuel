
Goal: fix the real issue on the published site so new frontend builds appear on normal refresh, without requiring a hard refresh.

What I think is happening:
- This no longer looks like a mobile-only problem.
- Hard refresh fixes browser HTTP caching; the current `main.tsx` logic only clears service workers / Cache Storage.
- So the app is likely loading an older cached HTML/app shell on normal refresh, and the current cache cleanup does not detect that.

Plan:
1. Replace the current “clear SW caches on load” strategy with a build-version check.
   - Keep the app focused on detecting stale published builds, not just service workers.

2. Add a unique build ID at build time in `vite.config.ts`.
   - Inject the same build ID into:
     - a global JS constant for the running app
     - a `<meta>` tag in the built HTML
   - This gives the app a reliable “current build” marker.

3. On startup in `src/main.tsx`, fetch the latest HTML with `cache: "no-store"`.
   - Parse the returned HTML.
   - Read the latest build ID from the meta tag.
   - Compare it with the currently running build ID.

4. If the fetched build ID is newer than the running one, force a one-time navigation to the fresh build.
   - Use a guarded reload/redirect so it does not loop.
   - Add a temporary cache-busting query param for that one refresh if needed.
   - After the new app loads, clean up that query param from the URL.

5. Remove or simplify the current cache-reset logic.
   - The existing service-worker/cache cleanup is not solving the “hard refresh on Mac” problem.
   - Keep only minimal fallback cleanup if needed, but make version detection the primary fix.

Technical details:
- `vite.config.ts`
  - Generate `buildId` once per build.
  - Expose it to app code.
  - Inject `<meta name="wholefuel-build-id" ...>` into HTML.
- `src/main.tsx`
  - Before rendering, fetch fresh HTML from the current route/root with `no-store`.
  - Compare remote build ID vs local build ID.
  - If mismatched, do a guarded one-time refresh to the new build.
  - If the check fails, continue rendering normally so the app never blocks.
- Likely no change needed in `index.html` besides the injected meta.

Expected result:
- After each publish, a normal refresh should pick up the latest build automatically.
- No hard refresh should be needed on Mac.
- The same fix should also improve “stale app” behavior on phones because it targets published-build freshness directly.

Validation:
- Publish a frontend change.
- Open the published site on Mac in a normal tab.
- Refresh normally and confirm the new UI appears without Cmd+Shift+R.
- Then verify the same on mobile/home-screen entry if needed.
