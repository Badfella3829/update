import { auth } from "./firebase.js";
import { sendPasswordResetEmail } from
"https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { logAuthEvent, logError } from "./logger.js";

window.resetPassword = function () {
  const resetBtn = document.querySelector('button[type="submit"], button[id="resetBtn"], input[type="submit"]');
  if (resetBtn && resetBtn.disabled) return; // Prevent double-click

  let email = document.querySelector("input").value;

  if (!email) {
    alert("Please enter your email address");
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
      alert("Password reset link sent");
    })
    .catch(err => {
      logError(err, { context: 'password_reset', email });
      alert(err.message);
    })
    .finally(() => {
      // Re-enable button
      if (resetBtn) {
        resetBtn.disabled = false;
        resetBtn.textContent = resetBtn.textContent.replace('Sending...', 'Reset Password');
      }
    });
};
