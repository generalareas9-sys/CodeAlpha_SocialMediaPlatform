/**
 * Linkora - Utility Functions
 * Connect. Share. Grow.
 */

// Theme Management (Light / Dark)
function initTheme() {
  const savedTheme = localStorage.getItem('linkora-theme');
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  const initialTheme = savedTheme || (prefersLight ? 'light' : 'dark');

  applyTheme(initialTheme);

  // Listen for OS preference changes if no manual override
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
    if (!localStorage.getItem('linkora-theme')) {
      applyTheme(e.matches ? 'light' : 'dark');
    }
  });
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) {
    themeColorMeta.setAttribute('content', theme === 'light' ? '#FFFFFF' : '#0F172A');
  }
  updateThemeToggleIcons(theme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('linkora-theme', newTheme);
  applyTheme(newTheme);
}

function updateThemeToggleIcons(theme) {
  const toggleBtns = document.querySelectorAll('.btn-icon-theme');
  toggleBtns.forEach(btn => {
    btn.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
    btn.innerHTML = theme === 'dark' ? `
      <!-- Sun icon for switching to light -->
      <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="4"/>
        <path stroke-linecap="round" d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41m14.14-14.14l-1.41 1.41"/>
      </svg>
    ` : `
      <!-- Moon icon for switching to dark -->
      <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
      </svg>
    `;
  });
}

// XSS Prevention: safely escape HTML entities
function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Convert hashtags and mentions into styled links
function formatPostContent(text) {
  const safeText = escapeHTML(text);
  const withMentions = safeText.replace(/@([a-zA-Z0-9_]+)/g, '<a href="/profile.html?user=$1" class="mention-link" style="color: var(--primary); font-weight: 500;">@$1</a>');
  const withHashtags = withMentions.replace(/#([a-zA-Z0-9_]+)/g, '<span style="color: var(--text-muted); font-weight: 500;">#$1</span>');
  return withHashtags;
}

// Pluralization Helper
function pluralize(count, singular, plural = singular + 's') {
  return `${count} ${count === 1 ? singular : plural}`;
}

// Relative time formatting
function timeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString.endsWith('Z') ? dateString : dateString + 'Z');
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

// Deterministic subtle color generation based on username for avatar initials
function getUsernameColor(username) {
  if (!username) return '#4F46E5';
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash % 360);
  return `hsl(${h}, 55%, 45%)`;
}

// Render avatar HTML (image or initials fallback)
function renderAvatar(user, sizeClass = 'avatar-md') {
  const username = user?.username || 'User';
  const initial = username.charAt(0).toUpperCase();
  const color = getUsernameColor(username);

  if (user?.avatar_url && user.avatar_url.trim() !== '') {
    return `<img src="${escapeHTML(user.avatar_url)}" alt="${escapeHTML(username)}" class="avatar ${sizeClass}" onerror="this.onerror=null;this.replaceWith(createFallbackAvatar('${escapeHTML(username)}', '${sizeClass}', '${color}'))" />`;
  }

  return `<div class="avatar ${sizeClass}" style="background-color: ${color};">${initial}</div>`;
}

function createFallbackAvatar(username, sizeClass, color) {
  const div = document.createElement('div');
  div.className = `avatar ${sizeClass}`;
  div.style.backgroundColor = color;
  div.textContent = username.charAt(0).toUpperCase();
  return div;
}

// Professional Toast notification manager (no emojis)
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let iconSvg = '';
  if (type === 'success') {
    iconSvg = `<svg fill="none" stroke="var(--success)" stroke-width="2" viewBox="0 0 24 24" width="18" height="18"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>`;
  } else if (type === 'error') {
    iconSvg = `<svg fill="none" stroke="var(--danger)" stroke-width="2" viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="12" r="10"/><path stroke-linecap="round" d="M12 8v4m0 4h.01"/></svg>`;
  } else {
    iconSvg = `<svg fill="none" stroke="var(--primary)" stroke-width="2" viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="12" r="10"/><path stroke-linecap="round" d="M12 16v-4m0-4h.01"/></svg>`;
  }

  toast.innerHTML = `${iconSvg}<span>${escapeHTML(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastOut 0.2s ease forwards';
    setTimeout(() => toast.remove(), 200);
  }, 3500);
}

// Debounce helper
function debounce(fn, delay = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// Initialize theme immediately on script evaluation to avoid flash of wrong theme
initTheme();
