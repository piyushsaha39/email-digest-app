import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { saveFcmToken } from './api.js';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let messaging = null;

function isFirebaseConfigured() {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.projectId &&
      firebaseConfig.messagingSenderId &&
      firebaseConfig.appId
  );
}

export async function initFcm(onForegroundMessage) {
  if (!isFirebaseConfigured()) {
    console.warn('Firebase not configured — push notifications disabled');
    return null;
  }

  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    console.warn('Notifications or Service Workers not supported');
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return null;
    }

    const app = initializeApp(firebaseConfig);
    messaging = getMessaging(app);

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    const fcmToken = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: await navigator.serviceWorker.register(
        '/firebase-messaging-sw.js'
      ),
    });

    if (fcmToken) {
      await saveFcmToken(fcmToken);
    }

    onMessage(messaging, (payload) => {
      if (onForegroundMessage) {
        onForegroundMessage(payload);
      }
    });

    return fcmToken;
  } catch (err) {
    console.error('FCM initialization failed:', err);
    return null;
  }
}
