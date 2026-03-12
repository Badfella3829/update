import { auth, db } from "./firebase.js";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

function getGoogleButton() {
  return document.getElementById("googleBtn");
}

function showAuthToast(message, type = "error") {
  if (typeof window.showToast === "function") {
    window.showToast(message, type);
    return;
  }

  const toast = document.getElementById("toast");
  if (!toast) {
    alert(message);
    return;
  }

  toast.className = `toast ${type}`;
  toast.innerText = message;
  toast.style.display = "block";
  setTimeout(() => {
    toast.style.display = "none";
  }, 4000);
}

function setGoogleButtonState(loading) {
  const btn = getGoogleButton();
  const textNode = btn ? btn.querySelector(".google-btn-text") : null;

  if (!btn) return;
  btn.disabled = loading;

  if (textNode) {
    textNode.textContent = loading ? "Signing in..." : "Continue with Google";
  }
}

function signupTermsAccepted() {
  const termsCheckbox = document.getElementById("termsCheckbox");
  if (!termsCheckbox) return true;

  if (!termsCheckbox.checked) {
    showAuthToast("Please accept Terms & Privacy Policy before continuing with Google.", "error");
    return false;
  }

  return true;
}

async function upsertUserDocument(user) {
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    const data = snap.data();

    // 🚫 BLOCKED USER CHECK
    if (data.blocked === true) {
      await signOut(auth);
      throw new Error("blocked_user");
    }

    await updateDoc(userRef, {
      name: user.displayName || data.name || "",
      displayName: user.displayName || data.displayName || "",
      email: user.email || data.email || "",
      emailVerified: true,
      provider: "google",
      lastLogin: serverTimestamp(),
      lastLoginDevice: navigator.userAgent || "Unknown"
    });

    return;
  }

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
    referralCode,
    referredBy: null,
    createdAt: serverTimestamp(),
    lastLogin: serverTimestamp(),
    lastLoginDevice: navigator.userAgent || "Unknown",
    provider: "google"
  });
}

function mapGoogleAuthError(error) {
  if (error?.message === "blocked_user") {
    return "Your account has been blocked by admin. Please contact support.";
  }

  switch (error?.code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Sign-in popup was closed. Please try again.";
    case "auth/network-request-failed":
      return "Network error. Check your internet connection.";
    case "auth/operation-not-allowed":
      return "Google sign-in is not enabled. Please contact support.";
    case "auth/unauthorized-domain":
      return "This domain is not authorized for Google sign-in.";
    case "auth/popup-blocked":
      return "Popup blocked. Trying secure redirect sign-in...";
    default:
      return "Google sign-in failed. Please try again.";
  }
}

async function finishGoogleAuth(user) {
  await upsertUserDocument(user);
  window.location.href = "dashboard.html";
}

async function handleGoogleSignIn() {
  if (!signupTermsAccepted()) return;

  setGoogleButtonState(true);

  try {
    const result = await signInWithPopup(auth, provider);
    await finishGoogleAuth(result.user);
    return;
  } catch (error) {
    if (error?.code === "auth/popup-blocked") {
      showAuthToast(mapGoogleAuthError(error), "success");
      await signInWithRedirect(auth, provider);
      return;
    }

    showAuthToast(mapGoogleAuthError(error), "error");
  } finally {
    setGoogleButtonState(false);
  }
}

let redirectResultHandled = false;
async function handleRedirectFlow() {
  if (redirectResultHandled) return;
  redirectResultHandled = true;

  try {
    const result = await getRedirectResult(auth);
    if (!result?.user) return;

    setGoogleButtonState(true);
    await finishGoogleAuth(result.user);
  } catch (error) {
    showAuthToast(mapGoogleAuthError(error), "error");
    setGoogleButtonState(false);
  }
}

const btn = getGoogleButton();
if (btn) {
  btn.addEventListener("click", handleGoogleSignIn);
}

handleRedirectFlow();
