/**
 * Linkora - Shared Navigation, Sidebars & Global Chrome Controller
 * Connect. Share. Grow.
 * Strict Lucide icons, responsive 3-column / 2-column / 1-column layout.
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
    if (currentPath.includes('profile.html') && !window.location.search) {
      window.location.href = '/login.html';
      return;
    }
  }

  // 1. Render Top Sticky Navbar
  renderTopNavbar(currentPath);

  // 2. Render Desktop Left Sidebar (if container exists)
  renderLeftSidebar(currentPath);

  // 3. Render Desktop Right Sidebar (if container exists)
  renderRightSidebar();

  // 4. Render Mobile Bottom Tab Bar
  renderMobileTabBar(currentPath);

  // 5. Render Shared Footer (if container exists)
  renderFooter();

  // 6. Bind Global Create / Post Dialog
  initCreatePostModal();

  // Trigger page-specific initializer
  if (typeof pageInit === 'function') {
    pageInit(currentUser);
  }
}

// ============================================================================
// 1. Top Sticky Navbar
// ============================================================================
function renderTopNavbar(currentPath) {
  const navPlaceholder = document.getElementById('navbar-mount');
  if (!navPlaceholder) return;

  const isHome = currentPath === '/' || currentPath.endsWith('index.html');
  const isDiscover = currentPath.includes('discover');
  const isLogin = currentPath.includes('login');
  const isRegister = currentPath.includes('register');

  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const logoSrc = currentTheme === 'dark' ? '/assets/logo-light.svg' : '/assets/logo-dark.svg';

  let rightSectionHtml = '';

  if (currentUser) {
    rightSectionHtml = `
      <div class="navbar-right">
        <!-- Home Nav Icon -->
        <a href="/" class="btn-icon-nav ${isHome ? 'active' : ''}" title="Home" aria-label="Home">
          ${renderIcon('home', '', 'width="22" height="22"')}
        </a>

        <!-- Explore Nav Icon -->
        <a href="/discover.html" class="btn-icon-nav ${isDiscover ? 'active' : ''}" title="Explore" aria-label="Explore">
          ${renderIcon('compass', '', 'width="22" height="22"')}
        </a>

        <!-- Messages Nav Icon with Unread Badge -->
        <a href="/discover.html?tab=messages" class="btn-icon-nav" title="Messages" aria-label="Messages" id="nav-btn-messages">
          ${renderIcon('mail', '', 'width="22" height="22"')}
          <span class="badge-count" id="nav-unread-messages" style="display: none;">0</span>
        </a>

        <!-- Notifications Nav Icon with Unread Badge -->
        <a href="/discover.html?tab=notifications" class="btn-icon-nav" title="Notifications" aria-label="Notifications" id="nav-btn-notifications">
          ${renderIcon('bell', '', 'width="22" height="22"')}
          <span class="badge-count" id="nav-unread-notifications" style="display: none;">0</span>
        </a>

        <!-- Create Button (Primary Gradient) -->
        <button type="button" class="btn btn-primary btn-sm btn-nav-create" id="btn-navbar-create">
          ${renderIcon('plus', '', 'width="16" height="16"')}
          <span>Create</span>
        </button>

        <!-- Theme Toggle Button -->
        <button type="button" class="btn-icon-theme btn-icon-nav" id="btn-theme-toggle" aria-label="Toggle theme"></button>

        <!-- User Avatar & Dropdown Menu -->
        <div class="dropdown-wrap" id="nav-user-dropdown-wrap">
          <button type="button" class="nav-user-btn" id="btn-user-menu" aria-haspopup="true" aria-expanded="false">
            ${renderAvatar(currentUser, 'avatar-xs')}
            <span class="nav-user-name">${escapeHTML(currentUser.username)}</span>
            ${renderIcon('chevron-down', '', 'width="14" height="14" style="color: var(--text-muted); ml: 2px;"')}
          </button>

          <div class="dropdown-menu" id="user-dropdown-menu">
            <div class="dropdown-header">
              <div style="font-size: var(--font-sm); font-weight: 700; color: var(--text-main);">${escapeHTML(currentUser.username)}</div>
              <div style="font-size: var(--font-xs); color: var(--text-faint);">${escapeHTML(currentUser.email || '')}</div>
            </div>

            <a href="/profile.html?user=${encodeURIComponent(currentUser.username)}" class="dropdown-item">
              ${renderIcon('user', '', 'width="18" height="18"')}
              <span>Profile</span>
            </a>

            <a href="/profile.html?user=${encodeURIComponent(currentUser.username)}&tab=bookmarks" class="dropdown-item">
              ${renderIcon('bookmark', '', 'width="18" height="18"')}
              <span>Bookmarks</span>
            </a>

            <a href="/profile.html?user=${encodeURIComponent(currentUser.username)}&action=edit" class="dropdown-item">
              ${renderIcon('settings', '', 'width="18" height="18"')}
              <span>Settings</span>
            </a>

            <div class="dropdown-divider"></div>

            <button type="button" class="dropdown-item" id="btn-dropdown-theme-toggle">
              ${renderIcon('sun', '', 'width="18" height="18"')}
              <span id="theme-dropdown-label">Theme Mode</span>
            </button>

            <button type="button" class="dropdown-item danger" id="btn-global-logout">
              ${renderIcon('log-out', '', 'width="18" height="18"')}
              <span>Log out</span>
            </button>
          </div>
        </div>
      </div>
    `;
  } else {
    rightSectionHtml = `
      <div class="navbar-right">
        <!-- Theme Toggle Button -->
        <button type="button" class="btn-icon-theme btn-icon-nav" id="btn-theme-toggle" aria-label="Toggle theme"></button>

        <a href="/login.html" class="btn btn-ghost btn-sm ${isLogin ? 'active' : ''}">Log in</a>
        <a href="/register.html" class="btn btn-primary btn-sm ${isRegister ? 'active' : ''}">Sign up</a>
      </div>
    `;
  }

  navPlaceholder.innerHTML = `
    <header class="navbar-sticky">
      <div class="navbar-container">
        <!-- Navbar Left: Logo -->
        <div class="navbar-left">
          <a href="/" class="brand-logo-link" title="Linkora - Home">
            <img src="${logoSrc}" alt="Linkora" class="brand-logo-img" />
          </a>
        </div>

        <!-- Navbar Center: Global Search with Live Dropdown -->
        ${(!currentUser && (isLogin || isRegister)) ? '<div class="navbar-center" style="display: none;"></div>' : `
        <div class="navbar-center">
          <div class="search-input-wrap">
            <span class="search-input-icon">
              ${renderIcon('search', '', 'width="18" height="18"')}
            </span>
            <input 
              type="text" 
              class="search-input-field" 
              id="nav-global-search" 
              placeholder="Search people, hashtags (#), or topics..." 
              autocomplete="off"
            />
          </div>
          <!-- Live Search Results Dropdown -->
          <div class="search-results-dropdown" id="search-results-dropdown"></div>
        </div>
        `}

        <!-- Navbar Right -->
        ${rightSectionHtml}
      </div>
    </header>
  `;

  // Bind Navbar Events
  bindNavbarEvents();
}

function bindNavbarEvents() {
  // Theme Toggle
  const themeBtns = document.querySelectorAll('.btn-icon-theme, #btn-dropdown-theme-toggle');
  themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      toggleTheme();
      const newTheme = document.documentElement.getAttribute('data-theme');
      const label = document.getElementById('theme-dropdown-label');
      if (label) label.textContent = `Theme: ${newTheme === 'dark' ? 'Dark' : 'Light'}`;
    });
  });

  // Global Search Dropdown with Debouncing
  const searchInput = document.getElementById('nav-global-search');
  const searchDropdown = document.getElementById('search-results-dropdown');

  if (searchInput && searchDropdown) {
    const handleSearch = debounce(async (query) => {
      if (!query || query.trim().length === 0) {
        searchDropdown.classList.remove('show');
        searchDropdown.innerHTML = '';
        return;
      }

      const q = query.trim();
      searchDropdown.innerHTML = `
        <div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: var(--font-sm);">
          Searching Linkora...
        </div>
      `;
      searchDropdown.classList.add('show');

      try {
        const res = await API.discoverUsers(q);
        const users = res.users || [];

        let html = '';

        // Hashtag shortcut if starts with # or has query
        const cleanTag = q.replace(/^#/, '');
        html += `
          <div class="search-result-group">
            <div class="search-result-group-header">Tags & Topics</div>
            <a href="/discover.html?search=%23${encodeURIComponent(cleanTag)}" class="search-result-item">
              <div style="width: 32px; height: 32px; border-radius: var(--radius-full); background: var(--brand-gradient-subtle); display: flex; align-items: center; justify-content: center; color: var(--primary);">
                #
              </div>
              <div style="flex: 1;">
                <div style="font-size: var(--font-sm); font-weight: 600; color: var(--text-main);">#${escapeHTML(cleanTag)}</div>
                <div style="font-size: 11px; color: var(--text-muted);">Explore tag posts</div>
              </div>
            </a>
          </div>
        `;

        // Users Section
        if (users.length > 0) {
          html += `<div class="search-result-group"><div class="search-result-group-header">People</div>`;
          users.slice(0, 5).forEach(user => {
            html += `
              <a href="/profile.html?user=${encodeURIComponent(user.username)}" class="search-result-item">
                ${renderAvatar(user, 'avatar-sm')}
                <div style="flex: 1; min-width: 0;">
                  <div style="font-size: var(--font-sm); font-weight: 600; color: var(--text-main); display: flex; align-items: center;">
                    ${escapeHTML(user.username)}
                    ${renderVerifiedBadge()}
                  </div>
                  <div style="font-size: 11px; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${escapeHTML(user.bio || 'Linkora creator')}
                  </div>
                </div>
              </a>
            `;
          });
          html += `</div>`;
        } else {
          html += `
            <div style="padding: 12px 16px; font-size: var(--font-xs); color: var(--text-muted); text-align: center;">
              No users found matching "${escapeHTML(q)}"
            </div>
          `;
        }

        // View All Link
        html += `
          <a href="/discover.html?search=${encodeURIComponent(q)}" style="display: block; padding: 10px 16px; text-align: center; font-size: var(--font-xs); font-weight: 600; color: var(--primary); background: var(--bg-surface-elevated); border-top: 1px solid var(--border-subtle);">
            View all results for "${escapeHTML(q)}" →
          </a>
        `;

        searchDropdown.innerHTML = html;
      } catch (err) {
        searchDropdown.innerHTML = `
          <div style="padding: 14px; text-align: center; color: var(--danger); font-size: var(--font-xs);">
            Failed to search: ${escapeHTML(err.message)}
          </div>
        `;
      }
    }, 280);

    searchInput.addEventListener('input', (e) => handleSearch(e.target.value));
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const q = searchInput.value.trim();
        if (q) window.location.href = `/discover.html?search=${encodeURIComponent(q)}`;
      } else if (e.key === 'Escape') {
        searchDropdown.classList.remove('show');
      }
    });

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
        searchDropdown.classList.remove('show');
      }
    });
  }

  // User Dropdown Menu
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

  // Logout Handler
  const logoutBtn = document.getElementById('btn-global-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      showConfirmDialog({
        title: 'Sign out of Linkora?',
        message: 'You can always sign back in with your username or email anytime.',
        confirmText: 'Sign out',
        cancelText: 'Cancel',
        isDanger: true,
        onConfirm: async () => {
          try {
            await API.logout();
            showToast('Signed out successfully', 'info');
            setTimeout(() => {
              window.location.href = '/login.html';
            }, 300);
          } catch (err) {
            showToast(err.message, 'error');
          }
        }
      });
    });
  }

  // Create Button Navbar Handler
  const navCreateBtn = document.getElementById('btn-navbar-create');
  if (navCreateBtn) {
    navCreateBtn.addEventListener('click', openCreateModal);
  }
}

// ============================================================================
// 2. Desktop Left Sidebar
// ============================================================================
function renderLeftSidebar(currentPath) {
  const sidebar = document.getElementById('left-sidebar-mount');
  if (!sidebar) return;

  const isHome = currentPath === '/' || currentPath.endsWith('index.html');
  const isDiscover = currentPath.includes('discover');
  const isProfile = currentPath.includes('profile') && currentUser && window.location.search.includes(`user=${currentUser.username}`);

  if (!currentUser) {
    // For logged-out visitors, show a neat guest card in sidebar
    sidebar.innerHTML = `
      <div class="card" style="padding: var(--space-4); text-align: center;">
        <div style="width: 48px; height: 48px; margin: 0 auto var(--space-2); border-radius: var(--radius-full); background: var(--brand-gradient-subtle); display: flex; align-items: center; justify-content: center; color: var(--primary);">
          ${renderIcon('sparkles', '', 'width="24" height="24"')}
        </div>
        <h3 style="font-size: var(--font-base); font-weight: 700; margin-bottom: 6px;">New to Linkora?</h3>
        <p style="font-size: var(--font-xs); color: var(--text-muted); margin-bottom: var(--space-3);">
          Sign up now to share updates, follow builders, and connect in real-time.
        </p>
        <a href="/register.html" class="btn btn-primary btn-sm btn-block" style="margin-bottom: 8px;">Create account</a>
        <a href="/login.html" class="btn btn-secondary btn-sm btn-block">Sign in</a>
      </div>
    `;
    return;
  }

  sidebar.innerHTML = `
    <ul class="sidebar-nav">
      <li>
        <a href="/" class="nav-link-item ${isHome ? 'active' : ''}">
          ${renderIcon('home')}
          <span>Home</span>
        </a>
      </li>
      <li>
        <a href="/discover.html" class="nav-link-item ${isDiscover ? 'active' : ''}">
          ${renderIcon('compass')}
          <span>Explore</span>
        </a>
      </li>
      <li>
        <a href="/discover.html?tab=notifications" class="nav-link-item" id="sidebar-notifications-link">
          ${renderIcon('bell')}
          <span>Notifications</span>
          <span class="badge-count" id="sidebar-unread-notifications" style="display: none; position: static; margin-left: auto;">0</span>
        </a>
      </li>
      <li>
        <a href="/discover.html?tab=messages" class="nav-link-item" id="sidebar-messages-link">
          ${renderIcon('mail')}
          <span>Messages</span>
          <span class="badge-count" id="sidebar-unread-messages" style="display: none; position: static; margin-left: auto;">0</span>
        </a>
      </li>
      <li>
        <a href="/profile.html?user=${encodeURIComponent(currentUser.username)}&tab=bookmarks" class="nav-link-item">
          ${renderIcon('bookmark')}
          <span>Bookmarks</span>
        </a>
      </li>
      <li>
        <a href="/profile.html?user=${encodeURIComponent(currentUser.username)}" class="nav-link-item ${isProfile ? 'active' : ''}">
          ${renderIcon('user')}
          <span>Profile</span>
        </a>
      </li>
      <li>
        <a href="/profile.html?user=${encodeURIComponent(currentUser.username)}&action=edit" class="nav-link-item">
          ${renderIcon('settings')}
          <span>Settings</span>
        </a>
      </li>
    </ul>

    <!-- Big Post Button -->
    <button type="button" class="btn btn-primary sidebar-post-btn" id="btn-sidebar-post">
      ${renderIcon('plus', '', 'width="18" height="18"')}
      <span>Post</span>
    </button>

    <!-- User Profile Pill at Bottom -->
    <div class="sidebar-user-pill" id="sidebar-user-pill" style="cursor: pointer;">
      <div style="display: flex; align-items: center; gap: 12px; min-width: 0;">
        ${renderAvatar(currentUser, 'avatar-md')}
        <div class="user-pill-details" style="min-width: 0;">
          <div style="font-size: var(--font-sm); font-weight: 700; color: var(--text-main); display: flex; align-items: center; gap: 3px;">
            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHTML(currentUser.username)}</span>
            ${renderVerifiedBadge()}
          </div>
          <div style="font-size: 11px; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            @${escapeHTML(currentUser.username)}
          </div>
        </div>
      </div>
      <div class="user-pill-details" style="color: var(--text-muted);">
        ${renderIcon('more-horizontal', '', 'width="18" height="18"')}
      </div>
    </div>
  `;

  const sidebarPostBtn = document.getElementById('btn-sidebar-post');
  if (sidebarPostBtn) {
    sidebarPostBtn.addEventListener('click', openCreateModal);
  }

  const userPill = document.getElementById('sidebar-user-pill');
  if (userPill) {
    userPill.addEventListener('click', () => {
      window.location.href = `/profile.html?user=${encodeURIComponent(currentUser.username)}`;
    });
  }
}

// ============================================================================
// 3. Desktop Right Sidebar (Trending Hashtags & Who To Follow)
// ============================================================================
async function renderRightSidebar() {
  const sidebar = document.querySelector('.right-sidebar');
  if (!sidebar) return;

  sidebar.innerHTML = `
    <!-- Trending Hashtags Widget -->
    <div class="sidebar-widget" id="widget-trending-hashtags">
      <h3 class="sidebar-widget-title">
        ${renderIcon('trending-up', '', 'width="18" height="18"')}
        <span>Trending on Linkora</span>
      </h3>
      <div class="trending-tags-list" id="trending-tags-mount">
        <!-- Rendered dynamically -->
        <div class="skeleton" style="height: 38px; margin-bottom: 8px;"></div>
        <div class="skeleton" style="height: 38px; margin-bottom: 8px;"></div>
        <div class="skeleton" style="height: 38px;"></div>
      </div>
    </div>

    <!-- Who To Follow / Suggested Creators Widget -->
    <div class="sidebar-widget" id="widget-suggested-creators">
      <h3 class="sidebar-widget-title">
        ${renderIcon('users', '', 'width="18" height="18"')}
        <span>Who to follow</span>
      </h3>
      <div class="suggested-users-list" id="suggested-users-mount">
        <div class="skeleton" style="height: 48px; margin-bottom: 8px;"></div>
        <div class="skeleton" style="height: 48px;"></div>
      </div>
    </div>

    <!-- Small Footer Links -->
    <div class="sidebar-footer-links">
      <a href="/discover.html">About</a>
      <span>·</span>
      <a href="/discover.html">Help Center</a>
      <span>·</span>
      <a href="/discover.html">Terms of Service</a>
      <span>·</span>
      <a href="/discover.html">Privacy Policy</a>
      <span>·</span>
      <a href="/discover.html">Cookie Policy</a>
      <div style="width: 100%; margin-top: 4px;">© 2026 Linkora, Inc.</div>
    </div>
  `;

  // Fetch and populate trending tags
  loadTrendingWidget();

  // Fetch and populate suggested users
  loadSuggestedUsersWidget();
}

async function loadTrendingWidget() {
  const mount = document.getElementById('trending-tags-mount');
  if (!mount) return;

  const defaultTags = [
    { tag: 'buildinpublic', count: 142 },
    { tag: 'designsystems', count: 89 },
    { tag: 'webdev', count: 64 },
    { tag: 'javascript', count: 51 },
    { tag: 'creators', count: 37 }
  ];

  try {
    const res = await API.getTrendingHashtags();
    const tags = (res && res.tags && res.tags.length > 0) ? res.tags : defaultTags;
    mount.innerHTML = tags.slice(0, 5).map(item => `
      <a href="/discover.html?search=%23${encodeURIComponent(item.tag)}" style="display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; border-radius: var(--radius-md); transition: background var(--transition-fast);" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='transparent'">
        <div>
          <div style="font-size: var(--font-xs); color: var(--text-faint);">Trending in Tech</div>
          <div style="font-size: var(--font-sm); font-weight: 700; color: var(--text-main);">#${escapeHTML(item.tag)}</div>
        </div>
        <span style="font-size: 11px; color: var(--text-muted);">${item.count} posts</span>
      </a>
    `).join('');
  } catch (err) {
    mount.innerHTML = defaultTags.map(item => `
      <a href="/discover.html?search=%23${encodeURIComponent(item.tag)}" style="display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; border-radius: var(--radius-md); transition: background var(--transition-fast);" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='transparent'">
        <div>
          <div style="font-size: var(--font-xs); color: var(--text-faint);">Trending in Tech</div>
          <div style="font-size: var(--font-sm); font-weight: 700; color: var(--text-main);">#${escapeHTML(item.tag)}</div>
        </div>
        <span style="font-size: 11px; color: var(--text-muted);">${item.count} posts</span>
      </a>
    `).join('');
  }
}

async function loadSuggestedUsersWidget() {
  const mount = document.getElementById('suggested-users-mount');
  if (!mount) return;

  try {
    const res = await API.getSuggestedUsers();
    let users = res.users || [];

    // Filter out myself and anyone I already follow
    if (currentUser) {
      users = users.filter(u => u.id !== currentUser.id && u.username !== currentUser.username && !u.is_following);
    }

    if (users.length === 0) {
      mount.innerHTML = `
        <div style="font-size: var(--font-xs); color: var(--text-muted); padding: 8px 0; text-align: center;">
          You're all caught up! No new suggestions.
        </div>
      `;
      return;
    }

    mount.innerHTML = users.slice(0, 4).map(u => `
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 0;" id="widget-suggested-user-${u.id}">
        <a href="/profile.html?user=${encodeURIComponent(u.username)}" style="display: flex; align-items: center; gap: 10px; min-width: 0; text-decoration: none;">
          ${renderAvatar(u, 'avatar-sm')}
          <div style="min-width: 0;">
            <div style="font-size: var(--font-sm); font-weight: 600; color: var(--text-main); display: flex; align-items: center; gap: 2px;">
              <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHTML(u.username)}</span>
              ${renderVerifiedBadge()}
            </div>
            <div style="font-size: 11px; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              @${escapeHTML(u.username)}
            </div>
          </div>
        </a>
        <button type="button" class="btn btn-secondary btn-xs btn-widget-follow" data-user-id="${u.id}" data-username="${u.username}">
          Follow
        </button>
      </div>
    `).join('');

    // Bind inline follow buttons
    mount.querySelectorAll('.btn-widget-follow').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!currentUser) {
          window.location.href = '/login.html';
          return;
        }
        const userId = btn.getAttribute('data-user-id');
        const username = btn.getAttribute('data-username');
        btn.disabled = true;
        try {
          const result = await API.toggleFollow(userId);
          if (result.following) {
            btn.textContent = 'Following';
            btn.classList.remove('btn-secondary');
            btn.classList.add('btn-ghost');
            showToast(`Following @${username}`, 'success');
          } else {
            btn.textContent = 'Follow';
            btn.classList.remove('btn-ghost');
            btn.classList.add('btn-secondary');
          }
        } catch (err) {
          showToast(err.message, 'error');
        } finally {
          btn.disabled = false;
        }
      });
    });
  } catch (err) {
    mount.innerHTML = `
      <div style="font-size: var(--font-xs); color: var(--text-faint); padding: 8px 0; text-align: center;">
        Unable to load suggestions.
      </div>
    `;
  }
}

// ============================================================================
// 4. Mobile Bottom Tab Bar
// ============================================================================
function renderMobileTabBar(currentPath) {
  let tabbar = document.querySelector('.mobile-tabbar');
  if (!tabbar) {
    tabbar = document.createElement('nav');
    tabbar.className = 'mobile-tabbar';
    document.body.appendChild(tabbar);
  }

  const isHome = currentPath === '/' || currentPath.endsWith('index.html');
  const isDiscover = currentPath.includes('discover');
  const isProfile = currentPath.includes('profile');

  if (currentUser) {
    tabbar.innerHTML = `
      <a href="/" class="tabbar-item ${isHome ? 'active' : ''}" aria-label="Home">
        ${renderIcon('home')}
      </a>

      <a href="/discover.html" class="tabbar-item ${isDiscover ? 'active' : ''}" aria-label="Explore">
        ${renderIcon('compass')}
      </a>

      <button type="button" class="tabbar-create-btn" id="mobile-tabbar-create" aria-label="Create Post">
        ${renderIcon('plus', '', 'width="24" height="24"')}
      </button>

      <a href="/discover.html?tab=messages" class="tabbar-item" aria-label="Messages">
        ${renderIcon('mail')}
      </a>

      <a href="/profile.html?user=${encodeURIComponent(currentUser.username)}" class="tabbar-item ${isProfile ? 'active' : ''}" aria-label="Profile">
        ${renderIcon('user')}
      </a>
    `;

    const mobCreateBtn = document.getElementById('mobile-tabbar-create');
    if (mobCreateBtn) {
      mobCreateBtn.addEventListener('click', openCreateModal);
    }
  } else {
    tabbar.innerHTML = `
      <a href="/" class="tabbar-item ${isHome ? 'active' : ''}" aria-label="Home">
        ${renderIcon('home')}
      </a>

      <a href="/discover.html" class="tabbar-item ${isDiscover ? 'active' : ''}" aria-label="Explore">
        ${renderIcon('compass')}
      </a>

      <a href="/login.html" class="tabbar-item" aria-label="Log in">
        ${renderIcon('log-out')}
      </a>
    `;
  }
}

// ============================================================================
// 5. Global Shared Footer
// ============================================================================
function renderFooter() {
  const footerMount = document.getElementById('footer-mount');
  if (!footerMount) return;

  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const logoSrc = currentTheme === 'dark' ? '/assets/logo-light.svg' : '/assets/logo-dark.svg';

  footerMount.className = 'app-footer';
  footerMount.innerHTML = `
    <div style="max-width: var(--app-max-width); margin: 0 auto; padding: var(--space-4) var(--space-2); display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; border-top: 1px solid var(--border); gap: var(--space-2);">
      <div style="display: flex; align-items: center; gap: 12px;">
        <a href="/" title="Linkora">
          <img src="${logoSrc}" alt="Linkora" class="brand-logo-img" style="height: 28px;" />
        </a>
        <span style="font-size: var(--font-xs); color: var(--text-muted);">Connect. Share. Grow.</span>
      </div>

      <div style="display: flex; gap: var(--space-3); font-size: var(--font-xs); color: var(--text-muted);">
        <a href="/discover.html">Explore</a>
        <a href="/login.html">Sign In</a>
        <a href="/register.html">Register</a>
        <a href="https://github.com" target="_blank" rel="noopener">GitHub</a>
      </div>

      <div style="font-size: 11px; color: var(--text-faint);">
        © 2026 Linkora. All rights reserved.
      </div>
    </div>
  `;
}

// ============================================================================
// 6. Global Create Post Modal
// ============================================================================
function initCreatePostModal() {
  let modalOverlay = document.getElementById('global-create-post-modal');
  if (!modalOverlay) {
    modalOverlay = document.createElement('div');
    modalOverlay.id = 'global-create-post-modal';
    modalOverlay.className = 'modal-overlay';
    document.body.appendChild(modalOverlay);
  }

  modalOverlay.innerHTML = `
    <div class="card modal-card" style="max-width: 580px;">
      <div class="modal-header">
        <h3 class="modal-title">Create Post</h3>
        <button type="button" class="btn-close-modal" id="btn-close-create-modal" aria-label="Close modal">
          ${renderIcon('x', '', 'width="18" height="18"')}
        </button>
      </div>

      <div class="modal-body">
        <div style="display: flex; gap: 12px;">
          <div id="modal-composer-avatar"></div>
          <div style="flex: 1;">
            <textarea 
              id="modal-post-content" 
              class="textarea-field" 
              placeholder="What are you building or thinking about today?" 
              rows="4" 
              maxlength="280"
              style="resize: none;"
            ></textarea>

            <div style="margin-top: 10px; display: none;" id="modal-image-input-wrap">
              <input 
                type="url" 
                id="modal-post-image-url" 
                class="input-field" 
                placeholder="Paste an image URL..." 
              />
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer" style="justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <button type="button" class="btn-icon" id="modal-btn-attach-image" title="Attach image URL">
            ${renderIcon('image', '', 'width="20" height="20"')}
          </button>
          <span style="font-size: var(--font-xs); color: var(--text-muted);" id="modal-char-count">0/280</span>
        </div>

        <div style="display: flex; gap: 8px;">
          <button type="button" class="btn btn-secondary btn-sm" id="modal-btn-cancel-post">Cancel</button>
          <button type="button" class="btn btn-primary btn-sm" id="modal-btn-submit-post" disabled>Post</button>
        </div>
      </div>
    </div>
  `;

  const closeBtn = modalOverlay.querySelector('#btn-close-create-modal');
  const cancelBtn = modalOverlay.querySelector('#modal-btn-cancel-post');
  const textarea = modalOverlay.querySelector('#modal-post-content');
  const submitBtn = modalOverlay.querySelector('#modal-btn-submit-post');
  const charCount = modalOverlay.querySelector('#modal-char-count');
  const attachImgBtn = modalOverlay.querySelector('#modal-btn-attach-image');
  const imgWrap = modalOverlay.querySelector('#modal-image-input-wrap');
  const imgInput = modalOverlay.querySelector('#modal-post-image-url');

  function closeModal() {
    modalOverlay.classList.remove('show');
    if (textarea) textarea.value = '';
    if (imgInput) imgInput.value = '';
    if (imgWrap) imgWrap.style.display = 'none';
  }

  if (closeBtn) closeBtn.onclick = closeModal;
  if (cancelBtn) cancelBtn.onclick = closeModal;
  modalOverlay.onclick = (e) => {
    if (e.target === modalOverlay) closeModal();
  };

  if (attachImgBtn && imgWrap) {
    attachImgBtn.onclick = () => {
      const isHidden = imgWrap.style.display === 'none';
      imgWrap.style.display = isHidden ? 'block' : 'none';
      if (isHidden && imgInput) imgInput.focus();
    };
  }

  if (textarea && submitBtn && charCount) {
    textarea.addEventListener('input', () => {
      const len = textarea.value.length;
      charCount.textContent = `${len}/280`;
      submitBtn.disabled = len === 0 || len > 280;
    });

    submitBtn.addEventListener('click', async () => {
      const content = textarea.value.trim();
      const imageUrl = imgInput ? imgInput.value.trim() : '';

      if (!content) return;

      submitBtn.disabled = true;
      submitBtn.textContent = 'Posting...';

      try {
        await API.createPost(content, imageUrl || null);
        showToast('Post created successfully!', 'success');
        closeModal();
        submitBtn.textContent = 'Post';
        submitBtn.disabled = false;

        // If on index, reload feed; otherwise redirect
        if (window.location.pathname === '/' || window.location.pathname.endsWith('index.html')) {
          if (typeof loadFeed === 'function') loadFeed();
        } else {
          window.location.href = '/';
        }
      } catch (err) {
        showToast(err.message, 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Post';
      }
    });
  }
}

function openCreateModal() {
  if (!currentUser) {
    window.location.href = '/login.html';
    return;
  }

  // If we are on the home page and the composer element exists, focus it smoothly
  const homeComposer = document.getElementById('post-content');
  if (homeComposer && window.location.pathname === '/' || window.location.pathname.endsWith('index.html')) {
    homeComposer.focus();
    homeComposer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const modalOverlay = document.getElementById('global-create-post-modal');
  if (modalOverlay) {
    const avatarMount = modalOverlay.querySelector('#modal-composer-avatar');
    if (avatarMount) avatarMount.innerHTML = renderAvatar(currentUser, 'avatar-md');
    modalOverlay.classList.add('show');
    const textarea = modalOverlay.querySelector('#modal-post-content');
    if (textarea) setTimeout(() => textarea.focus(), 100);
  }
}

document.addEventListener('DOMContentLoaded', initNavbar);
