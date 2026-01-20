/* ============================================
   TECHVYRO PREMIUM COMMON JAVASCRIPT
   Import this in all pages for consistent behavior
   ============================================ */

// ============ PAGE LOADER ============
function initPageLoader() {
  const loader = document.getElementById('pageLoader');
  if (loader) {
    loader.classList.add('hidden');
  }
}

// ============ THEME TOGGLE ============
function initThemeToggle() {
  const themeToggle = document.getElementById('themeToggle');
  if (!themeToggle) return;
  
  const savedTheme = localStorage.getItem('theme');
  
  if (savedTheme === 'light') {
    document.body.classList.add('light-mode');
    themeToggle.textContent = '☀️';
  }

  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    themeToggle.textContent = isLight ? '☀️' : '🌙';
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
  });
}

// ============ BACK TO TOP ============
function initBackToTop() {
  const backToTop = document.getElementById('backToTop');
  if (!backToTop) return;
  
  window.addEventListener('scroll', () => {
    if (window.scrollY > 400) {
      backToTop.classList.add('visible');
    } else {
      backToTop.classList.remove('visible');
    }
  });

  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ============ LIVE USERS COUNTER ============
function initLiveCounter() {
  const liveCount = document.getElementById('liveCount');
  if (!liveCount) return;
  
  function updateCount() {
    const base = 120;
    const variation = Math.floor(Math.random() * 50);
    liveCount.textContent = base + variation;
  }
  
  updateCount();
  setInterval(updateCount, 5000);
}

// ============ TOAST NOTIFICATIONS ============
function showToast(message, type = 'info') {
  let toast = document.getElementById('toast');
  
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// ============ RIPPLE EFFECT ============
function initRippleEffect() {
  document.querySelectorAll('.ripple-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      const rect = this.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const ripple = document.createElement('span');
      ripple.style.cssText = `
        position: absolute;
        background: rgba(255,255,255,0.4);
        border-radius: 50%;
        pointer-events: none;
        width: 100px;
        height: 100px;
        left: ${x - 50}px;
        top: ${y - 50}px;
        animation: rippleAnim 0.6s ease-out forwards;
      `;
      
      this.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    });
  });
}

// ============ SMOOTH SCROLL FOR ANCHORS ============
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
}

// ============ ANIMATE ON SCROLL ============
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-fade-in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  
  document.querySelectorAll('.animate-on-scroll').forEach(el => {
    observer.observe(el);
  });
}

// ============ INIT ALL ============
function initPremiumFeatures() {
  initPageLoader();
  initThemeToggle();
  initBackToTop();
  initLiveCounter();
  initRippleEffect();
  initSmoothScroll();
  initScrollAnimations();
}

// Auto-init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPremiumFeatures);
} else {
  initPremiumFeatures();
}

// Export for manual use
window.TechVyro = {
  showToast,
  initPremiumFeatures
};
