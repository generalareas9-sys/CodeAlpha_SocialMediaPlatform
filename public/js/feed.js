/**
 * Linkora - Feed Controller
 * Connect. Share. Grow.
 * Modern Instagram + Threads style feed with Lucide icons and polished animations.
 */
let currentFilter = ''; // '' for following feed, 'all' for global explore

async function pageInit(user) {
  if (user) {
    setupComposer(user);
    setupTabs();
    loadFeed();
  } else {
    // Logged out visitor: show rich landing hero & public trending feed
    setupLoggedOutLanding();
    loadFeed(true);
  }
}

// ============================================================================
// 1. Logged-Out Visitor Landing Page
// ============================================================================
function setupLoggedOutLanding() {
  const landingMount = document.getElementById('landing-hero-mount');
  if (landingMount) {
    landingMount.innerHTML = `
      <section class="landing-hero">
        <div class="landing-badge">
          ${renderIcon('sparkles', '', 'width="14" height="14"')}
          <span>Welcome to Linkora</span>
        </div>

        <h1 class="landing-title">
          Where <span class="gradient-text">creators & thinkers</span> connect.
        </h1>

        <p class="landing-subtitle">
          Share your daily progress, explore real-time conversations, and grow your network on a human, modern social network.
        </p>

        <div class="landing-cta-group">
          <a href="/register.html" class="btn btn-primary btn-lg">Get Started Free</a>
          <a href="/login.html" class="btn btn-secondary btn-lg">Sign In to Account</a>
        </div>

        <!-- 3 Feature Highlight Cards -->
        <div class="landing-features-grid">
          <div class="landing-feature-card">
            <div class="feature-icon-wrap">
              ${renderIcon('sparkles', '', 'width="24" height="24"')}
            </div>
            <h3 class="feature-title">Real-Time Everything</h3>
            <p class="feature-desc">Experience instant direct messaging, live reaction bursts, and real-time feed updates powered by Socket.io.</p>
          </div>

          <div class="landing-feature-card">
            <div class="feature-icon-wrap">
              ${renderIcon('image', '', 'width="24" height="24"')}
            </div>
            <h3 class="feature-title">Rich Stories & Media</h3>
            <p class="feature-desc">Express yourself with 24-hour visual stories, multi-photo posts, and interactive polls with live voting.</p>
          </div>

          <div class="landing-feature-card">
            <div class="feature-icon-wrap">
              ${renderIcon('trending-up', '', 'width="24" height="24"')}
            </div>
            <h3 class="feature-title">Vibrant Discovery</h3>
            <p class="feature-desc">Find trending hashtags (#), explore mutual connections, and follow inspiring builders and designers.</p>
          </div>
        </div>
      </section>
    `;
    landingMount.style.display = 'block';
  }

  // Hide composer for logged-out visitors
  const composer = document.getElementById('post-composer');
  if (composer) composer.style.display = 'none';

  // Set default filter to 'all' and update feed title
  currentFilter = 'all';
  const feedTitle = document.querySelector('.feed-title');
  if (feedTitle) feedTitle.textContent = 'Trending on Linkora';

  const tabsWrap = document.querySelector('.feed-tabs');
  if (tabsWrap) tabsWrap.style.display = 'none';
}

// ============================================================================
// 2. Post Composer
// ============================================================================
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

  btnSubmit.disabled = true;

  // Auto-growing textarea + 280-character counter
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

    // Auto grow
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

  // Image URL input preview
  if (imageInput) {
    imageInput.addEventListener('input', debounce(() => {
      const url = imageInput.value.trim();
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        previewImg.src = url;
        previewImg.onload = () => {
          previewWrap.classList.add('active');
        };
        previewImg.onerror = () => {
          previewWrap.classList.remove('active');
        };
      } else {
        previewWrap.classList.remove('active');
      }
    }, 400));
  }

  // Remove preview button
  if (btnRemovePreview) {
    btnRemovePreview.addEventListener('click', () => {
      if (imageInput) imageInput.value = '';
      previewWrap.classList.remove('active');
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
      showToast('Post published successfully!', 'success');

      // Reset form
      textarea.value = '';
      textarea.style.height = 'auto';
      charCounter.textContent = '0/280';
      charCounter.className = 'char-counter';
      if (imageInput) imageInput.value = '';
      if (previewWrap) previewWrap.classList.remove('active');
      if (imageInputWrap) imageInputWrap.classList.remove('active');

      // Prepend to feed
      const feedContainer = document.getElementById('feed-container');
      const emptyState = document.getElementById('empty-feed-state');
      if (emptyState) emptyState.remove();

      const postHtml = createPostCardHTML(res.post, currentUser);
      feedContainer.insertAdjacentHTML('afterbegin', postHtml);
      attachPostEvents(res.post.id);

      // Increment sidebar count
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

// ============================================================================
// 3. Feed Tabs (Following vs Explore All)
// ============================================================================
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

// ============================================================================
// 4. Load Feed Stream
// ============================================================================
async function loadFeed(isLoggedOut = false) {
  const feedContainer = document.getElementById('feed-container');
  if (!feedContainer) return;

  // Render Skeleton Placeholders
  feedContainer.innerHTML = `
    <div class="card skeleton-card">
      <div style="display:flex; gap: 12px; align-items:center; margin-bottom: 12px;">
        <div class="skeleton skeleton-avatar" style="width: 42px; height: 42px;"></div>
        <div style="flex:1;">
          <div class="skeleton skeleton-text" style="width: 140px; height: 14px;"></div>
          <div class="skeleton skeleton-text" style="width: 70px; height: 10px;"></div>
        </div>
      </div>
      <div class="skeleton skeleton-text" style="width: 100%; height: 50px;"></div>
      <div class="skeleton skeleton-text" style="width: 160px; height: 16px; margin-top: 12px;"></div>
    </div>
    <div class="card skeleton-card">
      <div style="display:flex; gap: 12px; align-items:center; margin-bottom: 12px;">
        <div class="skeleton skeleton-avatar" style="width: 42px; height: 42px;"></div>
        <div style="flex:1;">
          <div class="skeleton skeleton-text" style="width: 120px; height: 14px;"></div>
          <div class="skeleton skeleton-text" style="width: 60px; height: 10px;"></div>
        </div>
      </div>
      <div class="skeleton skeleton-text" style="width: 100%; height: 60px;"></div>
    </div>
  `;

  try {
    const data = await API.getFeed(currentFilter || (isLoggedOut ? 'all' : ''));
    const posts = data.posts || [];

    if (posts.length === 0) {
      feedContainer.innerHTML = `
        <div id="empty-feed-state">
          ${renderEmptyState({
            icon: 'sparkles',
            title: 'Your feed is quiet',
            description: 'Follow creators or explore community posts to fill your home stream.',
            actionText: 'Explore Creators',
            actionHref: '/discover.html'
          })}
        </div>
      `;
      return;
    }

    let banner = '';
    if (data.isFallback && !currentFilter && !isLoggedOut) {
      banner = `
        <div style="padding: 10px 16px; margin-bottom: var(--space-2); background: var(--brand-gradient-subtle); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: var(--radius-lg); font-size: var(--font-xs); color: var(--primary); display: flex; align-items: center; justify-content: space-between;">
          <span style="font-weight: 500;">Showing trending community posts since your followed stream is quiet.</span>
          <a href="/discover.html" style="font-weight: 700; text-decoration: underline;">Discover creators →</a>
        </div>
      `;
    }

    feedContainer.innerHTML = banner + posts.map(post => createPostCardHTML(post, currentUser)).join('');
    posts.forEach(post => attachPostEvents(post.id));
  } catch (err) {
    feedContainer.innerHTML = `
      <div class="card" style="padding: var(--space-4); text-align: center;">
        <div style="color: var(--danger); font-size: var(--font-base); font-weight: 700; margin-bottom: 6px;">Failed to load feed</div>
        <p style="font-size: var(--font-sm); color: var(--text-muted); margin-bottom: var(--space-2);">${escapeHTML(err.message)}</p>
        <button onclick="loadFeed()" class="btn btn-secondary btn-sm">Retry</button>
      </div>
    `;
  }
}

// ============================================================================
// 5. Post Card HTML Generator
// ============================================================================
function createPostCardHTML(post, user) {
  const isOwner = user && user.id === post.user_id;
  const isLiked = Boolean(post.is_liked);
  const likeCount = post.like_count || 0;
  const commentCount = post.comment_count || 0;

  return `
    <article class="card post-card" id="post-${post.id}" data-post-id="${post.id}" style="margin-bottom: var(--space-2-5); padding: var(--space-3);">
      <!-- Post Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <a href="/profile.html?user=${encodeURIComponent(post.username)}">
            ${renderAvatar({ username: post.username, avatar_url: post.avatar_url }, 'avatar-md')}
          </a>
          <div>
            <div style="display: flex; align-items: center; gap: 4px;">
              <a href="/profile.html?user=${encodeURIComponent(post.username)}" style="font-size: var(--font-sm); font-weight: 700; color: var(--text-main);">
                ${escapeHTML(post.username)}
              </a>
              ${renderVerifiedBadge()}
              <span style="font-size: 12px; color: var(--text-faint);">·</span>
              <span style="font-size: 12px; color: var(--text-muted);" title="${formatExactDate(post.created_at)}">${timeAgo(post.created_at)}</span>
            </div>
            <div style="font-size: 11px; color: var(--text-muted);">
              @${escapeHTML(post.username)}
            </div>
          </div>
        </div>

        <!-- Post Options Menu -->
        <div class="dropdown-wrap">
          <button type="button" class="btn-icon" data-more-btn="${post.id}" aria-label="More post options">
            ${renderIcon('more-horizontal', '', 'width="18" height="18"')}
          </button>
          <div class="dropdown-menu" id="post-menu-${post.id}">
            <button type="button" class="dropdown-item" data-share-post="${post.id}">
              ${renderIcon('link', '', 'width="16" height="16"')}
              <span>Copy link</span>
            </button>
            ${isOwner ? `
              <button type="button" class="dropdown-item danger" data-delete-post="${post.id}">
                ${renderIcon('trash-2', '', 'width="16" height="16"')}
                <span>Delete</span>
              </button>
            ` : `
              <button type="button" class="dropdown-item" onclick="showToast('User muted', 'info')">
                ${renderIcon('shield', '', 'width="16" height="16"')}
                <span>Mute @${escapeHTML(post.username)}</span>
              </button>
            `}
          </div>
        </div>
      </div>

      <!-- Post Body -->
      <div style="font-size: 15px; line-height: 1.6; color: var(--text-main); margin-bottom: 12px; word-break: break-word;">
        ${formatPostContent(post.content)}
      </div>

      <!-- Post Image -->
      ${post.image_url ? `
        <div style="border-radius: var(--radius-lg); overflow: hidden; margin-bottom: 12px; max-height: 520px; background: var(--bg-surface-elevated);">
          <img src="${escapeHTML(post.image_url)}" alt="Post media" style="width: 100%; height: auto; max-height: 520px; object-fit: cover; display: block;" loading="lazy" />
        </div>
      ` : ''}

      <!-- Post Action Buttons -->
      <div style="display: flex; align-items: center; gap: 16px; padding-top: 8px; border-top: 1px solid var(--border-subtle);">
        <!-- Like Button -->
        <button type="button" class="post-action-btn ${isLiked ? 'liked' : ''}" data-like-btn="${post.id}" style="display: inline-flex; align-items: center; gap: 6px; color: ${isLiked ? 'var(--accent-pink)' : 'var(--text-muted)'}; font-size: var(--font-xs); font-weight: 600;">
          <span class="like-icon-wrap" style="display: inline-flex;">
            ${renderIcon('heart', isLiked ? 'fill-pink' : '', 'width="18" height="18"')}
          </span>
          <span id="like-count-${post.id}">${formatCount(likeCount)}</span>
        </button>

        <!-- Comments Button -->
        <button type="button" class="post-action-btn" data-toggle-comments="${post.id}" style="display: inline-flex; align-items: center; gap: 6px; color: var(--text-muted); font-size: var(--font-xs); font-weight: 600;">
          ${renderIcon('message-circle', '', 'width="18" height="18"')}
          <span id="comment-count-${post.id}">${formatCount(commentCount)}</span>
        </button>

        <!-- Share Button -->
        <button type="button" class="post-action-btn" data-share-post="${post.id}" style="display: inline-flex; align-items: center; gap: 6px; color: var(--text-muted); font-size: var(--font-xs); font-weight: 600;">
          ${renderIcon('share-2', '', 'width="18" height="18"')}
          <span>Share</span>
        </button>
      </div>

      <!-- Comments Stream -->
      <section class="comments-section" id="comments-${post.id}" style="display: none; margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--border-subtle);">
        <div style="display: flex; gap: 8px; margin-bottom: 12px;">
          <input 
            type="text" 
            class="input-field" 
            id="comment-input-${post.id}" 
            placeholder="Write a thoughtful reply..." 
            maxlength="500" 
            style="padding: 8px 12px; font-size: var(--font-xs);"
          />
          <button type="button" class="btn btn-primary btn-xs" data-submit-comment="${post.id}">
            Reply
          </button>
        </div>
        <div class="comments-list" id="comments-list-${post.id}"></div>
      </section>
    </article>
  `;
}

// ============================================================================
// 6. Post Interactive Events
// ============================================================================
function attachPostEvents(postId) {
  const postCard = document.getElementById(`post-${postId}`);
  if (!postCard) return;

  // More menu toggle
  const moreBtn = postCard.querySelector(`[data-more-btn="${postId}"]`);
  const menuDropdown = document.getElementById(`post-menu-${postId}`);
  if (moreBtn && menuDropdown) {
    moreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.dropdown-menu').forEach(d => {
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
      const postUrl = `${window.location.origin}/#post-${postId}`;
      navigator.clipboard.writeText(postUrl).then(() => {
        showToast('Link copied to clipboard!', 'success');
      }).catch(() => {
        showToast('Failed to copy link', 'error');
      });
    });
  });

  // Like button with Heart Burst Animation
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
      likeBtn.style.color = !wasLiked ? 'var(--accent-pink)' : 'var(--text-muted)';
      countEl.textContent = formatCount(wasLiked ? Math.max(0, currentCount - 1) : currentCount + 1);

      // Play heart burst animation
      const iconWrap = likeBtn.querySelector('.like-icon-wrap');
      if (iconWrap && !wasLiked) {
        iconWrap.classList.add('animate-heart-burst');
        setTimeout(() => iconWrap.classList.remove('animate-heart-burst'), 400);
      }

      try {
        const res = await API.toggleLike(postId);
        likeBtn.classList.toggle('liked', res.liked);
        likeBtn.style.color = res.liked ? 'var(--accent-pink)' : 'var(--text-muted)';
        countEl.textContent = formatCount(res.like_count);
      } catch (err) {
        // Rollback
        likeBtn.classList.toggle('liked', wasLiked);
        likeBtn.style.color = wasLiked ? 'var(--accent-pink)' : 'var(--text-muted)';
        countEl.textContent = formatCount(currentCount);
        showToast(err.message, 'error');
      }
    });
  }

  // Delete Post (Replaced with Reusable Confirm Dialog)
  const deleteBtn = postCard.querySelector(`[data-delete-post="${postId}"]`);
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      showConfirmDialog({
        title: 'Delete this post?',
        message: 'This will permanently remove the post and its comments from Linkora.',
        confirmText: 'Delete Post',
        cancelText: 'Keep Post',
        isDanger: true,
        onConfirm: async () => {
          try {
            await API.deletePost(postId);
            postCard.style.transition = 'all 0.2s ease';
            postCard.style.opacity = '0';
            postCard.style.transform = 'scale(0.96)';
            setTimeout(() => postCard.remove(), 200);
            showToast('Post deleted', 'info');

            const postCountEl = document.getElementById('sidebar-post-count');
            if (postCountEl) {
              postCountEl.textContent = Math.max(0, parseInt(postCountEl.textContent || '1', 10) - 1);
            }
          } catch (err) {
            showToast(err.message, 'error');
          }
        }
      });
    });
  }

  // Toggle comments
  const toggleCommentsBtn = postCard.querySelector(`[data-toggle-comments="${postId}"]`);
  const commentsSection = document.getElementById(`comments-${postId}`);
  if (toggleCommentsBtn && commentsSection) {
    toggleCommentsBtn.addEventListener('click', () => {
      const isVisible = commentsSection.style.display === 'block';
      if (isVisible) {
        commentsSection.style.display = 'none';
      } else {
        commentsSection.style.display = 'block';
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
        const listEl = document.getElementById(`comments-list-${postId}`);
        const countEl = document.getElementById(`comment-count-${postId}`);
        if (countEl) countEl.textContent = formatCount(res.comment_count);

        const newCommentHtml = createCommentHTML(res.comment, currentUser);
        if (listEl) {
          listEl.insertAdjacentHTML('afterbegin', newCommentHtml);
          attachCommentEvents(res.comment.id);
        }
        showToast('Reply posted', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        submitCommentBtn.disabled = false;
      }
    };

    submitCommentBtn.addEventListener('click', handleComment);
    commentInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleComment();
      }
    });
  }
}

// ============================================================================
// 7. Comments Handling
// ============================================================================
async function loadComments(postId) {
  const listEl = document.getElementById(`comments-list-${postId}`);
  if (!listEl) return;

  listEl.innerHTML = '<div style="font-size: var(--font-xs); color: var(--text-faint); padding: 8px 0;">Loading comments...</div>';

  try {
    const data = await API.getComments(postId);
    const comments = data.comments || [];

    if (comments.length === 0) {
      listEl.innerHTML = '<div style="font-size: var(--font-xs); color: var(--text-faint); padding: 8px 0;">No replies yet. Be the first to start the conversation.</div>';
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
    <div class="comment-item" id="comment-${comment.id}" style="display: flex; gap: 10px; margin-bottom: 8px; padding: 6px 0;">
      <a href="/profile.html?user=${encodeURIComponent(comment.username)}">
        ${renderAvatar({ username: comment.username, avatar_url: comment.avatar_url }, 'avatar-xs')}
      </a>
      <div style="flex: 1; background: var(--bg-surface-elevated); padding: 8px 12px; border-radius: var(--radius-md);">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <a href="/profile.html?user=${encodeURIComponent(comment.username)}" style="font-size: var(--font-xs); font-weight: 700; color: var(--text-main);">
              ${escapeHTML(comment.username)}
            </a>
            <span style="font-size: 11px; color: var(--text-faint);">${timeAgo(comment.created_at)}</span>
          </div>
          ${isOwner ? `
            <button type="button" class="btn-icon" data-delete-comment="${comment.id}" title="Delete comment" style="width: 20px; height: 20px;">
              ${renderIcon('x', '', 'width="12" height="12"')}
            </button>
          ` : ''}
        </div>
        <div style="font-size: var(--font-xs); color: var(--text-main); word-break: break-word;">
          ${escapeHTML(comment.content)}
        </div>
      </div>
    </div>
  `;
}

function attachCommentEvents(commentId) {
  const item = document.getElementById(`comment-${commentId}`);
  if (!item) return;

  const delBtn = item.querySelector(`[data-delete-comment="${commentId}"]`);
  if (delBtn) {
    delBtn.addEventListener('click', () => {
      showConfirmDialog({
        title: 'Delete reply?',
        message: 'This will remove your reply permanently.',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        isDanger: true,
        onConfirm: async () => {
          try {
            const res = await API.deleteComment(commentId);
            item.remove();
            showToast('Comment deleted', 'info');

            const countEl = document.getElementById(`comment-count-${res.post_id}`);
            if (countEl) countEl.textContent = formatCount(res.comment_count);
          } catch (err) {
            showToast(err.message, 'error');
          }
        }
      });
    });
  }
}
