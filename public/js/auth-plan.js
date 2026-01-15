import { auth, db } from "./firebase.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { showError } from "./error-handler.js";

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
        showError("Unable to load your plan from online. Using saved settings.", { showRetry: true });
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
          showError("Plan updated locally but failed to save online. Please try again.", { showRetry: true });
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

  // Session / Auth Edge Cases Handling
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      // User is signed in
      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        // Check if user is blocked
        if (userSnap.exists() && userSnap.data().blocked === true) {
          showError("Your account has been blocked by admin. Please contact support.");
          await signOut(auth);
          return;
        }

        // Sync plan on auth state change
        const firestorePlan = userSnap.exists() ? userSnap.data().plan : null;
        if (firestorePlan) {
          localStorage.setItem(PLAN_KEY, firestorePlan);
        }
      } catch (error) {
        console.error("Error on auth state change:", error);
        // Auto logout on auth failure
        showError("Authentication error. Please login again.", { showRetry: false });
        await signOut(auth);
      }
    } else {
      // User is signed out
      // Clear local data on logout
      localStorage.removeItem(PLAN_KEY);
      localStorage.setItem(PLAN_KEY, "classic");
    }
  });
})();
