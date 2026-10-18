/**
 * Linkora - Profile Controller
 * Connect. Share. Grow.
 */
let profileUser = null;

async function pageInit(user) {
  const urlParams = new URLSearchParams(window.location.search);
  const targetUsername = urlParams.get('user') || (user ? user.username : null);
  const autoEdit = urlParams.get('action') === 'edit';

  if (!targetUsername) {
    window.location.href = '/login.html';
    return;
  }

  loadProfile(targetUsername, autoEdit);
}

async function loadProfile(username, autoEdit = false) {
  const container = document.getElementById('profile-content-mount');
  if (!container) return;

  const headerMount = document.getElementById('profile-header-mount');
  const postsMount = document.getElementById('profile-posts-mount');

  // Skeletons
  if (headerMount) {
    headerMount.innerHTML = `
      <div class="card profile-card">
        <div class="profile-cover"></div>
        <div class="profile-header-content">
          <div class="profile-avatar-row">
            <div class="skeleton" style="width: 96px; height: 96px; border-radius: var(--radius-full);"></div>
            <div class="skeleton" style="width: 110px; height: 36px; border-radius: var(--radius-md);"></div>
          </div>
          <div class="skeleton" style="width: 180px; height: 24px; margin-bottom: 8px;"></div>
          <div class="skeleton" style="width: 100px; height: 14px; margin-bottom: 16px;"></div>
          <div class="skeleton" style="width: 320px; height: 16px;"></div>
        </div>
      </div>
    `;
  }

  try {
    const data = await API.getUserProfile(username);
    profileUser = data.user;
    const posts = data.posts || [];
    allProfilePosts = posts;

    renderProfileHeader(profileUser);
    renderProfilePosts(posts);
    setupModals(profileUser);

    if (autoEdit && profileUser.is_me) {
      const editBtn = document.getElementById('btn-open-edit-modal');
      if (editBtn) editBtn.click();
    }
  } catch (err) {
    container.innerHTML = `
      <div class="card empty-state">
        <div class="empty-state-title" style="color: var(--danger);">User Not Found</div>
        <p class="empty-state-desc">The user @${escapeHTML(username)} does not exist or has been removed.</p>
        <a href="/" class="btn btn-secondary" style="margin-top: var(--space-4);">Back to Feed</a>
      </div>
    `;
  }
}

function renderProfileHeader(user) {
  const headerMount = document.getElementById('profile-header-mount');
  if (!headerMount) return;

  const isMe = user.is_me;
  const isFollowing = Boolean(user.is_following);
  const postCount = user.post_count || 0;
  const followerCount = user.follower_count || 0;
  const followingCount = user.following_count || 0;

  headerMount.innerHTML = `
    <div class="card profile-card">
      <div class="profile-cover"></div>
      <div class="profile-header-content">
        <div class="profile-avatar-row">
          <div class="profile-avatar-wrap">
            ${renderAvatar(user, 'avatar-xl')}
          </div>
          <div>
            ${isMe ? `
              <button type="button" class="btn btn-secondary btn-sm" id="btn-open-edit-modal">
                ${renderIcon('edit', '', 'width="14" height="14"')}
                <span>Edit Profile</span>
              </button>
            ` : (currentUser ? `
              <button type="button" class="btn btn-follow ${isFollowing ? 'following' : 'btn-primary'} btn-sm" id="btn-profile-follow">
                <span class="follow-text">${isFollowing ? 'Following' : 'Follow'}</span>
              </button>
            ` : `
              <a href="/login.html" class="btn btn-primary btn-sm">Sign in to follow</a>
            `)}
          </div>
        </div>

        <div class="profile-names">
          <h1 class="profile-display-name" style="display: inline-flex; align-items: center; gap: 4px;">
            ${escapeHTML(user.username)}
            ${renderVerifiedBadge()}
          </h1>
          <div class="profile-handle">@${escapeHTML(user.username)}</div>
        </div>

        <p class="profile-bio" id="profile-bio-text">
          ${user.bio ? escapeHTML(user.bio) : '<em>No bio yet.</em>'}
        </p>

        <div class="profile-meta-row">
          <div>
            <span class="profile-stat-count" id="stat-posts-count">${postCount}</span> ${postCount === 1 ? 'post' : 'posts'}
          </div>
          <div class="profile-stat-btn" id="btn-view-followers">
            <span class="profile-stat-count" id="stat-followers-count">${followerCount}</span> ${followerCount === 1 ? 'follower' : 'followers'}
          </div>
          <div class="profile-stat-btn" id="btn-view-following">
            <span class="profile-stat-count" id="stat-following-count">${followingCount}</span> following
          </div>
          <div style="font-size: var(--font-xs); color: var(--text-faint); margin-left: auto;">
            Joined ${timeAgo(user.created_at)}
          </div>
        </div>
      </div>
      <nav class="profile-tabs" role="tablist">
        <button type="button" class="profile-tab active" data-tab="posts" role="tab" aria-selected="true">Posts</button>
        <button type="button" class="profile-tab" data-tab="replies" role="tab" aria-selected="false">Replies</button>
        <button type="button" class="profile-tab" data-tab="media" role="tab" aria-selected="false">Media</button>
        <button type="button" class="profile-tab" data-tab="likes" role="tab" aria-selected="false">Likes</button>
      </nav>
    </div>
  `;

  // Attach tab switching
  const tabBtns = headerMount.querySelectorAll('.profile-tab');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      const tabName = btn.getAttribute('data-tab');
      handleProfileTabSwitch(tabName);
    });
  });

  // Attach Follow/Unfollow toggle (Optimistic UI)
  const followBtn = document.getElementById('btn-profile-follow');
  if (followBtn) {
    followBtn.addEventListener('click', async () => {
      followBtn.disabled = true;
      const countEl = document.getElementById('stat-followers-count');
      const wasFollowing = followBtn.classList.contains('following');
      const currentCount = parseInt(countEl?.textContent || '0', 10);

      // Optimistic update
      followBtn.className = wasFollowing ? 'btn btn-follow btn-primary btn-sm' : 'btn btn-follow following btn-sm';
      followBtn.innerHTML = `<span class="follow-text">${wasFollowing ? 'Follow' : 'Following'}</span>`;
      if (countEl) {
        countEl.textContent = wasFollowing ? Math.max(0, currentCount - 1) : currentCount + 1;
      }

      try {
        const res = await API.toggleFollow(user.id);
        if (res.following) {
          followBtn.className = 'btn btn-follow following btn-sm';
          followBtn.innerHTML = '<span class="follow-text">Following</span>';
        } else {
          followBtn.className = 'btn btn-follow btn-primary btn-sm';
          followBtn.innerHTML = '<span class="follow-text">Follow</span>';
        }
        if (countEl) countEl.textContent = res.follower_count;
        showToast(res.message, 'success');
      } catch (err) {
        // Rollback
        followBtn.className = wasFollowing ? 'btn btn-follow following btn-sm' : 'btn btn-follow btn-primary btn-sm';
        followBtn.innerHTML = `<span class="follow-text">${wasFollowing ? 'Following' : 'Follow'}</span>`;
        if (countEl) countEl.textContent = currentCount;
        showToast(err.message, 'error');
      } finally {
        followBtn.disabled = false;
      }
    });
  }

  // Modals for followers / following
  const btnFollowers = document.getElementById('btn-view-followers');
  if (btnFollowers) {
    btnFollowers.addEventListener('click', () => openUsersModal('followers', user.id, user.username));
  }

  const btnFollowing = document.getElementById('btn-view-following');
  if (btnFollowing) {
    btnFollowing.addEventListener('click', () => openUsersModal('following', user.id, user.username));
  }

  // Open Edit Profile modal
  const btnEdit = document.getElementById('btn-open-edit-modal');
  if (btnEdit) {
    btnEdit.addEventListener('click', () => {
      const modal = document.getElementById('edit-profile-modal');
      const bioInput = document.getElementById('edit-bio');
      const avatarInput = document.getElementById('edit-avatar-url');

      if (bioInput) bioInput.value = user.bio || '';
      if (avatarInput) avatarInput.value = user.avatar_url || '';
      if (modal) modal.classList.add('active');
    });
  }
}

let allProfilePosts = [];

function handleProfileTabSwitch(tabName) {
  const postsMount = document.getElementById('profile-posts-mount');
  if (!postsMount) return;

  if (tabName === 'posts') {
    renderProfilePosts(allProfilePosts);
  } else if (tabName === 'media') {
    const mediaPosts = allProfilePosts.filter(p => (p.media && p.media.length > 0) || p.image_url);
    if (mediaPosts.length === 0) {
      postsMount.innerHTML = `
        <div>
          ${renderEmptyState({
            icon: 'image',
            title: 'No media posts yet',
            description: 'This creator has not shared any photo posts yet.'
          })}
        </div>
      `;
    } else {
      renderProfilePosts(mediaPosts);
    }
  } else if (tabName === 'replies') {
    postsMount.innerHTML = `
      <div>
        ${renderEmptyState({
          icon: 'message-circle',
          title: 'No replies yet',
          description: 'Replies by this creator will appear here.'
        })}
      </div>
    `;
  } else if (tabName === 'likes') {
    const likedPosts = allProfilePosts.filter(p => p.is_liked);
    if (likedPosts.length === 0) {
      postsMount.innerHTML = `
        <div>
          ${renderEmptyState({
            icon: 'heart',
            title: 'No liked posts to show',
            description: 'Posts liked by this creator will appear here.'
          })}
        </div>
      `;
    } else {
      renderProfilePosts(likedPosts);
    }
  }
}

function renderProfilePosts(posts) {
  const postsMount = document.getElementById('profile-posts-mount');
  if (!postsMount) return;

  if (posts.length === 0) {
    postsMount.innerHTML = `
      <div>
        ${renderEmptyState({
          icon: 'sparkles',
          title: 'No posts yet',
          description: 'This creator has not published any posts yet.'
        })}
      </div>
    `;
    return;
  }

  postsMount.innerHTML = posts.map(post => createPostCardHTML(post, currentUser)).join('');
  posts.forEach(post => attachPostEvents(post.id));
}

function setupModals(user) {
  const editForm = document.getElementById('edit-profile-form');
  const editModal = document.getElementById('edit-profile-modal');
  const btnCloseEdit = document.getElementById('btn-close-edit-modal');

  const btnCancelEdit = document.getElementById('btn-cancel-edit-modal');
  if (btnCancelEdit && editModal) {
    btnCancelEdit.addEventListener('click', () => editModal.classList.remove('active'));
  }

  if (btnCloseEdit && editModal) {
    btnCloseEdit.addEventListener('click', () => editModal.classList.remove('active'));
    editModal.addEventListener('click', (e) => {
      if (e.target === editModal) editModal.classList.remove('active');
    });
  }

  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const bio = document.getElementById('edit-bio').value.trim();
      const avatarUrl = document.getElementById('edit-avatar-url').value.trim();
      const btnSave = document.getElementById('btn-save-profile');

      btnSave.disabled = true;
      btnSave.textContent = 'Saving...';

      try {
        const res = await API.updateProfile(bio, avatarUrl);
        showToast('Profile updated', 'success');
        editModal.classList.remove('active');

        user.bio = res.user.bio;
        user.avatar_url = res.user.avatar_url;
        const bioEl = document.getElementById('profile-bio-text');
        if (bioEl) bioEl.textContent = res.user.bio || 'No bio yet.';

        const avatarWrap = document.querySelector('.profile-avatar-wrap');
        if (avatarWrap) avatarWrap.innerHTML = renderAvatar(user, 'avatar-xl');
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        btnSave.disabled = false;
        btnSave.textContent = 'Save Changes';
      }
    });
  }
}

async function openUsersModal(type, userId, username) {
  const modal = document.getElementById('users-list-modal');
  const title = document.getElementById('users-modal-title');
  const content = document.getElementById('users-modal-content');
  const btnClose = document.getElementById('btn-close-users-modal');

  if (!modal || !content) return;

  title.textContent = type === 'followers' ? `@${username}'s Followers` : `@${username} is Following`;
  content.innerHTML = '<div style="text-align: center; padding: var(--space-6); color: var(--text-faint);">Loading...</div>';
  modal.classList.add('active');

  if (btnClose) {
    btnClose.onclick = () => modal.classList.remove('active');
  }
  modal.onclick = (e) => {
    if (e.target === modal) modal.classList.remove('active');
  };

  try {
    const data = type === 'followers' ? await API.getFollowers(userId) : await API.getFollowing(userId);
    const list = type === 'followers' ? data.followers : data.following;

    if (!list || list.length === 0) {
      content.innerHTML = `<div style="text-align: center; padding: var(--space-6); color: var(--text-faint);">No ${type} found.</div>`;
      return;
    }

    content.innerHTML = list.map(u => `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: var(--space-3) 0; border-bottom: 1px solid var(--border);">
        <div style="display: flex; align-items: center; gap: var(--space-3);">
          <a href="/profile.html?user=${encodeURIComponent(u.username)}">
            ${renderAvatar(u, 'avatar-sm')}
          </a>
          <div>
            <a href="/profile.html?user=${encodeURIComponent(u.username)}" style="font-weight: 600; color: var(--text-main); font-size: var(--font-sm);">
              ${escapeHTML(u.username)}
            </a>
            <div style="font-size: var(--font-xs); color: var(--text-muted);">${u.bio ? escapeHTML(u.bio).substring(0, 45) + '...' : ''}</div>
          </div>
        </div>
        <a href="/profile.html?user=${encodeURIComponent(u.username)}" class="btn btn-secondary btn-sm">
          View
        </a>
      </div>
    `).join('');
  } catch (err) {
    content.innerHTML = `<div style="color: var(--danger); text-align: center; padding: var(--space-6);">Failed to load list</div>`;
  }
}
