const functions = require("firebase-functions");
const admin = require("firebase-admin");
const sgMail = require("@sendgrid/mail");
const Razorpay = require("razorpay");
const fs = require("fs");
const path = require("path");

admin.initializeApp();

// Set SendGrid API key from environment variables
sgMail.setApiKey(functions.config().sendgrid ? functions.config().sendgrid.key : process.env.SENDGRID_API_KEY);

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: functions.config().razorpay ? functions.config().razorpay.key_id : process.env.RAZORPAY_KEY_ID,
  key_secret: functions.config().razorpay ? functions.config().razorpay.key_secret : process.env.RAZORPAY_KEY_SECRET,
});

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

// Verify payment with Razorpay API
exports.verifyPayment = functions.https.onCall(
  async (data, context) => {
    // 🔐 Auth Check: Ensure user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication required"
      );
    }

    const { paymentId } = data;

    if (!paymentId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Payment ID is required"
      );
    }

    try {
      // Fetch payment details from Razorpay
      const payment = await razorpay.payments.fetch(paymentId);

      // Check if payment is captured and successful
      if (payment.status === 'captured' && payment.amount_paid > 0) {
        return {
          verified: true,
          payment: {
            id: payment.id,
            amount: payment.amount,
            currency: payment.currency,
            status: payment.status,
            method: payment.method,
            email: payment.email,
            contact: payment.contact
          }
        };
      } else {
        return {
          verified: false,
          reason: `Payment status: ${payment.status}`
        };
      }

    } catch (error) {
      console.error("Error verifying payment:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to verify payment"
      );
    }
  }
);

// Send upgrade confirmation email with plan/auth validation
exports.sendUpgradeEmail = functions.https.onCall(
  async (data, context) => {
    // 🔐 Auth Check: Ensure user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication required"
      );
    }

    const { email, userName, userId, fromPlan, toPlan, planTitle } = data;

    if (!email || !userName || !userId || !toPlan) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Required fields: email, userName, userId, toPlan"
      );
    }

    // 🔐 Plan Check: Verify the user actually has the new plan
    try {
      const userDoc = await admin.firestore().collection('users').doc(userId).get();
      if (!userDoc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "User not found"
        );
      }

      const userData = userDoc.data();
      if (userData.plan !== toPlan) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Plan upgrade not verified. Contact support."
        );
      }

      // Additional check: Ensure userId matches authenticated user
      if (context.auth.uid !== userId) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "User ID mismatch"
        );
      }

    } catch (error) {
      if (error.code === 'permission-denied' || error.code === 'not-found') {
        throw error;
      }
      console.error("Error verifying user plan:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to verify upgrade"
      );
    }

    try {
      // Load email template
      const templatePath = path.join(__dirname, "templates", "upgrade-email.html");
      let htmlContent = fs.readFileSync(templatePath, "utf8");

      // Replace placeholders
      htmlContent = htmlContent
        .replace(/{{userName}}/g, userName)
        .replace(/{{fromPlan}}/g, fromPlan || "Free")
        .replace(/{{toPlan}}/g, toPlan)
        .replace(/{{planTitle}}/g, planTitle)
        .replace(/{{dashboardUrl}}/g, "https://techvyro.in/dashboard.html")
        .replace(/{{supportUrl}}/g, "https://techvyro.in/contact.html")
        .replace(/{{privacyUrl}}/g, "https://techvyro.in/privacy.html")
        .replace(/{{termsUrl}}/g, "https://techvyro.in/terms.html");

      const msg = {
        to: email,
        from: {
          email: "billing@techvyro.in",
          name: "TechVyro AI Billing"
        },
        subject: `Welcome to ${planTitle} - TechVyro AI`,
        html: htmlContent,
      };

      await sgMail.send(msg);

      // Log the email sent
      console.log(`Upgrade confirmation email sent to ${email} for user ${userId} (plan: ${toPlan})`);

      return { success: true };

    } catch (error) {
      console.error("Error sending upgrade email:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to send upgrade confirmation email"
      );
    }
  }
);

// Send login alert email
exports.sendLoginAlertEmail = functions.https.onCall(
  async (data, context) => {
    const { userId, userName, email, loginTime, deviceInfo, location, ipAddress } = data;

    if (!email || !userName) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Email and userName are required"
      );
    }

    try {
      // Load email template
      const templatePath = path.join(__dirname, "templates", "login-alert-email.html");
      let htmlContent = fs.readFileSync(templatePath, "utf8");

      // Replace placeholders
      htmlContent = htmlContent
        .replace(/{{userName}}/g, userName)
        .replace(/{{loginTime}}/g, loginTime)
        .replace(/{{deviceInfo}}/g, deviceInfo || "Unknown Device")
        .replace(/{{location}}/g, location || "Unknown Location")
        .replace(/{{ipAddress}}/g, ipAddress || "Unknown IP")
        .replace(/{{changePasswordUrl}}/g, "https://techvyro.in/forgot-password.html")
        .replace(/{{accountSettingsUrl}}/g, "https://techvyro.in/profile.html")
        .replace(/{{privacyUrl}}/g, "https://techvyro.in/privacy.html")
        .replace(/{{termsUrl}}/g, "https://techvyro.in/terms.html");

      const msg = {
        to: email,
        from: {
          email: "security@techvyro.in",
          name: "TechVyro AI Security"
        },
        subject: "New Login Detected - TechVyro AI",
        html: htmlContent,
      };

      await sgMail.send(msg);

      // Log the email sent
      console.log(`Login alert email sent to ${email} for user ${userId}`);

      return { success: true };

    } catch (error) {
      console.error("Error sending login alert email:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to send login alert email"
      );
    }
  }
);
