import { auth, app } from "./firebase.js";
import { createUserWithEmailAndPassword } from
"https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc } from
"https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const db = getFirestore(app);

window.signup = async function () {
  const emailInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const msg = document.getElementById("msg");

  msg.innerText = "";
  msg.style.color = "red";

  let email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    msg.innerText = "Please fill all fields";
    return;
  }

  // Mobile → email convert
  if (!email.includes("@")) {
    email = email + "@mobile.techvyro";
  }

  try {
    // Create user
    const res = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    // Firestore user doc
    await setDoc(doc(db, "users", res.user.uid), {
      credits: 200,
      plan: "free",
      createdAt: new Date()
    });

    // ✅ SUCCESS MESSAGE (GUARANTEED VISIBLE)
    msg.style.color = "green";
    msg.innerText = "Signup successful 🎉 Redirecting to login...";

    setTimeout(() => {
      location.href = "login.html";
    }, 1500);

  } catch (err) {
    if (err.code === "auth/email-already-in-use") {
      msg.innerText = "Account already exists. Please login.";
      setTimeout(() => {
        location.href = "login.html";
      }, 1500);
    } else {
      msg.innerText = err.message;
    }
  }
};
