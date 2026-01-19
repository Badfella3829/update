import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, updateDoc, increment, addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let currentUser = null;
let userCredits = 0;
let userPlan = 'free';
let isInitialized = false;

export function initAuthCredits(options = {}) {
  const { 
    requireAuth = true, 
    requirePremium = false,
    creditCost = 5,
    onReady = null 
  } = options;

  return new Promise((resolve, reject) => {
    if (!auth) {
      if (!requireAuth) {
        isInitialized = true;
        if (onReady) onReady({ user: null, credits: 0, plan: 'free' });
        resolve({ user: null, credits: 0, plan: 'free' });
        return;
      }
      window.location.href = 'login.html';
      reject('No auth');
      return;
    }

    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (requireAuth) {
          window.location.href = 'login.html';
          reject('Not authenticated');
          return;
        }
        isInitialized = true;
        if (onReady) onReady({ user: null, credits: 0, plan: 'free' });
        resolve({ user: null, credits: 0, plan: 'free' });
        return;
      }

      currentUser = user;

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          userCredits = data.credits || 0;
          userPlan = data.plan || 'free';
          
          localStorage.setItem('userPlan', userPlan);
          localStorage.setItem('userCredits', userCredits);
        }
      } catch (e) {
        console.error('Error fetching user data:', e);
        userCredits = parseInt(localStorage.getItem('userCredits') || '200');
        userPlan = localStorage.getItem('userPlan') || 'free';
      }

      if (requirePremium && !['pro', 'premium', 'admin'].includes(userPlan)) {
        showPremiumRequired();
        reject('Premium required');
        return;
      }

      if (userCredits < creditCost) {
        showNoCredits();
        reject('Not enough credits');
        return;
      }

      isInitialized = true;
      if (onReady) onReady({ user: currentUser, credits: userCredits, plan: userPlan });
      resolve({ user: currentUser, credits: userCredits, plan: userPlan });
    });
  });
}

export async function deductCredits(amount = 5) {
  if (!currentUser || !db) {
    userCredits = Math.max(0, userCredits - amount);
    localStorage.setItem('userCredits', userCredits);
    return userCredits;
  }

  try {
    await updateDoc(doc(db, 'users', currentUser.uid), {
      credits: increment(-amount)
    });
    userCredits = Math.max(0, userCredits - amount);
    localStorage.setItem('userCredits', userCredits);
  } catch (e) {
    console.error('Error deducting credits:', e);
    userCredits = Math.max(0, userCredits - amount);
    localStorage.setItem('userCredits', userCredits);
  }

  return userCredits;
}

export async function logToolUsage(toolName) {
  if (!currentUser || !db) return;

  try {
    await addDoc(collection(db, 'usage_logs'), {
      userId: currentUser.uid,
      tool: toolName,
      timestamp: serverTimestamp(),
      plan: userPlan
    });
  } catch (e) {
    console.error('Error logging usage:', e);
  }
}

export function getCredits() {
  return userCredits;
}

export function getPlan() {
  return userPlan;
}

export function getUser() {
  return currentUser;
}

export function isPremiumUser() {
  return ['pro', 'premium', 'admin'].includes(userPlan);
}

function showPremiumRequired() {
  document.body.innerHTML = `
    <div style="min-height: 100vh; background: #020617; display: flex; align-items: center; justify-content: center; font-family: Inter, sans-serif;">
      <div style="text-align: center; padding: 40px; max-width: 400px;">
        <div style="font-size: 60px; margin-bottom: 20px;">👑</div>
        <h2 style="color: #e5e7eb; margin-bottom: 15px;">Premium Required</h2>
        <p style="color: #9aa0b4; margin-bottom: 25px;">This tool is available for Premium users only. Upgrade your plan to access all features.</p>
        <a href="dashboard.html" style="display: inline-block; background: linear-gradient(135deg, #a855f7, #6366f1); color: white; padding: 14px 30px; border-radius: 10px; text-decoration: none; margin-right: 10px;">Go to Dashboard</a>
        <a href="pricing.html" style="display: inline-block; background: rgba(59,130,246,0.2); color: #3b82f6; border: 1px solid rgba(59,130,246,0.3); padding: 14px 30px; border-radius: 10px; text-decoration: none;">Upgrade Now</a>
      </div>
    </div>
  `;
}

function showNoCredits() {
  document.body.innerHTML = `
    <div style="min-height: 100vh; background: #020617; display: flex; align-items: center; justify-content: center; font-family: Inter, sans-serif;">
      <div style="text-align: center; padding: 40px; max-width: 400px;">
        <div style="font-size: 60px; margin-bottom: 20px;">⚡</div>
        <h2 style="color: #e5e7eb; margin-bottom: 15px;">Not Enough Credits</h2>
        <p style="color: #9aa0b4; margin-bottom: 25px;">You need at least 5 credits to use this tool. Upgrade your plan or wait for credits to refresh.</p>
        <a href="dashboard.html" style="display: inline-block; background: #3b82f6; color: white; padding: 14px 30px; border-radius: 10px; text-decoration: none; margin-right: 10px;">Go to Dashboard</a>
        <a href="pricing.html" style="display: inline-block; background: rgba(59,130,246,0.2); color: #3b82f6; border: 1px solid rgba(59,130,246,0.3); padding: 14px 30px; border-radius: 10px; text-decoration: none;">Get More Credits</a>
      </div>
    </div>
  `;
}
