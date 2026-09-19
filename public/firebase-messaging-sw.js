// public/firebase-messaging-sw.js
//
// Handles a push notification that arrives while NO tab of this site is
// focused (a "background" message) — the browser calls this service worker
// directly, separately from the foreground listener in src/lib/firebase.js.
//
// This file MUST live at the site root (not under /src or /public/anything)
// so its scope covers the whole origin — that's a Firebase/browser
// requirement, not a project convention.
//
// IMPORTANT: this is a plain script, not a module, and can't read Vite's
// import.meta.env — the config values below are intentionally duplicated
// from your .env's VITE_FIREBASE_* values. Update both places if they change.

importScripts("https://www.gstatic.com/firebasejs/11.0.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.0.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "REPLACE_WITH_VITE_FIREBASE_API_KEY",
  authDomain: "REPLACE_WITH_VITE_FIREBASE_AUTH_DOMAIN",
  projectId: "REPLACE_WITH_VITE_FIREBASE_PROJECT_ID",
  messagingSenderId: "REPLACE_WITH_VITE_FIREBASE_MESSAGING_SENDER_ID",
  appId: "REPLACE_WITH_VITE_FIREBASE_APP_ID",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || "ABHI CABS", {
    body: body || "",
    icon: "/icon-192.png", // add a real icon at this path, or change this line
    data: payload.data || {},
  });
});

// Clicking the notification focuses an existing tab if one's open, or opens
// a new one — same page every time, kept simple deliberately.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((list) => {
      for (const client of list) {
        if ("focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow("/");
    })
  );
});
