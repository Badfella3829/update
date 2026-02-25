import { auth } from "./firebase.js";
import { onAuthStateChanged, signOut } from
"https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { checkDevice } from "./remember-device.js";
import { getFirestore, collection, query, orderBy, limit, getDocs, doc, getDoc, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const db = getFirestore();

checkDevice();

onAuthStateChanged(auth, async (user) => {
  if (user) {
    document.getElementById("email").innerText = user.email;
    document.getElementById("uid").innerText = user.uid;

    // Fetch user data for last login info
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const userData = userDoc.data();

    // 🔐 Display last login info
    if (userData && userData.lastLogin) {
      const lastLoginDate = new Date(userData.lastLogin.seconds * 1000);
      document.getElementById("lastLogin").innerText = lastLoginDate.toLocaleString();
    } else {
      document.getElementById("lastLogin").innerText = "Never";
    }

    if (userData && userData.lastLoginDevice) {
      // Simplify device info for display
      const device = userData.lastLoginDevice;
      let simplifiedDevice = "Unknown Device";
      if (device.includes("Windows")) simplifiedDevice = "Windows PC";
      else if (device.includes("Mac")) simplifiedDevice = "Mac";
      else if (device.includes("Linux")) simplifiedDevice = "Linux PC";
      else if (device.includes("Android")) simplifiedDevice = "Android Device";
      else if (device.includes("iPhone") || device.includes("iPad")) simplifiedDevice = "iOS Device";
      document.getElementById("lastLoginDevice").innerText = simplifiedDevice;
    } else {
      document.getElementById("lastLoginDevice").innerText = "Unknown";
    }

    // Load billing history
    await loadBillingHistory(user.uid);
  } else {
    location.href = "login.html";
  }
});

// Load billing history and last transaction
async function loadBillingHistory(uid) {
  try {
    const paymentsRef = collection(db, "users", uid, "payments");
    const q = query(paymentsRef, orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);

    const payments = [];
    querySnapshot.forEach((doc) => {
      payments.push({ id: doc.id, ...doc.data() });
    });

    // Display last transaction
    if (payments.length > 0) {
      displayLastTransaction(payments[0]);
    }

    // Display payment history
    displayPaymentHistory(payments);

  } catch (error) {
    console.error("Error loading billing history:", error);
    document.getElementById("paymentTableBody").innerHTML = `
      <tr>
        <td colspan="5" style="padding: 20px; text-align: center; color: #dc2626;">
          Error loading payment history. Please try again later.
        </td>
      </tr>
    `;
  }
}

// Display last transaction status
function displayLastTransaction(lastPayment) {
  const lastTransactionDiv = document.getElementById("lastTransaction");
  const detailsEl = document.getElementById("lastTransactionDetails");

  const date = new Date(lastPayment.timestamp.seconds * 1000).toLocaleDateString();
  const amount = (lastPayment.amount / 100).toFixed(2); // Convert paise to rupees
  const plan = lastPayment.plan.charAt(0).toUpperCase() + lastPayment.plan.slice(1);
  const status = lastPayment.status.charAt(0).toUpperCase() + lastPayment.status.slice(1);

  detailsEl.innerHTML = `
    <strong>${plan} Plan</strong> - ₹${amount} - ${status} on ${date}
    <br><small>Payment ID: ${lastPayment.paymentId}</small>
  `;

  lastTransactionDiv.style.display = "block";
}

// Display payment history table
function displayPaymentHistory(payments) {
  const tbody = document.getElementById("paymentTableBody");

  if (payments.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="padding: 20px; text-align: center; color: #64748b;">
          No payment history found.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = payments.map(payment => {
    const date = new Date(payment.timestamp.seconds * 1000).toLocaleDateString();
    const amount = (payment.amount / 100).toFixed(2); // Convert paise to rupees
    const plan = payment.plan.charAt(0).toUpperCase() + payment.plan.slice(1);
    const status = payment.status.charAt(0).toUpperCase() + payment.status.slice(1);

    return `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${date}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${plan}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">₹${amount}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">
          <span style="color: ${status === 'Success' ? '#16a34a' : '#dc2626'}; font-weight: 600;">${status}</span>
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">
          <button onclick="downloadInvoice('${payment.id}', '${payment.paymentId}', '${plan}', '${amount}', '${date}')" style="padding: 4px 8px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">Download</button>
        </td>
      </tr>
    `;
  }).join('');
}

// Download invoice as text file
window.downloadInvoice = function(paymentId, razorpayId, plan, amount, date) {
  const invoiceContent = `
TECHVYRO INVOICE
================

Payment ID: ${razorpayId}
Plan: ${plan}
Amount: ₹${amount}
Date: ${date}
Status: Success

Thank you for your payment!
For any queries, contact support@techvyro.com

Generated on: ${new Date().toLocaleString()}
  `.trim();

  const blob = new Blob([invoiceContent], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `invoice-${razorpayId}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Load suspicious activity warnings
async function loadSuspiciousActivities(uid) {
  try {
    const loginHistoryRef = collection(db, "users", uid, "loginHistory");
    const q = query(loginHistoryRef, where("suspicious", "==", true), orderBy("timestamp", "desc"), limit(10));
    const querySnapshot = await getDocs(q);

    const suspiciousActivities = [];
    querySnapshot.forEach((doc) => {
      suspiciousActivities.push({ id: doc.id, ...doc.data() });
    });

    displaySuspiciousActivities(suspiciousActivities);

  } catch (error) {
    console.error("Error loading suspicious activities:", error);
    // Don't show error to user for security reasons
  }
}

// Display suspicious activity warnings
function displaySuspiciousActivities(activities) {
  const section = document.getElementById("suspiciousActivitySection");
  const list = document.getElementById("suspiciousActivityList");

  if (activities.length === 0) {
    section.style.display = "none";
    return;
  }

  list.innerHTML = activities.map(activity => {
    const date = new Date(activity.timestamp.seconds * 1000).toLocaleString();
    const reasons = activity.suspiciousReasons || [];

    return `
      <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #fecaca;">
        <div style="font-weight: bold; color: #dc2626; margin-bottom: 5px;">
          Suspicious Login Detected
        </div>
        <div style="font-size: 13px; color: #7f1d1d; margin-bottom: 5px;">
          ${date}
        </div>
        <div style="font-size: 13px; color: #991b1b;">
          ${reasons.map(reason => `• ${reason}`).join('<br>')}
        </div>
        <div style="margin-top: 10px;">
          <a href="https://techvyro.com/forgot-password.html" style="color: #dc2626; text-decoration: underline; font-size: 13px;">
            Change Password if this wasn't you
          </a>
        </div>
      </div>
    `;
  }).join('');

  section.style.display = "block";
}

window.logout = async function () {
  try {
    // Sign out from Firebase
    await signOut(auth);

    // Clear all local storage data
    localStorage.clear();

    // Clear session storage if used
    sessionStorage.clear();

    // Clear any cached data
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
    }

    // Force redirect to login page
    window.location.href = "login.html";
  } catch (error) {
    console.error("Logout error:", error);
    // Force redirect even if logout fails
    window.location.href = "login.html";
  }
};
