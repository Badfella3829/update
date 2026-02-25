import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from
"https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, getDocs, query, where, orderBy } from
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
  await loadTimeBasedAnalytics();
  await loadUserSegmentationAnalytics();
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

// ─── TIME-BASED ANALYTICS ────────────────────────────────────────────────────
async function loadTimeBasedAnalytics() {
  try {
    const usageSnap = await getDocs(collection(db, "usage_logs"));

    // Build a map: date-string → count
    const dailyCounts = {};
    const weeklyCounts = {};

    usageSnap.forEach(docSnap => {
      const data = docSnap.data();
      if (data.event !== 'tool_usage') return;

      // Normalise timestamp (Firestore Timestamp or ISO string)
      let ts = null;
      if (data.timestamp && typeof data.timestamp.toDate === 'function') {
        ts = data.timestamp.toDate();
      } else if (data.data && data.data.timestamp) {
        ts = new Date(data.data.timestamp);
      }
      if (!ts || isNaN(ts)) return;

      const dateStr = ts.toISOString().slice(0, 10); // YYYY-MM-DD
      dailyCounts[dateStr] = (dailyCounts[dateStr] || 0) + 1;

      // ISO week key: YYYY-W##
      const weekNum = getISOWeek(ts);
      const weekKey = `${ts.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
      weeklyCounts[weekKey] = (weeklyCounts[weekKey] || 0) + 1;
    });

    // Last 7 days for chart
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      last7.push({ label: key.slice(5), count: dailyCounts[key] || 0 });
    }

    // Render daily chart
    const dailyCtx = document.getElementById('dailyChart');
    if (dailyCtx) {
      new Chart(dailyCtx, {
        type: 'bar',
        data: {
          labels: last7.map(d => d.label),
          datasets: [{
            label: 'Tool Uses',
            data: last7.map(d => d.count),
            backgroundColor: '#3b82f6',
            borderRadius: 6
          }]
        },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
      });
    }

    // Render weekly summary list
    const weeklyEl = document.getElementById('weeklyStats');
    if (weeklyEl) {
      const sorted = Object.entries(weeklyCounts).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 6);
      weeklyEl.innerHTML = sorted.length
        ? sorted.map(([week, count]) => `<li>${week}: <b>${count}</b> uses</li>`).join('')
        : '<li>No weekly data yet.</li>';
    }

  } catch (err) {
    console.error('Time-based analytics error:', err);
  }
}

function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// ─── USER SEGMENTATION ANALYTICS ────────────────────────────────────────────
async function loadUserSegmentationAnalytics() {
  try {
    const usersSnap = await getDocs(collection(db, "users"));

    let freeActive = 0, freeInactive = 0, paidActive = 0, paidInactive = 0;
    const now = Date.now();
    const ACTIVE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

    usersSnap.forEach(docSnap => {
      const u = docSnap.data();
      const plan = u.plan || 'free';
      const isPaid = plan !== 'free';

      let lastLoginMs = null;
      if (u.lastLogin && typeof u.lastLogin.toDate === 'function') {
        lastLoginMs = u.lastLogin.toDate().getTime();
      } else if (u.lastLogin) {
        lastLoginMs = new Date(u.lastLogin).getTime();
      }

      const isActive = lastLoginMs && (now - lastLoginMs) < ACTIVE_THRESHOLD_MS;

      if (isPaid) { isActive ? paidActive++ : paidInactive++; }
      else        { isActive ? freeActive++ : freeInactive++; }
    });

    // Render segmentation chart
    const segCtx = document.getElementById('segmentationChart');
    if (segCtx) {
      new Chart(segCtx, {
        type: 'doughnut',
        data: {
          labels: ['Free Active', 'Free Inactive', 'Paid Active', 'Paid Inactive'],
          datasets: [{
            data: [freeActive, freeInactive, paidActive, paidInactive],
            backgroundColor: ['#3b82f6', '#93c5fd', '#f59e0b', '#fcd34d']
          }]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
      });
    }

    // Summary stats
    const segSummaryEl = document.getElementById('segmentationSummary');
    if (segSummaryEl) {
      segSummaryEl.innerHTML = `
        <li>Free Active (last 7d): <b>${freeActive}</b></li>
        <li>Free Inactive: <b>${freeInactive}</b></li>
        <li>Paid Active (last 7d): <b>${paidActive}</b></li>
        <li>Paid Inactive: <b>${paidInactive}</b></li>
      `;
    }

  } catch (err) {
    console.error('Segmentation analytics error:', err);
  }
}
