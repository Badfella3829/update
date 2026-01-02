/* ================================
   UPGRADE FLOW (FRONTEND ONLY)
   Pricing → Upgrade → Plan Change
   ================================ */

(function () {
  // Ensure base auth exists
  if (typeof setUserPlan !== "function") {
    console.warn("auth-plan.js not loaded");
    return;
  }

  document.addEventListener("DOMContentLoaded", () => {
    // Any button with data-upgrade="premium" will trigger upgrade
    const upgradeButtons = document.querySelectorAll('[data-upgrade="premium"]');

    upgradeButtons.forEach(button => {
      button.addEventListener("click", async (e) => {
        e.preventDefault();

        // Check if user is logged in
        if (!auth.currentUser) {
          alert("Please login first to upgrade.");
          window.location.href = "login.html";
          return;
        }

        // Initiate payment instead of fake upgrade
        buyPlan("premium");
      });
    });
  });
})();
