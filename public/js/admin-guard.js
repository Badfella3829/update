/* ================================
   ADMIN GUARD SYSTEM
   Protects admin-only pages
   ================================ */

import { showError } from "./error-handler.js";

document.addEventListener("DOMContentLoaded", async () => {
  // Ensure base auth exists
  if (typeof getUserPlan !== "function") {
    console.warn("auth-plan.js not loaded");
    return;
  }

  const plan = await getUserPlan();

  // Allow only admin
  if (plan === "admin") return;

  // Block access for non-admin users
  showError("Access Denied: This area is for administrators only.", { showRetry: false });

  // Safe redirect (change if needed)
  setTimeout(() => window.location.href = "index.html", 2000);
});
