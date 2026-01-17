/**
 * Centralized Error Handling Utility
 * Provides user-friendly error messages, network error handling, and retry options
 */

// Error message mappings for user-friendly display
const ERROR_MESSAGES = {
  // Firebase Auth Errors
  'auth/user-not-found': 'Account not found. Please check your email or sign up.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/email-already-in-use': 'This email is already registered. Please login instead.',
  'auth/weak-password': 'Password is too weak. Please use at least 6 characters.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-disabled': 'This account has been disabled. Contact support.',
  'auth/too-many-requests': 'Too many attempts. Please wait a few minutes and try again.',
  'auth/network-request-failed': 'Network connection failed. Please check your internet and try again.',
  'auth/operation-not-allowed': 'This login method is currently disabled.',

  // Firestore Errors
  'permission-denied': 'Access denied. Please login again.',
  'not-found': 'Data not found. Please try again.',
  'unavailable': 'Service temporarily unavailable. Please try again in a moment.',

  // Network Errors
  'NETWORK_ERROR': 'No internet connection. Please check your network and try again.',
  'TIMEOUT_ERROR': 'Request timed out. Please try again.',
  'SERVER_ERROR': 'Server is busy. Please try again in a few moments.',

  // Generic
  'UNKNOWN_ERROR': 'Something went wrong. Please try again or contact support if the problem persists.'
};

// Check if error is network-related
function isNetworkError(error) {
  const networkIndicators = [
    'network-request-failed',
    'unavailable',
    'timeout',
    'fetch',
    'Failed to fetch',
    'NetworkError',
    'TypeError: Failed to fetch'
  ];

  const errorString = (error?.message || error?.code || error || '').toLowerCase();
  return networkIndicators.some(indicator => errorString.includes(indicator.toLowerCase()));
}

// Get user-friendly error message
export function getUserFriendlyMessage(error) {
  const errorCode = error?.code || error?.message || error;

  // Check for network errors first
  if (isNetworkError(error)) {
    return ERROR_MESSAGES['NETWORK_ERROR'];
  }

  // Check for specific error codes
  if (ERROR_MESSAGES[errorCode]) {
    return ERROR_MESSAGES[errorCode];
  }

  // Check for partial matches in error messages
  for (const [key, message] of Object.entries(ERROR_MESSAGES)) {
    if (typeof errorCode === 'string' && errorCode.includes(key)) {
      return message;
    }
  }

  return ERROR_MESSAGES['UNKNOWN_ERROR'];
}

// Show error message to user with optional retry option
export function showError(message, options = {}) {
  const {
    showRetry = false,
    retryCallback = null,
    title = null,
    type = 'error' // 'error', 'warning', 'info'
  } = options;

  // Auto-set title based on type if not provided
  const modalTitle = title || (type === 'info' ? 'Success!' : type === 'warning' ? 'Warning' : 'Oops!');

  // Create error modal/dialog
  const modal = document.createElement('div');
  modal.className = 'error-modal';
  modal.innerHTML = `
    <div class="error-modal-content">
      <div class="error-modal-header">
        <span class="error-modal-title">${modalTitle}</span>
        <button class="error-modal-close">&times;</button>
      </div>
      <div class="error-modal-body">
        <div class="error-icon ${type}"></div>
        <p class="error-message">${message}</p>
      </div>
      <div class="error-modal-footer">
        ${showRetry ? `<button class="retry-btn">Try Again</button>` : ''}
        <button class="ok-btn">OK</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Add event listeners
  const closeBtn = modal.querySelector('.error-modal-close');
  const okBtn = modal.querySelector('.ok-btn');
  const retryBtn = modal.querySelector('.retry-btn');

  const closeModal = () => {
    modal.remove();
  };

  closeBtn.addEventListener('click', closeModal);
  okBtn.addEventListener('click', closeModal);

  if (retryBtn && retryCallback) {
    retryBtn.addEventListener('click', () => {
      closeModal();
      retryCallback();
    });
  }

  // Auto-close after 10 seconds for non-retry errors
  if (!showRetry) {
    setTimeout(closeModal, 10000);
  }

  // Add CSS if not already present
  if (!document.querySelector('#error-modal-styles')) {
    const styles = document.createElement('style');
    styles.id = 'error-modal-styles';
    styles.textContent = `
      .error-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(2, 6, 23, 0.85);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
      }

      .error-modal-content {
        background: #141a2e;
        border-radius: 20px;
        border: 1px solid rgba(59, 130, 246, 0.3);
        box-shadow: 0 20px 60px rgba(59, 130, 246, 0.25);
        max-width: 400px;
        width: 90%;
        overflow: hidden;
        animation: modalSlideIn 0.3s ease-out;
      }

      @keyframes modalSlideIn {
        from { transform: translateY(-50px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }

      .error-modal-header {
        background: rgba(59, 130, 246, 0.1);
        padding: 16px 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .error-modal-title {
        font-weight: 700;
        color: #fff;
        margin: 0;
        font-size: 18px;
      }

      .error-modal-close {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #9aa0b4;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: all 0.2s;
      }

      .error-modal-close:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
      }

      .error-modal-body {
        padding: 28px 24px;
        text-align: center;
      }

      .error-icon {
        font-size: 48px;
        margin-bottom: 16px;
      }

      .error-icon.error::before { content: '❌'; }
      .error-icon.warning::before { content: '⚠️'; }
      .error-icon.info::before { content: '✅'; }

      .error-message {
        color: #e5e7eb;
        font-size: 16px;
        line-height: 1.6;
        margin: 0;
      }

      .error-modal-footer {
        padding: 16px 20px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        justify-content: flex-end;
        gap: 12px;
      }

      .error-modal-footer button {
        padding: 10px 20px;
        border: none;
        border-radius: 10px;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.3s;
      }

      .ok-btn {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .ok-btn:hover {
        background: rgba(255, 255, 255, 0.15);
        transform: translateY(-2px);
      }

      .retry-btn {
        background: #3b82f6;
        color: #020617;
      }

      .retry-btn:hover {
        background: #60a5fa;
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
      }
    `;
    document.head.appendChild(styles);
  }
}

// Enhanced async function wrapper with automatic error handling
export async function withErrorHandling(asyncFn, options = {}) {
  const {
    showRetry = true,
    customMessage = null,
    onError = null
  } = options;

  try {
    return await asyncFn();
  } catch (error) {
    console.error('Error caught by error handler:', error);

    const message = customMessage || getUserFriendlyMessage(error);

    showError(message, {
      showRetry,
      retryCallback: showRetry ? () => withErrorHandling(asyncFn, options) : null,
      type: isNetworkError(error) ? 'warning' : 'error'
    });

    if (onError) {
      onError(error);
    }

    throw error; // Re-throw for further handling if needed
  }
}

// Network status checker
export function isOnline() {
  return navigator.onLine;
}

// Listen for network changes
window.addEventListener('online', () => {
  showError('You are back online!', { type: 'info', showRetry: false });
});

window.addEventListener('offline', () => {
  showError('You are offline. Some features may not work.', { type: 'warning', showRetry: false });
});
