import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const CACHE_RESET_KEY = "wholefuel-cache-reset-v1";

const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

async function clearStaleClientCaches() {
  const supportsServiceWorker = "serviceWorker" in navigator;
  const supportsCaches = "caches" in window;

  if (!supportsServiceWorker && !supportsCaches) {
    return;
  }

  let hadRegistrations = false;

  if (supportsServiceWorker) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    hadRegistrations = registrations.length > 0;

    await Promise.all(
      registrations.map((registration) => registration.unregister())
    );
  }

  if (supportsCaches) {
    const cacheKeys = await caches.keys();
    await Promise.all(cacheKeys.map((cacheKey) => caches.delete(cacheKey)));
  }

  const shouldForceRefresh =
    hadRegistrations &&
    !window.sessionStorage.getItem(CACHE_RESET_KEY) &&
    !isInIframe;

  if (shouldForceRefresh) {
    window.sessionStorage.setItem(CACHE_RESET_KEY, "true");
    window.location.reload();
  }
}

if (isInIframe || isPreviewHost || window.location.hostname === "wholefuel.lovable.app") {
  void clearStaleClientCaches();
}

createRoot(document.getElementById("root")!).render(<App />);
