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

        // Button loading state
        button.disabled = true;
        const oldText = button.innerText;
        button.innerText = "Processing…";

        // Fake delay (API / payment simulation)
        await new Promise(res => setTimeout(res, 1500));

        // Set plan to premium
        setUserPlan("premium");

        // Restore button
        button.innerText = "Upgraded ✓";
        button.disabled = true;

        // Success message
        alert("🎉 Upgrade Successful! You are now a Premium user.");

        // Optional redirect (commented for safety)
        // window.location.href = "dashboard.html";
      });
    });
  });
})();
