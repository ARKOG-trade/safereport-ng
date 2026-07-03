import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const apps = getApps();

let adminApp;

const hasValidAdminCredentials = (
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_PROJECT_ID !== "placeholder-project-id" &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_CLIENT_EMAIL !== "placeholder-client-email@example.com" &&
  process.env.FIREBASE_PRIVATE_KEY &&
  !process.env.FIREBASE_PRIVATE_KEY.includes("FAKE_PRIVATE_KEY") &&
  process.env.FIREBASE_PRIVATE_KEY.startsWith("-----BEGIN PRIVATE KEY-----") &&
  process.env.FIREBASE_PRIVATE_KEY.endsWith("-----END PRIVATE KEY-----\n")
);

if (apps.length > 0) {
  adminApp = apps[0];
} else if (hasValidAdminCredentials) {
  adminApp = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    }),
  });
} else {
  console.warn("Firebase Admin SDK environment variables not found or are placeholders. Admin SDK will not be initialized.");
}

export const adminDb = adminApp ? getFirestore(adminApp) : ({} as unknown as ReturnType<typeof getFirestore>);
export const adminAuth = adminApp ? getAuth(adminApp) : ({} as unknown as ReturnType<typeof getAuth>);
