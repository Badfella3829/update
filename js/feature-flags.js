import { db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  DEFAULT_FEATURE_FLAGS,
  createFeatureFlagsCache,
  resolveFeatureEnabled
} from "./feature-flags-core.js";

const cache = createFeatureFlagsCache();

/**
 * Load feature flags from Firestore
 * @returns {Promise<Object>} Feature flags object
 */
export async function loadFeatureFlags() {
  const cachedFlags = cache.get();
  if (cachedFlags) {
    return cachedFlags;
  }

  try {
    const flagsDoc = await getDoc(doc(db, "system", "feature_flags"));
    if (flagsDoc.exists()) {
      return cache.set(flagsDoc.data());
    }

    return cache.set({ ...DEFAULT_FEATURE_FLAGS });
  } catch (error) {
    console.error("Error loading feature flags:", error);
    return { ...DEFAULT_FEATURE_FLAGS };
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
  return resolveFeatureEnabled(flags, feature, userId);
}

/**
 * Clear feature flags cache (useful for admin updates)
 */
export function clearFeatureFlagsCache() {
  cache.clear();
}
