import { auth } from "./firebase.js";
import { onAuthStateChanged } from
"https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getCreditsByUid } from "./credits.js";

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = "login.html";
    return;
  }

  // Now user is guaranteed
  const credits = await getCreditsByUid(user.uid);

  const el = document.getElementById("credits");
  if (el) {
    el.innerText = credits;
  }
});
