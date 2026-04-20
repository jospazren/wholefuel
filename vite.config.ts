import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

const buildId = Date.now().toString(36);

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  define: {
    __BUILD_ID__: JSON.stringify(buildId),
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    {
      name: "inject-build-id",
      transformIndexHtml(html: string) {
        return html.replace(
          "</head>",
          `<meta name="wholefuel-build-id" content="${buildId}">\n  </head>`
        );
      },
    },
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      // Never run the SW in dev or in the Lovable preview iframe
      devOptions: {
        enabled: false,
      },
      manifest: false, // We ship our own /manifest.webmanifest in /public
      workbox: {
        // CRITICAL: never serve a cached HTML shell — always go to the network.
        // This is what prevents the "stale app on phone" problem we had before.
        navigateFallback: null,
        // Don't precache HTML — only hashed JS/CSS/assets.
        globPatterns: ["**/*.{js,css,woff,woff2,ttf,otf,png,jpg,jpeg,svg,webp,ico}"],
        // Take control immediately on new build
        clientsClaim: true,
        skipWaiting: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // HTML / navigation requests: ALWAYS network. No cache fallback.
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkOnly",
          },
          {
            // OAuth callback must never be intercepted
            urlPattern: /\/~oauth/,
            handler: "NetworkOnly",
          },
          {
            // Supabase API calls: always network
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkOnly",
          },
          {
            // Static assets (hashed) — safe to cache
            urlPattern: ({ request }) =>
              ["style", "script", "worker", "font", "image"].includes(request.destination),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "wholefuel-assets",
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
