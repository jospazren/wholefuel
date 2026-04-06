import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const CACHE_RESET_KEY = "wholefuel-cache-reset-v2";

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

  if (hadRegistrations && !sessionStorage.getItem(CACHE_RESET_KEY)) {
    sessionStorage.setItem(CACHE_RESET_KEY, "true");
    window.location.reload();
  }
}

// Always run cache cleanup on every page load
void clearStaleClientCaches();

createRoot(document.getElementById("root")!).render(<App />);
