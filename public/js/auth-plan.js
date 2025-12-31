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

  // Get current plan
  window.getUserPlan = function () {
    return localStorage.getItem(PLAN_KEY);
  };

  // Set plan (used by upgrade/admin)
  window.setUserPlan = function (plan) {
    if (["classic", "premium", "admin"].includes(plan)) {
      localStorage.setItem(PLAN_KEY, plan);
      console.log("User plan set to:", plan);
    }
  };

  // Debug helper (optional)
  window.resetPlan = function () {
    localStorage.removeItem(PLAN_KEY);
    localStorage.setItem(PLAN_KEY, "classic");
    console.log("User plan reset to classic");
  };
})();
