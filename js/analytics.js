import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from
"https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, getDocs } from
"https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ⚠️ SAME ADMIN EMAIL
const ADMIN_EMAIL = "badfella3829@gmail.com";

const totalUsersEl = document.getElementById("totalUsers");
const freeEl = document.getElementById("freeUsers");
const proEl = document.getElementById("proUsers");
const premiumEl = document.getElementById("premiumUsers");
const revenueEl = document.getElementById("revenue");

onAuthStateChanged(auth, async (user) => {
  if (!user || user.email !== ADMIN_EMAIL) {
    alert("Admins only");
    location.href = "dashboard.html";
    return;
  }

  const snap = await getDocs(collection(db, "users"));

  let total = 0;
  let free = 0;
  let pro = 0;
  let premium = 0;
  let revenue = 0;

  snap.forEach(doc => {
    const u = doc.data();
    total++;

    if (u.plan === "free") free++;
    if (u.plan === "pro") {
      pro++;
      revenue += 299;
    }
    if (u.plan === "premium") {
      premium++;
      revenue += 499;
    }
  });

  totalUsersEl.innerText = total;
  freeEl.innerText = free;
  proEl.innerText = pro;
  premiumEl.innerText = premium;
  revenueEl.innerText = revenue;

  drawChart(free, pro, premium);
});

function drawChart(free, pro, premium) {
  const ctx = document.getElementById("chart");

  new Chart(ctx, {
    type: "pie",
    data: {
      labels: ["Free", "Pro", "Premium"],
      datasets: [{
        data: [free, pro, premium],
        backgroundColor: ["#ccc", "#4caf50", "#ff9800"]
      }]
    }
  });
}
