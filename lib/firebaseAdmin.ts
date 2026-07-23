// lib/firebaseAdmin.ts
// Server-only Firebase Admin initialization. NEVER import this from a
// client component — it uses a service account key and must stay on the server.
// Used by app/api/auth/* (session cookies) and app/api/admin/* (account creation).

import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function getAdminApp(): App {
  if (getApps().length) return getApps()[0];

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountJson) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY is not set. Add your service account JSON " +
        "(as a single-line string) to .env.local to enable server-side auth."
    );
  }

  let parsed;
  try {
    parsed = JSON.parse(serviceAccountJson);
  } catch (err) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON: " +
        (err instanceof Error ? err.message : String(err))
    );
  }

  return initializeApp({
    credential: cert(parsed),
  });
}

export const adminAuth = () => getAuth(getAdminApp());
export const adminDb = () => getFirestore(getAdminApp());