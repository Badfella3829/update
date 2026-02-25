import { auth } from "./firebase.js";
import { sendPasswordResetEmail } from
"https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { logAuthEvent, logError } from "./logger.js";
import { showError } from "./error-handler.js";

window.resetPassword = function () {
  const resetBtn = document.querySelector('button[type="submit"], button[id="resetBtn"], input[type="submit"]');
  if (resetBtn && resetBtn.disabled) return; // Prevent double-click

  let email = document.querySelector("input").value.trim();

  // Enhanced validation
  if (!email) {
    showError("Please enter your email address");
    return;
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showError("Please enter a valid email address");
    return;
  }

  // Rate limiting for password reset attempts
  const resetAttemptsKey = 'passwordResetAttempts';
  const resetLockoutKey = 'passwordResetLockout';
  const maxResetAttempts = 3;
  const resetLockoutDuration = 30 * 60 * 1000; // 30 minutes

  const currentAttempts = parseInt(localStorage.getItem(resetAttemptsKey) || '0');
  const lockoutUntil = localStorage.getItem(resetLockoutKey);

  if (lockoutUntil && Date.now() < parseInt(lockoutUntil)) {
    const remainingMinutes = Math.ceil((parseInt(lockoutUntil) - Date.now()) / (1000 * 60));
    showError(`Too many reset attempts. Try again in ${remainingMinutes} minutes.`, {
      showRetry: false,
      title: "Reset Temporarily Disabled"
    });
    return;
  }

  if (currentAttempts >= maxResetAttempts) {
    const lockoutUntil = Date.now() + resetLockoutDuration;
    localStorage.setItem(resetLockoutKey, lockoutUntil.toString());
    showError("Too many reset attempts. Try again in 30 minutes.", {
      showRetry: false,
      title: "Reset Temporarily Disabled"
    });
    return;
  }

  // Disable button to prevent double-click
  if (resetBtn) {
    resetBtn.disabled = true;
    resetBtn.textContent = resetBtn.textContent.replace('Reset Password', 'Sending...');
  }

  logAuthEvent('password_reset_attempt', { email });

  sendPasswordResetEmail(auth, email)
    .then(() => {
      logAuthEvent('password_reset_success', { email });
      // Clear rate limiting on success
      localStorage.removeItem(resetAttemptsKey);
      localStorage.removeItem(resetLockoutKey);
      showError("If an account exists with this email, a password reset link has been sent.", {
        type: 'info',
        showRetry: false,
        title: "Reset Email Sent"
      });
    })
    .catch(err => {
      logError(err, { context: 'password_reset', email });

      // Increment attempts on failure
      localStorage.setItem(resetAttemptsKey, (currentAttempts + 1).toString());

      // 🚨 SECURITY: Prevent User Enumeration
      // Handle specific error codes to avoid revealing if email exists
      switch (err.code) {
        case 'auth/user-not-found':
          // Suppress user-not-found error - treat as success to prevent enumeration
          logAuthEvent('password_reset_success', { email }); // Log as success for consistency
          showError("If an account exists with this email, a password reset link has been sent.", {
            type: 'info',
            showRetry: false,
            title: "Reset Email Sent"
          });
          break;

        case 'auth/invalid-email':
          // Show error for invalid email format (this is not enumeration)
          showError("Please enter a valid email address.");
          break;

        case 'auth/network-request-failed':
          // Show error for network issues (this is not enumeration)
          showError("Network error. Check internet connection and try again.");
          break;

        case 'auth/too-many-requests':
          // Firebase rate limiting
          showError("Too many requests. Please wait before trying again.", {
            showRetry: false,
            title: "Rate Limited"
          });
          break;

        default:
          // For any other errors, show generic message to avoid enumeration
          showError("If an account exists with this email, a password reset link has been sent.", {
            type: 'info',
            showRetry: false,
            title: "Reset Email Sent"
          });
          break;
      }
    })
    .finally(() => {
      // Re-enable button
      if (resetBtn) {
        resetBtn.disabled = false;
        resetBtn.textContent = resetBtn.textContent.replace('Sending...', 'Reset Password');
      }
    });
};
