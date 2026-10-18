/**
 * Linkora - Discover Creators Controller
 * Connect. Share. Grow.
 */
async function pageInit(user) {
  const searchInput = document.getElementById('search-users-input');
  const discoverGrid = document.getElementById('discover-grid');

  if (!discoverGrid) return;

  // Check URL query param ?search=
  const urlParams = new URLSearchParams(window.location.search);
  const initialQuery = urlParams.get('search') || '';

  if (searchInput && initialQuery) {
    searchInput.value = initialQuery;
  }

  loadUsers(initialQuery);

  if (searchInput) {
    searchInput.addEventListener('input', debounce((e) => {
      const query = e.target.value.trim();
      loadUsers(query);
    }, 300));
  }
}

async function loadUsers(search = '') {
  const grid = document.getElementById('discover-grid');
  if (!grid) return;

  // Skeleton loading state
  grid.innerHTML = `
    <div class="card discover-card">
      <div class="skeleton" style="width: 64px; height: 64px; border-radius: var(--radius-full); margin-bottom: var(--space-3);"></div>
      <div class="skeleton" style="width: 120px; height: 16px; margin-bottom: 6px;"></div>
      <div class="skeleton" style="width: 80px; height: 12px; margin-bottom: var(--space-3);"></div>
      <div class="skeleton" style="width: 100%; height: 32px; margin-bottom: var(--space-4);"></div>
      <div class="skeleton" style="width: 100%; height: 32px;"></div>
    </div>
    <div class="card discover-card">
      <div class="skeleton" style="width: 64px; height: 64px; border-radius: var(--radius-full); margin-bottom: var(--space-3);"></div>
      <div class="skeleton" style="width: 110px; height: 16px; margin-bottom: 6px;"></div>
      <div class="skeleton" style="width: 70px; height: 12px; margin-bottom: var(--space-3);"></div>
      <div class="skeleton" style="width: 100%; height: 32px; margin-bottom: var(--space-4);"></div>
      <div class="skeleton" style="width: 100%; height: 32px;"></div>
    </div>
  `;

  try {
    const data = await API.discoverUsers(search);
    const users = data.users || [];

    if (users.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1;" class="card empty-state">
          <svg class="empty-state-icon" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <div class="empty-state-title">No creators found</div>
          <p class="empty-state-desc">We couldn't find anyone matching "${escapeHTML(search)}". Try searching for different keywords or explore suggested accounts.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = users.map(u => createUserCardHTML(u, currentUser)).join('');
    users.forEach(u => attachDiscoverUserEvents(u.id));
  } catch (err) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1;" class="card empty-state">
        <div class="empty-state-title" style="color: var(--danger);">Error loading creators</div>
        <p class="empty-state-desc">${escapeHTML(err.message)}</p>
      </div>
    `;
  }
}

function createUserCardHTML(user, me) {
  const isMe = me && me.id === user.id;
  // Follow/Following button state comes from the real follows table
  const isFollowing = Boolean(user.is_following);
  const followerCount = user.follower_count || 0;
  const postCount = user.post_count || 0;

  return `
    <div class="card discover-card" id="user-card-${user.id}">
      <a href="/profile.html?user=${encodeURIComponent(user.username)}">
        ${renderAvatar(user, 'avatar-lg')}
      </a>
      <a href="/profile.html?user=${encodeURIComponent(user.username)}" class="discover-card-name">
        ${escapeHTML(user.username)}
      </a>
      <div class="discover-card-handle">@${escapeHTML(user.username)}</div>

      <div class="discover-card-bio">
        ${user.bio ? escapeHTML(user.bio) : '<em>No bio yet</em>'}
      </div>

      <div class="discover-card-stats">
        <span><strong>${postCount}</strong> ${postCount === 1 ? 'post' : 'posts'}</span> • 
        <span><strong id="card-followers-${user.id}">${followerCount}</strong> ${followerCount === 1 ? 'follower' : 'followers'}</span>
      </div>

      <div style="width: 100%; display: flex; gap: var(--space-2); justify-content: center;">
        <a href="/profile.html?user=${encodeURIComponent(user.username)}" class="btn btn-secondary btn-sm" style="flex: 1;">
          Profile
        </a>
        ${isMe ? `
          <button type="button" class="btn btn-secondary btn-sm" disabled style="opacity: 0.6; flex: 1;">You</button>
        ` : (me ? `
          <button type="button" class="btn btn-follow ${isFollowing ? 'following' : 'btn-primary'} btn-sm" data-discover-follow="${user.id}" style="flex: 1;">
            <span class="follow-text">${isFollowing ? 'Following' : 'Follow'}</span>
          </button>
        ` : `
          <a href="/login.html" class="btn btn-primary btn-sm" style="flex: 1;">Follow</a>
        `)}
      </div>
    </div>
  `;
}

function attachDiscoverUserEvents(userId) {
  const btn = document.querySelector(`[data-discover-follow="${userId}"]`);
  if (!btn) return;

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    const countEl = document.getElementById(`card-followers-${userId}`);
    const wasFollowing = btn.classList.contains('following');
    const currentFollowers = parseInt(countEl?.textContent || '0', 10);

    // Optimistic UI update
    btn.className = wasFollowing ? 'btn btn-follow btn-primary btn-sm' : 'btn btn-follow following btn-sm';
    btn.innerHTML = `<span class="follow-text">${wasFollowing ? 'Follow' : 'Following'}</span>`;
    if (countEl) {
      countEl.textContent = wasFollowing ? Math.max(0, currentFollowers - 1) : currentFollowers + 1;
    }

    try {
      const res = await API.toggleFollow(userId);
      // Confirm from API
      if (res.following) {
        btn.className = 'btn btn-follow following btn-sm';
        btn.innerHTML = '<span class="follow-text">Following</span>';
      } else {
        btn.className = 'btn btn-follow btn-primary btn-sm';
        btn.innerHTML = '<span class="follow-text">Follow</span>';
      }
      if (countEl) countEl.textContent = res.follower_count;
      showToast(res.message, 'success');
    } catch (err) {
      // Rollback on error
      btn.className = wasFollowing ? 'btn btn-follow following btn-sm' : 'btn btn-follow btn-primary btn-sm';
      btn.innerHTML = `<span class="follow-text">${wasFollowing ? 'Following' : 'Follow'}</span>`;
      if (countEl) countEl.textContent = currentFollowers;
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  });
}
