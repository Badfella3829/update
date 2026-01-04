import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/**
 * STRICT AUTHENTICATION GUARD FOR DASHBOARD
 * 🚨 CRITICAL SECURITY: Prevents unauthorized access via back button and BFCache
 *
 * Requirements:
 * - Run immediately in <head> or top of <body> before UI renders
 * - Use Firebase onAuthStateChanged for real-time auth verification
 * - Immediate redirect if no valid user
 * - Use window.location.replace() to overwrite history
 * - Handle BFCache (pageshow event with persisted=true)
 * - Force fresh auth check on cache loads
 */

(function() {
  'use strict';

  // 🚨 IMMEDIATE EXECUTION: Block rendering until auth verified
  let authVerified = false;
  let authCheckComplete = false;

  // Create immediate loading overlay to prevent flash of content
  const loadingOverlay = document.createElement('div');
  loadingOverlay.id = 'auth-guard-overlay';
  loadingOverlay.innerHTML = `
    <div class="auth-guard-content">
      <div class="auth-guard-spinner"></div>
      <p>Securing your session...</p>
    </div>
  `;

  // Add critical CSS immediately
  const criticalStyles = document.createElement('style');
  criticalStyles.textContent = `
    #auth-guard-overlay {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      background: rgba(2, 6, 23, 0.98) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      z-index: 10000 !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      backdrop-filter: blur(8px) !important;
    }

    .auth-guard-content {
      text-align: center !important;
      color: #e5e7eb !important;
    }

    .auth-guard-spinner {
      width: 50px !important;
      height: 50px !important;
      border: 4px solid rgba(255,255,255,0.1) !important;
      border-top: 4px solid #3b82f6 !important;
      border-radius: 50% !important;
      animation: auth-guard-spin 1s linear infinite !important;
      margin: 0 auto 20px !important;
    }

    @keyframes auth-guard-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .auth-guard-content p {
      margin: 0 !important;
      font-size: 18px !important;
      font-weight: 500 !important;
    }
  `;

  // Insert immediately to block rendering
  document.head.appendChild(criticalStyles);
  document.body.insertBefore(loadingOverlay, document.body.firstChild);

  // 🚨 STRICT AUTH CHECK: Firebase onAuthStateChanged
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    authCheckComplete = true;

    if (user && user.emailVerified) {
      // ✅ AUTHENTICATED: Allow access
      authVerified = true;
      removeAuthGuard();
      return;
    }

    // ❌ NOT AUTHENTICATED: Immediate redirect
    console.warn('🚨 AUTH GUARD: No valid user session detected');
    forceRedirectToLogin();
  });

  // 🚨 BFCACHE PROTECTION: Handle pageshow event
  window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
      // Page loaded from BFCache (back button)
      console.log('🚨 AUTH GUARD: Page loaded from cache, re-verifying auth...');

      // Force fresh auth check
      authCheckComplete = false;
      authVerified = false;

      // Re-show loading overlay
      if (!document.getElementById('auth-guard-overlay')) {
        document.body.insertBefore(loadingOverlay, document.body.firstChild);
      }

      // Re-run auth check
      if (auth.currentUser && auth.currentUser.emailVerified) {
        authVerified = true;
        removeAuthGuard();
      } else {
        forceRedirectToLogin();
      }
    }
  });

  // 🚨 BACK/FORWARD NAVIGATION PROTECTION
  window.addEventListener('popstate', function() {
    if (!authVerified || !auth.currentUser || !auth.currentUser.emailVerified) {
      console.warn('🚨 AUTH GUARD: Invalid session on navigation');
      forceRedirectToLogin();
    }
  });

  // 🚨 VISIBILITY CHANGE PROTECTION (tab switching)
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') {
      // Tab became visible - re-check auth
      if (!auth.currentUser || !auth.currentUser.emailVerified) {
        console.warn('🚨 AUTH GUARD: Invalid session on tab focus');
        forceRedirectToLogin();
      }
    }
  });

  // 🚨 FAILSAFE: Force redirect after timeout if auth check hangs
  setTimeout(() => {
    if (!authCheckComplete) {
      console.error('🚨 AUTH GUARD: Auth check timeout - forcing redirect');
      forceRedirectToLogin();
    }
  }, 10000); // 10 second timeout

  /**
   * Force redirect to login using replace() to overwrite history
   */
  function forceRedirectToLogin() {
    // Clean up
    if (unsubscribe) unsubscribe();

    // Clear any cached data that might allow bypass
    try {
      sessionStorage.clear();
      // Don't clear localStorage as it might contain theme preferences
    } catch (e) {
      console.warn('Could not clear session storage:', e);
    }

    // 🚨 USE replace() to overwrite history entry - prevents back button access
    window.location.replace('login.html');
  }

  /**
   * Remove auth guard overlay and allow page to render
   */
  function removeAuthGuard() {
    const overlay = document.getElementById('auth-guard-overlay');
    if (overlay) {
      overlay.style.opacity = '0';
      overlay.style.pointerEvents = 'none';
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      }, 300);
    }
  }

  // 🚨 PREVENT RIGHT-CLICK INSPECTION (additional security layer)
  document.addEventListener('contextmenu', function(e) {
    if (!authVerified) {
      e.preventDefault();
      return false;
    }
  });

  // 🚨 PREVENT KEYBOARD SHORTCUTS (additional security layer)
  document.addEventListener('keydown', function(e) {
    if (!authVerified) {
      // Prevent F12, Ctrl+Shift+I, Ctrl+U, etc.
      if (e.key === 'F12' ||
          (e.ctrlKey && e.shiftKey && e.key === 'I') ||
          (e.ctrlKey && e.key === 'U')) {
        e.preventDefault();
        return false;
      }
    }
  });

})();
