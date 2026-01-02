/* ================================
   PREMIUM GUARD SYSTEM
   Locks premium features for
   Classic users only
   ================================ */

(function () {
  // Ensure auth-plan is loaded
  if (typeof getUserPlan !== "function") {
    console.warn("auth-plan.js not loaded");
    return;
  }

  const userPlan = getUserPlan();

  // Only apply locks for classic users
  if (userPlan !== "classic") return;

  document.addEventListener("DOMContentLoaded", () => {
    // Lock premium sections
    document.querySelectorAll(".premium-only").forEach(el => {
      el.classList.add("premium-blur");
      el.setAttribute("data-locked", "true");
    });

    // Disable premium buttons
    document.querySelectorAll(".premium-btn").forEach(btn => {
      btn.disabled = true;
      btn.classList.add("premium-disabled");

      btn.addEventListener("click", e => {
        e.preventDefault();
        alert("🔒 This feature is Premium. Please upgrade to continue.");
      });
    });
  });
})();
