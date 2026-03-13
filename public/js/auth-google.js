import { auth, db } from "./firebase.js";
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  fetchSignInMethodsForEmail,
  getRedirectResult,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

function getGoogleButton() {
  return document.getElementById("googleBtn");
}

function getAuthContext() {
  const path = (window.location.pathname || "").toLowerCase();
  if (path.includes("signup")) return "signup";
  if (path.includes("login")) return "login";
  return "generic";
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
  btn.dataset.loading = loading ? "true" : "";

  if (textNode) {
    const context = getAuthContext();
    const idleText = context === "signup" ? "Sign up with Google" : "Continue with Google";
    const loadingText = context === "signup" ? "Creating account..." : "Signing in...";
    textNode.textContent = loading ? loadingText : idleText;
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

function shouldUseRedirectFlow() {
  const ua = navigator.userAgent || "";
  const isIOS = /iPad|iPhone|iPod/i.test(ua);
  const isSamsungBrowser = /SamsungBrowser/i.test(ua);
  const isStandalone = window.matchMedia && window.matchMedia("(display-mode: standalone)").matches;

  return isIOS || isSamsungBrowser || isStandalone;
}

async function upsertUserDocument(user) {
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    const data = snap.data();

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

async function resolveAccountConflictMessage(error) {
  if (error?.code !== "auth/account-exists-with-different-credential") {
    return null;
  }

  const email = error?.customData?.email;
  if (!email) {
    return "This email is already linked to another sign-in method. Use that method first.";
  }

  try {
    const methods = await fetchSignInMethodsForEmail(auth, email);
    if (!methods.length) {
      return "This email is already linked to another sign-in method. Use that method first.";
    }

    if (methods.includes("password")) {
      return "This email already has a password account. Please log in with email/password first, then connect Google from settings.";
    }

    if (methods.includes("phone")) {
      return "This email is linked with phone sign-in. Please use phone login first.";
    }

    return `This email is linked to ${methods.join(", ")}. Please sign in using that method first.`;
  } catch {
    return "This email is already linked to another sign-in method. Use that method first.";
  }
}

async function mapGoogleAuthError(error) {
  if (error?.message === "blocked_user") {
    return "Your account has been blocked by admin. Please contact support.";
  }

  const conflictMessage = await resolveAccountConflictMessage(error);
  if (conflictMessage) {
    return conflictMessage;
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
      return "Popup blocked. Switching to secure redirect sign-in...";
    default:
      return "Google sign-in failed. Please try again.";
  }
}

async function finishGoogleAuth(user) {
  await upsertUserDocument(user);
  window.location.href = "dashboard.html";
}

function syncSignupGoogleButtonState() {
  if (getAuthContext() !== "signup") return;

  const termsCheckbox = document.getElementById("termsCheckbox");
  const btn = getGoogleButton();
  if (!termsCheckbox || !btn) return;

  const applyState = () => {
    const canUseGoogle = termsCheckbox.checked;
    if (!btn.dataset.loading) {
      btn.disabled = !canUseGoogle;
    }

    btn.setAttribute("aria-disabled", String(!canUseGoogle));
  };

  termsCheckbox.addEventListener("change", applyState);
  applyState();
}

async function startRedirectSignIn(message) {
  if (message) {
    showAuthToast(message, "success");
  }
  setGoogleButtonState(true);
  await signInWithRedirect(auth, provider);
}

async function handleGoogleSignIn() {
  if (!signupTermsAccepted()) return;

  setGoogleButtonState(true);

  try {
    await setPersistence(auth, browserLocalPersistence);

    if (shouldUseRedirectFlow()) {
      await startRedirectSignIn("Opening secure Google sign-in...");
      return;
    }

    const result = await signInWithPopup(auth, provider);
    await finishGoogleAuth(result.user);
    return;
  } catch (error) {
    if (error?.code === "auth/popup-blocked") {
      await startRedirectSignIn(await mapGoogleAuthError(error));
      return;
    }

    showAuthToast(await mapGoogleAuthError(error), "error");
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
    showAuthToast(await mapGoogleAuthError(error), "error");
    setGoogleButtonState(false);
  }
}

const btn = getGoogleButton();
if (btn) {
  btn.addEventListener("click", handleGoogleSignIn);
  setGoogleButtonState(false);
}

syncSignupGoogleButtonState();
handleRedirectFlow();
