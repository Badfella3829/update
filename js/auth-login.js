import { auth, db } from "./firebase.js";
import { signInWithEmailAndPassword, signOut } from
"https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, updateDoc } from
"https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { canLogin, recordFail, resetAttempts } from "./auth-attempt.js";
import { saveDevice } from "./remember-device.js";
import { logAuthEvent, logError } from "./logger.js";
import { withErrorHandling, showError } from "./error-handler.js";
import { isFeatureEnabled } from "./feature-flags.js";

window.login = async function () {
  const loginBtn = document.querySelector('button[type="submit"], button[id="loginBtn"], input[type="submit"]');
  if (loginBtn && loginBtn.disabled) return; // Prevent double-click

  // 🔐 Login attempt limit
  if (!canLogin()) return;

  const u = document.getElementById("username").value.trim();
  const p = document.getElementById("password").value;

  // Basic validation
  if (!u || !p) {
    showError("Please enter both username and password");
    return;
  }

  // Disable button to prevent double-click
  if (loginBtn) {
    loginBtn.disabled = true;
    loginBtn.textContent = loginBtn.textContent.replace('Login', 'Logging in...');
  }

  // Mobile → email conversion
  const email = u.includes("@") ? u : u + "@mobile.techvyro";

  try {
    await withErrorHandling(async () => {
      logAuthEvent('login_attempt', { email });
      // 🔑 Firebase Auth login
      const res = await signInWithEmailAndPassword(auth, email, p);

      // 📦 Fetch user document from Firestore
      const snap = await getDoc(doc(db, "users", res.user.uid));

      // 🚫 BLOCKED USER CHECK
      if (snap.exists() && snap.data().blocked === true) {
        showError("Your account has been blocked by admin. Please contact support.");
        await signOut(auth);
        return;
      }

      // 🚫 EMAIL VERIFICATION CHECK
      if (!res.user.emailVerified) {
        showError("Please verify your email before logging in. Check your inbox for the verification link.", {
          showRetry: false,
          title: "Email Verification Required"
        });
        await signOut(auth);
        return;
      }

      // Update emailVerified in Firestore
      if (snap.exists() && !snap.data().emailVerified) {
        await updateDoc(doc(db, "users", res.user.uid), { emailVerified: true });
      }

      // ✅ Login success
      logAuthEvent('login_success', { userId: res.user.uid, email });
      resetAttempts();
      saveDevice();

      showError("Login successful! Redirecting...", {
        type: 'info',
        showRetry: false,
        title: "Success!"
      });

      // Redirect
      setTimeout(() => {
        location.href = "profile.html";
      }, 800);
    }, {
      showRetry: true,
      onError: (error) => {
        logError(error, { context: 'login', email });
        recordFail();
      }
    });
  } finally {
    // Re-enable button
    if (loginBtn) {
      loginBtn.disabled = false;
      loginBtn.textContent = loginBtn.textContent.replace('Logging in...', 'Login');
    }
  }
};
