import admin from 'firebase-admin';

let firebaseInitialized = false;

function initFirebase() {
  if (firebaseInitialized) return;

  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
    console.warn('Firebase credentials not configured — push notifications disabled');
    return;
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });

  firebaseInitialized = true;
}

export async function sendUrgentNotification(fcmToken, { senderName, urgencyReason, emailId, subject }) {
  if (!fcmToken) {
    return false;
  }

  initFirebase();

  if (!firebaseInitialized) {
    return false;
  }

  try {
    await admin.messaging().send({
      token: fcmToken,
      notification: {
        title: `Urgent email from ${senderName}`,
        body: urgencyReason,
      },
      data: {
        emailId: String(emailId),
        subject: subject || '',
      },
      webpush: {
        fcmOptions: {
          link: '/dashboard',
        },
      },
    });
    return true;
  } catch (err) {
    console.error('FCM send failed:', err.message);
    return false;
  }
}
