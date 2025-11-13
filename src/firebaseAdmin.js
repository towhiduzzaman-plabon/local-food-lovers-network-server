import admin from 'firebase-admin';

const projectId   = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const rawKey      = process.env.FIREBASE_PRIVATE_KEY;

// dev-এ স্পষ্ট বার্তা
if (!projectId || !clientEmail || !rawKey) {
  console.error('❌ Missing FIREBASE_* env vars. Check your server/.env');
}

const privateKey = rawKey?.replace(/\\n/g, '\n');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
  console.log('✅ Firebase Admin initialized');
}

export async function verifyFirebaseIdToken(idToken) {
  return admin.auth().verifyIdToken(idToken, true);
}
