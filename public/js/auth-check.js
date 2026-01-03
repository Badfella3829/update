// Authentication check and user session management
import { auth } from './firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// Check authentication state and handle redirects
function initAuthCheck() {
  onAuthStateChanged(auth, (user) => {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    // Pages that don't require authentication
    const publicPages = ['index.html', 'login.html', 'signup.html', 'forgot-password.html', 'otp-email.html', 'about.html', 'contact.html', 'pricing.html', 'privacy.html', 'terms.html', 'refund.html'];

    if (user) {
      // User is signed in
      console.log('User authenticated:', user.email);

      // Redirect authenticated users away from auth pages
      if (['login.html', 'signup.html', 'forgot-password.html', 'otp-email.html'].includes(currentPage)) {
        window.location.href = 'dashboard.html';
      }
    } else {
      // User is signed out
      console.log('User not authenticated');

      // Redirect unauthenticated users to login (except for public pages)
      if (!publicPages.includes(currentPage)) {
        window.location.href = 'login.html';
      }
    }
  });
}

// Initialize auth check when DOM is loaded
document.addEventListener('DOMContentLoaded', initAuthCheck);

// Export for use in other modules
export { initAuthCheck };
