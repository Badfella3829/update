import { auth, db } from "./firebase.js";
import { signInWithEmailAndPassword, signOut } from
"https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc } from
"https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { canLogin, recordFail, resetAttempts } from "./auth-attempt.js";
import { saveDevice } from "./remember-device.js";

window.login = async function () {
  // 🔐 Login attempt limit
  if (!canLogin()) return;

  const u = document.getElementById("username").value.trim();
  const p = document.getElementById("password").value;

  // Basic validation
  if (!u || !p) {
    alert("Please enter username and password");
    return;
  }

  // Mobile → email conversion
  const email = u.includes("@") ? u : u + "@mobile.techvyro";

  try {
    // 🔑 Firebase Auth login
    const res = await signInWithEmailAndPassword(auth, email, p);

    // 📦 Fetch user document from Firestore
    const snap = await getDoc(doc(db, "users", res.user.uid));

    // 🚫 BLOCKED USER CHECK
    if (snap.exists() && snap.data().blocked === true) {
      alert("Your account has been blocked by admin.");
      await signOut(auth);
      return;
    }

    // ✅ Login success
    resetAttempts();
    saveDevice();

    alert("Login successful 🎉");

    // Redirect
    setTimeout(() => {
      location.href = "profile.html";
    }, 800);

  } catch (err) {
    // ❌ Login failed
    recordFail();
    alert("Invalid credentials");
  }
};
