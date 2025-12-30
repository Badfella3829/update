const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.sendOtpIfUserExists = functions.https.onCall(
  async (data, context) => {
    const email = data.email;

    if (!email) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Email is required"
      );
    }

    try {
      // 🔍 Check user existence
      await admin.auth().getUserByEmail(email);

      // ✅ User exists → allow OTP
      return { ok: true };

    } catch (err) {
      // ❌ User not found
      throw new functions.https.HttpsError(
        "not-found",
        "User does not exist"
      );
    }
  }
);
