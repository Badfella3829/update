import { auth } from "./firebase.js";
import { sendPasswordResetEmail } from
"https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

window.resetPassword = function () {
  let email = document.querySelector("input").value;

  sendPasswordResetEmail(auth, email)
    .then(() => alert("Password reset link sent"))
    .catch(err => alert(err.message));
};
