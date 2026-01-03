/**
 * Simple Logging and Analytics Utility
 * Tracks user events, errors, and performance metrics
 */

import { db } from "./firebase.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { showError } from "./error-handler.js";

// Log levels
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

// Current log level (can be changed based on environment)
const CURRENT_LEVEL = LOG_LEVELS.INFO;

/**
 * Core logging function
 */
function log(level, event, data = {}, userId = null) {
  if (level < CURRENT_LEVEL) return;

  const logEntry = {
    timestamp: serverTimestamp(),
    level: Object.keys(LOG_LEVELS)[level],
    event,
    data: {
      ...data,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString()
    },
    userId: userId || getCurrentUserId()
  };

  // Console logging for development
  const consoleMethod = level === LOG_LEVELS.ERROR ? 'error' :
                       level === LOG_LEVELS.WARN ? 'warn' :
                       level === LOG_LEVELS.INFO ? 'info' : 'debug';

  console[consoleMethod](`[${logEntry.level}] ${event}:`, logEntry.data);

  // Store in Firestore (async, don't wait)
  storeLog(logEntry).catch(err => {
    console.error('Failed to store log:', err);
  });
}

/**
 * Store log entry in Firestore
 */
async function storeLog(logEntry) {
  try {
    // Use different collections for different log types
    let collectionName = 'logs';

    if (logEntry.event.includes('auth') || logEntry.event.includes('login') || logEntry.event.includes('signup')) {
      collectionName = 'auth_logs';
    } else if (logEntry.event.includes('payment') || logEntry.event.includes('upgrade')) {
      collectionName = 'payment_logs';
    } else if (logEntry.event.includes('error') || logEntry.level === 'ERROR') {
      collectionName = 'error_logs';
    } else if (logEntry.data.category === 'usage_analytics') {
      collectionName = 'usage_logs';
    }

    await addDoc(collection(collectionName), logEntry);
  } catch (error) {
    // Don't throw - logging failures shouldn't break the app
    console.error('Log storage failed:', error);
  }
}

/**
 * Get current user ID from auth state
 */
function getCurrentUserId() {
  // This will be set by the auth state listener
  return window.currentUserId || null;
}

/**
 * Set current user ID (called from auth listeners)
 */
export function setCurrentUser(user) {
  window.currentUserId = user ? user.uid : null;
}

// Public logging methods
export const logger = {
  debug: (event, data) => log(LOG_LEVELS.DEBUG, event, data),
  info: (event, data) => log(LOG_LEVELS.INFO, event, data),
  warn: (event, data) => log(LOG_LEVELS.WARN, event, data),
  error: (event, data) => log(LOG_LEVELS.ERROR, event, data)
};

// Specialized logging functions
export function logAuthEvent(event, data = {}) {
  logger.info(`auth_${event}`, {
    ...data,
    category: 'authentication'
  });
}

export function logPaymentEvent(event, data = {}) {
  logger.info(`payment_${event}`, {
    ...data,
    category: 'payment'
  });
}

export function logError(error, context = {}) {
  logger.error('application_error', {
    ...context,
    error: {
      message: error.message || error,
      stack: error.stack,
      code: error.code,
      name: error.name
    }
  });
}

export function logUserAction(action, data = {}) {
  logger.info(`user_${action}`, {
    ...data,
    category: 'user_action'
  });
}

// Usage Analytics Functions
export function logToolUsage(toolName, data = {}) {
  logger.info('tool_usage', {
    ...data,
    tool: toolName,
    category: 'usage_analytics'
  });
}

export function logDropOff(reason, data = {}) {
  logger.warn('user_drop_off', {
    ...data,
    reason, // e.g., 'credit_exhausted', 'premium_feature_attempted'
    category: 'usage_analytics'
  });
}

export function logUpgradeBehavior(action, data = {}) {
  logger.info('upgrade_behavior', {
    ...data,
    action, // e.g., 'usage_increased', 'tool_preference_changed'
    category: 'usage_analytics'
  });
}

// Performance tracking
export function logPerformance(metric, value, data = {}) {
  logger.info('performance_metric', {
    ...data,
    metric,
    value,
    category: 'performance'
  });
}

// Page view tracking
export function logPageView(page, data = {}) {
  logger.info('page_view', {
    ...data,
    page,
    category: 'navigation'
  });
}

// Error boundary for catching unhandled errors
window.addEventListener('error', (event) => {
  logError(event.error || new Error(event.message), {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    category: 'unhandled_error'
  });
});

// Promise rejection tracking
window.addEventListener('unhandledrejection', (event) => {
  logError(event.reason || new Error('Unhandled promise rejection'), {
    category: 'unhandled_promise_rejection'
  });
});

// Network status monitoring
let isOnline = navigator.onLine;
window.addEventListener('online', () => {
  if (!isOnline) {
    logger.info('network_restored', {
      category: 'network',
      previous_state: 'offline'
    });
    isOnline = true;
  }
});

window.addEventListener('offline', () => {
  logger.warn('network_lost', {
    category: 'network',
    current_state: 'offline'
  });
  isOnline = false;
});

// Page visibility tracking
document.addEventListener('visibilitychange', () => {
  logger.info('page_visibility_change', {
    hidden: document.hidden,
    category: 'engagement'
  });
});

// Initialize page view logging
document.addEventListener('DOMContentLoaded', () => {
  logPageView(window.location.pathname);
});
