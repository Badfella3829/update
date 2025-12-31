import { app } from "./firebase.js";
import { getFirestore, doc, getDoc } from
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
