import { db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Cache for feature flags to avoid repeated Firestore calls
let featureFlagsCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Load feature flags from Firestore
 * @returns {Promise<Object>} Feature flags object
 */
export async function loadFeatureFlags() {
  const now = Date.now();

  // Return cached flags if still valid
  if (featureFlagsCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
    return featureFlagsCache;
  }

  try {
    const flagsDoc = await getDoc(doc(db, "system", "feature_flags"));
    if (flagsDoc.exists()) {
      featureFlagsCache = flagsDoc.data();
      cacheTimestamp = now;
      return featureFlagsCache;
    } else {
      // Default flags if document doesn't exist
      featureFlagsCache = {
        login: true,
        signup: true,
        password_reset: true,
        payments: true,
        ai_chat: true,
        analytics: true
      };
      cacheTimestamp = now;
      return featureFlagsCache;
    }
  } catch (error) {
    console.error("Error loading feature flags:", error);
    // Return default flags on error
    return {
      login: true,
      signup: true,
      password_reset: true,
      payments: true,
      ai_chat: true,
      analytics: true
    };
  }
}

/**
 * Check if a specific feature is enabled
 * @param {string} feature - Feature name
 * @param {string} [userId] - Optional user ID for beta user checks
 * @returns {Promise<boolean>} Whether the feature is enabled
 */
export async function isFeatureEnabled(feature, userId = null) {
  const flags = await loadFeatureFlags();

  // If globally enabled, return true
  if (flags[feature] === true) {
    return true;
  }

  // If globally disabled, check if user is in beta list
  if (flags[feature] === false && userId && flags[`${feature}_beta_users`] && Array.isArray(flags[`${feature}_beta_users`])) {
    return flags[`${feature}_beta_users`].includes(userId);
  }

  // Default to true if not set
  return flags[feature] !== false;
}

/**
 * Clear feature flags cache (useful for admin updates)
 */
export function clearFeatureFlagsCache() {
  featureFlagsCache = null;
  cacheTimestamp = null;
}
