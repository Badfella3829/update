import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getCreditsByUid } from "./credits.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const db = getFirestore();

// --- LOADING STATES ---
function showUserDataLoading() {
  const userNameEl = document.getElementById("userName");
  const userPlanEl = document.getElementById("userPlan");
  const memberSinceEl = document.getElementById("memberSince");

  if (userNameEl) userNameEl.innerText = "Loading...";
  if (userPlanEl) userPlanEl.innerText = "Loading...";
  if (memberSinceEl) memberSinceEl.innerText = "Loading...";

  // Disable buttons during loading
  disableButtonsDuringProcessing(true);
}

function hideUserDataLoading() {
  // Loading is hidden by updating the elements with actual data
  // Re-enable buttons after loading
  disableButtonsDuringProcessing(false);
}

// --- BUTTON DISABLED STATES ---
function disableButtonsDuringProcessing(disable) {
  const buttonsToDisable = [
    'settings-btn',
    'theme-toggle-btn',
    'notification-icon',
    'sidebar-upgrade-btn'
  ];

  buttonsToDisable.forEach(btnId => {
    const btn = document.getElementById(btnId);
    if (btn) {
      btn.disabled = disable;
      btn.style.opacity = disable ? '0.6' : '1';
      btn.style.cursor = disable ? 'not-allowed' : 'pointer';
    }
  });

  // Also handle upgrade buttons in cards
  const upgradeBtns = document.querySelectorAll('.upgrade-btn');
  upgradeBtns.forEach(btn => {
    btn.disabled = disable;
    btn.style.opacity = disable ? '0.6' : '1';
    btn.style.cursor = disable ? 'not-allowed' : 'pointer';
  });
}

// --- PREMIUM AWARENESS ---
function updatePremiumAwareness(userPlan) {
  const upgradeButtons = document.querySelectorAll('.sidebar-upgrade-btn, .upgrade-btn');
  const premiumSections = document.querySelectorAll('.premium-highlight-section');

  if (userPlan === 'premium') {
    // Hide upgrade buttons and premium highlight sections for premium users
    upgradeButtons.forEach(btn => btn.style.display = 'none');
    premiumSections.forEach(section => section.style.display = 'none');
  } else {
    // Show upgrade buttons and premium highlight sections for free users
    upgradeButtons.forEach(btn => btn.style.display = 'block');
    premiumSections.forEach(section => section.style.display = 'block');
  }
}

// --- SETTINGS ACTIONS ---
window.openProfile = () => {
  // Navigate to profile page or open profile modal
  window.location.href = "profile.html";
};

window.openHelp = () => {
  // Navigate to support/contact page
  window.location.href = "contact.html";
};

// --- AUTHENTICATION CHECK ---
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = "login.html";
    return;
  }

  // Show loading state for user data
  showUserDataLoading();

  try {
    // Fetch user profile data from Firestore
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const userData = userDoc.data();

    // Update Credits in Navbar
    const credits = await getCreditsByUid(user.uid);
    const el = document.getElementById("creditText");
    if (el) el.innerText = `⚡ ${credits} Credits`;

    // Update Progress Bar
    const bar = document.getElementById("creditBar");
    if(bar) bar.style.width = `${(credits/200)*100}%`;

    // Update User Name
    const nameEl = document.getElementById("userName");
    if(nameEl) {
      if (user.displayName) {
        nameEl.innerText = user.displayName;
      } else if (user.email) {
        // Fallback to email username if no display name
        nameEl.innerText = user.email.split('@')[0];
      } else {
        nameEl.innerText = "User";
      }
    }

    // Update User Plan
    const planEl = document.getElementById("userPlan");
    const userPlan = userData?.plan || "free";
    if (planEl) {
      const planText = userPlan.charAt(0).toUpperCase() + userPlan.slice(1) + " Plan";
      planEl.innerText = planText;
      planEl.className = `plan-badge ${userPlan}`;
    }
    // Store user plan in localStorage for use by openPremiumTool and getUserPlan
    localStorage.setItem('userPlan', userPlan);

    // Update Member Since Date
    const memberSinceEl = document.getElementById("memberSince");
    if (memberSinceEl && userData?.createdAt) {
      const createdDate = userData.createdAt.toDate ? userData.createdAt.toDate() : new Date(userData.createdAt);
      const formattedDate = createdDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      memberSinceEl.innerText = `Member since ${formattedDate}`;
    }

    // Dynamic Premium Awareness - Show/Hide upgrade elements based on plan
    updatePremiumAwareness(userPlan);

    // === RECENT ACTIVITY SECTION ===
    updateRecentActivity(user, userData, credits);

    // Hide loading state
    hideUserDataLoading();

  } catch (error) {
    console.error("Error fetching user data:", error);
    hideUserDataLoading();
    // Fallback: show basic user info
    const nameEl = document.getElementById("userName");
    if(nameEl) {
      if (user.displayName) {
        nameEl.innerText = user.displayName;
      } else if (user.email) {
        nameEl.innerText = user.email.split('@')[0];
      } else {
        nameEl.innerText = "User";
      }
    }
  }
});

// --- DASHBOARD LOGIC ---
document.addEventListener('DOMContentLoaded', () => {

    // Ghost Loading Sequence: Show skeletons first, then content
    const sectionsWithContent = ['ai-tools', 'design-tools', 'dev-tools'];
    const sectionsWithoutContent = ['seo', 'util', 'file'];

    // Show skeletons initially for sections with content
    sectionsWithContent.forEach(id => {
        const grid = document.getElementById(`${id}-grid`);
        if (grid) grid.style.display = 'grid';
        const content = document.getElementById(`${id}-content`);
        if (content) content.style.display = 'none';
    });

    // Swap to content after 1.5 seconds
    setTimeout(() => {
        sectionsWithContent.forEach(id => {
            const grid = document.getElementById(`${id}-grid`);
            if (grid) grid.style.display = 'none';
            const content = document.getElementById(`${id}-content`);
            if (content) {
                content.style.display = 'grid';
                animateEntry(content);
            }
        });
    }, 1500);

    // Ensure grids are visible for sections without content
    sectionsWithoutContent.forEach(id => {
        const grid = document.getElementById(`${id}-grid`);
        if (grid) grid.style.display = 'grid';
    });


    // 2. REAL-TIME SEARCH LOGIC
    const searchInput = document.getElementById('globalSearch');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            let totalVisible = 0;
            const allCards = document.querySelectorAll('.card');

            allCards.forEach(card => {
                const title = card.querySelector('h3')?.innerText.toLowerCase() || "";
                const desc = card.querySelector('.card-description')?.innerText.toLowerCase() || "";

                if (title.includes(term) || desc.includes(term)) {
                    card.style.display = 'flex';
                    card.parentElement.style.display = 'grid';
                    totalVisible++;
                } else {
                    card.style.display = 'none';
                }
            });

            // Handle "No Results"
            let noResultDiv = document.getElementById('search-no-results');
            if (totalVisible === 0 && term.length > 0) {
                if (!noResultDiv && window.emptyStateManager) {
                    const tempContainer = document.querySelector('.main-content'); // Fallback container
                    // You might need a specific container for search results in HTML
                }
            }
        });
    }

    // 3. MOBILE SIDEBAR & OVERLAY
    window.toggleSidebar = () => {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.querySelector('.sidebar-overlay');

        if (sidebar) sidebar.classList.toggle('active');
        if (overlay) overlay.classList.toggle('active');
    };

    const overlay = document.querySelector('.sidebar-overlay');
    if (overlay) {
        overlay.addEventListener('click', () => {
            window.toggleSidebar();
        });
    }

    // 4. SCROLL EFFECT FOR HEADER (Auth-Aware)
    let lastScrollTop = 0;
    const header = document.querySelector('.header');
    const mainContent = document.querySelector('.main-content');

    if (mainContent) {
        mainContent.addEventListener('scroll', () => {
            // Only apply scroll effect if user is authenticated
            if (!auth.currentUser) return;

            const scrollTop = mainContent.scrollTop;

            if (scrollTop > lastScrollTop && scrollTop > 100) {
                // Scrolling down - hide header
                header.classList.add('hidden');
            } else {
                // Scrolling up - show header
                header.classList.remove('hidden');
            }

            lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
        }, { passive: true });
    }
});

// Helper: Staggered Animation for Cards
function animateEntry(container) {
    const cards = Array.from(container.children);
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';

        setTimeout(() => {
            card.style.transition = 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 50);
    });
}

// === RECENT ACTIVITY FUNCTION ===
function updateRecentActivity(user, userData, credits) {
  // 1. Today's Usage - from localStorage or userData
  const todayUsageEl = document.getElementById('todayUsage');
  if (todayUsageEl) {
    const today = new Date().toDateString();
    const storedDate = localStorage.getItem('usageDate');
    let todayCount = 0;
    
    if (storedDate === today) {
      todayCount = parseInt(localStorage.getItem('todayUsageCount') || '0');
    } else {
      localStorage.setItem('usageDate', today);
      localStorage.setItem('todayUsageCount', '0');
    }
    todayUsageEl.innerText = todayCount;
  }

  // 2. Remaining Limit - based on plan
  const remainingLimitEl = document.getElementById('remainingLimit');
  if (remainingLimitEl) {
    const plan = userData?.plan || 'free';
    if (plan === 'premium' || plan === 'pro' || plan === 'admin') {
      remainingLimitEl.innerText = '∞';
    } else {
      remainingLimitEl.innerText = credits || 0;
    }
  }

  // 3. Last Activity - from localStorage
  const lastActivityEl = document.getElementById('lastActivity');
  if (lastActivityEl) {
    const lastActivityTime = localStorage.getItem('lastActivityTime');
    if (lastActivityTime) {
      const timeDiff = Date.now() - parseInt(lastActivityTime);
      const minutes = Math.floor(timeDiff / 60000);
      const hours = Math.floor(timeDiff / 3600000);
      
      if (minutes < 1) {
        lastActivityEl.innerText = 'Just now';
      } else if (minutes < 60) {
        lastActivityEl.innerText = `${minutes}m ago`;
      } else if (hours < 24) {
        lastActivityEl.innerText = `${hours}h ago`;
      } else {
        lastActivityEl.innerText = `${Math.floor(hours/24)}d ago`;
      }
    } else {
      lastActivityEl.innerText = 'Now';
      localStorage.setItem('lastActivityTime', Date.now().toString());
    }
  }

  // 4. Last Used Tool - from localStorage
  const lastUsedToolEl = document.getElementById('lastUsedTool');
  if (lastUsedToolEl) {
    const lastTool = localStorage.getItem('lastUsedTool') || 'None';
    lastUsedToolEl.innerText = lastTool;
  }

  // 5. Last Login Time - from Firebase auth or userData
  const lastLoginTimeEl = document.getElementById('lastLoginTime');
  if (lastLoginTimeEl) {
    const lastLogin = user.metadata?.lastSignInTime;
    if (lastLogin) {
      const loginDate = new Date(lastLogin);
      const now = new Date();
      const diffMs = now - loginDate;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      
      if (diffMins < 5) {
        lastLoginTimeEl.innerText = 'Just now';
      } else if (diffMins < 60) {
        lastLoginTimeEl.innerText = `${diffMins}m ago`;
      } else if (diffHours < 24) {
        lastLoginTimeEl.innerText = `${diffHours}h ago`;
      } else {
        lastLoginTimeEl.innerText = loginDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      }
    } else {
      lastLoginTimeEl.innerText = 'Today';
    }
  }

  // 6. Last Upgrade Attempt - from localStorage
  const lastUpgradeAttemptEl = document.getElementById('lastUpgradeAttempt');
  if (lastUpgradeAttemptEl) {
    const lastUpgrade = localStorage.getItem('lastUpgradeAttempt');
    if (lastUpgrade) {
      const upgradeDate = new Date(parseInt(lastUpgrade));
      lastUpgradeAttemptEl.innerText = upgradeDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    } else {
      const plan = userData?.plan || 'free';
      lastUpgradeAttemptEl.innerText = plan !== 'free' ? 'Upgraded' : 'None';
    }
  }
}

// Track tool usage for Recent Activity
window.trackToolUsage = function(toolName) {
  localStorage.setItem('lastUsedTool', toolName);
  localStorage.setItem('lastActivityTime', Date.now().toString());
  
  const today = new Date().toDateString();
  const storedDate = localStorage.getItem('usageDate');
  
  if (storedDate === today) {
    const count = parseInt(localStorage.getItem('todayUsageCount') || '0') + 1;
    localStorage.setItem('todayUsageCount', count.toString());
  } else {
    localStorage.setItem('usageDate', today);
    localStorage.setItem('todayUsageCount', '1');
  }
};

// Track upgrade attempts
window.trackUpgradeAttempt = function() {
  localStorage.setItem('lastUpgradeAttempt', Date.now().toString());
};
