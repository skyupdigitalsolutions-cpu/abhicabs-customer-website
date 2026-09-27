// Firebase Cloud Messaging — web push notifications.
//
// This only activates once real Firebase project config is set in .env
// (VITE_FIREBASE_*). Until then, requestNotificationPermission() resolves
// to null and callers should treat that as "push isn't configured yet" —
// never throw, since a customer without push shouldn't be blocked from
// anything else on the site.
import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { api } from "../api/client";
import { USE_MOCK } from "../api/config";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

function isConfigured() {
  return !!(firebaseConfig.apiKey && firebaseConfig.projectId && VAPID_KEY);
}

let appInstance = null;
function getFirebaseApp() {
  if (!isConfigured()) return null;
  if (getApps().length) return getApps()[0];
  if (!appInstance) appInstance = initializeApp(firebaseConfig);
  return appInstance;
}

/**
 * Asks the browser for notification permission, registers the service
 * worker, gets an FCM token, and sends it to the real backend
 * (POST /notifications/push-tokens) so it can push to this device later.
 * Call this right after a successful login — a logged-out visitor has
 * nowhere for a push to be attributed to.
 *
 * Returns the token on success, or null if push isn't available/configured/
 * permitted — every case is handled quietly, never thrown, since this is an
 * enhancement, not something that should ever block the rest of the app.
 */
export async function requestNotificationPermission() {
  if (typeof window === "undefined") return null;
  if (!isConfigured()) return null;
  if (!(await isSupported().catch(() => false))) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    const app = getFirebaseApp();
    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
    if (!token) return null;

    if (!USE_MOCK) {
      await api.post("/notifications/push-tokens", { token, platform: "WEB" }).catch(() => {
        // Registration failing shouldn't surface anywhere loud — the push
        // simply won't arrive; everything else keeps working normally.
      });
    }
    return token;
  } catch {
    return null;
  }
}

/**
 * Listens for a push that arrives while this tab is open and focused
 * (a "foreground" message — FCM delivers background ones straight to the
 * service worker instead, see public/firebase-messaging-sw.js).
 * Returns an unsubscribe function; call it in a useEffect cleanup.
 */
export function onForegroundMessage(callback) {
  const app = getFirebaseApp();
  if (!app) return () => {};
  const messaging = getMessaging(app);
  return onMessage(messaging, callback);
}
