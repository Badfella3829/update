import { getRecentTools, getFavoriteTools, toggleFavorite, isFavorite, getCreditCosts } from './auth-credits.js';

const TOOL_DATA = {
  'chat': { name: 'AI Chat', icon: '🤖', url: 'chat.html', premium: false },
  'image-gen': { name: 'Image Gen', icon: '🎨', url: 'image-gen.html', premium: false },
  'logo-gen': { name: 'Logo Maker', icon: '✨', url: 'logo-gen.html', premium: false },
  'voice-ai': { name: 'Voice AI', icon: '🎙️', url: 'voice-ai.html', premium: true },
  'content-ai': { name: 'Content AI', icon: '📝', url: 'content-ai.html', premium: true },
  'code-ai': { name: 'Code AI', icon: '💻', url: 'code-ai.html', premium: true },
  'email-ai': { name: 'Email AI', icon: '📧', url: 'email-ai.html', premium: true },
  'resume-ai': { name: 'Resume AI', icon: '📄', url: 'resume-ai.html', premium: true },
  'data-ai': { name: 'Data AI', icon: '📊', url: 'data-ai.html', premium: true },
  'color-gen': { name: 'Color Palette', icon: '🎨', url: 'color-gen.html', premium: false },
  'gradient-gen': { name: 'Gradient Gen', icon: '🌈', url: 'gradient-gen.html', premium: false },
  'img-compress': { name: 'Image Compress', icon: '🗜️', url: 'img-compress.html', premium: false },
  'img-convert': { name: 'Image Convert', icon: '🔄', url: 'img-convert.html', premium: false },
  'json-format': { name: 'JSON Format', icon: '📋', url: 'json-format.html', premium: false },
  'code-minify': { name: 'Code Minify', icon: '📦', url: 'code-minify.html', premium: false },
  'jwt-decode': { name: 'JWT Decode', icon: '🔑', url: 'jwt-decode.html', premium: false },
  'url-encode': { name: 'URL Encode', icon: '🔗', url: 'url-encode.html', premium: false },
  'regex-test': { name: 'Regex Test', icon: '🔍', url: 'regex-test.html', premium: false },
  'pass-gen': { name: 'Password Gen', icon: '🔐', url: 'pass-gen.html', premium: false },
  'qr-gen': { name: 'QR Generator', icon: '📱', url: 'qr-gen.html', premium: false },
  'hashtag-gen': { name: 'Hashtag Gen', icon: '#️⃣', url: 'hashtag-gen.html', premium: false },
  'utm-gen': { name: 'UTM Builder', icon: '🔗', url: 'utm-gen.html', premium: false },
  'case-convert': { name: 'Case Convert', icon: 'Aa', url: 'case-convert.html', premium: false },
  'unit-convert': { name: 'Unit Convert', icon: '📏', url: 'unit-convert.html', premium: false },
  'ip-lookup': { name: 'IP Lookup', icon: '🌐', url: 'ip-lookup.html', premium: false },
  'fake-data': { name: 'Fake Data', icon: '🎭', url: 'fake-data.html', premium: false }
};

function createToolCard(toolId) {
  const tool = TOOL_DATA[toolId];
  if (!tool) return '';
  
  const creditCosts = getCreditCosts();
  const cost = creditCosts[toolId] || 5;
  const isFav = isFavorite(toolId);
  
  return `
    <div class="card js-tilt" data-tool="${toolId}">
      <button class="favorite-btn ${isFav ? 'active' : ''}" onclick="event.stopPropagation(); window.toggleToolFavorite('${toolId}', this)" title="${isFav ? 'Remove from favorites' : 'Add to favorites'}">
        ${isFav ? '★' : '☆'}
      </button>
      <div class="card-content" onclick="window.location.href='${tool.url}'">
        <div class="card-icon">${tool.icon}</div>
        <h3>${tool.name}</h3>
        <div class="card-footer">
          <span class="card-status ${tool.premium ? 'premium' : 'free'}">${tool.premium ? '🔒 Premium' : '🟢 Free'}</span>
          <span class="credit-cost">${cost} credits</span>
        </div>
      </div>
    </div>
  `;
}

function renderFavorites() {
  const favorites = getFavoriteTools();
  const favSection = document.getElementById('section-favorites');
  const favGrid = document.getElementById('favorites-grid');
  
  if (!favSection || !favGrid) return;
  
  if (favorites.length === 0) {
    favSection.style.display = 'none';
    favGrid.style.display = 'none';
    return;
  }
  
  favSection.style.display = 'flex';
  favGrid.style.display = 'grid';
  favGrid.innerHTML = favorites.map(createToolCard).join('');
}

function renderRecentTools() {
  const recent = getRecentTools();
  const recentSection = document.getElementById('section-recent');
  const recentGrid = document.getElementById('recent-grid');
  
  if (!recentSection || !recentGrid) return;
  
  if (recent.length === 0) {
    recentSection.style.display = 'none';
    recentGrid.style.display = 'none';
    return;
  }
  
  recentSection.style.display = 'flex';
  recentGrid.style.display = 'grid';
  recentGrid.innerHTML = recent.slice(0, 6).map(createToolCard).join('');
}

function addFavoriteButtonsToExistingCards() {
  const allCards = document.querySelectorAll('.card[onclick], .card .card-btn');
  
  document.querySelectorAll('.grid .card').forEach(card => {
    const h3 = card.querySelector('h3');
    if (!h3) return;
    
    const toolName = h3.textContent.trim().toLowerCase()
      .replace(/\s+/g, '-')
      .replace('image gen', 'image-gen')
      .replace('logo maker', 'logo-gen')
      .replace('ai chat', 'chat')
      .replace('voice ai', 'voice-ai')
      .replace('content ai', 'content-ai')
      .replace('code ai', 'code-ai')
      .replace('email ai', 'email-ai')
      .replace('resume ai', 'resume-ai')
      .replace('data ai', 'data-ai')
      .replace('color palette', 'color-gen')
      .replace('gradient generator', 'gradient-gen')
      .replace('image compress', 'img-compress')
      .replace('image convert', 'img-convert')
      .replace('json formatter', 'json-format')
      .replace('code minifier', 'code-minify')
      .replace('jwt decoder', 'jwt-decode')
      .replace('url encoder', 'url-encode')
      .replace('regex tester', 'regex-test')
      .replace('password gen', 'pass-gen')
      .replace('qr generator', 'qr-gen')
      .replace('hashtag gen', 'hashtag-gen')
      .replace('utm builder', 'utm-gen')
      .replace('case converter', 'case-convert')
      .replace('unit converter', 'unit-convert')
      .replace('ip lookup', 'ip-lookup')
      .replace('fake data', 'fake-data');
    
    if (!card.querySelector('.favorite-btn') && TOOL_DATA[toolName]) {
      const isFav = isFavorite(toolName);
      const favBtn = document.createElement('button');
      favBtn.className = `favorite-btn ${isFav ? 'active' : ''}`;
      favBtn.innerHTML = isFav ? '★' : '☆';
      favBtn.title = isFav ? 'Remove from favorites' : 'Add to favorites';
      favBtn.onclick = (e) => {
        e.stopPropagation();
        window.toggleToolFavorite(toolName, favBtn);
      };
      card.style.position = 'relative';
      card.appendChild(favBtn);
    }
  });
}

window.toggleToolFavorite = function(toolId, btn) {
  toggleFavorite(toolId);
  const isFav = isFavorite(toolId);
  
  document.querySelectorAll(`[data-tool="${toolId}"] .favorite-btn, .card .favorite-btn`).forEach(b => {
    if (b === btn || b.closest(`[data-tool="${toolId}"]`)) {
      b.classList.toggle('active', isFav);
      b.innerHTML = isFav ? '★' : '☆';
      b.title = isFav ? 'Remove from favorites' : 'Add to favorites';
    }
  });
  
  renderFavorites();
  
  const toast = document.createElement('div');
  toast.className = 'fav-toast';
  toast.textContent = isFav ? 'Added to favorites!' : 'Removed from favorites';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
};

export function initDashboardEnhancements() {
  renderFavorites();
  renderRecentTools();
  addFavoriteButtonsToExistingCards();
  
  const style = document.createElement('style');
  style.textContent = `
    .favorite-btn {
      position: absolute;
      top: 12px;
      right: 12px;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: none;
      background: rgba(0,0,0,0.3);
      color: #9aa0b4;
      font-size: 18px;
      cursor: pointer;
      transition: all 0.2s ease;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .favorite-btn:hover {
      background: rgba(59,130,246,0.3);
      transform: scale(1.1);
    }
    .favorite-btn.active {
      color: #fbbf24;
      background: rgba(251,191,36,0.2);
    }
    .credit-cost {
      font-size: 11px;
      color: #9aa0b4;
      background: rgba(255,255,255,0.05);
      padding: 4px 8px;
      border-radius: 6px;
    }
    .fav-toast {
      position: fixed;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      color: white;
      padding: 12px 24px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      animation: toastIn 0.3s ease, toastOut 0.3s ease 1.7s forwards;
    }
    @keyframes toastIn {
      from { transform: translateX(-50%) translateY(20px); opacity: 0; }
      to { transform: translateX(-50%) translateY(0); opacity: 1; }
    }
    @keyframes toastOut {
      from { transform: translateX(-50%) translateY(0); opacity: 1; }
      to { transform: translateX(-50%) translateY(20px); opacity: 0; }
    }
    #favorites-grid .card,
    #recent-grid .card {
      position: relative;
    }
  `;
  document.head.appendChild(style);
}
