import { auth, db } from "./firebase.js";
import { collection, query, where, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- ALERTS SYSTEM ---
async function getAlerts() {
  const user = auth.currentUser;
  if (!user) return [];

  try {
    const alertsRef = collection(db, 'alerts');
    const q = query(alertsRef, where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const alerts = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      alerts.push({
        message: data.message,
        type: data.type || 'info',
        time: getTimeAgo(data.createdAt?.toDate?.() || new Date(data.createdAt))
      });
    });
    return alerts;
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return [];
  }
}

async function initAlerts() {
  const alertsContent = document.getElementById('alertsContent');
  if (!alertsContent) return;

  alertsContent.innerHTML = '<div class="alert-item">Loading...</div>';

  const alertsData = await getAlerts();
  let currentAlertIndex = 0;

  if (alertsData.length === 0) {
    alertsContent.innerHTML = '<div class="alert-item">No new alerts.</div>';
    return;
  }

  function showAlert(index) {
    const alert = alertsData[index];
    const alertElement = document.createElement('div');
    alertElement.className = `alert-item ${alert.type}`;
    alertElement.innerHTML = `
      <div>${alert.message}</div>
      <small style="color: var(--text-muted); font-size: 11px; margin-top: 4px; display: block;">${alert.time}</small>
    `;
    alertsContent.innerHTML = '';
    alertsContent.appendChild(alertElement);
    alertElement.style.opacity = '0';
    setTimeout(() => {
      alertElement.style.transition = 'opacity 0.3s ease';
      alertElement.style.opacity = '1';
    }, 50);
  }

  showAlert(currentAlertIndex);

  setInterval(() => {
    currentAlertIndex = (currentAlertIndex + 1) % alertsData.length;
    showAlert(currentAlertIndex);
  }, 5000);
}

// --- TIPS / SUGGESTIONS SYSTEM ---
async function getTips() {
  // Simulate fetching data from an API - can be replaced with actual API call
  return new Promise(resolve => {
    setTimeout(() => {
      resolve([
        { message: "Try the AI Chat tool for instant help with coding questions", time: "Tip" },
        { message: "Use the Image Generator to create custom graphics for your projects", time: "Tip" },
        { message: "Upgrade to Premium for unlimited access to all tools", time: "Suggestion" },
        { message: "Check your usage statistics to optimize your workflow", time: "Tip" },
        { message: "Explore design tools to enhance your creative projects", time: "Suggestion" },
      ]);
    }, 1000);
  });
}

async function initTips() {
  const tipsContent = document.getElementById('tipsContent');
  if (!tipsContent) return;

  tipsContent.innerHTML = '<div class="tips-item">Loading...</div>';

  const tipsData = await getTips();
  let currentTipIndex = 0;

  if (tipsData.length === 0) {
    tipsContent.innerHTML = '<div class="tips-item">No new tips.</div>';
    return;
  }

  function showTip(index) {
    const tip = tipsData[index];
    const tipElement = document.createElement('div');
    tipElement.className = 'tips-item';
    tipElement.innerHTML = `
      <div>${tip.message}</div>
      <small style="color: var(--text-muted); font-size: 11px; margin-top: 4px; display: block;">${tip.time}</small>
    `;
    tipsContent.innerHTML = '';
    tipsContent.appendChild(tipElement);
    tipElement.style.opacity = '0';
    setTimeout(() => {
      tipElement.style.transition = 'opacity 0.3s ease';
      tipElement.style.opacity = '1';
    }, 50);
  }

  showTip(currentTipIndex);

  setInterval(() => {
    currentTipIndex = (currentTipIndex + 1) % tipsData.length;
    showTip(currentTipIndex);
  }, 7000);
}

// --- UTILITY FUNCTIONS ---
function getTimeAgo(date) {
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minutes ago`;
  if (hours < 24) return `${hours} hours ago`;
  return `${days} days ago`;
}

// --- EXPORTS ---
export { initAlerts, initTips };
