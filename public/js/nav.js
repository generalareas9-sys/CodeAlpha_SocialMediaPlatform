/**
 * Linkora - Shared Navigation & Footer Controller
 * Connect. Share. Grow.
 */
let currentUser = null;

async function initNavbar() {
  const currentPath = window.location.pathname;

  // Check auth session
  try {
    const res = await API.getMe();
    currentUser = res.user;
  } catch (err) {
    currentUser = null;
    // Don't auto-redirect index.html if logged out; index.html shows the landing hero!
    if (currentPath.includes('profile.html') && !window.location.search) {
      window.location.href = '/login.html';
      return;
    }
  }

  // Render Top Navbar
  const navPlaceholder = document.getElementById('navbar-mount');
  if (navPlaceholder) {
    const isHome = currentPath === '/' || currentPath.endsWith('index.html');
    const isDiscover = currentPath.includes('discover');
    const isProfile = currentPath.includes('profile') && (!currentUser || window.location.search.includes(`user=${currentUser.username}`));
    const isLogin = currentPath.includes('login');
    const isRegister = currentPath.includes('register');

    let userNavHtml = '';
    if (currentUser) {
      userNavHtml = `
        <div class="nav-right">
          <!-- Search input in navbar -->
          <div class="nav-search-wrap">
            <svg class="nav-search-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input type="text" class="nav-search-input" id="nav-global-search" placeholder="Search Linkora..." />
          </div>

          <!-- Theme Toggle Button -->
          <button type="button" class="btn-icon-theme" id="btn-theme-toggle" title="Toggle theme"></button>

          <!-- User Dropdown Menu -->
          <div class="nav-user-dropdown">
            <button type="button" class="nav-user-btn" id="btn-user-menu" aria-haspopup="true" aria-expanded="false">
              ${renderAvatar(currentUser, 'avatar-xs')}
              <span class="nav-user-name">${escapeHTML(currentUser.username)}</span>
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="14" height="14">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>

            <div class="dropdown-menu" id="user-dropdown-menu">
              <div class="dropdown-header">
                <div style="font-size: var(--font-xs); font-weight: 600; color: var(--text-main);">${escapeHTML(currentUser.username)}</div>
                <div style="font-size: 11px; color: var(--text-faint);">${escapeHTML(currentUser.email || '')}</div>
              </div>

              <a href="/profile.html?user=${encodeURIComponent(currentUser.username)}" class="dropdown-item">
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
                <span>Profile</span>
              </a>

              <a href="/profile.html?user=${encodeURIComponent(currentUser.username)}&action=edit" class="dropdown-item">
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                <span>Settings</span>
              </a>

              <button type="button" class="dropdown-item danger" id="btn-global-logout" style="width: 100%; text-align: left; cursor: pointer;">
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                </svg>
                <span>Log out</span>
              </button>
            </div>
          </div>
        </div>
      `;
    } else {
      userNavHtml = `
        <div class="nav-right">
          <!-- Theme Toggle Button -->
          <button type="button" class="btn-icon-theme" id="btn-theme-toggle" title="Toggle theme"></button>

          <a href="/login.html" class="btn btn-ghost ${isLogin ? 'active' : ''}">Log in</a>
          <a href="/register.html" class="btn btn-primary ${isRegister ? 'active' : ''}">Sign up</a>
        </div>
      `;
    }

    navPlaceholder.innerHTML = `
      <header class="navbar">
        <div class="nav-container">
          <div style="display: flex; align-items: center; gap: var(--space-6);">
            <a href="/" class="nav-brand" title="Linkora - Home">
              <img src="/assets/logo.svg" alt="Linkora" />
            </a>

            <nav class="nav-links">
              <a href="/" class="nav-item ${isHome ? 'active' : ''}">
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                </svg>
                <span>Feed</span>
              </a>
              <a href="/discover.html" class="nav-item ${isDiscover ? 'active' : ''}">
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                <span>Discover</span>
              </a>
              ${currentUser ? `
                <a href="/profile.html?user=${encodeURIComponent(currentUser.username)}" class="nav-item ${isProfile ? 'active' : ''}">
                  <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                  </svg>
                  <span>Profile</span>
                </a>
              ` : ''}
            </nav>
          </div>

          ${userNavHtml}
        </div>
      </header>

      <!-- Mobile Bottom Navigation -->
      <nav class="mobile-nav">
        <a href="/" class="mobile-nav-item ${isHome ? 'active' : ''}">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
          </svg>
          <span>Feed</span>
        </a>
        <a href="/discover.html" class="mobile-nav-item ${isDiscover ? 'active' : ''}">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <span>Discover</span>
        </a>
        ${currentUser ? `
          <a href="/#composer" class="mobile-nav-item" id="mobile-nav-post-btn">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
            </svg>
            <span>Post</span>
          </a>
          <a href="/profile.html?user=${encodeURIComponent(currentUser.username)}" class="mobile-nav-item ${isProfile ? 'active' : ''}">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
            <span>Profile</span>
          </a>
        ` : `
          <a href="/login.html" class="mobile-nav-item">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/>
            </svg>
            <span>Log in</span>
          </a>
        `}
      </nav>
    `;

    // Theme toggle listener
    const themeBtn = document.getElementById('btn-theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', toggleTheme);
      updateThemeToggleIcons(document.documentElement.getAttribute('data-theme') || 'dark');
    }

    // Search bar enter listener
    const searchInput = document.getElementById('nav-global-search');
    if (searchInput) {
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const q = searchInput.value.trim();
          if (q) {
            window.location.href = `/discover.html?search=${encodeURIComponent(q)}`;
          }
        }
      });
    }

    // Dropdown toggle listener
    const userMenuBtn = document.getElementById('btn-user-menu');
    const userDropdown = document.getElementById('user-dropdown-menu');
    if (userMenuBtn && userDropdown) {
      userMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = userDropdown.classList.contains('show');
        userDropdown.classList.toggle('show', !isOpen);
        userMenuBtn.setAttribute('aria-expanded', !isOpen);
      });

      document.addEventListener('click', () => {
        userDropdown.classList.remove('show');
        userMenuBtn.setAttribute('aria-expanded', 'false');
      });
    }

    // Logout listener
    const logoutBtn = document.getElementById('btn-global-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        try {
          await API.logout();
          showToast('Logged out successfully', 'success');
          setTimeout(() => {
            window.location.href = '/login.html';
          }, 300);
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }
  }

  // Render Footer
  renderFooter();

  // Trigger page-specific initializer
  if (typeof pageInit === 'function') {
    pageInit(currentUser);
  }
}

function renderFooter() {
  let footer = document.getElementById('footer-mount');
  if (!footer) {
    footer = document.createElement('footer');
    footer.id = 'footer-mount';
    document.body.appendChild(footer);
  }

  footer.className = 'app-footer';
  footer.innerHTML = `
    <div class="footer-container">
      <div class="footer-left">
        <a href="/" title="Linkora">
          <img src="/assets/logo.svg" alt="Linkora" class="footer-logo" />
        </a>
        <span class="footer-desc">Connect. Share. Grow. A minimalist community for builders and creators.</span>
      </div>
      <div class="footer-links">
        <a href="/discover.html">Discover</a>
        <a href="#about" onclick="alert('Linkora is a modern community platform built with Node.js and SQLite.'); return false;">About</a>
        <a href="#privacy" onclick="alert('Linkora values your privacy. Session data is stored in secure httpOnly cookies.'); return false;">Privacy</a>
        <a href="#terms" onclick="alert('Standard community guidelines apply. Be respectful and supportive.'); return false;">Terms</a>
      </div>
      <div class="footer-copy">© 2026 Linkora. All rights reserved.</div>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', initNavbar);
