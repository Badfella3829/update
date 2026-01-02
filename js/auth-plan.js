import { auth, db } from "./firebase.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ================================
   AUTH PLAN SYSTEM (BASE LOGIC)
   Classic | Premium | Admin
   ================================ */

(function () {
  const PLAN_KEY = "USER_PLAN";

  // Default plan
  if (!localStorage.getItem(PLAN_KEY)) {
    localStorage.setItem(PLAN_KEY, "classic");
  }

  // Get current plan - sync with Firestore
  window.getUserPlan = async function () {
    const user = auth.currentUser;
    if (user) {
      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const firestorePlan = userSnap.data().plan;
          if (firestorePlan) {
            // Sync localStorage with Firestore
            localStorage.setItem(PLAN_KEY, firestorePlan);
            return firestorePlan;
          }
        }
      } catch (error) {
        console.error("Error fetching plan from Firestore:", error);
      }
    }
    // Fallback to localStorage
    return localStorage.getItem(PLAN_KEY);
  };

  // Set plan (used by upgrade/admin) - update Firestore
  window.setUserPlan = async function (plan) {
    if (["classic", "premium", "admin"].includes(plan)) {
      localStorage.setItem(PLAN_KEY, plan);
      console.log("User plan set to:", plan);

      // Update Firestore if user is logged in
      const user = auth.currentUser;
      if (user) {
        try {
          const userRef = doc(db, "users", user.uid);
          await updateDoc(userRef, { plan: plan });
        } catch (error) {
          console.error("Error updating plan in Firestore:", error);
        }
      }
    }
  };

  // Debug helper (optional)
  window.resetPlan = function () {
    localStorage.removeItem(PLAN_KEY);
    localStorage.setItem(PLAN_KEY, "classic");
    console.log("User plan reset to classic");
  };
})();
