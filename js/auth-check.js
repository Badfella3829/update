import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { showError } from "./error-handler.js";

// Global loading state
let authCheckComplete = false;

/**
 * Universal Auth Check for Protected Pages
 * Shows loading state, handles auth verification, redirects if not authenticated
 */
(function () {
  // Show loading overlay immediately
  showLoadingState();

  onAuthStateChanged(auth, async (user) => {
    authCheckComplete = true;

    if (user) {
      // User is authenticated
      try {
        // 🚫 EMAIL VERIFICATION CHECK - Limited access until email is verified
        if (!user.emailVerified) {
          hideLoadingState();
          showError("Please verify your email to access all features. Check your inbox for the verification link. You can still use basic features.", {
            showRetry: false,
            title: "Email Verification Required for Full Access"
          });
          // Allow limited access - don't redirect, just show warning
          return;
        }

        // Additional checks can be added here (e.g., plan verification, blocked status)
        hideLoadingState();
        // Allow page to load normally
      } catch (error) {
        console.error("Auth check error:", error);
        showError("Authentication error. Please login again.", { showRetry: false });
        redirectToLogin();
      }
    } else {
      // User not authenticated
      hideLoadingState();
      redirectToLogin();
    }
  });

  // Prevent back button navigation to protected pages
  window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
      // Page was loaded from cache (back button)
      if (!authCheckComplete) {
        showLoadingState();
      } else if (!auth.currentUser) {
        redirectToLogin();
      }
    }
  });

  // Handle browser back/forward navigation
  window.addEventListener('popstate', function() {
    if (!auth.currentUser) {
      redirectToLogin();
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

  window.location.href = "login.html";
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
