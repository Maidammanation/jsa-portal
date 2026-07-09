// lib/firebaseAdmin.ts
// Server-only Firebase Admin initialization. NEVER import this from a
// client component — it uses a service account key and must stay on the server.
// Used by the API routes under app/api/auth/* to create and verify session cookies.

import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function getAdminApp(): App {
  if (getApps().length) return getApps()[0];

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountJson) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY is not set. Add your service account JSON " +
        "(as a single-line string) to .env.local to enable server-side auth."
    );
  }

  return initializeApp({
    credential: cert(JSON.parse(serviceAccountJson)),
  });
}

export const adminAuth = () => getAuth(getAdminApp());
