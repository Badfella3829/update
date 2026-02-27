import { auth, db } from "./firebase.js";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const provider = new GoogleAuthProvider();

async function handleGoogleSignIn() {
  const btn = document.getElementById("googleBtn");
  const textNode = btn ? btn.querySelector(".google-btn-text") : null;

  if (btn) btn.disabled = true;
  if (textNode) textNode.textContent = "Signing in…";

  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Fetch or create user document in Firestore
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      // 🚫 BLOCKED USER CHECK
      if (snap.data().blocked === true) {
        await signOut(auth);
        alert("Your account has been blocked by admin. Please contact support.");
        return;
      }
    } else {
      // New Google user — create Firestore document
      const referralCode =
        (user.displayName || "USR").substring(0, 3).toUpperCase() +
        user.uid.substring(0, 5).toUpperCase();

      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        name: user.displayName || "",
        displayName: user.displayName || "",
        plan: "free",
        credits: 100,
        emailVerified: true,
        blocked: false,
        referralCode: referralCode,
        referredBy: null,
        createdAt: serverTimestamp(),
        lastLogin: null,
        lastLoginDevice: null,
        provider: "google"
      });
    }

    // ✅ Redirect to dashboard
    location.href = "dashboard.html";
  } catch (error) {
    console.error("Google sign-in error:", error);
    let message = "Google sign-in failed. Please try again.";
    if (error.code === "auth/popup-closed-by-user" || error.code === "auth/cancelled-popup-request") {
      message = "Sign-in cancelled.";
    } else if (error.code === "auth/network-request-failed") {
      message = "Network error. Check your internet connection.";
    } else if (error.code === "auth/popup-blocked") {
      message = "Pop-up blocked by browser. Please allow pop-ups for this site.";
    } else if (error.code === "auth/operation-not-allowed") {
      message = "Google sign-in is not enabled. Please contact support.";
    } else if (error.code === "auth/unauthorized-domain") {
      message = "This domain is not authorized for Google sign-in. Please contact support.";
    }
    alert(message);
  } finally {
    if (btn) btn.disabled = false;
    if (textNode) textNode.textContent = "Continue with Google";
  }
}

// Attach event listener once DOM is ready
const btn = document.getElementById("googleBtn");
if (btn) {
  btn.addEventListener("click", handleGoogleSignIn);
}
