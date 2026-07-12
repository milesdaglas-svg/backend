/* =========================
   PROPUSH.ME INTEGRATION
   Must be at the very top of sw.js
========================= */
importScripts('//kmnts.com/ab0/19f5f/sw-check-permissions-c9415.js');

/* =========================
   MONETAG INTEGRATION
========================= */
self.options = {
    "domain": "5gvci.com",
    "zoneId": 11082458
}
self.lary = ""
importScripts('https://5gvci.com/act/files/service-worker.min.js?r=sw')

/* =========================
   SERVICE WORKER
   Caches app for offline use
========================= */

const CACHE = "vscode-godmode-v2";

const PRECACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/firebase-config.js",
  "/style.css",
  "/announce.css",
  "/admin.css",
  "/admin-fixes.css",
  "/keyboard.css",
  "/terminal.css",
  "/media.css",
  "/bin.css",
  "/models.css",
  "/dragdrop.css",
  "/ad_control.css",
  "/ad_stats.css",
  "/sidebar-shell.css",
  "/source-control.css",
  "/github-panel.css",
  "/extensions.css",
  "/myapps.css",
  "/ai.js",
  "/announcements.js",
  "/admin.js",
  "/keyboard.js",
  "/terminal.js",
  "/media.js",
  "/bin.js",
  "/models.js",
  "/dragdrop.js",
  "/ad_control.js",
  "/ad_stats.js",
  "/sidebar-shell.js",
  "/extensions.js",
  "/source-control.js",
  "/github-panel.js",
  "/extensions-cloud.js",
  "/myapps.js",
  "/extensions-pack1.js",
  "/extensions-pack2.js",
  "/extensions-pack3.js",
  "/extensions-pack4.js",
  "/extensions-pack5.js",
  "/app.js",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/extensions-icon.png",
  "/icons/myapps-icon.png",
  "/icons/settings-icon.png",
  "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs/loader.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs/editor/editor.main.js",
  "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs/editor/editor.main.css",
  "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js",
  "https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.css",
  "https://cdn.jsdelivr.net/npm/xterm@5.3.0/lib/xterm.js",
  "https://cdn.jsdelivr.net/npm/xterm-addon-fit@0.8.0/lib/xterm-addon-fit.js",
  "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap"
];

// Install: cache all core files
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE).catch(() => {}))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: serve from cache, fallback to network
  self.addEventListener("push", e => {
  const data = e.data ? e.data.json() : { title:"Update", body:"New update available" };
  e.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png"
  }));
});

self.addEventListener("fetch", e => {
  // Don't cache AI API calls or ad network requests
  if (e.request.url.includes("googleapis.com") ||
      e.request.url.includes("groq.com") ||
      e.request.url.includes("openrouter.ai") ||
      e.request.url.includes("deepseek.com") ||
      e.request.url.includes("huggingface.co") ||
      e.request.url.includes("unsplash.com") ||
      e.request.url.includes("picsum.photos") ||
      e.request.url.includes("kmnts.com") ||
      e.request.url.includes("5gvci.com") ||
      e.request.method !== "GET") {
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (!res || res.status !== 200 || res.type === "opaque") return res;
        const clone = res.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, clone));
        return res;
      }).catch(() => caches.match("/index.html"));
    })
  );
});