const admin = require("firebase-admin");
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(
    Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, "base64").toString(),
  );
} else {
  const keyPath = process.env.FIREBASE_KEY_PATH || "./firebase-key.json";
  serviceAccount = require(keyPath);
  if (process.env.NODE_ENV !== "development") {
    console.warn("⚠️  Using local Firebase key in production - insecure!");
  }
}

// 🔥 IMPORTANT: use ENV in production
const BUCKET_NAME =
  process.env.FIREBASE_BUCKET || "rental-house-6de49.appspot.com";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: BUCKET_NAME,
  });
}

const bucket = admin.storage().bucket();

// ✅ Debug check
console.log("✅ Firebase bucket:", bucket.name);

module.exports = { admin, bucket };
