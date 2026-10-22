/* Blip service worker: app shell, last-viewed menu for offline reading, and push. */
const VERSION = "v1";
const SHELL = `blip-shell-${VERSION}`;
const PAGES = `blip-pages-${VERSION}`;
const ASSETS = `blip-assets-${VERSION}`;
const READ_ONLY_PAGES = ["/", "/menu"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll(["/offline"])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => ![SHELL, PAGES, ASSETS].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  // Static files: cache first.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/banners/") || /\.(?:png|svg|jpg|webp|woff2)$/.test(url.pathname)) {
    event.respondWith(
      caches.open(ASSETS).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  // Pages: network first. Home and Menu are kept for offline, read-only browsing.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && READ_ONLY_PAGES.includes(url.pathname)) {
            const copy = res.clone();
            caches.open(PAGES).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(async () => (await caches.match(req)) ?? (await caches.match("/offline")) ?? Response.error()),
    );
  }
});

self.addEventListener("push", (event) => {
  let data = { title: "Blip", body: "Your order was updated.", url: "/orders" };
  try {
    data = { ...data, ...event.data.json() };
  } catch (e) {
    /* plain text payload */
  }
  event.waitUntil(self.registration.showNotification(data.title, { body: data.body, icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", data: { url: data.url }, tag: data.url }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/orders";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      const open = wins.find((w) => new URL(w.url).origin === self.location.origin);
      return open ? open.navigate(target).then((w) => w && w.focus()) : self.clients.openWindow(target);
    }),
  );
});
