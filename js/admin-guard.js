/* ================================
   ADMIN GUARD SYSTEM
   Protects admin-only pages
   ================================ */

(function () {
  // Ensure base auth exists
  if (typeof getUserPlan !== "function") {
    console.warn("auth-plan.js not loaded");
    return;
  }

  document.addEventListener("DOMContentLoaded", () => {
    const plan = getUserPlan();

    // Allow only admin
    if (plan === "admin") return;

    // Block access for non-admin users
    showError("Access Denied: This area is for administrators only.", { showRetry: false });

    // Safe redirect (change if needed)
    setTimeout(() => window.location.href = "index.html", 2000);
  });
})();
