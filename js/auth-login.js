import { auth, db } from "./firebase.js";
import { signInWithEmailAndPassword, signOut } from
"https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, updateDoc, collection, addDoc, query, orderBy, limit, getDocs } from
"https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { httpsCallable, getFunctions } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js";

import { logAuthEvent, logError } from "./logger.js";
import { showError } from "./error-handler.js";

// 🚨 CLIENT-SIDE RATE LIMITING CONSTANTS
const RATE_LIMIT_KEY = 'failedLoginAttempts';
const LOCKOUT_KEY = 'loginLockoutUntil';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

window.login = async function () {
  const loginBtn = document.querySelector('button[type="submit"], button[id="loginBtn"], input[type="submit"]');
  if (loginBtn && loginBtn.disabled) return; // Prevent double-click

  // 🚨 CLIENT-SIDE RATE LIMITING: Check for lockout
  const lockoutUntil = isLockedOut();
  if (lockoutUntil) {
    updateLockoutUI(lockoutUntil);
    return;
  }

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

  const email = u;

  try {
    logAuthEvent('login_attempt', { email });
    // 🔑 Firebase Auth login
    const userCredential = await signInWithEmailAndPassword(auth, email, p);

    // 📦 Fetch user document from Firestore
    const snap = await getDoc(doc(db, "users", userCredential.user.uid));

    // 🚫 BLOCKED USER CHECK
    if (snap.exists() && snap.data().blocked === true) {
      showError("Your account has been blocked by admin. Please contact support.");
      await signOut(auth);
      return;
    }

    // 🚫 STRICT EMAIL VERIFICATION ENFORCEMENT
    if (!userCredential.user.emailVerified) {
      // Sign out immediately to prevent session persistence
      await signOut(auth);
      showError("Please verify your email address to continue.", {
        showRetry: false,
        title: "Email Verification Required"
      });
      return;
    }

    // Update emailVerified in Firestore
    if (snap.exists() && !snap.data().emailVerified) {
      await updateDoc(doc(db, "users", userCredential.user.uid), { emailVerified: true });
    }

    // ✅ Login success
    logAuthEvent('login_success', { userId: userCredential.user.uid, email });

    // 🚨 CLIENT-SIDE RATE LIMITING: Clear rate limiting data on successful login
    clearRateLimitData();

    // 🔐 Record login event and send alert
    await recordLoginEvent(userCredential.user.uid, email, snap.data());

    showError("Login successful! Redirecting...", {
      type: 'info',
      showRetry: false,
      title: "Success!"
    });

    // Redirect to dashboard
    setTimeout(() => {
      location.href = "dashboard.html";
    }, 800);
  } catch (error) {
    logError(error, { context: 'login', email });

    // 🚨 CLIENT-SIDE RATE LIMITING: Increment failed attempts on login failure
    incrementFailedAttempts();

    // 🚨 IMPROVED ERROR HANDLING UX
    let errorMessage = "An unexpected error occurred. Please try again.";
    let showRetryOption = true;

    // Handle specific Firebase error codes
    switch (error.code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        // Security Best Practice: Generic message to avoid revealing which field is incorrect
        errorMessage = "Invalid email or password.";
        break;

      case 'auth/network-request-failed':
        errorMessage = "Network error. Check internet connection.";
        break;

      case 'auth/too-many-requests':
        errorMessage = "Too many failed attempts. Please try again later.";
        showRetryOption = false; // Don't show retry for rate limiting
        break;

      default:
        // Keep default message for any other errors
        break;
    }

    showError(errorMessage, {
      showRetry: showRetryOption,
      title: "Login Failed"
    });
  } finally {
    // Re-enable button
    if (loginBtn) {
      loginBtn.disabled = false;
      loginBtn.textContent = loginBtn.textContent.replace('Logging in...', 'Login');
    }
  }
};

// Record login event and send alert if needed
async function recordLoginEvent(userId, email, userData) {
  try {
    const now = new Date();
    const loginData = {
      timestamp: now,
      deviceInfo: navigator.userAgent,
      ipAddress: 'Unknown', // Would need server-side IP detection
      location: 'Unknown', // Would need geolocation API
      userId: userId,
      email: email
    };

    // Update last login in user document
    await updateDoc(doc(db, "users", userId), {
      lastLogin: now,
      lastLoginDevice: navigator.userAgent
    });

    // Add to login history
    await addDoc(collection(db, "users", userId, "loginHistory"), loginData);

    // Check for suspicious activity (enhanced detection)
    const suspiciousActivity = await detectSuspiciousActivity(userId, loginData);

    if (suspiciousActivity.isSuspicious) {
      // Flag this login as suspicious in Firestore
      await updateDoc(doc(db, "users", userId, "loginHistory", loginData.id || 'temp'), {
        suspicious: true,
        suspiciousReasons: suspiciousActivity.reasons
      });

      // Send login alert email
      const functions = getFunctions();
      const sendLoginAlert = httpsCallable(functions, 'sendLoginAlertEmail');
      await sendLoginAlert({
        userId: userId,
        userName: userData.name || userData.displayName || email.split('@')[0],
        email: email,
        loginTime: now.toLocaleString(),
        deviceInfo: navigator.userAgent,
        location: 'Unknown',
        ipAddress: 'Unknown'
      });
    }

  } catch (error) {
    console.error('Error recording login event:', error);
    // Don't block login for this error
  }
}

// Check if this is a new device (simplified)
async function checkForNewDevice(userId, currentDevice) {
  try {
    // Get recent login history
    const loginHistoryRef = collection(db, "users", userId, "loginHistory");
    const q = query(loginHistoryRef, orderBy("timestamp", "desc"), limit(10));
    const querySnapshot = await getDocs(q);

    const recentDevices = [];
    querySnapshot.forEach((doc) => {
      recentDevices.push(doc.data().deviceInfo);
    });

    // Check if current device matches any recent ones
    const isKnownDevice = recentDevices.some(device => device === currentDevice);

    return !isKnownDevice && recentDevices.length > 0; // New device if not known and has history

  } catch (error) {
    console.error('Error checking device:', error);
    return false; // Default to not suspicious
  }
}

// Enhanced suspicious activity detection
async function detectSuspiciousActivity(userId, currentLogin) {
  const reasons = [];
  let isSuspicious = false;

  try {
    // Get recent login history (last 20 logins for better analysis)
    const loginHistoryRef = collection(db, "users", userId, "loginHistory");
    const q = query(loginHistoryRef, orderBy("timestamp", "desc"), limit(20));
    const querySnapshot = await getDocs(q);

    const recentLogins = [];
    querySnapshot.forEach((doc) => {
      recentLogins.push({ id: doc.id, ...doc.data() });
    });

    // Skip analysis if no history
    if (recentLogins.length === 0) {
      return { isSuspicious: false, reasons: [] };
    }

    // 1. New device detection
    const isNewDevice = await checkForNewDevice(userId, currentLogin.deviceInfo);
    if (isNewDevice) {
      reasons.push('New device detected');
      isSuspicious = true;
    }

    // 2. Unusual time pattern (login at unusual hours)
    const currentHour = currentLogin.timestamp.getHours();
    const usualHours = recentLogins.map(login => new Date(login.timestamp.seconds * 1000).getHours());
    const avgHour = usualHours.reduce((a, b) => a + b, 0) / usualHours.length;
    const hourDeviation = Math.abs(currentHour - avgHour);

    // Flag if login is more than 6 hours from usual time and we have enough history
    if (recentLogins.length >= 5 && hourDeviation > 6) {
      reasons.push(`Unusual login time (${currentHour}:00, usually around ${Math.round(avgHour)}:00)`);
      isSuspicious = true;
    }

    // 3. Rapid successive logins from different locations/IPs (potential account sharing)
    const recentLoginsLast24h = recentLogins.filter(login => {
      const loginTime = new Date(login.timestamp.seconds * 1000);
      const hoursDiff = (currentLogin.timestamp - loginTime) / (1000 * 60 * 60);
      return hoursDiff <= 24;
    });

    // Check for multiple different IPs/locations in short time
    const uniqueIPs = [...new Set(recentLoginsLast24h.map(login => login.ipAddress).filter(ip => ip !== 'Unknown'))];
    const uniqueLocations = [...new Set(recentLoginsLast24h.map(login => login.location).filter(loc => loc !== 'Unknown'))];

    if (uniqueIPs.length > 2 || uniqueLocations.length > 2) {
      reasons.push('Multiple different locations/IPs detected in 24 hours');
      isSuspicious = true;
    }

    // 4. Geographic anomaly (if location data available)
    // This would require geolocation API integration for more advanced detection

    return { isSuspicious, reasons };

  } catch (error) {
    console.error('Error detecting suspicious activity:', error);
    return { isSuspicious: false, reasons: [] }; // Default to not suspicious on error
  }
}

// 🚨 CLIENT-SIDE RATE LIMITING FUNCTIONS

// Check if user is currently locked out
function isLockedOut() {
  const lockoutUntil = localStorage.getItem(LOCKOUT_KEY);
  if (!lockoutUntil) return null;

  const lockoutTime = parseInt(lockoutUntil);
  const now = Date.now();

  if (now < lockoutTime) {
    return lockoutTime; // Still locked out
  } else {
    // Lockout expired, clear it
    localStorage.removeItem(LOCKOUT_KEY);
    return null;
  }
}

// Increment failed login attempts and trigger lockout if needed
function incrementFailedAttempts() {
  const currentAttempts = parseInt(localStorage.getItem(RATE_LIMIT_KEY) || '0');
  const newAttempts = currentAttempts + 1;

  localStorage.setItem(RATE_LIMIT_KEY, newAttempts.toString());

  // Trigger lockout if max attempts reached
  if (newAttempts >= MAX_ATTEMPTS) {
    const lockoutUntil = Date.now() + LOCKOUT_DURATION;
    localStorage.setItem(LOCKOUT_KEY, lockoutUntil.toString());
  }
}

// Clear all rate limiting data on successful login
function clearRateLimitData() {
  localStorage.removeItem(RATE_LIMIT_KEY);
  localStorage.removeItem(LOCKOUT_KEY);
}

// Update UI to show lockout state and countdown timer
function updateLockoutUI(lockoutUntil) {
  const loginBtn = document.querySelector('button[type="submit"], button[id="loginBtn"], input[type="submit"]');
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");

  // Disable inputs and button
  if (loginBtn) loginBtn.disabled = true;
  if (usernameInput) usernameInput.disabled = true;
  if (passwordInput) passwordInput.disabled = true;

  // Calculate remaining time
  const remainingMs = lockoutUntil - Date.now();
  const remainingMinutes = Math.ceil(remainingMs / (1000 * 60));

  // Show lockout message
  showError(`Too many failed attempts. Please try again in ${remainingMinutes} minutes.`, {
    showRetry: false,
    title: "Login Temporarily Disabled"
  });

  // Start countdown timer
  let countdownInterval = setInterval(() => {
    const currentRemainingMs = lockoutUntil - Date.now();

    if (currentRemainingMs <= 0) {
      // Lockout expired
      clearInterval(countdownInterval);
      clearRateLimitData();

      // Re-enable UI
      if (loginBtn) loginBtn.disabled = false;
      if (usernameInput) usernameInput.disabled = false;
      if (passwordInput) passwordInput.disabled = false;

      showError("You can now try logging in again.", {
        type: 'info',
        showRetry: false,
        title: "Lockout Expired"
      });
      return;
    }

    const minutes = Math.floor(currentRemainingMs / (1000 * 60));
    const seconds = Math.floor((currentRemainingMs % (1000 * 60)) / 1000);

    // Update the error message with current countdown
    showError(`Too many failed attempts. Please try again in ${minutes}:${seconds.toString().padStart(2, '0')} minutes.`, {
      showRetry: false,
      title: "Login Temporarily Disabled"
    });
  }, 1000);
}

// 🚫 EMAIL VERIFICATION HANDLER - Enhanced UX
async function handleEmailVerificationRequired(user) {
  const email = user.email;

  // Create inline verification UI instead of modal
  const verificationContainer = document.createElement('div');
  verificationContainer.id = 'emailVerificationContainer';
  verificationContainer.innerHTML = `
    <div class="verification-notice">
      <div class="verification-header">
        <h3>📧 Email Verification Required</h3>
        <p>We've sent a verification link to <strong>${email}</strong></p>
      </div>

      <div class="verification-content">
        <div class="verification-steps">
          <div class="step">
            <span class="step-number">1</span>
            <span>Check your email inbox (and spam folder)</span>
          </div>
          <div class="step">
            <span class="step-number">2</span>
            <span>Click the verification link in the email</span>
          </div>
          <div class="step">
            <span class="step-number">3</span>
            <span>Return here and click "I've Verified My Email"</span>
          </div>
        </div>

        <div class="verification-actions">
          <button id="resendVerificationBtn" class="btn-secondary">
            <span id="resendText">Resend Verification Email</span>
            <span id="resendCooldown" style="display:none">Resend in 60s</span>
          </button>
          <button id="checkVerificationBtn" class="btn-primary">I've Verified My Email</button>
        </div>

        <div class="verification-footer">
          <button id="backToLoginBtn" class="btn-link">← Back to Login</button>
        </div>
      </div>
    </div>
  `;

  // Add styles
  const styles = document.createElement('style');
  styles.textContent = `
    #emailVerificationContainer {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .verification-notice {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      max-width: 500px;
      width: 90%;
      overflow: hidden;
      animation: slideIn 0.4s ease-out;
    }

    @keyframes slideIn {
      from { transform: translateY(-30px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .verification-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 24px;
      text-align: center;
    }

    .verification-header h3 {
      margin: 0 0 8px 0;
      font-size: 24px;
      font-weight: 700;
    }

    .verification-header p {
      margin: 0;
      opacity: 0.9;
      font-size: 16px;
    }

    .verification-content {
      padding: 24px;
    }

    .verification-steps {
      margin-bottom: 24px;
    }

    .step {
      display: flex;
      align-items: center;
      margin-bottom: 12px;
      padding: 8px 0;
    }

    .step-number {
      background: #007bff;
      color: white;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      margin-right: 12px;
      flex-shrink: 0;
    }

    .verification-actions {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
    }

    .verification-actions button {
      flex: 1;
      padding: 12px 16px;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary {
      background: #007bff;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #0056b3;
      transform: translateY(-1px);
    }

    .btn-primary:disabled {
      background: #6c757d;
      cursor: not-allowed;
      transform: none;
    }

    .btn-secondary {
      background: #f8f9fa;
      color: #495057;
      border: 1px solid #dee2e6;
    }

    .btn-secondary:hover:not(:disabled) {
      background: #e9ecef;
    }

    .btn-secondary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .verification-footer {
      text-align: center;
      padding-top: 16px;
      border-top: 1px solid #e9ecef;
    }

    .btn-link {
      background: none;
      border: none;
      color: #007bff;
      text-decoration: none;
      font-size: 14px;
      cursor: pointer;
      padding: 8px;
    }

    .btn-link:hover {
      text-decoration: underline;
    }

    @media (max-width: 480px) {
      .verification-actions {
        flex-direction: column;
      }

      .verification-notice {
        margin: 20px;
        width: calc(100% - 40px);
      }
    }
  `;
  document.head.appendChild(styles);
  document.body.appendChild(verificationContainer);

  // Sign out user immediately to prevent session persistence
  await signOut(auth);

  // Event handlers
  let resendCooldown = 0;
  let cooldownInterval;

  function startResendCooldown() {
    resendCooldown = 60;
    const resendBtn = document.getElementById('resendVerificationBtn');
    const resendText = document.getElementById('resendText');
    const resendCooldownEl = document.getElementById('resendCooldown');

    resendBtn.disabled = true;
    resendText.style.display = 'none';
    resendCooldownEl.style.display = 'inline';

    cooldownInterval = setInterval(() => {
      resendCooldown--;
      resendCooldownEl.textContent = `Resend in ${resendCooldown}s`;

      if (resendCooldown <= 0) {
        clearInterval(cooldownInterval);
        resendBtn.disabled = false;
        resendText.style.display = 'inline';
        resendCooldownEl.style.display = 'none';
      }
    }, 1000);
  }

  // Resend verification email
  document.getElementById('resendVerificationBtn').addEventListener('click', async () => {
    const btn = document.getElementById('resendVerificationBtn');
    const originalText = btn.innerHTML;

    try {
      btn.disabled = true;
      btn.innerHTML = 'Sending...';

      await user.sendEmailVerification();

      showError('Verification email sent successfully! Please check your inbox.', {
        type: 'info',
        showRetry: false,
        title: 'Email Sent'
      });

      startResendCooldown();

    } catch (error) {
      console.error('Error resending verification:', error);

      let errorMsg = 'Failed to send verification email.';
      if (error.code === 'auth/too-many-requests') {
        errorMsg = 'Too many requests. Please wait before trying again.';
      }

      showError(errorMsg, {
        showRetry: true,
        title: 'Send Failed',
        retryCallback: () => document.getElementById('resendVerificationBtn').click()
      });

      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  });

  // Check verification status
  document.getElementById('checkVerificationBtn').addEventListener('click', async () => {
    const btn = document.getElementById('checkVerificationBtn');
    const originalText = btn.textContent;

    try {
      btn.disabled = true;
      btn.textContent = 'Checking...';

      // Force refresh user auth state
      await user.reload();

      if (user.emailVerified) {
        // Success! Close modal and redirect
        verificationContainer.remove();
        styles.remove();

        showError('Email verified successfully! Redirecting to dashboard...', {
          type: 'info',
          showRetry: false,
          title: 'Verification Complete'
        });

        setTimeout(() => {
          location.href = 'dashboard.html';
        }, 1500);

      } else {
        showError('Email not yet verified. Please check your inbox and click the verification link.', {
          showRetry: false,
          title: 'Still Unverified'
        });
      }

    } catch (error) {
      console.error('Error checking verification:', error);
      showError('Unable to check verification status. Please try again.', {
        showRetry: true,
        title: 'Check Failed'
      });
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });

  // Back to login
  document.getElementById('backToLoginBtn').addEventListener('click', () => {
    verificationContainer.remove();
    styles.remove();
    if (cooldownInterval) clearInterval(cooldownInterval);
  });
}

// Initialize rate limiting check on page load
document.addEventListener('DOMContentLoaded', function() {
  const lockoutUntil = isLockedOut();
  if (lockoutUntil) {
    updateLockoutUI(lockoutUntil);
  }
});
