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

  // Load usage analytics
  await loadUsageAnalytics();
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

async function loadUsageAnalytics() {
  try {
    // Get tool usage data
    const usageSnap = await getDocs(collection(db, "usage_logs"));
    const toolUsage = {};
    const dropOffReasons = {};
    const upgradeActions = {};

    usageSnap.forEach(doc => {
      const data = doc.data();
      if (data.event === 'tool_usage') {
        const tool = data.data.tool;
        toolUsage[tool] = (toolUsage[tool] || 0) + 1;
      } else if (data.event === 'user_drop_off') {
        const reason = data.data.reason;
        dropOffReasons[reason] = (dropOffReasons[reason] || 0) + 1;
      } else if (data.event === 'upgrade_behavior') {
        const action = data.data.action;
        upgradeActions[action] = (upgradeActions[action] || 0) + 1;
      }
    });

    // Display most used tools
    const mostUsedToolsEl = document.getElementById("mostUsedTools");
    if (mostUsedToolsEl) {
      const sortedTools = Object.entries(toolUsage).sort((a, b) => b[1] - a[1]);
      mostUsedToolsEl.innerHTML = sortedTools.slice(0, 5).map(([tool, count]) =>
        `<li>${tool}: ${count} uses</li>`).join('');
    }

    // Display drop-off reasons
    const dropOffEl = document.getElementById("dropOffReasons");
    if (dropOffEl) {
      const sortedDropOff = Object.entries(dropOffReasons).sort((a, b) => b[1] - a[1]);
      dropOffEl.innerHTML = sortedDropOff.map(([reason, count]) =>
        `<li>${reason}: ${count} instances</li>`).join('');
    }

    // Display upgrade behavior
    const upgradeBehaviorEl = document.getElementById("upgradeBehavior");
    if (upgradeBehaviorEl) {
      const sortedUpgrade = Object.entries(upgradeActions).sort((a, b) => b[1] - a[1]);
      upgradeBehaviorEl.innerHTML = sortedUpgrade.map(([action, count]) =>
        `<li>${action}: ${count} instances</li>`).join('');
    }

  } catch (error) {
    console.error('Error loading usage analytics:', error);
  }
}
