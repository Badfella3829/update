import { db } from "./firebase.js";
import { doc, getDoc, updateDoc, collection, query, where, getDocs, addDoc } from
"https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { logDropOff } from "./logger.js";

// Cache for rate limits
let rateLimitsCache = null;
let rateLimitsTimestamp = null;
const RATE_LIMITS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Load rate limiting configuration from Firestore
export async function loadRateLimits() {
  const now = Date.now();

  if (rateLimitsCache && rateLimitsTimestamp && (now - rateLimitsTimestamp) < RATE_LIMITS_CACHE_DURATION) {
    return rateLimitsCache;
  }

  try {
    const limitsDoc = await getDoc(doc(db, "system", "rate_limits"));
    if (limitsDoc.exists()) {
      rateLimitsCache = limitsDoc.data();
      rateLimitsTimestamp = now;
      return rateLimitsCache;
    } else {
      // Default limits
      rateLimitsCache = {
        daily_limit_free: 5,
        daily_limit_premium: -1, // -1 means unlimited
        monthly_limit_free: 100,
        monthly_limit_premium: -1, // -1 means unlimited
        rate_limit_interval: 30 // seconds
      };
      rateLimitsTimestamp = now;
      return rateLimitsCache;
    }
  } catch (error) {
    console.error("Error loading rate limits:", error);
    return {
      daily_limit_free: 5,
      daily_limit_premium: -1,
      monthly_limit_free: 100,
      monthly_limit_premium: -1,
      rate_limit_interval: 30
    };
  }
}

// Get credits by UID (safe)
export async function getCreditsByUid(uid) {
  if (!uid) return 0;

  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) return 0;

  return snap.data().credits || 0;
}

// Check if free user has exceeded daily usage limit
export async function checkUsageLimit(uid, action = "ai_generation") {
  if (!uid) return false;

  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) return false;

  const userData = userSnap.data();
  const plan = userData.plan || "free";

  // Only limit free users
  if (plan !== "free") return false;

  // Get today's date
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Query usage logs for today
  const usageQuery = query(
    collection(db, "usage_logs"),
    where("uid", "==", uid),
    where("action", "==", action),
    where("date", ">=", today)
  );

  const usageSnap = await getDocs(usageQuery);
  const dailyCount = usageSnap.size;

  // Check if user has made referrals for limited premium access
  const hasReferrals = await hasMadeReferrals(uid);
  const dailyLimit = hasReferrals ? 10 : 5; // Double limit for users who made referrals

  // Check daily limit
  if (dailyCount >= dailyLimit) return true;

  // Load rate limits for monthly check
  const limits = await loadRateLimits();

  // Get current month start
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Query usage logs for this month
  const monthlyQuery = query(
    collection(db, "usage_logs"),
    where("uid", "==", uid),
    where("action", "==", action),
    where("date", ">=", monthStart)
  );

  const monthlySnap = await getDocs(monthlyQuery);
  const monthlyCount = monthlySnap.size;

  // Monthly limit (double for referrals)
  const monthlyLimit = hasReferrals ? limits.monthly_limit_free * 2 : limits.monthly_limit_free;

  return monthlyCount >= monthlyLimit;
}

// Check rate limiting: configurable interval between actions
export async function checkRateLimit(uid, action = "ai_generation") {
  if (!uid) return false;

  // Load rate limits configuration
  const limits = await loadRateLimits();

  const now = new Date();
  const intervalAgo = new Date(now.getTime() - limits.rate_limit_interval * 1000);

  // Query recent usage logs
  const rateQuery = query(
    collection(db, "usage_logs"),
    where("uid", "==", uid),
    where("action", "==", action),
    where("timestamp", ">=", intervalAgo)
  );

  const rateSnap = await getDocs(rateQuery);
  return rateSnap.size > 0; // If any recent action, rate limited
}

// Check if user has made referrals (for limited premium access)
export async function hasMadeReferrals(uid) {
  if (!uid) return false;

  try {
    const referralQuery = query(
      collection(db, "referrals"),
      where("referrerId", "==", uid),
      where("rewarded", "==", true)
    );
    const referralSnap = await getDocs(referralQuery);
    return referralSnap.size > 0;
  } catch (error) {
    console.error("Error checking referrals:", error);
    return false;
  }
}

// Log usage action
export async function logUsage(uid, action = "ai_generation") {
  if (!uid) return;

  const usageRef = collection(db, "usage_logs");
  await addDoc(usageRef, {
    uid: uid,
    action: action,
    date: new Date(),
    timestamp: new Date()
  });
}
