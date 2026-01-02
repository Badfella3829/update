import { app } from "./firebase.js";
import { getFirestore, doc, getDoc, updateDoc, collection, query, where, getDocs, addDoc } from
"https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const db = getFirestore(app);

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

  // Limit: 5 AI generations per day for free users
  const limit = 5;
  return dailyCount >= limit;
}

// Check rate limiting: no more than one action per 30 seconds
export async function checkRateLimit(uid, action = "ai_generation") {
  if (!uid) return false;

  const now = new Date();
  const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000);

  // Query recent usage logs
  const rateQuery = query(
    collection(db, "usage_logs"),
    where("uid", "==", uid),
    where("action", "==", action),
    where("timestamp", ">=", thirtySecondsAgo)
  );

  const rateSnap = await getDocs(rateQuery);
  return rateSnap.size > 0; // If any recent action, rate limited
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
