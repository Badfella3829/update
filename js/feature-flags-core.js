/**
 * Shared feature-flag helpers that are runtime-agnostic (browser/Node).
 */

export const DEFAULT_FEATURE_FLAGS = {
  login: true,
  signup: true,
  password_reset: true,
  payments: true,
  ai_chat: true,
  analytics: true
};

export function resolveFeatureEnabled(flags, feature, userId = null) {
  if (flags[feature] === true) {
    return true;
  }

  const betaList = flags[`${feature}_beta_users`];
  if (flags[feature] === false && userId && Array.isArray(betaList)) {
    return betaList.includes(userId);
  }

  return flags[feature] !== false;
}

export function createFeatureFlagsCache(cacheDurationMs = 5 * 60 * 1000) {
  let cachedFlags = null;
  let cachedAt = null;

  return {
    get(now = Date.now()) {
      if (cachedFlags && cachedAt && (now - cachedAt) < cacheDurationMs) {
        return cachedFlags;
      }
      return null;
    },
    set(flags, now = Date.now()) {
      cachedFlags = flags;
      cachedAt = now;
      return cachedFlags;
    },
    clear() {
      cachedFlags = null;
      cachedAt = null;
    }
  };
}
