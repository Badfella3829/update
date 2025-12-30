import { auth } from "./firebase.js";
import { onAuthStateChanged, signOut } from
"https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { checkDevice } from "./remember-device.js";

checkDevice();

onAuthStateChanged(auth, (user) => {
  if (user) {
    document.getElementById("email").innerText = user.email;
    document.getElementById("uid").innerText = user.uid;
  } else {
    location.href = "login.html";
  }
});

window.logout = function () {
  signOut(auth).then(() => {
    localStorage.clear();
    location.href = "login.html";
  });
};
