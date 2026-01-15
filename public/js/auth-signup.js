import { auth, app } from "./firebase.js";
import { createUserWithEmailAndPassword, sendEmailVerification, signInWithEmailAndPassword } from
"https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, collection, addDoc, query, where, getDocs, updateDoc } from
"https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js";
import { showError, withErrorHandling } from "./error-handler.js";
import { logAuthEvent, logError } from "./logger.js";
const db = getFirestore(app);

// Generate unique referral code
function generateReferralCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Process referral during signup
async function processReferral(referralCode, newUserId) {
  if (!referralCode) return;

  try {
    // Find referrer by referral code
    const referrerQuery = query(
      collection(db, "users"),
      where("referralCode", "==", referralCode)
    );
    const referrerSnap = await getDocs(referrerQuery);

    if (!referrerSnap.empty) {
      const referrerDoc = referrerSnap.docs[0];
      const referrerId = referrerDoc.id;

      // Log referral
      await addDoc(collection(db, "referrals"), {
        referrerId: referrerId,
        referredId: newUserId,
        referralCode: referralCode,
        timestamp: new Date(),
        rewarded: false
      });

      // Reward referrer with 50 credits (miles)
      const currentCredits = referrerDoc.data().credits || 0;
      await updateDoc(doc(db, "users", referrerId), {
        credits: currentCredits + 50
      });

      // Mark referral as rewarded
      const referralQuery = query(
        collection(db, "referrals"),
        where("referrerId", "==", referrerId),
        where("referredId", "==", newUserId)
      );
      const referralSnap = await getDocs(referralQuery);
      if (!referralSnap.empty) {
        await updateDoc(referralSnap.docs[0].ref, { rewarded: true });
      }

      logAuthEvent('referral_processed', { referrerId, referredId: newUserId, creditsRewarded: 50 });
    }
  } catch (error) {
    logError(error, { context: 'referral_processing', referralCode, newUserId });
  }
}

window.signup = async function () {
  const emailInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const msg = document.getElementById("msg");

  msg.innerText = "";
  msg.style.color = "red";

  let email = emailInput.value.trim();
  const password = passwordInput.value;
  logAuthEvent('signup_attempt', { email });
  if (!email || !password) {
    msg.innerText = "Please fill all fields";
    return;
  }

  // Mobile → email convert
  if (!email.includes("@")) {
    email = email + "@mobile.techvyro";
  }

  try {
    // Create user
    const res = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    // Send email verification
    await sendEmailVerification(res.user);
    logAuthEvent('signup_success', { userId: res.user.uid, email });
    // Generate referral code for new user
    const referralCode = generateReferralCode();

    // Firestore user doc
    await setDoc(doc(db, "users", res.user.uid), {
      credits: 200,
      plan: "free",
      createdAt: new Date(),
      emailVerified: false,
      referralCode: referralCode
    });

    // Send welcome email (non-blocking)
    try {
      const sendWelcomeEmail = httpsCallable('sendWelcomeEmail');
      await sendWelcomeEmail({
        email: email,
        userName: email.split('@')[0], // Use email prefix as name for now
        userId: res.user.uid
      });
      logAuthEvent('welcome_email_sent', { userId: res.user.uid, email });
    } catch (emailError) {
      // Log but don't fail signup if email fails
      logError(emailError, { context: 'welcome_email', userId: res.user.uid, email });
    }

    // Process referral code if provided
    const inputReferralCode = document.getElementById("referralCode").value.trim().toUpperCase() ||
                              new URLSearchParams(window.location.search).get('ref')?.toUpperCase();
    if (inputReferralCode) {
      await processReferral(inputReferralCode, res.user.uid);
    }

    // ✅ SUCCESS MESSAGE (GUARANTEED VISIBLE)
    msg.style.color = "green";
    msg.innerText = "Signup successful! Please check your email and verify your account before logging in.";

    setTimeout(() => {
      location.href = "login.html";
    }, 3000);

  } catch (err) {
    logError(err, { context: 'signup', email });
    if (err.code === "auth/email-already-in-use") {
      msg.innerText = "Account already exists. Please login.";
      setTimeout(() => {
        location.href = "login.html";
      }, 1500);
    } else {
      msg.innerText = err.message;
    }
  }
};

// Resend email verification
window.resendVerification = async function () {
  const emailInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");

  let email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showError("Please enter both email and password to resend verification");
    return;
  }

  // Mobile → email convert
  if (!email.includes("@")) {
    email = email + "@mobile.techvyro";
  }

  await withErrorHandling(async () => {
    logAuthEvent('verification_resend_attempt', { email: email.replace(/@mobile\.techvyro$/, '@[mobile]') });

    // Sign in to get user
    const res = await signInWithEmailAndPassword(auth, email, password);

    setCurrentUser(res.user);

    // Check if already verified
    if (res.user.emailVerified) {
      logAuthEvent('verification_already_verified', {
        userId: res.user.uid,
        email: email.replace(/@mobile\.techvyro$/, '@[mobile]')
      });
      showError("Your email is already verified. You can login now.", {
        type: 'info',
        showRetry: false,
        title: "Already Verified"
      });
      return;
    }

    // Resend verification
    await sendEmailVerification(res.user);

    logAuthEvent('verification_email_sent', {
      userId: res.user.uid,
      email: email.replace(/@mobile\.techvyro$/, '@[mobile]')
    });

    showError("Verification email sent! Please check your inbox.", {
      type: 'info',
      showRetry: false,
      title: "Email Sent"
    });
  }, {
    showRetry: true,
    onError: (error) => {
      logError(error, {
        context: 'verification_resend',
        email: email.replace(/@mobile\.techvyro$/, '@[mobile]')
      });
    }
  });
};
