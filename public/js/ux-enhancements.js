/**
 * UX Enhancements: Welcome Tour, Tooltips, and Empty States
 * Improves user onboarding and clarity
 */

// Welcome Tour for First-Time Users
class WelcomeTour {
  constructor() {
    this.steps = [
      {
        element: '.sidebar',
        title: 'Navigation Sidebar',
        content: 'Access all your tools from here. Click on any section to explore different categories.',
        position: 'right'
      },
      {
        element: '.credit-box',
        title: 'Your Credits',
        content: 'Track your remaining credits here. Each AI tool costs 5 credits. Upgrade anytime for unlimited access!',
        position: 'bottom'
      },
      {
        element: '#section-ai .grid .card:first-child',
        title: 'AI Tools Section',
        content: 'Start with our powerful AI tools. AI Chat and Image Generation are ready to use!',
        position: 'top'
      },
      {
        element: '#section-design .grid .card:first-child',
        title: 'Design Tools',
        content: 'Create stunning designs with our design tools. More features coming soon!',
        position: 'top'
      },
      {
        element: '#section-dev .grid .card:first-child',
        title: 'Developer Tools',
        content: 'Essential tools for developers - JSON formatting, code minification, and more.',
        position: 'top'
      },
      {
        element: '.sidebar-upgrade-btn',
        title: 'Upgrade to Premium',
        content: 'Unlock all features, get unlimited credits, and access premium tools. Start your journey today!',
        position: 'top'
      }
    ];
    this.currentStep = 0;
    this.overlay = null;
    this.tooltip = null;
  }

  init() {
    // Check if user has seen the tour
    const hasSeenTour = localStorage.getItem('techvyro_welcome_tour_seen');
    if (!hasSeenTour) {
      this.showTour();
    }
  }

  showTour() {
    this.createOverlay();
    this.showStep(0);
  }

  createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'tour-overlay';
    this.overlay.innerHTML = `
      <div class="tour-tooltip" id="tour-tooltip">
        <div class="tour-header">
          <h3 id="tour-title"></h3>
          <button class="tour-close" onclick="welcomeTour.skipTour()">&times;</button>
        </div>
        <div class="tour-content">
          <p id="tour-content"></p>
        </div>
        <div class="tour-footer">
          <span class="tour-step" id="tour-step"></span>
          <div class="tour-buttons">
            <button class="tour-btn tour-prev" onclick="welcomeTour.prevStep()" style="display: none;">Previous</button>
            <button class="tour-btn tour-next" onclick="welcomeTour.nextStep()">Next</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(this.overlay);

    // Add CSS
    if (!document.querySelector('#tour-styles')) {
      const styles = document.createElement('style');
      styles.id = 'tour-styles';
      styles.textContent = `
        .tour-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.7);
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .tour-tooltip {
          background: #141a2e;
          border: 1px solid #3b82f6;
          border-radius: 12px;
          padding: 24px;
          max-width: 400px;
          width: 90%;
          box-shadow: 0 20px 60px rgba(59, 130, 246, 0.3);
          color: #e5e7eb;
        }

        .tour-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .tour-header h3 {
          margin: 0;
          color: #fff;
          font-size: 18px;
        }

        .tour-close {
          background: none;
          border: none;
          color: #9aa0b4;
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .tour-content p {
          margin: 0 0 20px 0;
          line-height: 1.6;
        }

        .tour-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .tour-step {
          color: #9aa0b4;
          font-size: 14px;
        }

        .tour-buttons {
          display: flex;
          gap: 12px;
        }

        .tour-btn {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }

        .tour-prev {
          background: #6c757d;
          color: white;
        }

        .tour-prev:hover {
          background: #5a6268;
        }

        .tour-next {
          background: #3b82f6;
          color: white;
        }

        .tour-next:hover {
          background: #2563eb;
        }

        @media (max-width: 600px) {
          .tour-tooltip {
            margin: 20px;
          }
        }
      `;
      document.head.appendChild(styles);
    }
  }

  showStep(stepIndex) {
    if (stepIndex >= this.steps.length) {
      this.endTour();
      return;
    }

    this.currentStep = stepIndex;
    const step = this.steps[stepIndex];

    const titleEl = document.getElementById('tour-title');
    const contentEl = document.getElementById('tour-content');
    const stepEl = document.getElementById('tour-step');
    const prevBtn = document.querySelector('.tour-prev');
    const nextBtn = document.querySelector('.tour-next');

    if (titleEl) titleEl.textContent = step.title;
    if (contentEl) contentEl.textContent = step.content;
    if (stepEl) stepEl.textContent = `${stepIndex + 1} of ${this.steps.length}`;

    if (prevBtn) prevBtn.style.display = stepIndex === 0 ? 'none' : 'block';
    if (nextBtn) nextBtn.textContent = stepIndex === this.steps.length - 1 ? 'Finish' : 'Next';
  }

  nextStep() {
    this.showStep(this.currentStep + 1);
  }

  prevStep() {
    this.showStep(this.currentStep - 1);
  }

  skipTour() {
    this.endTour();
  }

  endTour() {
    localStorage.setItem('techvyro_welcome_tour_seen', 'true');
    if (this.overlay) {
      this.overlay.remove();
    }
  }
}

// Tooltip System
class TooltipSystem {
  constructor() {
    this.currentTooltip = null;
    this.activeElement = null;
  }

  init() {
    document.addEventListener('mouseover', (e) => {
      const target = e.target.closest('[data-tooltip]');
      if (target && !this.currentTooltip) {
        this.showTooltip(target, e);
      }
    });

    document.addEventListener('mouseout', (e) => {
      const target = e.target.closest('[data-tooltip], [data-original-title]');
      if (target && this.currentTooltip) {
        this.hideTooltip(target);
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (this.currentTooltip) {
        this.updateTooltipPosition(e);
      }
    });
  }

  showTooltip(element, event) {
    const text = element.getAttribute('data-tooltip');
    if (!text) return;

    // Suppress native browser title tooltip to avoid duplicate text on hover
    if (element.hasAttribute('title')) {
      element.setAttribute('data-original-title', element.getAttribute('title'));
      element.removeAttribute('title');
    }
    this.activeElement = element;

    this.currentTooltip = document.createElement('div');
    this.currentTooltip.className = 'custom-tooltip';
    this.currentTooltip.textContent = text;
    document.body.appendChild(this.currentTooltip);

    this.updateTooltipPosition(event);

    // Add CSS if not present
    if (!document.querySelector('#tooltip-styles')) {
      const styles = document.createElement('style');
      styles.id = 'tooltip-styles';
      styles.textContent = `
        .custom-tooltip {
          position: fixed;
          background: rgba(2, 6, 23, 0.95);
          color: #e5e7eb;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          pointer-events: none;
          z-index: 1000;
          max-width: 200px;
          text-align: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
      `;
      document.head.appendChild(styles);
    }
  }

  updateTooltipPosition(event) {
    if (!this.currentTooltip) return;

    const tooltip = this.currentTooltip;
    const x = event.clientX + 10;
    const y = event.clientY + 10;

    // Adjust position to stay within viewport
    const rect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let finalX = x;
    let finalY = y;

    if (x + rect.width > viewportWidth) {
      finalX = x - rect.width - 20;
    }

    if (y + rect.height > viewportHeight) {
      finalY = y - rect.height - 20;
    }

    tooltip.style.left = finalX + 'px';
    tooltip.style.top = finalY + 'px';
  }

  hideTooltip(element) {
    if (this.currentTooltip) {
      this.currentTooltip.remove();
      this.currentTooltip = null;
    }
    // Restore native title attribute if it was suppressed
    const target = element || this.activeElement;
    if (target && target.hasAttribute('data-original-title')) {
      target.setAttribute('title', target.getAttribute('data-original-title'));
      target.removeAttribute('data-original-title');
    }
    this.activeElement = null;
  }
}

// Skeleton Loading System
class SkeletonLoader {
  constructor() {
    this.loadingStates = new Map();
    this.skeletonTemplates = {
      'tool-card': `
        <div class="skeleton-card">
          <div class="skeleton-icon"></div>
          <div class="skeleton-title"></div>
          <div class="skeleton-description"></div>
          <div class="skeleton-description"></div>
          <div class="skeleton-footer">
            <div class="skeleton-status"></div>
            <div class="skeleton-button"></div>
          </div>
        </div>
      `,
      'section': `
        <div class="skeleton-section">
          <div class="skeleton-title" style="width: 200px; height: 24px; margin-bottom: 25px;"></div>
          <div class="skeleton-grid">
            <div class="skeleton-card">
              <div class="skeleton-icon"></div>
              <div class="skeleton-title"></div>
              <div class="skeleton-description"></div>
              <div class="skeleton-description"></div>
              <div class="skeleton-footer">
                <div class="skeleton-status"></div>
                <div class="skeleton-button"></div>
              </div>
            </div>
            <div class="skeleton-card">
              <div class="skeleton-icon"></div>
              <div class="skeleton-title"></div>
              <div class="skeleton-description"></div>
              <div class="skeleton-description"></div>
              <div class="skeleton-footer">
                <div class="skeleton-status"></div>
                <div class="skeleton-button"></div>
              </div>
            </div>
            <div class="skeleton-card">
              <div class="skeleton-icon"></div>
              <div class="skeleton-title"></div>
              <div class="skeleton-description"></div>
              <div class="skeleton-description"></div>
              <div class="skeleton-footer">
                <div class="skeleton-status"></div>
                <div class="skeleton-button"></div>
              </div>
            </div>
          </div>
        </div>
      `
    };
  }

  showSkeleton(containerId, type = 'tool-card', count = 6) {
    const container = document.getElementById(containerId);
    if (!container) return;

    this.loadingStates.set(containerId, true);

    if (type === 'section') {
      container.innerHTML = this.skeletonTemplates.section;
      container.classList.add('section-loading');
    } else {
      // Generate multiple skeleton cards
      const skeletons = Array(count).fill(this.skeletonTemplates['tool-card']).join('');
      container.innerHTML = skeletons;
    }

    // Add fade-in animation
    container.classList.add('loading-fade-in');
  }

  hideSkeleton(containerId, content = '') {
    const container = document.getElementById(containerId);
    if (!container) return;

    this.loadingStates.set(containerId, false);

    // Add fade-out animation
    container.classList.add('loading-fade-out');
    container.classList.remove('section-loading');

    setTimeout(() => {
      container.classList.remove('loading-fade-out');
      if (content) {
        container.innerHTML = content;
        container.classList.add('loading-fade-in');
        setTimeout(() => container.classList.remove('loading-fade-in'), 500);
      }
    }, 300);
  }

  isLoading(containerId) {
    return this.loadingStates.get(containerId) || false;
  }

  // Simulate loading for demo purposes
  simulateLoad(containerId, type = 'tool-card', duration = 2000) {
    this.showSkeleton(containerId, type);
    setTimeout(() => {
      this.hideSkeleton(containerId);
    }, duration);
  }

  // Load section with skeleton
  loadSection(sectionId, contentLoader, duration = 1500) {
    const section = document.getElementById(sectionId);
    if (!section) return;

    this.showSkeleton(sectionId, 'section');

    setTimeout(async () => {
      try {
        const content = await contentLoader();
        this.hideSkeleton(sectionId, content);
      } catch (error) {
        console.error('Error loading section:', error);
        this.hideSkeleton(sectionId);
        emptyStateManager.showEmptyState(sectionId, 'error');
      }
    }, duration);
  }
}

// Enhanced Empty State Messages with SVG Illustrations
class EmptyStateManager {
  constructor() {
    this.emptyStates = {
      'no-credits': {
        icon: this.getCreditsSVG(),
        title: 'Out of Credits',
        message: 'You\'ve used all your free credits. Upgrade to Premium for unlimited access!',
        action: {
          text: 'Upgrade Now',
          href: 'pricing.html'
        }
      },
      'no-tools': {
        icon: this.getToolsSVG(),
        title: 'Tools Coming Soon',
        message: 'We\'re working hard to bring you more amazing tools. Stay tuned!',
        action: null
      },
      'no-data': {
        icon: this.getDataSVG(),
        title: 'No Data Yet',
        message: 'Start using our tools to see your activity and insights here.',
        action: null
      },
      'error': {
        icon: this.getErrorSVG(),
        title: 'Something went wrong',
        message: 'We encountered an error while loading this section. Please try again.',
        action: {
          text: 'Retry',
          href: '#'
        }
      },
      'network-error': {
        icon: this.getNetworkSVG(),
        title: 'Connection Issue',
        message: 'Please check your internet connection and try again.',
        action: {
          text: 'Retry',
          href: '#'
        }
      }
    };
  }

  getCreditsSVG() {
    return `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="45" stroke="currentColor" stroke-width="2" opacity="0.2"/>
      <path d="M45 45L75 75M75 45L45 75" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      <circle cx="60" cy="60" r="35" stroke="currentColor" stroke-width="2" opacity="0.1"/>
      <text x="60" y="68" text-anchor="middle" font-size="24" fill="currentColor" opacity="0.6">⚡</text>
    </svg>`;
  }

  getToolsSVG() {
    return `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="35" y="35" width="50" height="50" rx="8" stroke="currentColor" stroke-width="2" opacity="0.2"/>
      <circle cx="50" cy="50" r="6" stroke="currentColor" stroke-width="2"/>
      <circle cx="70" cy="50" r="6" stroke="currentColor" stroke-width="2"/>
      <circle cx="50" cy="70" r="6" stroke="currentColor" stroke-width="2"/>
      <circle cx="70" cy="70" r="6" stroke="currentColor" stroke-width="2"/>
      <path d="M40 85L50 95M70 85L80 95" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <text x="60" y="110" text-anchor="middle" font-size="16" fill="currentColor" opacity="0.6">🛠️</text>
    </svg>`;
  }

  getDataSVG() {
    return `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="25" y="40" width="70" height="40" rx="6" stroke="currentColor" stroke-width="2" opacity="0.2"/>
      <rect x="30" y="45" width="60" height="6" rx="3" fill="currentColor" opacity="0.3"/>
      <rect x="30" y="55" width="40" height="6" rx="3" fill="currentColor" opacity="0.2"/>
      <rect x="30" y="65" width="50" height="6" rx="3" fill="currentColor" opacity="0.3"/>
      <circle cx="60" cy="25" r="8" stroke="currentColor" stroke-width="2"/>
      <path d="M52 25L56 29L68 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="60" y="95" text-anchor="middle" font-size="16" fill="currentColor" opacity="0.6">📊</text>
    </svg>`;
  }

  getErrorSVG() {
    return `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="45" stroke="currentColor" stroke-width="2" opacity="0.2"/>
      <path d="M45 45L75 75M75 45L45 75" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      <circle cx="60" cy="60" r="35" stroke="currentColor" stroke-width="2" opacity="0.1"/>
      <text x="60" y="68" text-anchor="middle" font-size="24" fill="currentColor" opacity="0.6">❌</text>
    </svg>`;
  }

  getNetworkSVG() {
    return `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M30 50L50 30L70 50L90 30" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.3"/>
      <circle cx="50" cy="30" r="4" fill="currentColor" opacity="0.5"/>
      <circle cx="70" cy="50" r="4" fill="currentColor" opacity="0.5"/>
      <circle cx="90" cy="30" r="4" fill="currentColor" opacity="0.5"/>
      <path d="M30 70L50 50L70 70L90 50" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="30" cy="70" r="4" fill="currentColor"/>
      <circle cx="50" cy="50" r="4" fill="currentColor"/>
      <circle cx="70" cy="70" r="4" fill="currentColor"/>
      <circle cx="90" cy="50" r="4" fill="currentColor"/>
      <text x="60" y="100" text-anchor="middle" font-size="16" fill="currentColor" opacity="0.6">📡</text>
    </svg>`;
  }

  showEmptyState(containerId, stateKey) {
    const container = document.getElementById(containerId);
    if (!container || !this.emptyStates[stateKey]) return;

    const state = this.emptyStates[stateKey];
    const emptyStateHtml = `
      <div class="empty-state">
        <div class="empty-illustration">${state.icon}</div>
        <h3 class="empty-title">${state.title}</h3>
        <p class="empty-message">${state.message}</p>
        ${state.action ? `<a href="${state.action.href}" class="empty-action" onclick="emptyStateManager.handleAction('${stateKey}')">${state.action.text}</a>` : ''}
      </div>
    `;

    container.innerHTML = emptyStateHtml;
    container.classList.add('loading-fade-in');

    // Add CSS if not present
    if (!document.querySelector('#empty-state-styles')) {
      const styles = document.createElement('style');
      styles.id = 'empty-state-styles';
      styles.textContent = `
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: var(--text-muted);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }

        .empty-illustration {
          width: 120px;
          height: 120px;
          opacity: 0.8;
          margin-bottom: 20px;
        }

        .empty-illustration svg {
          width: 100%;
          height: 100%;
        }

        .empty-title {
          color: var(--text-main);
          font-size: 24px;
          font-weight: 700;
          margin: 0;
        }

        .empty-message {
          font-size: 16px;
          line-height: 1.6;
          margin: 0;
          max-width: 400px;
        }

        .empty-action {
          display: inline-block;
          background: linear-gradient(135deg, var(--blue), #4f46e5);
          color: white;
          padding: 12px 24px;
          border-radius: 50px;
          text-decoration: none;
          font-weight: 600;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
          margin-top: 10px;
        }

        .empty-action:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(59, 130, 246, 0.5);
        }

        @media (max-width: 768px) {
          .empty-illustration {
            width: 80px;
            height: 80px;
          }

          .empty-title {
            font-size: 20px;
          }

          .empty-message {
            font-size: 14px;
          }
        }
      `;
      document.head.appendChild(styles);
    }
  }

  hideEmptyState(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = '';
      container.classList.remove('loading-fade-in');
    }
  }

  handleAction(stateKey) {
    // Handle retry actions
    if (stateKey === 'error' || stateKey === 'network-error') {
      // Trigger a reload or retry mechanism
      window.location.reload();
    }
  }
}

// Initialize UX Enhancements
const welcomeTour = new WelcomeTour();
const tooltipSystem = new TooltipSystem();
const emptyStateManager = new EmptyStateManager();
const skeletonLoader = new SkeletonLoader();

// Export for global access
window.welcomeTour = welcomeTour;
window.tooltipSystem = tooltipSystem;
window.emptyStateManager = emptyStateManager;
window.skeletonLoader = skeletonLoader;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  tooltipSystem.init();
  welcomeTour.init();
});
