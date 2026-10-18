/**
 * Linkora - Shared Utilities & Design System Helpers
 * Connect. Share. Grow.
 * Modern, warm, vibrant & human UI toolkit.
 */

// ============================================================================
// 1. Theme Management (Light is Default, Dark is Polished Option)
// ============================================================================
function initTheme() {
  const savedTheme = localStorage.getItem('linkora-theme');
  let initialTheme = 'light';

  if (savedTheme) {
    initialTheme = savedTheme;
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    initialTheme = 'dark';
  }

  applyTheme(initialTheme);

  // Follow OS preference if user hasn't explicitly set a preference
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem('linkora-theme')) {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    });
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  
  // Update meta theme-color for mobile browser chrome
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) {
    themeColorMeta.setAttribute('content', theme === 'dark' ? '#0B0B12' : '#F7F7FB');
  }

  // Update theme toggle icons across page
  updateThemeToggleIcons(theme);

  // Update logos if present with dynamic variant
  updateLogosForTheme(theme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('linkora-theme', newTheme);
  applyTheme(newTheme);
}

function updateThemeToggleIcons(theme) {
  const toggleBtns = document.querySelectorAll('.btn-icon-theme, #btn-theme-toggle');
  toggleBtns.forEach(btn => {
    btn.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
    btn.setAttribute('title', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
    btn.innerHTML = theme === 'dark' 
      ? renderIcon('sun', 'icon-theme') 
      : renderIcon('moon', 'icon-theme');
  });
}

function updateLogosForTheme(theme) {
  const logoImgs = document.querySelectorAll('.brand-logo-img, .auth-logo');
  logoImgs.forEach(img => {
    // If logo has dedicated light/dark variants, switch gracefully
    if (theme === 'dark') {
      img.src = '/assets/logo-light.svg';
    } else {
      img.src = '/assets/logo-dark.svg';
    }
  });
}

// ============================================================================
// 2. Lucide Icons Engine (Strictly Lucide Only, No Emoji in UI Chrome)
// ============================================================================
const LUCIDE_ICONS = {
  home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  compass: '<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  bookmark: '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  'message-circle': '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  'share-2': '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/>',
  'more-horizontal': '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  'log-out': '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  'eye-off': '<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/>',
  'trending-up': '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
  image: '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
  smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/>',
  'bar-chart-2': '<line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  'trash-2': '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>',
  edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  'alert-triangle': '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/>',
  sparkles: '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  'chevron-right': '<path d="m9 18 6-6-6-6"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>'
};

function renderIcon(name, extraClass = '', extraAttrs = '') {
  const path = LUCIDE_ICONS[name] || LUCIDE_ICONS['sparkles'];
  return `<svg class="lucide lucide-${name} ${extraClass}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" ${extraAttrs}>${path}</svg>`;
}

// ============================================================================
// 3. Avatar & Badge Renderers
// ============================================================================
function getUsernameColor(username) {
  if (!username) return '#6366F1';
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash % 360);
  return `hsl(${h}, 65%, 50%)`;
}

function renderAvatar(user, sizeClass = 'avatar-md', options = {}) {
  const username = user?.username || 'User';
  const initial = username.charAt(0).toUpperCase();
  const color = getUsernameColor(username);
  const avatarUrl = user?.avatar_url;

  let innerAvatar = '';
  if (avatarUrl && avatarUrl.trim() !== '') {
    innerAvatar = `<img src="${escapeHTML(avatarUrl)}" alt="${escapeHTML(username)}" class="avatar ${sizeClass}" onerror="this.onerror=null;this.replaceWith(createFallbackAvatar('${escapeHTML(username)}', '${sizeClass}', '${color}'))" />`;
  } else {
    innerAvatar = `<div class="avatar ${sizeClass}" style="background-color: ${color};">${initial}</div>`;
  }

  let onlineHtml = options.online ? '<span class="avatar-online-dot"></span>' : '';

  if (options.hasStory) {
    const ringClass = options.storySeen ? 'story-ring-seen' : 'story-ring-active';
    return `
      <div class="avatar-wrap ${ringClass}">
        <div class="story-ring-inner">
          ${innerAvatar}
        </div>
        ${onlineHtml}
      </div>
    `;
  }

  return `
    <div class="avatar-wrap">
      ${innerAvatar}
      ${onlineHtml}
    </div>
  `;
}

function createFallbackAvatar(username, sizeClass, color) {
  const div = document.createElement('div');
  div.className = `avatar ${sizeClass}`;
  div.style.backgroundColor = color;
  div.textContent = (username || 'U').charAt(0).toUpperCase();
  return div;
}

function renderVerifiedBadge() {
  return `
    <span class="badge-verified" title="Verified Creator" aria-label="Verified Creator">
      <svg fill="currentColor" viewBox="0 0 24 24" width="16" height="16">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1.2 14.2l-3.5-3.5 1.4-1.4 2.1 2.1 5.6-5.6 1.4 1.4-7 7z"/>
      </svg>
    </span>
  `;
}

// ============================================================================
// 4. Toast Notifications System
// ============================================================================
function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let iconName = 'sparkles';
  if (type === 'success') iconName = 'check';
  else if (type === 'error') iconName = 'alert-triangle';

  toast.innerHTML = `
    <div class="toast-icon">
      ${renderIcon(iconName, '', 'width="18" height="18"')}
    </div>
    <div class="toast-msg">${escapeHTML(message)}</div>
    <button type="button" class="toast-close" aria-label="Close notification">
      ${renderIcon('x', '', 'width="16" height="16"')}
    </button>
  `;

  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => removeToast(toast));

  container.appendChild(toast);

  const timeoutId = setTimeout(() => {
    removeToast(toast);
  }, duration);

  function removeToast(el) {
    clearTimeout(timeoutId);
    el.style.opacity = '0';
    el.style.transform = 'translateY(12px) scale(0.96)';
    setTimeout(() => el.remove(), 200);
  }
}

// ============================================================================
// 5. Reusable Confirm Dialog Modal
// ============================================================================
function showConfirmDialog({
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDanger = true,
  onConfirm = () => {}
}) {
  let modalOverlay = document.getElementById('global-confirm-dialog');
  if (!modalOverlay) {
    modalOverlay = document.createElement('div');
    modalOverlay.id = 'global-confirm-dialog';
    modalOverlay.className = 'modal-overlay';
    document.body.appendChild(modalOverlay);
  }

  modalOverlay.innerHTML = `
    <div class="card modal-card confirm-dialog" role="dialog" aria-modal="true">
      <div class="confirm-dialog-icon">
        ${renderIcon(isDanger ? 'alert-triangle' : 'info', '', 'width="26" height="26"')}
      </div>
      <h3 class="confirm-dialog-title">${escapeHTML(title)}</h3>
      <p class="confirm-dialog-msg">${escapeHTML(message)}</p>
      <div class="confirm-dialog-actions">
        <button type="button" class="btn btn-secondary" id="confirm-btn-cancel">${escapeHTML(cancelText)}</button>
        <button type="button" class="btn ${isDanger ? 'btn-danger' : 'btn-primary'}" id="confirm-btn-ok">${escapeHTML(confirmText)}</button>
      </div>
    </div>
  `;

  modalOverlay.classList.add('show');

  const cancelBtn = modalOverlay.querySelector('#confirm-btn-cancel');
  const okBtn = modalOverlay.querySelector('#confirm-btn-ok');

  function closeDialog() {
    modalOverlay.classList.remove('show');
  }

  cancelBtn.onclick = closeDialog;
  modalOverlay.onclick = (e) => {
    if (e.target === modalOverlay) closeDialog();
  };

  okBtn.onclick = () => {
    closeDialog();
    if (typeof onConfirm === 'function') {
      onConfirm();
    }
  };
}

// ============================================================================
// 6. Empty State Component Generator (With SVG Illustration, No Emoji)
// ============================================================================
function renderEmptyState({
  icon = 'sparkles',
  title = 'No content yet',
  description = 'When things happen here, you will see them right away.',
  actionText = '',
  actionHref = '',
  actionOnClick = null
}) {
  let actionHtml = '';
  if (actionText) {
    if (actionHref) {
      actionHtml = `<a href="${actionHref}" class="btn btn-primary btn-sm">${escapeHTML(actionText)}</a>`;
    } else {
      actionHtml = `<button type="button" class="btn btn-primary btn-sm empty-state-action-btn">${escapeHTML(actionText)}</button>`;
    }
  }

  return `
    <div class="empty-state">
      <div class="empty-state-svg">
        <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="60" cy="60" r="50" fill="var(--brand-gradient-subtle)" />
          <circle cx="60" cy="60" r="32" stroke="var(--primary)" stroke-width="2" stroke-dasharray="4 4"/>
          <g transform="translate(46, 46)">
            ${renderIcon(icon, '', 'width="28" height="28" style="color: var(--primary); stroke-width: 2;"')}
          </g>
        </svg>
      </div>
      <h3 class="empty-state-title">${escapeHTML(title)}</h3>
      <p class="empty-state-desc">${escapeHTML(description)}</p>
      ${actionHtml}
    </div>
  `;
}

// ============================================================================
// 7. Text Formatters & Helpers
// ============================================================================
function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatCount(count) {
  const num = Number(count) || 0;
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
}

function pluralize(count, singular, plural = singular + 's') {
  return `${count} ${count === 1 ? singular : plural}`;
}

function timeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString.endsWith('Z') ? dateString : dateString + 'Z');
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;

  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;

  const years = Math.floor(days / 365);
  return `${years}y`;
}

function formatExactDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString.endsWith('Z') ? dateString : dateString + 'Z');
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function formatPostContent(text) {
  const safeText = escapeHTML(text);
  const withMentions = safeText.replace(
    /@([a-zA-Z0-9_]+)/g,
    '<a href="/profile.html?user=$1" class="mention-link" style="color: var(--primary); font-weight: 600;">@$1</a>'
  );
  const withHashtags = withMentions.replace(
    /#([a-zA-Z0-9_]+)/g,
    '<a href="/discover.html?tag=$1" class="hashtag-link" style="color: var(--accent-violet); font-weight: 600;">#$1</a>'
  );
  return withHashtags;
}

function debounce(fn, delay = 250) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// Initialize theme immediately on evaluation
initTheme();
