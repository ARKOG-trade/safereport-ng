
console.log("Checking Environment Variables...");

const requiredClientEnv = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
];

const requiredAdminEnv = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
];

let allClientEnvSet = true;
console.log("--- Client-side Environment Variables ---");
for (const envVar of requiredClientEnv) {
  if (!process.env[envVar]) {
    console.log(`❌ Missing: ${envVar}`);
    allClientEnvSet = false;
  } else if (process.env[envVar].includes("placeholder")) {
    console.log(`⚠️ Placeholder value for: ${envVar}`);
  } else {
    console.log(`✅ Set: ${envVar}`);
  }
}

let allAdminEnvSet = true;
console.log("\n--- Admin-side Environment Variables ---");
for (const envVar of requiredAdminEnv) {
  if (!process.env[envVar]) {
    console.log(`❌ Missing: ${envVar}`);
    allAdminEnvSet = false;
  } else if (process.env[envVar].includes("placeholder") || process.env[envVar].includes("FAKE_PRIVATE_KEY")) {
    console.log(`⚠️ Placeholder value for: ${envVar}`);
  } else {
    console.log(`✅ Set: ${envVar}`);
  }
}

if (allClientEnvSet && allAdminEnvSet) {
  console.log("\n🏁 All critical environment variables are set (some may be placeholders).");
} else {
  console.log("\n❌ Some critical environment variables are missing or are placeholders.");
  process.exit(1);
}
