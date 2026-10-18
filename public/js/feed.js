/**
 * Linkora - Feed Controller (Phase 2: Full-Featured Posts, Composer & Real-Time)
 * Connect. Share. Grow.
 */
let currentFilter = ''; // '' for following, 'for_you' for explore
let nextCursor = null;
let isLoadingMore = false;
let pendingRealtimePosts = 0;
let attachedImages = []; // Array of File objects or preview objects
let isPollActive = false;

async function pageInit(user) {
  if (user) {
    setupFullComposer(user);
    setupTabs();
    setupInfiniteScroll();
    setupSocketRealtime();
    loadFeed();
  } else {
    // Logged out visitor: show landing hero & global public feed
    setupLoggedOutLanding();
    setupInfiniteScroll();
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
            <p class="feature-desc">Experience live messaging, instant reactions, and real-time feed updates powered by Socket.io.</p>
          </div>

          <div class="landing-feature-card">
            <div class="feature-icon-wrap">
              ${renderIcon('image', '', 'width="24" height="24"')}
            </div>
            <h3 class="feature-title">Rich Stories & Media</h3>
            <p class="feature-desc">Express yourself with 24-hour visual stories, multi-photo posts, and interactive community polls.</p>
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

  currentFilter = 'for_you';
  const feedTitle = document.querySelector('.feed-title');
  if (feedTitle) feedTitle.textContent = 'Trending on Linkora';

  const tabsWrap = document.querySelector('.feed-tabs');
  if (tabsWrap) tabsWrap.style.display = 'none';
}

// ============================================================================
// 2. Full-Featured Composer (Ring, Emoji, Multi-Image, Poll, Autocomplete)
// ============================================================================
function setupFullComposer(user) {
  const avatarWrap = document.getElementById('composer-avatar-mount');
  if (avatarWrap) {
    avatarWrap.innerHTML = renderAvatar(user, 'avatar-md');
  }

  const textarea = document.getElementById('post-content');
  const btnSubmit = document.getElementById('btn-submit-post');
  const ringWrap = document.getElementById('composer-char-ring');
  const dropZone = document.getElementById('post-composer');
  const fileInput = document.getElementById('composer-file-input');
  const btnUploadImg = document.getElementById('btn-upload-image');
  const previewsGrid = document.getElementById('composer-previews-grid');
  const btnTogglePoll = document.getElementById('btn-toggle-poll');
  const pollBox = document.getElementById('composer-poll-box');
  const btnClosePoll = document.getElementById('btn-close-poll');
  const btnAddPollOpt = document.getElementById('btn-add-poll-option');
  const btnToggleEmoji = document.getElementById('btn-toggle-emoji');
  const emojiPopover = document.getElementById('composer-emoji-popover');
  const autocompleteMenu = document.getElementById('composer-autocomplete-dropdown');
  const visibilitySelect = document.getElementById('post-visibility');

  if (!textarea) return;

  // 1. Textarea Auto-Grow & Ring Counter
  textarea.addEventListener('input', () => {
    const len = textarea.value.length;
    updateCharRing(ringWrap, len, 280);

    // Auto-grow
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 240) + 'px';

    // Submit state validation
    checkComposerSubmitReady();

    // Check for @mentions or #hashtags autocomplete
    handleComposerAutocomplete(textarea, autocompleteMenu);
  });

  // 2. Emoji Picker Popover
  initEmojiPickerPopover(textarea, btnToggleEmoji, emojiPopover);

  // 3. Multi-Image Upload (Drop & File Selection, up to 4 images)
  if (btnUploadImg && fileInput) {
    btnUploadImg.onclick = () => fileInput.click();
    fileInput.onchange = (e) => handleSelectedFiles(e.target.files);
  }

  if (dropZone) {
    ['dragenter', 'dragover'].forEach(name => {
      dropZone.addEventListener(name, (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(name => {
      dropZone.addEventListener(name, (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
      });
    });

    dropZone.addEventListener('drop', (e) => {
      if (e.dataTransfer && e.dataTransfer.files) {
        handleSelectedFiles(e.dataTransfer.files);
      }
    });
  }

  // 4. Poll Creation
  if (btnTogglePoll && pollBox) {
    btnTogglePoll.onclick = () => {
      isPollActive = !isPollActive;
      pollBox.style.display = isPollActive ? 'block' : 'none';
      btnTogglePoll.classList.toggle('active', isPollActive);
      checkComposerSubmitReady();
    };

    if (btnClosePoll) {
      btnClosePoll.onclick = () => {
        isPollActive = false;
        pollBox.style.display = 'none';
        btnTogglePoll.classList.remove('active');
        checkComposerSubmitReady();
      };
    }

    if (btnAddPollOpt) {
      btnAddPollOpt.onclick = () => {
        const optInputs = document.querySelectorAll('.poll-opt-input');
        if (optInputs.length >= 4) {
          showToast('Maximum 4 poll options allowed', 'info');
          return;
        }
        const container = document.getElementById('poll-options-inputs');
        const row = document.createElement('div');
        row.className = 'composer-poll-option-row';
        row.innerHTML = `
          <input type="text" class="input-field poll-opt-input" placeholder="Option ${optInputs.length + 1}" maxlength="50" style="font-size: var(--font-xs);" />
          <button type="button" class="btn-icon" style="width: 24px; height: 24px;" onclick="this.closest('.composer-poll-option-row').remove(); checkComposerSubmitReady();">✕</button>
        `;
        container.appendChild(row);
      };
    }
  }

  // 5. Submit Handler
  btnSubmit.onclick = async () => {
    const content = textarea.value.trim();
    if (!content) return;
    if (content.length > 280) {
      showToast('Post cannot exceed 280 characters', 'error');
      return;
    }

    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Publishing...';

    try {
      // 1. Upload images if attached
      let mediaUrls = [];
      if (attachedImages.length > 0) {
        const formData = new FormData();
        for (const file of attachedImages) {
          // Compress client-side before sending
          const compressed = await compressImageClientSide(file);
          formData.append('images', compressed);
        }
        const uploadRes = await API.uploadImages(formData);
        mediaUrls = uploadRes.urls || [];
      }

      // 2. Build Poll object if active
      let pollData = null;
      if (isPollActive) {
        const question = (document.getElementById('poll-question-input')?.value || '').trim();
        const optionInputs = Array.from(document.querySelectorAll('.poll-opt-input'));
        const options = optionInputs.map(input => input.value.trim()).filter(Boolean);

        if (options.length < 2) {
          showToast('Please provide at least 2 poll options', 'error');
          btnSubmit.disabled = false;
          btnSubmit.textContent = 'Post';
          return;
        }

        const duration = parseInt(document.getElementById('poll-duration-select')?.value, 10) || 24;
        pollData = { question, options, duration_hours: duration };
      }

      const visibility = visibilitySelect ? visibilitySelect.value : 'public';

      // 3. Post to API
      const res = await API.createPost({
        content,
        media_urls: mediaUrls,
        image_url: mediaUrls[0] || '',
        poll: pollData,
        visibility
      });

      showToast('Post published successfully!', 'success');

      // Reset composer
      textarea.value = '';
      textarea.style.height = 'auto';
      updateCharRing(ringWrap, 0, 280);
      attachedImages = [];
      renderAttachedPreviews();
      if (isPollActive && btnClosePoll) btnClosePoll.click();

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
        postCountEl.textContent = parseInt(postCountEl.textContent || '0', 10) + 1;
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Post';
      checkComposerSubmitReady();
    }
  };

  function checkComposerSubmitReady() {
    const len = textarea.value.trim().length;
    btnSubmit.disabled = len === 0 || len > 280;
  }

  function handleSelectedFiles(files) {
    if (!files || files.length === 0) return;
    const remainingSlots = 4 - attachedImages.length;
    if (remainingSlots <= 0) {
      showToast('You can attach up to 4 images per post', 'info');
      return;
    }

    const newFiles = Array.from(files).slice(0, remainingSlots);
    for (const file of newFiles) {
      if (file.type.startsWith('image/')) {
        attachedImages.push(file);
      }
    }
    renderAttachedPreviews();
  }

  function renderAttachedPreviews() {
    if (!previewsGrid) return;
    if (attachedImages.length === 0) {
      previewsGrid.style.display = 'none';
      previewsGrid.innerHTML = '';
      return;
    }

    previewsGrid.style.display = 'grid';
    previewsGrid.innerHTML = '';

    attachedImages.forEach((file, index) => {
      const item = document.createElement('div');
      item.className = 'composer-preview-item';

      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      item.appendChild(img);

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'btn-remove-thumb';
      removeBtn.innerHTML = '✕';
      removeBtn.onclick = () => {
        attachedImages.splice(index, 1);
        renderAttachedPreviews();
      };
      item.appendChild(removeBtn);

      previewsGrid.appendChild(item);
    });
  }
}

// ============================================================================
// 3. Emoji Picker Popover Helper
// ============================================================================
function initEmojiPickerPopover(textarea, toggleBtn, popover) {
  if (!toggleBtn || !popover || !textarea) return;

  const popularEmojis = [
    '😀', '😂', '😍', '🔥', '🚀', '✨', '💡',
    '🎉', '❤️', '👏', '🙌', '💯', '👍', '👀',
    '🤔', '⚡', '💻', '🎨', '📚', '🌱', '☕'
  ];

  popover.innerHTML = `
    <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">QUICK EMOJIS</div>
    <div class="emoji-grid">
      ${popularEmojis.map(emoji => `<div class="emoji-item" data-emoji="${emoji}">${emoji}</div>`).join('')}
    </div>
  `;

  toggleBtn.onclick = (e) => {
    e.stopPropagation();
    popover.classList.toggle('active');
  };

  document.addEventListener('click', (e) => {
    if (!popover.contains(e.target) && e.target !== toggleBtn) {
      popover.classList.remove('active');
    }
  });

  popover.querySelectorAll('.emoji-item').forEach(item => {
    item.onclick = (e) => {
      e.stopPropagation();
      const emoji = item.getAttribute('data-emoji');
      insertTextAtCursor(textarea, emoji);
      popover.classList.remove('active');
      textarea.dispatchEvent(new Event('input'));
      textarea.focus();
    };
  });
}

function insertTextAtCursor(input, text) {
  const start = input.selectionStart;
  const end = input.selectionEnd;
  const val = input.value;
  input.value = val.substring(0, start) + text + val.substring(end);
  input.selectionStart = input.selectionEnd = start + text.length;
}

// ============================================================================
// 4. Mention / Hashtag Autocomplete Dropdown
// ============================================================================
let autocompleteTimeout = null;
function handleComposerAutocomplete(textarea, menu) {
  if (!menu) return;
  clearTimeout(autocompleteTimeout);

  const text = textarea.value.slice(0, textarea.selectionStart);
  const match = text.match(/(?:^|\s)([@#])([a-zA-Z0-9_]*)$/);

  if (!match) {
    menu.classList.remove('active');
    return;
  }

  const trigger = match[1]; // '@' or '#'
  const query = match[2];

  autocompleteTimeout = setTimeout(async () => {
    try {
      let items = [];
      if (trigger === '@') {
        const res = await API.discoverUsers(query);
        items = (res.users || []).slice(0, 4).map(u => ({
          label: `@${u.username}`,
          sub: u.bio || 'Linkora creator',
          insert: `@${u.username} `
        }));
      } else {
        const tags = ['webdev', 'buildinpublic', 'design', 'javascript', 'tech', 'creators', 'ai', 'css'];
        const filtered = tags.filter(t => t.toLowerCase().includes(query.toLowerCase())).slice(0, 4);
        items = filtered.map(t => ({
          label: `#${t}`,
          sub: 'Trending topic',
          insert: `#${t} `
        }));
      }

      if (items.length === 0) {
        menu.classList.remove('active');
        return;
      }

      menu.innerHTML = items.map(item => `
        <div class="autocomplete-item" data-insert="${item.insert}">
          <div>
            <div style="font-weight: 700; font-size: var(--font-xs);">${escapeHTML(item.label)}</div>
            <div style="font-size: 10px; color: var(--text-faint);">${escapeHTML(item.sub)}</div>
          </div>
        </div>
      `).join('');

      menu.classList.add('active');

      menu.querySelectorAll('.autocomplete-item').forEach(el => {
        el.onclick = () => {
          const toInsert = el.getAttribute('data-insert');
          const before = text.replace(/([@#][a-zA-Z0-9_]*)$/, '');
          const after = textarea.value.slice(textarea.selectionStart);
          textarea.value = before + toInsert + after;
          menu.classList.remove('active');
          textarea.dispatchEvent(new Event('input'));
          textarea.focus();
        };
      });
    } catch (e) {
      menu.classList.remove('active');
    }
  }, 200);
}

// ============================================================================
// 5. Feed Tabs (Following vs For You)
// ============================================================================
function setupTabs() {
  const tabs = document.querySelectorAll('.feed-tab');
  tabs.forEach(tab => {
    tab.onclick = () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.getAttribute('data-filter') || '';
      nextCursor = null;
      loadFeed();
    };
  });
}

// ============================================================================
// 6. Infinite Scroll & Real-Time Feed Stream
// ============================================================================
async function loadFeed(isLoggedOut = false) {
  const feedContainer = document.getElementById('feed-container');
  if (!feedContainer) return;

  // Render initial skeletons
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
    const data = await API.getFeed(currentFilter || (isLoggedOut ? 'for_you' : ''), null, 20);
    const posts = data.posts || [];
    nextCursor = data.nextCursor;

    if (posts.length === 0) {
      feedContainer.innerHTML = `
        <div id="empty-feed-state">
          ${renderEmptyState({
            icon: 'sparkles',
            title: 'Your feed is quiet',
            description: 'Follow creators or switch to "For You" to discover trending posts.',
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

    feedContainer.innerHTML = banner + posts.map(p => createPostCardHTML(p, currentUser)).join('');
    posts.forEach(p => attachPostEvents(p.id));
  } catch (err) {
    feedContainer.innerHTML = `
      <div class="card" style="padding: var(--space-4); text-align: center;">
        <div style="color: var(--danger); font-size: var(--font-base); font-weight: 700;">Failed to load feed</div>
        <p style="font-size: var(--font-sm); color: var(--text-muted); margin-bottom: 12px;">${escapeHTML(err.message)}</p>
        <button onclick="loadFeed()" class="btn btn-secondary btn-sm">Retry</button>
      </div>
    `;
  }
}

function setupInfiniteScroll() {
  const sentinel = document.getElementById('feed-infinite-sentinel');
  if (!sentinel) return;

  const observer = new IntersectionObserver(async (entries) => {
    if (entries[0].isIntersecting && nextCursor && !isLoadingMore) {
      isLoadingMore = true;
      sentinel.innerHTML = `<div class="skeleton" style="height: 30px; border-radius: var(--radius-md);"></div>`;

      try {
        const data = await API.getFeed(currentFilter, nextCursor, 15);
        const newPosts = data.posts || [];
        nextCursor = data.nextCursor;

        const feedContainer = document.getElementById('feed-container');
        if (feedContainer && newPosts.length > 0) {
          feedContainer.insertAdjacentHTML('beforeend', newPosts.map(p => createPostCardHTML(p, currentUser)).join(''));
          newPosts.forEach(p => attachPostEvents(p.id));
        }
      } catch (e) {
        console.error('Infinite scroll error:', e);
      } finally {
        sentinel.innerHTML = '';
        isLoadingMore = false;
      }
    }
  }, { rootMargin: '300px' });

  observer.observe(sentinel);
}

function setupSocketRealtime() {
  const socket = getSocketClient();
  if (!socket) return;

  const pillMount = document.getElementById('new-posts-pill-mount');
  const countText = document.getElementById('new-posts-count-text');
  const pillBtn = document.getElementById('btn-new-posts-pill');

  socket.on('new_post', (post) => {
    // If not my own post, increment pending counter and show pill
    if (currentUser && post.user_id !== currentUser.id) {
      pendingRealtimePosts++;
      if (countText) {
        countText.textContent = `↑ ${pendingRealtimePosts} new ${pendingRealtimePosts === 1 ? 'post' : 'posts'}`;
      }
      if (pillMount) pillMount.style.display = 'block';
    }
  });

  if (pillBtn) {
    pillBtn.onclick = () => {
      pendingRealtimePosts = 0;
      if (pillMount) pillMount.style.display = 'none';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      loadFeed();
    };
  }
}

// ============================================================================
// 7. Post Card HTML Generator
// ============================================================================
function createPostCardHTML(post, user) {
  const isOwner = user && user.id === post.user_id;
  const isLiked = Boolean(post.is_liked);
  const isBookmarked = Boolean(post.is_bookmarked);
  const isReposted = Boolean(post.is_reposted);
  const likeCount = post.like_count || 0;
  const commentCount = post.comment_count || 0;
  const repostCount = post.repost_count || 0;

  // Media Grid HTML
  const mediaGrid = renderMediaGridHTML(post.media);

  // Link Preview if any URL
  const linkPreview = extractLinkPreview(post.content);

  // Poll Component HTML
  let pollHtml = '';
  if (post.poll) {
    const poll = post.poll;
    const hasVoted = Boolean(poll.user_voted_option_id);
    const isExpired = Boolean(poll.is_expired);
    const showResults = hasVoted || isExpired || isOwner;

    pollHtml = `
      <div class="post-poll-card" id="poll-container-${post.id}">
        ${poll.question ? `<div class="poll-question">${escapeHTML(poll.question)}</div>` : ''}
        <div class="poll-options-list">
          ${poll.options.map(opt => {
            const isMyVote = poll.user_voted_option_id === opt.id;
            return `
              <button 
                type="button" 
                class="poll-option-btn ${isMyVote ? 'voted' : ''}" 
                data-poll-option-id="${opt.id}" 
                data-post-id="${post.id}"
                ${showResults || !user ? 'disabled' : ''}
              >
                ${showResults ? `<div class="poll-progress-fill" style="width: ${opt.percentage}%;"></div>` : ''}
                <div class="poll-option-text">
                  <span>${escapeHTML(opt.option_text)}</span>
                  ${isMyVote ? `<span style="color: var(--primary); font-size: 11px;">✓ Voted</span>` : ''}
                </div>
                ${showResults ? `<span class="poll-option-percent">${opt.percentage}%</span>` : ''}
              </button>
            `;
          }).join('')}
        </div>
        <div class="poll-meta-row">
          <span>${poll.total_votes} ${poll.total_votes === 1 ? 'vote' : 'votes'}</span>
          <span>${isExpired ? 'Final results' : (hasVoted ? 'Vote registered' : 'Tap option to vote')}</span>
        </div>
      </div>
    `;
  }

  return `
    <article class="card post-card" id="post-${post.id}" data-post-id="${post.id}" style="margin-bottom: var(--space-2-5); padding: var(--space-3);">
      <!-- Pinned Post Indicator -->
      ${post.is_pinned ? `
        <div style="display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; color: var(--primary); margin-bottom: 6px;">
          ${renderIcon('bookmark', '', 'width="12" height="12"')}
          <span>Pinned post</span>
        </div>
      ` : ''}

      <!-- Header: Author & More Options -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <a href="/profile.html?user=${encodeURIComponent(post.username)}">
            ${renderAvatar({ username: post.username, avatar_url: post.avatar_url }, 'avatar-md')}
          </a>
          <div>
            <div style="display: flex; align-items: center; gap: 4px;">
              <a href="/profile.html?user=${encodeURIComponent(post.username)}" style="font-size: var(--font-sm); font-weight: 700; color: var(--text-main);">
                ${escapeHTML(post.username)}
              </a>
              ${renderVerifiedBadge()}
              <span style="font-size: 11px; color: var(--text-faint);">·</span>
              <a href="/post.html?id=${post.id}" style="font-size: 12px; color: var(--text-muted);" title="${formatExactDate(post.created_at)}">
                ${timeAgo(post.created_at)}
              </a>
              ${post.edited_at ? `<span style="font-size: 11px; color: var(--text-faint); font-style: italic;">(edited)</span>` : ''}
            </div>
            <div style="font-size: 11px; color: var(--text-muted);">
              @${escapeHTML(post.username)}
            </div>
          </div>
        </div>

        <!-- More Options Menu (...) -->
        <div class="dropdown-wrap">
          <button type="button" class="btn-icon" data-more-btn="${post.id}" aria-label="More options">
            ${renderIcon('more-horizontal', '', 'width="18" height="18"')}
          </button>
          <div class="dropdown-menu" id="post-menu-${post.id}">
            <button type="button" class="dropdown-item" data-share-post="${post.id}">
              ${renderIcon('link', '', 'width="16" height="16"')}
              <span>Copy link</span>
            </button>

            ${isOwner ? `
              ${post.can_edit ? `
                <button type="button" class="dropdown-item" data-edit-post="${post.id}">
                  ${renderIcon('edit', '', 'width="16" height="16"')}
                  <span>Edit post</span>
                </button>
              ` : ''}
              <button type="button" class="dropdown-item" data-pin-post="${post.id}">
                ${renderIcon('bookmark', '', 'width="16" height="16"')}
                <span>${post.is_pinned ? 'Unpin from profile' : 'Pin to profile'}</span>
              </button>
              <button type="button" class="dropdown-item danger" data-delete-post="${post.id}">
                ${renderIcon('trash-2', '', 'width="16" height="16"')}
                <span>Delete</span>
              </button>
            ` : `
              <button type="button" class="dropdown-item" data-mute-user="${post.user_id}" data-username="${escapeHTML(post.username)}">
                ${renderIcon('shield', '', 'width="16" height="16"')}
                <span>Mute @${escapeHTML(post.username)}</span>
              </button>
              <button type="button" class="dropdown-item danger" data-block-user="${post.user_id}" data-username="${escapeHTML(post.username)}">
                ${renderIcon('x', '', 'width="16" height="16"')}
                <span>Block @${escapeHTML(post.username)}</span>
              </button>
              <button type="button" class="dropdown-item danger" data-report-post="${post.id}">
                ${renderIcon('alert-triangle', '', 'width="16" height="16"')}
                <span>Report post</span>
              </button>
            `}
          </div>
        </div>
      </div>

      <!-- Post Body -->
      <div class="post-content-body" style="font-size: 15px; line-height: 1.6; color: var(--text-main); margin-bottom: 10px; word-break: break-word;">
        ${formatPostContent(post.content)}
      </div>

      <!-- Multi-Image Grid -->
      ${mediaGrid}

      <!-- Link Preview -->
      ${linkPreview}

      <!-- Interactive Poll -->
      ${pollHtml}

      <!-- Actions Footer -->
      <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 8px; border-top: 1px solid var(--border-subtle); margin-top: 6px;">
        <!-- Like -->
        <button type="button" class="post-action-btn ${isLiked ? 'liked' : ''}" data-like-btn="${post.id}" style="display: inline-flex; align-items: center; gap: 6px; color: ${isLiked ? 'var(--accent-pink)' : 'var(--text-muted)'}; font-size: var(--font-xs); font-weight: 600;">
          <span class="like-icon-wrap" style="display: inline-flex;">
            ${renderIcon('heart', isLiked ? 'fill-pink' : '', 'width="18" height="18"')}
          </span>
          <span id="like-count-${post.id}">${formatCount(likeCount)}</span>
        </button>

        <!-- Comments (link to detail / toggle inline) -->
        <a href="/post.html?id=${post.id}" class="post-action-btn" style="display: inline-flex; align-items: center; gap: 6px; color: var(--text-muted); font-size: var(--font-xs); font-weight: 600; text-decoration: none;">
          ${renderIcon('message-circle', '', 'width="18" height="18"')}
          <span>${formatCount(commentCount)}</span>
        </a>

        <!-- Repost / Quote -->
        <button type="button" class="post-action-btn ${isReposted ? 'reposted' : ''}" data-repost-btn="${post.id}" style="display: inline-flex; align-items: center; gap: 6px; color: ${isReposted ? 'var(--success)' : 'var(--text-muted)'}; font-size: var(--font-xs); font-weight: 600;">
          ${renderIcon('repeat', '', 'width="18" height="18"')}
          <span id="repost-count-${post.id}">${formatCount(repostCount)}</span>
        </button>

        <!-- Bookmark -->
        <button type="button" class="post-action-btn ${isBookmarked ? 'bookmarked' : ''}" data-bookmark-btn="${post.id}" style="display: inline-flex; align-items: center; color: ${isBookmarked ? 'var(--primary)' : 'var(--text-muted)'};" title="Save post">
          ${renderIcon('bookmark', isBookmarked ? 'fill-primary' : '', 'width="18" height="18"')}
        </button>

        <!-- Share -->
        <button type="button" class="post-action-btn" data-share-post="${post.id}" style="display: inline-flex; align-items: center; color: var(--text-muted);" title="Share post">
          ${renderIcon('share-2', '', 'width="18" height="18"')}
        </button>
      </div>
    </article>
  `;
}

// ============================================================================
// 8. Post Interactive Events (Likes, Reposts, Bookmarks, Menus, Polls)
// ============================================================================
function attachPostEvents(postId) {
  const postCard = document.getElementById(`post-${postId}`);
  if (!postCard) return;

  // 1. More Menu Dropdown
  const moreBtn = postCard.querySelector(`[data-more-btn="${postId}"]`);
  const menuDropdown = document.getElementById(`post-menu-${postId}`);
  if (moreBtn && menuDropdown) {
    moreBtn.onclick = (e) => {
      e.stopPropagation();
      document.querySelectorAll('.dropdown-menu').forEach(d => {
        if (d !== menuDropdown) d.classList.remove('show');
      });
      menuDropdown.classList.toggle('show');
    };

    document.addEventListener('click', () => {
      menuDropdown.classList.remove('show');
    });
  }

  // 2. Like Action with Heart Burst
  const likeBtn = postCard.querySelector(`[data-like-btn="${postId}"]`);
  if (likeBtn) {
    likeBtn.onclick = async () => {
      if (!currentUser) return showToast('Please sign in to like posts', 'info');

      const countEl = document.getElementById(`like-count-${postId}`);
      const wasLiked = likeBtn.classList.contains('liked');
      const currentCount = parseInt(countEl.textContent, 10) || 0;

      // Optimistic update
      likeBtn.classList.toggle('liked', !wasLiked);
      likeBtn.style.color = !wasLiked ? 'var(--accent-pink)' : 'var(--text-muted)';
      countEl.textContent = formatCount(wasLiked ? Math.max(0, currentCount - 1) : currentCount + 1);

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
        likeBtn.classList.toggle('liked', wasLiked);
        likeBtn.style.color = wasLiked ? 'var(--accent-pink)' : 'var(--text-muted)';
        countEl.textContent = formatCount(currentCount);
        showToast(err.message, 'error');
      }
    };
  }

  // 3. Repost Action
  const repostBtn = postCard.querySelector(`[data-repost-btn="${postId}"]`);
  if (repostBtn) {
    repostBtn.onclick = async () => {
      if (!currentUser) return showToast('Please sign in to repost', 'info');
      try {
        const res = await API.toggleRepost(postId);
        repostBtn.classList.toggle('reposted', res.reposted);
        repostBtn.style.color = res.reposted ? 'var(--success)' : 'var(--text-muted)';
        const countEl = document.getElementById(`repost-count-${postId}`);
        if (countEl) countEl.textContent = formatCount(res.repost_count);
        showToast(res.message, 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
  }

  // 4. Bookmark Action
  const bookmarkBtn = postCard.querySelector(`[data-bookmark-btn="${postId}"]`);
  if (bookmarkBtn) {
    bookmarkBtn.onclick = async () => {
      if (!currentUser) return showToast('Please sign in to save bookmarks', 'info');
      try {
        const res = await API.toggleBookmark(postId);
        bookmarkBtn.classList.toggle('bookmarked', res.bookmarked);
        bookmarkBtn.style.color = res.bookmarked ? 'var(--primary)' : 'var(--text-muted)';
        showToast(res.message, 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
  }

  // 5. Share Action (Web Share API + Clipboard)
  const shareBtns = postCard.querySelectorAll(`[data-share-post="${postId}"]`);
  shareBtns.forEach(btn => {
    btn.onclick = async () => {
      const postUrl = `${window.location.origin}/post.html?id=${postId}`;
      if (navigator.share) {
        try {
          await navigator.share({ title: 'Linkora Post', url: postUrl });
          return;
        } catch (e) {}
      }
      navigator.clipboard.writeText(postUrl).then(() => {
        showToast('Link copied to clipboard!', 'success');
      });
    };
  });

  // 6. Delete Action
  const deleteBtn = postCard.querySelector(`[data-delete-post="${postId}"]`);
  if (deleteBtn) {
    deleteBtn.onclick = () => {
      showConfirmDialog({
        title: 'Delete this post?',
        message: 'This post and all its replies will be permanently removed.',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        isDanger: true,
        onConfirm: async () => {
          try {
            await API.deletePost(postId);
            postCard.remove();
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
    };
  }

  // 7. Edit Action (within 15 minutes)
  const editBtn = postCard.querySelector(`[data-edit-post="${postId}"]`);
  if (editBtn) {
    editBtn.onclick = () => {
      const contentEl = postCard.querySelector('.post-content-body');
      const currentContent = contentEl ? contentEl.innerText.trim() : '';

      const newContent = prompt('Edit your post (within 15 minutes):', currentContent);
      if (newContent !== null && newContent.trim() !== '') {
        API.editPost(postId, newContent.trim()).then(res => {
          if (contentEl) contentEl.innerHTML = formatPostContent(res.post.content);
          showToast('Post updated successfully', 'success');
        }).catch(err => {
          showToast(err.message, 'error');
        });
      }
    };
  }

  // 8. Pin to Profile Action
  const pinBtn = postCard.querySelector(`[data-pin-post="${postId}"]`);
  if (pinBtn) {
    pinBtn.onclick = async () => {
      try {
        const res = await API.togglePin(postId);
        showToast(res.message, 'success');
        loadFeed();
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
  }

  // 9. Mute User Action
  const muteBtn = postCard.querySelector(`[data-mute-user]`);
  if (muteBtn) {
    muteBtn.onclick = async () => {
      const targetUserId = muteBtn.getAttribute('data-mute-user');
      const uname = muteBtn.getAttribute('data-username');
      try {
        await API.toggleMute(targetUserId);
        showToast(`Muted @${uname}. Their posts won't appear in your feed.`, 'info');
        postCard.remove();
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
  }

  // 10. Block User Action
  const blockBtn = postCard.querySelector(`[data-block-user]`);
  if (blockBtn) {
    blockBtn.onclick = () => {
      const targetUserId = blockBtn.getAttribute('data-block-user');
      const uname = blockBtn.getAttribute('data-username');
      showConfirmDialog({
        title: `Block @${uname}?`,
        message: 'They will no longer be able to follow you or see your posts.',
        confirmText: 'Block',
        cancelText: 'Cancel',
        isDanger: true,
        onConfirm: async () => {
          try {
            await API.toggleBlock(targetUserId);
            showToast(`Blocked @${uname}`, 'info');
            loadFeed();
          } catch (err) {
            showToast(err.message, 'error');
          }
        }
      });
    };
  }

  // 11. Report Post Action
  const reportBtn = postCard.querySelector(`[data-report-post="${postId}"]`);
  if (reportBtn) {
    reportBtn.onclick = () => {
      const reason = prompt('Please select report reason:\n1. Spam\n2. Harassment\n3. Inappropriate content\n4. Other', 'Spam');
      if (reason) {
        API.reportPost(postId, reason).then(res => {
          showToast(res.message, 'success');
        }).catch(err => {
          showToast(err.message, 'error');
        });
      }
    };
  }

  // 12. Poll Option Voting Action
  const pollOptionBtns = postCard.querySelectorAll('.poll-option-btn');
  pollOptionBtns.forEach(btn => {
    btn.onclick = async () => {
      if (!currentUser) return showToast('Please sign in to vote', 'info');
      const optId = btn.getAttribute('data-poll-option-id');
      try {
        await API.votePoll(postId, optId);
        showToast('Vote counted!', 'success');
        // Refresh single post
        const res = await API.getPost(postId);
        postCard.outerHTML = createPostCardHTML(res.post, currentUser);
        attachPostEvents(postId);
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
  });
}
