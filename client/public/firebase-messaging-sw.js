/* eslint-disable no-undef */
importScripts('/firebase-config.js');
importScripts('https://www.gstatic.com/firebasejs/11.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.0.0/firebase-messaging-compat.js');

firebase.initializeApp(self.FIREBASE_CONFIG);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'Urgent Email';
  const options = {
    body: payload.notification?.body || '',
    icon: '/vite.svg',
    data: payload.data || {},
  };

  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const emailId = event.notification.data?.emailId;
  const url = emailId ? `/dashboard?email=${emailId}` : '/dashboard';
  event.waitUntil(clients.openWindow(url));
});
