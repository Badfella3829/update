import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, updateDoc, increment, addDoc, collection, serverTimestamp, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let currentUser = null;
let userCredits = 0;
let userPlan = 'free';
let isInitialized = false;

const TOOL_CREDIT_COSTS = {
  'image-gen': 10,
  'logo-gen': 10,
  'voice-ai': 10,
  'content-ai': 10,
  'code-ai': 10,
  'email-ai': 8,
  'resume-ai': 10,
  'data-ai': 10,
  'chat': 5,
  'color-gen': 3,
  'gradient-gen': 3,
  'img-compress': 3,
  'img-convert': 3,
  'json-format': 3,
  'code-minify': 3,
  'jwt-decode': 3,
  'url-encode': 3,
  'regex-test': 3,
  'pass-gen': 3,
  'qr-gen': 3,
  'hashtag-gen': 3,
  'utm-gen': 3,
  'case-convert': 3,
  'unit-convert': 3,
  'ip-lookup': 3,
  'fake-data': 3
};

const LOW_CREDITS_THRESHOLD = 15;

export function getToolCreditCost(toolName) {
  return TOOL_CREDIT_COSTS[toolName] || 5;
}

export function initAuthCredits(options = {}) {
  const { 
    requireAuth = true, 
    requirePremium = false,
    creditCost = 5,
    toolName = null,
    onReady = null 
  } = options;

  const actualCost = toolName ? getToolCreditCost(toolName) : creditCost;

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

      if (userCredits < actualCost) {
        showNoCredits(actualCost);
        reject('Not enough credits');
        return;
      }

      if (userCredits <= LOW_CREDITS_THRESHOLD && userCredits > 0) {
        showLowCreditsWarning(userCredits);
      }

      isInitialized = true;
      if (onReady) onReady({ user: currentUser, credits: userCredits, plan: userPlan, creditCost: actualCost });
      resolve({ user: currentUser, credits: userCredits, plan: userPlan, creditCost: actualCost });
    });
  });
}

export async function deductCredits(amount = 5, toolName = null) {
  const actualAmount = toolName ? getToolCreditCost(toolName) : amount;
  
  if (!currentUser || !db) {
    userCredits = Math.max(0, userCredits - actualAmount);
    localStorage.setItem('userCredits', userCredits);
    return userCredits;
  }

  try {
    await updateDoc(doc(db, 'users', currentUser.uid), {
      credits: increment(-actualAmount)
    });
    userCredits = Math.max(0, userCredits - actualAmount);
    localStorage.setItem('userCredits', userCredits);

    await addDoc(collection(db, 'credit_history'), {
      userId: currentUser.uid,
      amount: -actualAmount,
      tool: toolName || 'unknown',
      balance: userCredits,
      timestamp: serverTimestamp(),
      type: 'deduction'
    });

    if (userCredits <= LOW_CREDITS_THRESHOLD && userCredits > 0) {
      showLowCreditsWarning(userCredits);
    }
  } catch (e) {
    console.error('Error deducting credits:', e);
    userCredits = Math.max(0, userCredits - actualAmount);
    localStorage.setItem('userCredits', userCredits);
  }

  return userCredits;
}

export async function logToolUsage(toolName) {
  if (!currentUser || !db) {
    addToRecentTools(toolName);
    return;
  }

  try {
    await addDoc(collection(db, 'usage_logs'), {
      userId: currentUser.uid,
      tool: toolName,
      timestamp: serverTimestamp(),
      plan: userPlan,
      creditCost: getToolCreditCost(toolName)
    });
    addToRecentTools(toolName);
  } catch (e) {
    console.error('Error logging usage:', e);
    addToRecentTools(toolName);
  }
}

function addToRecentTools(toolName) {
  let recent = JSON.parse(localStorage.getItem('recentTools') || '[]');
  recent = recent.filter(t => t !== toolName);
  recent.unshift(toolName);
  recent = recent.slice(0, 8);
  localStorage.setItem('recentTools', JSON.stringify(recent));
}

export function getRecentTools() {
  return JSON.parse(localStorage.getItem('recentTools') || '[]');
}

export function getFavoriteTools() {
  return JSON.parse(localStorage.getItem('favoriteTools') || '[]');
}

export function toggleFavorite(toolName) {
  let favorites = getFavoriteTools();
  if (favorites.includes(toolName)) {
    favorites = favorites.filter(t => t !== toolName);
  } else {
    favorites.push(toolName);
  }
  localStorage.setItem('favoriteTools', JSON.stringify(favorites));
  
  if (currentUser && db) {
    updateDoc(doc(db, 'users', currentUser.uid), {
      favoriteTools: favorites
    }).catch(e => console.error('Error syncing favorites:', e));
  }
  
  return favorites;
}

export function isFavorite(toolName) {
  return getFavoriteTools().includes(toolName);
}

export async function loadUserFavorites() {
  if (!currentUser || !db) return getFavoriteTools();
  
  try {
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    if (userDoc.exists() && userDoc.data().favoriteTools) {
      const favorites = userDoc.data().favoriteTools;
      localStorage.setItem('favoriteTools', JSON.stringify(favorites));
      return favorites;
    }
  } catch (e) {
    console.error('Error loading favorites:', e);
  }
  return getFavoriteTools();
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

export function getCreditCosts() {
  return { ...TOOL_CREDIT_COSTS };
}

function showLowCreditsWarning(credits) {
  const existingWarning = document.getElementById('lowCreditsWarning');
  if (existingWarning) return;

  const warning = document.createElement('div');
  warning.id = 'lowCreditsWarning';
  warning.innerHTML = `
    <div style="position: fixed; top: 20px; right: 20px; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 16px 24px; border-radius: 12px; box-shadow: 0 10px 40px rgba(245, 158, 11, 0.4); z-index: 10000; font-family: Inter, sans-serif; animation: slideIn 0.3s ease;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="font-size: 24px;">⚡</span>
        <div>
          <div style="font-weight: 600; margin-bottom: 2px;">Low Credits Warning</div>
          <div style="font-size: 13px; opacity: 0.9;">Only ${credits} credits left. <a href="pricing.html" style="color: white; text-decoration: underline;">Get more</a></div>
        </div>
        <button onclick="this.parentElement.parentElement.parentElement.remove()" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; font-size: 14px; margin-left: 8px;">&times;</button>
      </div>
    </div>
    <style>
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    </style>
  `;
  document.body.appendChild(warning);

  setTimeout(() => {
    if (warning.parentElement) warning.remove();
  }, 8000);
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

function showNoCredits(requiredCredits = 5) {
  document.body.innerHTML = `
    <div style="min-height: 100vh; background: #020617; display: flex; align-items: center; justify-content: center; font-family: Inter, sans-serif;">
      <div style="text-align: center; padding: 40px; max-width: 400px;">
        <div style="font-size: 60px; margin-bottom: 20px;">⚡</div>
        <h2 style="color: #e5e7eb; margin-bottom: 15px;">Not Enough Credits</h2>
        <p style="color: #9aa0b4; margin-bottom: 25px;">You need at least ${requiredCredits} credits to use this tool. Upgrade your plan or wait for credits to refresh.</p>
        <a href="dashboard.html" style="display: inline-block; background: #3b82f6; color: white; padding: 14px 30px; border-radius: 10px; text-decoration: none; margin-right: 10px;">Go to Dashboard</a>
        <a href="pricing.html" style="display: inline-block; background: rgba(59,130,246,0.2); color: #3b82f6; border: 1px solid rgba(59,130,246,0.3); padding: 14px 30px; border-radius: 10px; text-decoration: none;">Get More Credits</a>
      </div>
    </div>
  `;
}

export function setupKeyboardShortcuts(generateCallback) {
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (typeof generateCallback === 'function') {
        generateCallback();
      }
    }
  });
}
