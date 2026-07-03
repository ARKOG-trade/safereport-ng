# SafeReport NG – Vercel Environment Variables Documentation

This document outlines all environment variables required for deploying SafeReport NG on Vercel, categorized by their usage context (client-side or server-side).

## 1. Client-Side Environment Variables (Prefixed with `NEXT_PUBLIC_`)

These variables are exposed to the browser and are used by the Firebase Client SDK for authentication and Firestore access. They must be configured in Vercel for **Production**, **Preview**, and **Development** environments.

| Variable Name | Description | Example Value |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase API Key for your project. | `AIzaSyB_xxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain for your project. | `your-project-id.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase Project ID. | `your-project-id` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Storage Bucket. | `your-project-id.appspot.com` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging Sender ID. | `123456789012` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase App ID. | `1:123456789012:web:xxxxxxxxxxxxxxxxxxx` |

## 2. Server-Side Environment Variables (No `NEXT_PUBLIC_` Prefix)

These variables are sensitive and are only accessible on the server (e.g., within API routes). They are used by the Firebase Admin SDK for secure operations. These must be configured in Vercel for **Production** and **Preview** environments. For **Development**, they are typically sourced from a `.env.local` file.

| Variable Name | Description | Example Value |
| :--- | :--- | :--- |
| `FIREBASE_PROJECT_ID` | Firebase Project ID (same as `NEXT_PUBLIC_FIREBASE_PROJECT_ID`). | `your-project-id` |
| `FIREBASE_CLIENT_EMAIL` | Client email from your Firebase service account key. | `firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com` |
| `FIREBASE_PRIVATE_KEY` | Private key from your Firebase service account key. **Ensure newlines are preserved or correctly escaped if pasting into a single line in Vercel.** | `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n` |

## 3. Vercel Configuration Notes

*   **Environment Variables**: When adding `FIREBASE_PRIVATE_KEY` to Vercel, ensure that the newlines (`\n`) are correctly interpreted. Vercel typically handles multi-line secrets correctly if pasted directly. If issues arise, explicitly replace `\n` with `\\n` if Vercel requires a single-line string, though this is rarely necessary for direct pasting.
*   **Build & Development Settings**: The project uses Next.js, and Vercel automatically detects and configures the build settings. No `vercel.json` file is currently required for basic deployment. If custom build commands or output directories are needed in the future, a `vercel.json` file can be added.
*   **Dynamic Rendering**: Protected routes like `/admin` and `/institution/[institution]` now use `export const dynamic = "force-dynamic";` to ensure they are rendered dynamically on each request. This prevents Firebase client-side initialization from occurring during static prerendering, resolving previous deployment failures.

This documentation ensures that all necessary environment variables are clearly identified and the Vercel deployment configuration is optimized for a successful deployment of SafeReport NG.
