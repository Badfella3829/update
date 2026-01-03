import { auth, db } from "./firebase.js";
import { signInWithEmailAndPassword, signOut } from
"https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, updateDoc, collection, addDoc } from
"https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js";

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

      // 🔐 Record login event and send alert
      await recordLoginEvent(res.user.uid, email, snap.data());

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
