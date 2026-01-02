import { auth, app } from "./firebase.js";
import { createUserWithEmailAndPassword, sendEmailVerification, signInWithEmailAndPassword } from
"https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc } from
"https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { showError, withErrorHandling } from "./error-handler.js";
import { logAuthEvent, logError } from "./logger.js";
const db = getFirestore(app);

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
    // Firestore user doc
    await setDoc(doc(db, "users", res.user.uid), {
      credits: 200,
      plan: "free",
      createdAt: new Date(),
      emailVerified: false
    });

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
