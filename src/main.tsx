import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

declare const __BUILD_ID__: string;

async function checkForUpdate() {
  try {
    const res = await fetch("/?_cb=" + Date.now(), {
      cache: "no-store",
      headers: { Accept: "text/html" },
    });
    if (!res.ok) return;
    const html = await res.text();
    const match = html.match(
      /<meta\s+name="wholefuel-build-id"\s+content="([^"]+)"/
    );
    if (match && match[1] !== __BUILD_ID__) {
      // New build detected – force a clean reload once
      const url = new URL(window.location.href);
      if (!url.searchParams.has("_updated")) {
        url.searchParams.set("_updated", match[1]);
        window.location.replace(url.toString());
        return; // stop rendering, page will reload
      }
    }
  } catch {
    // Network error – continue with current build
  }

  // Clean up the query param if present
  const url = new URL(window.location.href);
  if (url.searchParams.has("_updated")) {
    url.searchParams.delete("_updated");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }

  // Legacy cleanup: unregister any old service workers
  if ("serviceWorker" in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    regs.forEach((r) => r.unregister());
  }
  if ("caches" in window) {
    const keys = await caches.keys();
    keys.forEach((k) => caches.delete(k));
  }

  createRoot(document.getElementById("root")!).render(<App />);
}

checkForUpdate();
