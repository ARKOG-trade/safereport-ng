"use client";

import { initializeApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";

let db: Firestore | null = null;

export function initializeFirebase(): Firestore {
  if (db) return db;

  // Only initialize Firebase client-side in the browser
  if (typeof window === 'undefined') {
    // During server-side rendering or build, return a mock or throw if strict
    if (process.env.NODE_ENV === "production") {
      // In production SSR, if client-side Firebase is needed, it implies a misconfiguration
      // However, for Vercel build, we just want to avoid errors, so return a mock
      console.warn("Attempted to initialize client-side Firebase on server during production build. Returning mock Firestore.");
      return {} as Firestore; 
    } else {
      console.warn("Attempted to initialize client-side Firebase on server. Returning mock Firestore.");
      return {} as Firestore; // Return a mock object for non-production SSR
    }
  }

  if (
    !process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    !process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    !process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    !process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
    !process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  ) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Missing Firebase configuration in environment variables");
    } else {
      console.warn("Missing Firebase configuration in environment variables. Firestore will not work correctly.");
      return {} as Firestore; // Return a mock object for non-production environments
    }
  }

  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);

  return db;
}

export function getDb(): Firestore {
  if (!db) {
    return initializeFirebase();
  }
  return db;
}
