import { auth } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { showError } from "./error-handler.js";

/**
 * Universal Auth Check for Protected Pages
 * STRICT SECURITY: Only Firebase authenticated users allowed
 * No localStorage bypass or simulation mode
 */
(function () {
  // Show loading overlay immediately - prevents flash of protected content
  showLoadingState();

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      // ✅ Firebase user authenticated - allow access
      // 🚫 EMAIL VERIFICATION CHECK - Strict enforcement: No access until email is verified
      if (!user.emailVerified) {
        hideLoadingState();
        // Sign out immediately to prevent session persistence
        await signOut(auth);
        showError("Session invalid or Email not verified.", {
          showRetry: false,
          title: "Access Denied"
        });
        // Use replace to prevent Back button re-entry
        window.location.replace('login.html');
        return;
      }

      // Additional checks can be added here (e.g., plan verification, blocked status)
      hideLoadingState();
      // Allow page to load normally
    } else {
      // ❌ NO Firebase user - strict redirect to login
      // 🚨 CRITICAL: Do not trust localStorage or any client-side data
      hideLoadingState();
      redirectToLogin();
    }
  });

  // Handle Browser Back Cache (BFCache): Force reload if page was loaded from cache
  window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
      // Page was loaded from cache (back button) - force reload/auth check
      window.location.reload();
    }
  });
})();

/**
 * Show loading state while checking authentication
 */
function showLoadingState() {
  // Remove any existing loading overlay
  const existing = document.querySelector('.auth-loading-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'auth-loading-overlay';
  overlay.innerHTML = `
    <div class="auth-loading-content">
      <div class="auth-spinner"></div>
      <p>Verifying authentication...</p>
    </div>
  `;

  // Add CSS if not present
  if (!document.querySelector('#auth-loading-styles')) {
    const styles = document.createElement('style');
    styles.id = 'auth-loading-styles';
    styles.textContent = `
      .auth-loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 255, 255, 0.95);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .auth-loading-content {
        text-align: center;
        color: #495057;
      }

      .auth-spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #007bff;
        border-radius: 50%;
        animation: auth-spin 1s linear infinite;
        margin: 0 auto 16px;
      }

      @keyframes auth-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      .auth-loading-content p {
        margin: 0;
        font-size: 16px;
        font-weight: 500;
      }
    `;
    document.head.appendChild(styles);
  }

  document.body.appendChild(overlay);
}

/**
 * Hide loading state
 */
function hideLoadingState() {
  const overlay = document.querySelector('.auth-loading-overlay');
  if (overlay) {
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 300);
  }
}

/**
 * Redirect to login page
 */
function redirectToLogin() {
  // Store current page for redirect after login
  const currentPath = window.location.pathname;
  if (currentPath !== '/login.html' && currentPath !== '/signup.html' && currentPath !== '/forgot-password.html') {
    sessionStorage.setItem('redirectAfterLogin', currentPath);
  }

  window.location.replace("login.html");
}

/**
 * Get redirect path after login
 */
export function getRedirectAfterLogin() {
  return sessionStorage.getItem('redirectAfterLogin') || 'dashboard.html';
}

/**
 * Clear redirect after login
 */
export function clearRedirectAfterLogin() {
  sessionStorage.removeItem('redirectAfterLogin');
}
