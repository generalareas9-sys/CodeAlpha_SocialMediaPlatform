/**
 * Linkora - Feed Controller
 * Connect. Share. Grow.
 */
let currentFilter = ''; // '' for following feed, 'all' for global

async function pageInit(user) {
  if (user) {
    setupComposer(user);
    setupSidebars(user);
    setupTabs();
    loadFeed();
  } else {
    // Logged out visitor: show landing hero & global public feed
    setupLoggedOutLanding();
    loadFeed(true);
  }
}

function setupLoggedOutLanding() {
  const landingMount = document.getElementById('landing-hero-mount');
  if (landingMount) {
    landingMount.innerHTML = `
      <section class="card landing-hero">
        <div class="landing-tagline-badge">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="14" height="14">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
          <span>Connect. Share. Grow.</span>
        </div>
        <h1 class="landing-headline">Where builders and creators connect</h1>
        <p class="landing-subhead">Join a minimalist community to share insights, follow engineers, and stay inspired without the noise.</p>
        <div class="landing-actions">
          <a href="/register.html" class="btn btn-primary" style="padding: 10px 22px;">Join Linkora</a>
          <a href="/login.html" class="btn btn-secondary" style="padding: 10px 22px;">Sign In</a>
        </div>
      </section>
    `;
    landingMount.style.display = 'block';
  }

  // Hide composer for logged-out visitors
  const composer = document.getElementById('post-composer');
  if (composer) composer.style.display = 'none';

  // Set default filter to 'all'
  currentFilter = 'all';
  const tabsWrap = document.querySelector('.feed-tabs');
  if (tabsWrap) tabsWrap.style.display = 'none';
}

function setupComposer(user) {
  const avatarWrap = document.getElementById('composer-avatar-mount');
  if (avatarWrap) {
    avatarWrap.innerHTML = renderAvatar(user, 'avatar-md');
  }

  const textarea = document.getElementById('post-content');
  const charCounter = document.getElementById('char-counter');
  const btnSubmit = document.getElementById('btn-submit-post');
  const btnToggleImage = document.getElementById('btn-toggle-image');
  const imageInputWrap = document.getElementById('image-input-wrap');
  const imageInput = document.getElementById('post-image-url');
  const previewWrap = document.getElementById('image-preview-wrap');
  const previewImg = document.getElementById('image-preview');
  const btnRemovePreview = document.getElementById('btn-remove-preview');

  if (!textarea) return;

  // Live character counter: disabled with no warning icon when empty; enabled when text present; red near 280
  btnSubmit.disabled = true;

  textarea.addEventListener('input', () => {
    const len = textarea.value.length;
    const remaining = 280 - len;
    charCounter.textContent = `${len}/280`;

    if (len === 0) {
      charCounter.className = 'char-counter';
      btnSubmit.disabled = true;
    } else if (remaining < 0) {
      charCounter.className = 'char-counter danger';
      btnSubmit.disabled = true;
    } else if (remaining <= 20) {
      charCounter.className = 'char-counter warning';
      btnSubmit.disabled = false;
    } else {
      charCounter.className = 'char-counter';
      btnSubmit.disabled = false;
    }

    // Auto grow textarea
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 220) + 'px';
  });

  // Toggle image URL input
  if (btnToggleImage && imageInputWrap) {
    btnToggleImage.addEventListener('click', () => {
      imageInputWrap.classList.toggle('active');
      if (imageInputWrap.classList.contains('active')) {
        imageInput.focus();
      }
    });
  }

  // Live image preview
  if (imageInput) {
    imageInput.addEventListener('input', debounce(() => {
      const url = imageInput.value.trim();
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        previewImg.src = url;
        previewImg.onload = () => previewWrap.classList.add('active');
        previewImg.onerror = () => previewWrap.classList.remove('active');
      } else {
        previewWrap.classList.remove('active');
      }
    }, 350));
  }

  if (btnRemovePreview) {
    btnRemovePreview.addEventListener('click', () => {
      imageInput.value = '';
      previewWrap.classList.remove('active');
      previewImg.src = '';
    });
  }

  // Submit Post
  btnSubmit.addEventListener('click', async () => {
    const content = textarea.value.trim();
    const imageUrl = imageInput ? imageInput.value.trim() : '';

    if (!content) return;
    if (content.length > 280) {
      showToast('Post cannot exceed 280 characters', 'error');
      return;
    }

    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Posting...';

    try {
      const res = await API.createPost(content, imageUrl);
      showToast('Post published', 'success');

      // Reset form
      textarea.value = '';
      textarea.style.height = 'auto';
      charCounter.textContent = '0/280';
      charCounter.className = 'char-counter';
      if (imageInput) imageInput.value = '';
      if (previewWrap) previewWrap.classList.remove('active');
      if (imageInputWrap) imageInputWrap.classList.remove('active');

      // Prepend post to feed
      const feedContainer = document.getElementById('feed-container');
      const emptyState = document.getElementById('empty-feed-state');
      if (emptyState) emptyState.remove();

      const postHtml = createPostCardHTML(res.post, currentUser);
      feedContainer.insertAdjacentHTML('afterbegin', postHtml);
      attachPostEvents(res.post.id);

      // Increment sidebar count consistently
      const postCountEl = document.getElementById('sidebar-post-count');
      if (postCountEl) {
        const newCount = parseInt(postCountEl.textContent || '0', 10) + 1;
        postCountEl.textContent = newCount;
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btnSubmit.disabled = textarea.value.trim().length === 0;
      btnSubmit.textContent = 'Post';
    }
  });
}

function setupTabs() {
  const tabs = document.querySelectorAll('.feed-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.getAttribute('data-filter') || '';
      loadFeed();
    });
  });
}

async function loadFeed(isLoggedOut = false) {
  const feedContainer = document.getElementById('feed-container');
  if (!feedContainer) return;

  // Render loading skeletons
  feedContainer.innerHTML = `
    <div class="card post-card" style="margin-bottom: var(--space-4);">
      <div style="display:flex; gap: var(--space-3); align-items:center; margin-bottom: var(--space-3);">
        <div class="skeleton" style="width: 40px; height: 40px; border-radius: var(--radius-full);"></div>
        <div style="flex:1;">
          <div class="skeleton" style="width: 120px; height: 14px; margin-bottom: 6px;"></div>
          <div class="skeleton" style="width: 60px; height: 11px;"></div>
        </div>
      </div>
      <div class="skeleton" style="width: 100%; height: 48px; margin-bottom: var(--space-3);"></div>
      <div class="skeleton" style="width: 140px; height: 16px;"></div>
    </div>
    <div class="card post-card">
      <div style="display:flex; gap: var(--space-3); align-items:center; margin-bottom: var(--space-3);">
        <div class="skeleton" style="width: 40px; height: 40px; border-radius: var(--radius-full);"></div>
        <div style="flex:1;">
          <div class="skeleton" style="width: 140px; height: 14px; margin-bottom: 6px;"></div>
          <div class="skeleton" style="width: 80px; height: 11px;"></div>
        </div>
      </div>
      <div class="skeleton" style="width: 100%; height: 64px;"></div>
    </div>
  `;

  try {
    const data = await API.getFeed(currentFilter || (isLoggedOut ? 'all' : ''));
    const posts = data.posts || [];

    if (posts.length === 0) {
      feedContainer.innerHTML = `
        <div id="empty-feed-state" class="card empty-state">
          <svg class="empty-state-icon" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
          </svg>
          <div class="empty-state-title">Your feed is quiet</div>
          <p class="empty-state-desc">Follow creators or switch to "Explore All" to discover what people are sharing.</p>
          <a href="/discover.html" class="btn btn-primary" style="margin-top: var(--space-4);">Discover Creators</a>
        </div>
      `;
      return;
    }

    let banner = '';
    if (data.isFallback && !currentFilter && !isLoggedOut) {
      banner = `
        <div style="padding: 10px 14px; margin-bottom: var(--space-4); background: var(--primary-subtle); border: 1px solid rgba(79, 70, 229, 0.2); border-radius: var(--radius-md); font-size: var(--font-xs); color: var(--primary); display: flex; align-items: center; justify-content: space-between;">
          <span>Showing latest community posts since your followed feed is quiet.</span>
          <a href="/discover.html" style="font-weight: 600; text-decoration: underline;">Discover creators →</a>
        </div>
      `;
    }

    feedContainer.innerHTML = banner + posts.map(post => createPostCardHTML(post, currentUser)).join('');
    posts.forEach(post => attachPostEvents(post.id));
  } catch (err) {
    feedContainer.innerHTML = `
      <div class="card empty-state">
        <div class="empty-state-title" style="color: var(--danger);">Failed to load feed</div>
        <p class="empty-state-desc">${escapeHTML(err.message)}</p>
        <button onclick="loadFeed()" class="btn btn-secondary" style="margin-top: var(--space-3);">Retry</button>
      </div>
    `;
  }
}

function createPostCardHTML(post, user) {
  const isOwner = user && user.id === post.user_id;
  const isLiked = Boolean(post.is_liked);
  const likeCount = post.like_count || 0;
  const commentCount = post.comment_count || 0;

  return `
    <article class="card post-card" id="post-${post.id}" data-post-id="${post.id}">
      <div class="post-header">
        <div class="post-author-row">
          <a href="/profile.html?user=${encodeURIComponent(post.username)}">
            ${renderAvatar({ username: post.username, avatar_url: post.avatar_url }, 'avatar-md')}
          </a>
          <div>
            <div style="display: flex; align-items: baseline; gap: var(--space-1);">
              <a href="/profile.html?user=${encodeURIComponent(post.username)}" class="post-author-name">
                ${escapeHTML(post.username)}
              </a>
              <span class="post-author-handle">@${escapeHTML(post.username)}</span>
            </div>
            <div class="post-time">${timeAgo(post.created_at)}</div>
          </div>
        </div>

        <div class="post-more-menu-wrap">
          <button type="button" class="btn-post-more" data-more-btn="${post.id}" aria-label="More options">
            <svg fill="currentColor" viewBox="0 0 24 24" width="16" height="16">
              <circle cx="5" cy="12" r="2"/>
              <circle cx="12" cy="12" r="2"/>
              <circle cx="19" cy="12" r="2"/>
            </svg>
          </button>
          <div class="post-menu-dropdown" id="post-menu-${post.id}">
            <button type="button" class="dropdown-item" data-share-post="${post.id}" style="width: 100%;">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
              </svg>
              <span>Copy link</span>
            </button>
            ${isOwner ? `
              <button type="button" class="dropdown-item danger" data-delete-post="${post.id}" style="width: 100%;">
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
                <span>Delete</span>
              </button>
            ` : ''}
          </div>
        </div>
      </div>

      <div class="post-body">
        ${formatPostContent(post.content)}
      </div>

      ${post.image_url ? `
        <div class="post-image-container">
          <img src="${escapeHTML(post.image_url)}" alt="Post image" class="post-image" loading="lazy" />
        </div>
      ` : ''}

      <div class="post-footer">
        <!-- Like Button (Optimistic UI) -->
        <button type="button" class="post-action-btn ${isLiked ? 'liked' : ''}" data-like-btn="${post.id}">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <span class="like-count" id="like-count-${post.id}">${likeCount}</span>
        </button>

        <!-- Comment Toggle Button -->
        <button type="button" class="post-action-btn" data-toggle-comments="${post.id}">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span class="comment-count" id="comment-count-${post.id}">${commentCount}</span>
        </button>

        <!-- Share (Copy Link) Button -->
        <button type="button" class="post-action-btn" data-share-post="${post.id}" title="Copy link to post">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          <span>Share</span>
        </button>
      </div>

      <!-- Comments Section -->
      <section class="comments-section" id="comments-${post.id}">
        <div class="comment-input-wrap">
          <input type="text" class="comment-input" id="comment-input-${post.id}" placeholder="Write a comment..." maxlength="500" />
          <button type="button" class="btn btn-primary btn-sm" data-submit-comment="${post.id}">Reply</button>
        </div>
        <div class="comments-list" id="comments-list-${post.id}"></div>
      </section>
    </article>
  `;
}

function attachPostEvents(postId) {
  const postCard = document.getElementById(`post-${postId}`);
  if (!postCard) return;

  // More menu toggle
  const moreBtn = postCard.querySelector(`[data-more-btn="${postId}"]`);
  const menuDropdown = document.getElementById(`post-menu-${postId}`);
  if (moreBtn && menuDropdown) {
    moreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.post-menu-dropdown').forEach(d => {
        if (d !== menuDropdown) d.classList.remove('show');
      });
      menuDropdown.classList.toggle('show');
    });

    document.addEventListener('click', () => {
      menuDropdown.classList.remove('show');
    });
  }

  // Share / Copy Link
  const shareBtns = postCard.querySelectorAll(`[data-share-post="${postId}"]`);
  shareBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const postUrl = `${window.location.origin}/profile.html#post-${postId}`;
      navigator.clipboard.writeText(postUrl).then(() => {
        showToast('Post link copied to clipboard', 'success');
      }).catch(() => {
        showToast('Failed to copy link', 'error');
      });
    });
  });

  // Like button (Optimistic UI with rollback)
  const likeBtn = postCard.querySelector(`[data-like-btn="${postId}"]`);
  if (likeBtn) {
    likeBtn.addEventListener('click', async () => {
      if (!currentUser) {
        showToast('Please sign in to like posts', 'info');
        return;
      }

      const countEl = document.getElementById(`like-count-${postId}`);
      const wasLiked = likeBtn.classList.contains('liked');
      const currentCount = parseInt(countEl.textContent, 10) || 0;

      // Optimistic update
      likeBtn.classList.toggle('liked', !wasLiked);
      countEl.textContent = wasLiked ? Math.max(0, currentCount - 1) : currentCount + 1;

      try {
        const res = await API.toggleLike(postId);
        likeBtn.classList.toggle('liked', res.liked);
        countEl.textContent = res.like_count;
      } catch (err) {
        // Rollback on error
        likeBtn.classList.toggle('liked', wasLiked);
        countEl.textContent = currentCount;
        showToast(err.message, 'error');
      }
    });
  }

  // Delete Post
  const deleteBtn = postCard.querySelector(`[data-delete-post="${postId}"]`);
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to delete this post?')) return;

      try {
        await API.deletePost(postId);
        postCard.style.transition = 'all 0.2s ease';
        postCard.style.opacity = '0';
        postCard.style.transform = 'scale(0.95)';
        setTimeout(() => postCard.remove(), 200);
        showToast('Post deleted', 'info');

        const postCountEl = document.getElementById('sidebar-post-count');
        if (postCountEl) {
          postCountEl.textContent = Math.max(0, parseInt(postCountEl.textContent || '1', 10) - 1);
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  // Toggle comments
  const toggleCommentsBtn = postCard.querySelector(`[data-toggle-comments="${postId}"]`);
  const commentsSection = document.getElementById(`comments-${postId}`);
  if (toggleCommentsBtn && commentsSection) {
    toggleCommentsBtn.addEventListener('click', () => {
      const isOpen = commentsSection.classList.contains('open');
      if (isOpen) {
        commentsSection.classList.remove('open');
      } else {
        commentsSection.classList.add('open');
        loadComments(postId);
      }
    });
  }

  // Submit comment
  const submitCommentBtn = postCard.querySelector(`[data-submit-comment="${postId}"]`);
  const commentInput = document.getElementById(`comment-input-${postId}`);
  if (submitCommentBtn && commentInput) {
    const handleComment = async () => {
      if (!currentUser) {
        showToast('Please sign in to comment', 'info');
        return;
      }

      const text = commentInput.value.trim();
      if (!text) return;

      submitCommentBtn.disabled = true;
      try {
        const res = await API.addComment(postId, text);
        commentInput.value = '';

        const commentsList = document.getElementById(`comments-list-${postId}`);
        const commentHtml = createCommentHTML(res.comment, currentUser);
        commentsList.insertAdjacentHTML('beforeend', commentHtml);
        attachCommentEvents(res.comment.id);

        const countEl = document.getElementById(`comment-count-${postId}`);
        if (countEl) countEl.textContent = res.comment_count;
        showToast('Comment added', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        submitCommentBtn.disabled = false;
      }
    };

    submitCommentBtn.addEventListener('click', handleComment);
    commentInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleComment();
      }
    });
  }
}

async function loadComments(postId) {
  const listEl = document.getElementById(`comments-list-${postId}`);
  if (!listEl) return;

  listEl.innerHTML = '<div style="font-size: var(--font-xs); color: var(--text-faint); padding: var(--space-2) 0;">Loading comments...</div>';

  try {
    const data = await API.getComments(postId);
    const comments = data.comments || [];

    if (comments.length === 0) {
      listEl.innerHTML = '<div style="font-size: var(--font-xs); color: var(--text-faint); padding: var(--space-2) 0;">No comments yet. Be the first to reply.</div>';
      return;
    }

    listEl.innerHTML = comments.map(c => createCommentHTML(c, currentUser)).join('');
    comments.forEach(c => attachCommentEvents(c.id));
  } catch (err) {
    listEl.innerHTML = `<div style="font-size: var(--font-xs); color: var(--danger);">Failed to load comments</div>`;
  }
}

function createCommentHTML(comment, user) {
  const isOwner = user && user.id === comment.user_id;

  return `
    <div class="comment-item" id="comment-${comment.id}">
      <a href="/profile.html?user=${encodeURIComponent(comment.username)}">
        ${renderAvatar({ username: comment.username, avatar_url: comment.avatar_url }, 'avatar-xs')}
      </a>
      <div class="comment-content">
        <div class="comment-header">
          <a href="/profile.html?user=${encodeURIComponent(comment.username)}" class="comment-author">
            ${escapeHTML(comment.username)}
          </a>
          <div style="display: flex; align-items: center; gap: var(--space-2);">
            <span class="comment-time">${timeAgo(comment.created_at)}</span>
            ${isOwner ? `
              <button type="button" class="btn-comment-delete" data-delete-comment="${comment.id}" title="Delete comment">
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="12" height="12">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            ` : ''}
          </div>
        </div>
        <div class="comment-text">${escapeHTML(comment.content)}</div>
      </div>
    </div>
  `;
}

function attachCommentEvents(commentId) {
  const item = document.getElementById(`comment-${commentId}`);
  if (!item) return;

  const delBtn = item.querySelector(`[data-delete-comment="${commentId}"]`);
  if (delBtn) {
    delBtn.addEventListener('click', async () => {
      try {
        const res = await API.deleteComment(commentId);
        item.remove();
        showToast('Comment deleted', 'info');

        const countEl = document.getElementById(`comment-count-${res.post_id}`);
        if (countEl) countEl.textContent = res.comment_count;
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }
}

async function setupSidebars(user) {
  // Left sidebar user mini card
  const leftMount = document.getElementById('left-sidebar-mount');
  if (leftMount && user) {
    leftMount.innerHTML = `
      <div class="card user-mini-card">
        <div class="mini-avatar-wrap">
          ${renderAvatar(user, 'avatar-lg')}
        </div>
        <div class="mini-user-name">${escapeHTML(user.username)}</div>
        <div class="mini-user-handle">@${escapeHTML(user.username)}</div>
        <p class="mini-bio">
          ${user.bio ? escapeHTML(user.bio) : '<em>No bio yet</em>'}
        </p>

        <div class="mini-stats">
          <div>
            <div class="mini-stat-val" id="sidebar-post-count">${user.post_count || 0}</div>
            <div class="mini-stat-lbl">${user.post_count === 1 ? 'post' : 'posts'}</div>
          </div>
          <div>
            <div class="mini-stat-val" id="sidebar-follower-count">${user.follower_count || 0}</div>
            <div class="mini-stat-lbl">${user.follower_count === 1 ? 'follower' : 'followers'}</div>
          </div>
          <div>
            <div class="mini-stat-val" id="sidebar-following-count">${user.following_count || 0}</div>
            <div class="mini-stat-lbl">following</div>
          </div>
        </div>

        <a href="/profile.html?user=${encodeURIComponent(user.username)}" class="btn btn-secondary btn-sm" style="width: 100%; margin-top: var(--space-4);">
          View Profile
        </a>
      </div>
    `;
  }

  // Right sidebar: Suggested Creators (must not include self or people already followed)
  const rightMount = document.getElementById('suggested-users-mount');
  if (rightMount) {
    try {
      const data = await API.getSuggestedUsers();
      const suggestions = data.users || [];

      if (suggestions.length === 0) {
        rightMount.innerHTML = '<div style="font-size: var(--font-xs); color: var(--text-faint); padding: var(--space-2) 0;">No suggestions right now.</div>';
        return;
      }

      rightMount.innerHTML = suggestions.map(u => `
        <div class="suggestion-item" id="suggested-user-${u.id}">
          <div class="suggestion-user">
            <a href="/profile.html?user=${encodeURIComponent(u.username)}">
              ${renderAvatar(u, 'avatar-sm')}
            </a>
            <div class="suggestion-meta">
              <a href="/profile.html?user=${encodeURIComponent(u.username)}" class="suggestion-name">
                ${escapeHTML(u.username)}
              </a>
              <span class="suggestion-followers">${u.follower_count || 0} ${u.follower_count === 1 ? 'follower' : 'followers'}</span>
            </div>
          </div>
          <button type="button" class="btn btn-follow btn-primary" data-sidebar-follow="${u.id}">
            <span class="follow-text">Follow</span>
          </button>
        </div>
      `).join('');

      suggestions.forEach(u => {
        const btn = rightMount.querySelector(`[data-sidebar-follow="${u.id}"]`);
        if (btn) {
          btn.addEventListener('click', async () => {
            btn.disabled = true;
            // Optimistic update
            btn.className = 'btn btn-follow following';
            btn.innerHTML = '<span class="follow-text">Following</span>';

            try {
              const res = await API.toggleFollow(u.id);
              if (res.following) {
                btn.className = 'btn btn-follow following';
                btn.innerHTML = '<span class="follow-text">Following</span>';
              } else {
                btn.className = 'btn btn-follow btn-primary';
                btn.innerHTML = '<span class="follow-text">Follow</span>';
              }

              // Update sidebar following count consistently
              const myFollowingEl = document.getElementById('sidebar-following-count');
              if (myFollowingEl && res.my_following_count !== undefined) {
                myFollowingEl.textContent = res.my_following_count;
              }

              showToast(res.message, 'success');
            } catch (err) {
              // Rollback
              btn.className = 'btn btn-follow btn-primary';
              btn.innerHTML = '<span class="follow-text">Follow</span>';
              showToast(err.message, 'error');
            } finally {
              btn.disabled = false;
            }
          });
        }
      });
    } catch (e) {
      rightMount.innerHTML = '<div style="font-size: var(--font-xs); color: var(--text-faint);">Could not load suggestions</div>';
    }
  }
}
