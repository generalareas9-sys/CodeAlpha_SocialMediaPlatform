/**
 * Linkora - Post Detail & Conversation Controller
 * Connect. Share. Grow.
 */
let currentPostId = null;
let currentSort = 'newest';

async function pageInit(user) {
  // Extract post ID from URL path (/post/123) or query parameter (?id=123)
  const pathParts = window.location.pathname.split('/');
  const lastPart = pathParts[pathParts.length - 1];
  const urlParams = new URLSearchParams(window.location.search);
  currentPostId = urlParams.get('id') || (!isNaN(parseInt(lastPart, 10)) ? lastPart : null);

  if (!currentPostId) {
    window.location.href = '/';
    return;
  }

  // Setup current user reply avatar
  const avatarMount = document.getElementById('comment-avatar-mount');
  if (avatarMount && user) {
    avatarMount.innerHTML = renderAvatar(user, 'avatar-md');
  }

  // Join socket room for live updates on this post
  const socket = getSocketClient();
  if (socket) {
    socket.emit('join_post', currentPostId);
  }

  // Setup sorting buttons
  setupSortButtons();

  // Setup main reply submission
  setupMainReply();

  // Load post and its comments
  await loadPostDetail();
  await loadPostComments();
}

function setupSortButtons() {
  const btnNewest = document.getElementById('sort-btn-newest');
  const btnTop = document.getElementById('sort-btn-top');

  if (btnNewest && btnTop) {
    btnNewest.onclick = () => {
      btnNewest.classList.add('active');
      btnTop.classList.remove('active');
      currentSort = 'newest';
      loadPostComments();
    };

    btnTop.onclick = () => {
      btnTop.classList.add('active');
      btnNewest.classList.remove('active');
      currentSort = 'top';
      loadPostComments();
    };
  }
}

async function loadPostDetail() {
  const mount = document.getElementById('post-detail-mount');
  if (!mount) return;

  try {
    const res = await API.getPost(currentPostId);
    const post = res.post;

    document.title = `${post.username} on Linkora: "${post.content.slice(0, 30)}..."`;
    mount.innerHTML = createFullPostHTML(post, currentUser);
    attachFullPostEvents(post);
  } catch (err) {
    mount.innerHTML = `
      <div class="card" style="padding: var(--space-4); text-align: center;">
        <div style="color: var(--danger); font-size: var(--font-base); font-weight: 700;">Post not found</div>
        <p style="color: var(--text-muted); font-size: var(--font-xs); margin: 6px 0 12px;">This post may have been deleted or is inaccessible.</p>
        <a href="/" class="btn btn-secondary btn-sm">Return Home</a>
      </div>
    `;
  }
}

function createFullPostHTML(post, user) {
  const isOwner = user && user.id === post.user_id;
  const isLiked = Boolean(post.is_liked);
  const isBookmarked = Boolean(post.is_bookmarked);
  const isReposted = Boolean(post.is_reposted);

  // Link Preview if any URL in content
  const linkPreview = extractLinkPreview(post.content);

  // Media Grid HTML
  const mediaGrid = renderMediaGridHTML(post.media);

  // Poll HTML if any
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
    <article class="card" id="post-${post.id}" style="padding: var(--space-4);">
      <!-- Pinned Badge -->
      ${post.is_pinned ? `
        <div style="display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; color: var(--primary); margin-bottom: 8px;">
          ${renderIcon('bookmark', '', 'width="12" height="12"')}
          <span>Pinned Post</span>
        </div>
      ` : ''}

      <!-- Author Row -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <a href="/profile.html?user=${encodeURIComponent(post.username)}">
            ${renderAvatar({ username: post.username, avatar_url: post.avatar_url }, 'avatar-lg')}
          </a>
          <div>
            <div style="display: flex; align-items: center; gap: 4px;">
              <a href="/profile.html?user=${encodeURIComponent(post.username)}" style="font-size: var(--font-base); font-weight: 800; color: var(--text-main);">
                ${escapeHTML(post.username)}
              </a>
              ${renderVerifiedBadge()}
            </div>
            <div style="font-size: var(--font-xs); color: var(--text-muted);">
              @${escapeHTML(post.username)}
            </div>
          </div>
        </div>

        <div style="font-size: var(--font-xs); color: var(--text-faint);" title="${formatExactDate(post.created_at)}">
          ${timeAgo(post.created_at)}
          ${post.edited_at ? `<span style="font-style: italic; margin-left: 2px;">(edited)</span>` : ''}
        </div>
      </div>

      <!-- Post Body -->
      <div style="font-size: 17px; line-height: 1.6; color: var(--text-main); margin-bottom: 14px; word-break: break-word;">
        ${formatPostContent(post.content)}
      </div>

      <!-- Media & Link Previews -->
      ${mediaGrid}
      ${linkPreview}
      ${pollHtml}

      <!-- Exact Date Stamp -->
      <div style="padding: 12px 0 10px; border-bottom: 1px solid var(--border-subtle); font-size: var(--font-xs); color: var(--text-muted);">
        ${formatExactDate(post.created_at)}
        ${post.visibility === 'followers' ? ' · 🔒 Followers only' : ''}
      </div>

      <!-- Action Buttons Row -->
      <div style="display: flex; align-items: center; justify-content: space-around; padding-top: 10px;">
        <!-- Like -->
        <button type="button" class="btn-icon post-action-like" data-post-id="${post.id}" style="color: ${isLiked ? 'var(--accent-pink)' : 'var(--text-muted)'}; display: inline-flex; align-items: center; gap: 6px; width: auto; padding: 6px 12px;">
          <span class="like-icon-wrap">${renderIcon('heart', isLiked ? 'fill-pink' : '', 'width="20" height="20"')}</span>
          <span id="detail-like-count">${formatCount(post.like_count)}</span>
        </button>

        <!-- Repost -->
        <button type="button" class="btn-icon post-action-repost" data-post-id="${post.id}" style="color: ${isReposted ? 'var(--success)' : 'var(--text-muted)'}; display: inline-flex; align-items: center; gap: 6px; width: auto; padding: 6px 12px;">
          ${renderIcon('repeat', '', 'width="20" height="20"')}
          <span id="detail-repost-count">${formatCount(post.repost_count)}</span>
        </button>

        <!-- Bookmark -->
        <button type="button" class="btn-icon post-action-bookmark" data-post-id="${post.id}" style="color: ${isBookmarked ? 'var(--primary)' : 'var(--text-muted)'};">
          ${renderIcon('bookmark', isBookmarked ? 'fill-primary' : '', 'width="20" height="20"')}
        </button>

        <!-- Share -->
        <button type="button" class="btn-icon post-action-share" data-post-id="${post.id}" title="Share post">
          ${renderIcon('share-2', '', 'width="20" height="20"')}
        </button>
      </div>
    </article>
  `;
}

function attachFullPostEvents(post) {
  const postEl = document.getElementById(`post-${post.id}`);
  if (!postEl) return;

  // Like button
  const likeBtn = postEl.querySelector('.post-action-like');
  if (likeBtn) {
    likeBtn.onclick = async () => {
      if (!currentUser) {
        showToast('Please sign in to like', 'info');
        return;
      }
      const iconWrap = likeBtn.querySelector('.like-icon-wrap');
      if (iconWrap) {
        iconWrap.classList.add('animate-heart-burst');
        setTimeout(() => iconWrap.classList.remove('animate-heart-burst'), 400);
      }
      try {
        const res = await API.toggleLike(post.id);
        likeBtn.style.color = res.liked ? 'var(--accent-pink)' : 'var(--text-muted)';
        const count = document.getElementById('detail-like-count');
        if (count) count.textContent = formatCount(res.like_count);
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
  }

  // Repost button
  const repostBtn = postEl.querySelector('.post-action-repost');
  if (repostBtn) {
    repostBtn.onclick = async () => {
      if (!currentUser) return showToast('Please sign in to repost', 'info');
      try {
        const res = await API.toggleRepost(post.id);
        repostBtn.style.color = res.reposted ? 'var(--success)' : 'var(--text-muted)';
        const count = document.getElementById('detail-repost-count');
        if (count) count.textContent = formatCount(res.repost_count);
        showToast(res.message, 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
  }

  // Bookmark button
  const bookmarkBtn = postEl.querySelector('.post-action-bookmark');
  if (bookmarkBtn) {
    bookmarkBtn.onclick = async () => {
      if (!currentUser) return showToast('Please sign in to bookmark', 'info');
      try {
        const res = await API.toggleBookmark(post.id);
        bookmarkBtn.style.color = res.bookmarked ? 'var(--primary)' : 'var(--text-muted)';
        showToast(res.message, 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
  }

  // Share button
  const shareBtn = postEl.querySelector('.post-action-share');
  if (shareBtn) {
    shareBtn.onclick = async () => {
      const url = window.location.href;
      if (navigator.share) {
        try {
          await navigator.share({ title: 'Linkora Post', url });
          return;
        } catch (e) {}
      }
      navigator.clipboard.writeText(url).then(() => {
        showToast('Post link copied to clipboard!', 'success');
      });
    };
  }

  // Poll voting options
  const pollOptionBtns = postEl.querySelectorAll('.poll-option-btn');
  pollOptionBtns.forEach(btn => {
    btn.onclick = async () => {
      if (!currentUser) return showToast('Please sign in to vote', 'info');
      const optId = btn.getAttribute('data-poll-option-id');
      try {
        await API.votePoll(post.id, optId);
        showToast('Vote cast successfully!', 'success');
        await loadPostDetail(); // Refresh with live percentages
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
  });
}

// ============================================================================
// Comments & Nested Replies Controller
// ============================================================================
async function loadPostComments() {
  const container = document.getElementById('nested-comments-container');
  if (!container) return;

  container.innerHTML = `
    <div style="padding: 16px 0; text-align: center; color: var(--text-muted); font-size: var(--font-xs);">
      Loading conversation...
    </div>
  `;

  try {
    const data = await API.getComments(currentPostId, currentSort);
    const comments = data.comments || [];

    const titleEl = document.getElementById('comments-header-title');
    if (titleEl) titleEl.textContent = `Replies (${comments.length})`;

    if (comments.length === 0) {
      container.innerHTML = `
        <div style="padding: 24px 0; text-align: center; color: var(--text-muted); font-size: var(--font-sm);">
          No replies yet. Be the first to start the conversation!
        </div>
      `;
      return;
    }

    container.innerHTML = comments.map(c => renderCommentThreadHTML(c, currentUser)).join('');
    attachCommentThreadEvents(comments);
  } catch (err) {
    container.innerHTML = `<div style="color: var(--danger); font-size: var(--font-xs); text-align: center;">Failed to load replies</div>`;
  }
}

function renderCommentThreadHTML(comment, user) {
  const isOwner = user && user.id === comment.user_id;
  const isLiked = Boolean(comment.is_liked);

  return `
    <div class="comment-thread" id="comment-thread-${comment.id}">
      <!-- Top Level Comment -->
      <div style="display: flex; gap: 12px;">
        <a href="/profile.html?user=${encodeURIComponent(comment.username)}">
          ${renderAvatar({ username: comment.username, avatar_url: comment.avatar_url }, 'avatar-sm')}
        </a>
        <div style="flex: 1; background: var(--bg-surface-elevated); padding: 10px 14px; border-radius: var(--radius-lg);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <a href="/profile.html?user=${encodeURIComponent(comment.username)}" style="font-size: var(--font-xs); font-weight: 700; color: var(--text-main);">
                ${escapeHTML(comment.username)}
              </a>
              <span style="font-size: 11px; color: var(--text-faint);">${timeAgo(comment.created_at)}</span>
            </div>
            ${isOwner ? `
              <div style="display: flex; gap: 4px;">
                <button type="button" class="btn-icon" data-delete-c="${comment.id}" title="Delete reply" style="width: 22px; height: 22px;">
                  ${renderIcon('x', '', 'width="12" height="12"')}
                </button>
              </div>
            ` : ''}
          </div>

          <div style="font-size: var(--font-sm); color: var(--text-main); line-height: 1.5; margin-bottom: 6px;">
            ${formatPostContent(comment.content)}
          </div>

          <div style="display: flex; align-items: center; gap: 14px;">
            <!-- Like Comment -->
            <button type="button" class="btn-comment-reply btn-comment-like" data-like-c="${comment.id}" style="display: inline-flex; align-items: center; gap: 4px; color: ${isLiked ? 'var(--accent-pink)' : 'var(--text-muted)'};">
              ${renderIcon('heart', isLiked ? 'fill-pink' : '', 'width="13" height="13"')}
              <span id="c-like-count-${comment.id}">${comment.like_count || 0}</span>
            </button>

            <!-- Reply Button -->
            <button type="button" class="btn-comment-reply" data-reply-to="${comment.id}">
              Reply
            </button>
          </div>
        </div>
      </div>

      <!-- Nested Replies List (Level 2) -->
      ${comment.replies && comment.replies.length > 0 ? `
        <div class="comment-replies">
          ${comment.replies.map(reply => {
            const isReplyOwner = user && user.id === reply.user_id;
            const isReplyLiked = Boolean(reply.is_liked);
            return `
              <div style="display: flex; gap: 10px;" id="reply-${reply.id}">
                <a href="/profile.html?user=${encodeURIComponent(reply.username)}">
                  ${renderAvatar({ username: reply.username, avatar_url: reply.avatar_url }, 'avatar-xs')}
                </a>
                <div style="flex: 1; background: var(--bg-surface-elevated); padding: 8px 12px; border-radius: var(--radius-md);">
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                      <a href="/profile.html?user=${encodeURIComponent(reply.username)}" style="font-size: var(--font-xs); font-weight: 700; color: var(--text-main);">
                        ${escapeHTML(reply.username)}
                      </a>
                      <span style="font-size: 10px; color: var(--text-faint);">${timeAgo(reply.created_at)}</span>
                    </div>
                    ${isReplyOwner ? `
                      <button type="button" class="btn-icon" data-delete-c="${reply.id}" title="Delete reply" style="width: 20px; height: 20px;">
                        ${renderIcon('x', '', 'width="12" height="12"')}
                      </button>
                    ` : ''}
                  </div>
                  <div style="font-size: var(--font-xs); color: var(--text-main); line-height: 1.4;">
                    ${formatPostContent(reply.content)}
                  </div>
                  <div style="margin-top: 4px;">
                    <button type="button" class="btn-comment-reply btn-comment-like" data-like-c="${reply.id}" style="color: ${isReplyLiked ? 'var(--accent-pink)' : 'var(--text-muted)'};">
                      ${renderIcon('heart', isReplyLiked ? 'fill-pink' : '', 'width="12" height="12"')}
                      <span id="c-like-count-${reply.id}">${reply.like_count || 0}</span>
                    </button>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      ` : ''}

      <!-- Inline Reply Box (Hidden by default) -->
      <div class="reply-input-box" id="reply-box-${comment.id}" style="display: none; margin-left: 28px;">
        <input 
          type="text" 
          class="input-field" 
          id="reply-input-${comment.id}" 
          placeholder="Reply to @${escapeHTML(comment.username)}..." 
          style="padding: 6px 12px; font-size: var(--font-xs);"
        />
        <button type="button" class="btn btn-primary btn-xs" data-submit-nested="${comment.id}">
          Send
        </button>
      </div>
    </div>
  `;
}

function attachCommentThreadEvents(comments) {
  // Toggle reply box
  document.querySelectorAll('[data-reply-to]').forEach(btn => {
    btn.onclick = () => {
      if (!currentUser) return showToast('Please sign in to reply', 'info');
      const cid = btn.getAttribute('data-reply-to');
      const box = document.getElementById(`reply-box-${cid}`);
      if (box) {
        const isHidden = box.style.display === 'none';
        box.style.display = isHidden ? 'flex' : 'none';
        if (isHidden) {
          const input = document.getElementById(`reply-input-${cid}`);
          if (input) input.focus();
        }
      }
    };
  });

  // Submit nested reply
  document.querySelectorAll('[data-submit-nested]').forEach(btn => {
    btn.onclick = async () => {
      const parentId = btn.getAttribute('data-submit-nested');
      const input = document.getElementById(`reply-input-${parentId}`);
      if (!input) return;
      const text = input.value.trim();
      if (!text) return;

      btn.disabled = true;
      try {
        await API.addComment(currentPostId, text, parentId);
        input.value = '';
        showToast('Reply added', 'success');
        loadPostComments();
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        btn.disabled = false;
      }
    };
  });

  // Like comment
  document.querySelectorAll('[data-like-c]').forEach(btn => {
    btn.onclick = async () => {
      if (!currentUser) return showToast('Please sign in to like', 'info');
      const cid = btn.getAttribute('data-like-c');
      try {
        const res = await API.toggleCommentLike(cid);
        btn.style.color = res.liked ? 'var(--accent-pink)' : 'var(--text-muted)';
        const count = document.getElementById(`c-like-count-${cid}`);
        if (count) count.textContent = res.like_count;
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
  });

  // Delete comment
  document.querySelectorAll('[data-delete-c]').forEach(btn => {
    btn.onclick = () => {
      const cid = btn.getAttribute('data-delete-c');
      showConfirmDialog({
        title: 'Delete this reply?',
        message: 'This reply and any sub-replies will be removed.',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        isDanger: true,
        onConfirm: async () => {
          try {
            await API.deleteComment(cid);
            showToast('Reply deleted', 'info');
            loadPostComments();
          } catch (err) {
            showToast(err.message, 'error');
          }
        }
      });
    };
  });
}

function setupMainReply() {
  const submitBtn = document.getElementById('btn-submit-main-reply');
  const input = document.getElementById('main-reply-input');
  if (!submitBtn || !input) return;

  submitBtn.onclick = async () => {
    if (!currentUser) return showToast('Please sign in to reply', 'info');
    const content = input.value.trim();
    if (!content) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Posting...';

    try {
      await API.addComment(currentPostId, content);
      input.value = '';
      showToast('Reply published', 'success');
      loadPostComments();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Reply';
    }
  };
}
