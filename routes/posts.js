const express = require('express');
const { body, param } = require('express-validator');
const db = require('../db/database');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

/**
 * Helper to extract and store hashtags from text
 */
function syncHashtags(postId, text) {
  if (!text) return;
  const tags = Array.from(new Set((text.match(/#[a-zA-Z0-9_]+/g) || []).map(t => t.slice(1).toLowerCase())));
  if (tags.length === 0) return;

  const insertTag = db.prepare('INSERT OR IGNORE INTO hashtags (name) VALUES (?)');
  const getTag = db.prepare('SELECT id FROM hashtags WHERE name = ?');
  const linkTag = db.prepare('INSERT OR IGNORE INTO post_hashtags (post_id, hashtag_id) VALUES (?, ?)');

  for (const tag of tags) {
    insertTag.run(tag);
    const tagRow = getTag.get(tag);
    if (tagRow) {
      linkTag.run(postId, tagRow.id);
    }
  }
}

/**
 * Helper to hydrate post with media, poll, and counts
 */
function hydratePost(post, currentUserId) {
  if (!post) return null;

  // 1. Fetch multi-images
  const mediaList = db.prepare(`
    SELECT id, media_url, media_type, order_index 
    FROM post_media 
    WHERE post_id = ? 
    ORDER BY order_index ASC
  `).all(post.id);

  if (mediaList.length > 0) {
    post.media = mediaList;
  } else if (post.image_url) {
    post.media = [{ id: 0, media_url: post.image_url, media_type: 'image', order_index: 0 }];
  } else {
    post.media = [];
  }

  // 2. Fetch poll if exists
  const poll = db.prepare(`
    SELECT id, question, duration_hours, expires_at, created_at,
           (expires_at <= CURRENT_TIMESTAMP) AS is_expired
    FROM polls 
    WHERE post_id = ?
  `).get(post.id);

  if (poll) {
    const options = db.prepare(`
      SELECT po.id, po.option_text, po.order_index,
             (SELECT COUNT(*) FROM poll_votes WHERE option_id = po.id) AS vote_count
      FROM poll_options po
      WHERE po.poll_id = ?
      ORDER BY po.order_index ASC
    `).all(poll.id);

    const totalVotes = options.reduce((sum, opt) => sum + opt.vote_count, 0);

    // Calculate percentages
    options.forEach(opt => {
      opt.percentage = totalVotes > 0 ? Math.round((opt.vote_count / totalVotes) * 100) : 0;
    });

    let userVotedOptionId = null;
    if (currentUserId) {
      const voteRow = db.prepare('SELECT option_id FROM poll_votes WHERE poll_id = ? AND user_id = ?').get(poll.id, currentUserId);
      if (voteRow) userVotedOptionId = voteRow.option_id;
    }

    post.poll = {
      ...poll,
      total_votes: totalVotes,
      user_voted_option_id: userVotedOptionId,
      options
    };
  } else {
    post.poll = null;
  }

  // 3. Repost and Bookmark flags
  if (currentUserId) {
    post.is_bookmarked = Boolean(db.prepare('SELECT 1 FROM bookmarks WHERE user_id = ? AND post_id = ?').get(currentUserId, post.id));
    post.is_reposted = Boolean(db.prepare('SELECT 1 FROM reposts WHERE user_id = ? AND post_id = ?').get(currentUserId, post.id));
  } else {
    post.is_bookmarked = false;
    post.is_reposted = false;
  }

  post.repost_count = db.prepare('SELECT COUNT(*) AS count FROM reposts WHERE post_id = ?').get(post.id).count;

  // 4. Can edit check (within 15 minutes of post creation)
  const createdAtStr = post.created_at ? String(post.created_at) : '';
  const createdMs = createdAtStr ? new Date(createdAtStr.endsWith('Z') ? createdAtStr : createdAtStr + 'Z').getTime() : 0;
  const nowMs = Date.now();
  post.can_edit = Boolean(currentUserId && currentUserId === post.user_id && createdMs && (nowMs - createdMs <= 15 * 60 * 1000));

  return post;
}

/**
 * GET /api/posts/feed
 * Home feed: 'following' (default) or 'for_you' / 'all' (explore ranking by likes + recency)
 */
router.get('/feed', optionalAuth, (req, res) => {
  try {
    const currentUserId = req.user ? req.user.id : null;
    const filter = req.query.filter || (currentUserId ? '' : 'all');
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
    const cursor = req.query.cursor ? parseInt(req.query.cursor, 10) : null;

    let baseQuery = `
      SELECT 
        p.id, p.user_id, p.content, p.image_url, p.visibility, p.edited_at, p.is_pinned, p.created_at,
        u.username, u.avatar_url,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS like_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comment_count,
        CASE WHEN ? IS NOT NULL THEN
          EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?)
        ELSE 0 END AS is_liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
    `;

    // Filter out posts from blocked or muted accounts
    let whereClauses = [];
    let params = [currentUserId, currentUserId];

    if (currentUserId) {
      whereClauses.push(`p.user_id NOT IN (SELECT blocked_user_id FROM blocks WHERE user_id = ?)`);
      whereClauses.push(`p.user_id NOT IN (SELECT user_id FROM blocks WHERE blocked_user_id = ?)`);
      whereClauses.push(`p.user_id NOT IN (SELECT muted_user_id FROM mutes WHERE user_id = ?)`);
      params.push(currentUserId, currentUserId, currentUserId);
    }

    if (cursor) {
      whereClauses.push(`p.id < ?`);
      params.push(cursor);
    }

    let isFallback = false;

    if (filter === 'for_you' || filter === 'all') {
      // Explore algorithm: Popularity (likes*2 + comments) + Recency
      if (whereClauses.length > 0) {
        baseQuery += ` WHERE ` + whereClauses.join(' AND ');
      }
      baseQuery += ` ORDER BY p.is_pinned DESC, (like_count * 2 + comment_count) DESC, p.created_at DESC LIMIT ?`;
      params.push(limit);
    } else {
      // Following feed: posts from followed creators + own posts
      let followClause = `(p.user_id = ? OR p.user_id IN (SELECT following_id FROM follows WHERE follower_id = ?))`;
      whereClauses.push(followClause);
      params.push(currentUserId, currentUserId);

      baseQuery += ` WHERE ` + whereClauses.join(' AND ');
      baseQuery += ` ORDER BY p.is_pinned DESC, p.created_at DESC LIMIT ?`;
      params.push(limit);
    }

    let rawPosts = db.prepare(baseQuery).all(...params);

    // If following feed is completely empty, fallback to explore posts
    if (rawPosts.length === 0 && filter !== 'for_you' && filter !== 'all') {
      isFallback = true;
      let fallbackParams = [currentUserId, currentUserId];
      let fallbackWhere = [];
      if (currentUserId) {
        fallbackWhere.push(`p.user_id NOT IN (SELECT blocked_user_id FROM blocks WHERE user_id = ?)`);
        fallbackWhere.push(`p.user_id NOT IN (SELECT muted_user_id FROM mutes WHERE user_id = ?)`);
        fallbackParams.push(currentUserId, currentUserId);
      }
      let fallbackSql = `
        SELECT 
          p.id, p.user_id, p.content, p.image_url, p.visibility, p.edited_at, p.is_pinned, p.created_at,
          u.username, u.avatar_url,
          (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS like_count,
          (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comment_count,
          CASE WHEN ? IS NOT NULL THEN
            EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?)
          ELSE 0 END AS is_liked
        FROM posts p
        JOIN users u ON p.user_id = u.id
      `;
      if (fallbackWhere.length > 0) {
        fallbackSql += ` WHERE ` + fallbackWhere.join(' AND ');
      }
      fallbackSql += ` ORDER BY (like_count * 2 + comment_count) DESC, p.created_at DESC LIMIT ?`;
      fallbackParams.push(limit);
      rawPosts = db.prepare(fallbackSql).all(...fallbackParams);
    }

    const posts = rawPosts.map(p => hydratePost(p, currentUserId));
    const nextCursor = posts.length >= limit ? posts[posts.length - 1].id : null;

    return res.json({ posts, isFallback, nextCursor });
  } catch (err) {
    console.error('Feed error:', err);
    return res.status(500).json({ error: 'Failed to fetch feed' });
  }
});

/**
 * POST /api/posts
 * Create a new post with multi-media, poll, visibility, and hashtag extraction
 */
router.post(
  '/',
  requireAuth,
  [
    body('content')
      .trim()
      .notEmpty()
      .withMessage('Post content cannot be empty')
      .isLength({ max: 280 })
      .withMessage('Post content cannot exceed 280 characters'),
    body('image_url')
      .optional({ checkFalsy: true })
      .trim(),
    body('media_urls')
      .optional()
      .isArray({ max: 4 })
      .withMessage('You can attach up to 4 images'),
    body('visibility')
      .optional()
      .isIn(['public', 'followers'])
      .withMessage('Visibility must be public or followers'),
    validate
  ],
  (req, res) => {
    try {
      const { content, image_url = '', media_urls = [], poll = null, visibility = 'public' } = req.body;
      const userId = req.user.id;

      // Primary image URL is either passed directly or first of media_urls
      const primaryImage = image_url || (Array.isArray(media_urls) && media_urls.length > 0 ? media_urls[0] : '');

      const insertStmt = db.prepare(`
        INSERT INTO posts (user_id, content, image_url, visibility)
        VALUES (?, ?, ?, ?)
      `);
      const result = insertStmt.run(userId, content, primaryImage, visibility);
      const postId = result.lastInsertRowid;

      // 1. Insert multi-media if provided
      if (Array.isArray(media_urls) && media_urls.length > 0) {
        const insertMedia = db.prepare(`
          INSERT INTO post_media (post_id, media_url, media_type, order_index)
          VALUES (?, ?, 'image', ?)
        `);
        media_urls.slice(0, 4).forEach((url, idx) => {
          if (url && typeof url === 'string') {
            insertMedia.run(postId, url.trim(), idx);
          }
        });
      } else if (primaryImage) {
        db.prepare(`
          INSERT INTO post_media (post_id, media_url, media_type, order_index)
          VALUES (?, ?, 'image', 0)
        `).run(postId, primaryImage);
      }

      // 2. Insert Poll if provided (2 to 4 options)
      if (poll && Array.isArray(poll.options) && poll.options.length >= 2) {
        const durationHours = parseInt(poll.duration_hours, 10) || 24;
        const expiresAt = new Date(Date.now() + durationHours * 3600 * 1000).toISOString();
        const pollResult = db.prepare(`
          INSERT INTO polls (post_id, question, duration_hours, expires_at)
          VALUES (?, ?, ?, ?)
        `).run(postId, (poll.question || '').trim(), durationHours, expiresAt);

        const pollId = pollResult.lastInsertRowid;
        const insertOption = db.prepare(`
          INSERT INTO poll_options (poll_id, option_text, order_index)
          VALUES (?, ?, ?)
        `);

        poll.options.slice(0, 4).forEach((opt, idx) => {
          if (opt && String(opt).trim()) {
            insertOption.run(pollId, String(opt).trim(), idx);
          }
        });
      }

      // 3. Extract and sync hashtags
      syncHashtags(postId, content);

      // 4. Retrieve complete hydrated post
      const rawPost = db.prepare(`
        SELECT 
          p.id, p.user_id, p.content, p.image_url, p.visibility, p.edited_at, p.is_pinned, p.created_at,
          u.username, u.avatar_url,
          0 AS like_count,
          0 AS comment_count,
          0 AS is_liked
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.id = ?
      `).get(postId);

      const post = hydratePost(rawPost, userId);

      // 5. Emit real-time Socket.io event if available
      const io = req.app.get('io');
      if (io) {
        io.emit('new_post', post);
      }

      return res.status(201).json({
        message: 'Post created successfully',
        post
      });
    } catch (err) {
      console.error('Create post error:', err);
      return res.status(500).json({ error: 'Failed to create post' });
    }
  }
);

/**
 * GET /api/posts/trending/hashtags
 * Retrieve trending hashtags ordered by usage count
 */
router.get('/trending/hashtags', (req, res) => {
  try {
    const tags = db.prepare(`
      SELECT h.name AS tag, COUNT(ph.post_id) AS count
      FROM hashtags h
      JOIN post_hashtags ph ON h.id = ph.hashtag_id
      GROUP BY h.id, h.name
      ORDER BY count DESC, h.name ASC
      LIMIT 10
    `).all();

    return res.json({ tags });
  } catch (err) {
    console.error('Trending hashtags error:', err);
    return res.status(500).json({ error: 'Failed to fetch trending tags' });
  }
});

/**
 * GET /api/posts/:id
 * Retrieve a single post by ID
 */
router.get('/:id', optionalAuth, (req, res) => {
  try {
    const postId = req.params.id;
    const currentUserId = req.user ? req.user.id : null;

    const rawPost = db.prepare(`
      SELECT 
        p.id, p.user_id, p.content, p.image_url, p.visibility, p.edited_at, p.is_pinned, p.created_at,
        u.username, u.avatar_url,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS like_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comment_count,
        CASE WHEN ? IS NOT NULL THEN
          EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?)
        ELSE 0 END AS is_liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `).get(currentUserId, currentUserId, postId);

    if (!rawPost) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = hydratePost(rawPost, currentUserId);
    return res.json({ post });
  } catch (err) {
    console.error('Get post error:', err);
    return res.status(500).json({ error: 'Failed to fetch post' });
  }
});

/**
 * PUT /api/posts/:id
 * Edit post content within 15 minutes of creation
 */
router.put(
  '/:id',
  requireAuth,
  [
    body('content')
      .trim()
      .notEmpty()
      .withMessage('Post content cannot be empty')
      .isLength({ max: 280 })
      .withMessage('Post content cannot exceed 280 characters'),
    validate
  ],
  (req, res) => {
    try {
      const postId = req.params.id;
      const { content } = req.body;
      const userId = req.user.id;

      const post = db.prepare('SELECT id, user_id, created_at FROM posts WHERE id = ?').get(postId);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      if (post.user_id !== userId) {
        return res.status(403).json({ error: 'Forbidden: You can only edit your own posts' });
      }

      // Check 15-minute editing window
      const createdMs = new Date(post.created_at.endsWith('Z') ? post.created_at : post.created_at + 'Z').getTime();
      const nowMs = Date.now();
      if (nowMs - createdMs > 15 * 60 * 1000) {
        return res.status(400).json({ error: 'Posts can only be edited within 15 minutes of creation' });
      }

      db.prepare(`
        UPDATE posts 
        SET content = ?, edited_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(content, postId);

      syncHashtags(postId, content);

      const rawPost = db.prepare(`
        SELECT 
          p.id, p.user_id, p.content, p.image_url, p.visibility, p.edited_at, p.is_pinned, p.created_at,
          u.username, u.avatar_url,
          (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS like_count,
          (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comment_count,
          EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) AS is_liked
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.id = ?
      `).get(userId, postId);

      const updatedPost = hydratePost(rawPost, userId);

      return res.json({
        message: 'Post updated successfully',
        post: updatedPost
      });
    } catch (err) {
      console.error('Edit post error:', err);
      return res.status(500).json({ error: 'Failed to edit post' });
    }
  }
);

/**
 * DELETE /api/posts/:id
 * Delete a post (owner only)
 */
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const postId = req.params.id;
    const post = db.prepare('SELECT id, user_id FROM posts WHERE id = ?').get(postId);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: You can only delete your own posts' });
    }

    db.prepare('DELETE FROM posts WHERE id = ?').run(postId);
    return res.json({ message: 'Post deleted successfully' });
  } catch (err) {
    console.error('Delete post error:', err);
    return res.status(500).json({ error: 'Failed to delete post' });
  }
});

/**
 * POST /api/posts/:id/like
 * Toggle like/unlike on a post
 */
router.post('/:id/like', requireAuth, (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const existingLike = db.prepare('SELECT id FROM likes WHERE user_id = ? AND post_id = ?').get(userId, postId);

    let isLiked = false;
    if (existingLike) {
      db.prepare('DELETE FROM likes WHERE id = ?').run(existingLike.id);
      isLiked = false;
    } else {
      db.prepare('INSERT INTO likes (user_id, post_id) VALUES (?, ?)').run(userId, postId);
      isLiked = true;
    }

    const likeCount = db.prepare('SELECT COUNT(*) AS count FROM likes WHERE post_id = ?').get(postId).count;

    return res.json({
      liked: isLiked,
      like_count: likeCount,
      message: isLiked ? 'Post liked' : 'Post unliked'
    });
  } catch (err) {
    console.error('Like toggle error:', err);
    return res.status(500).json({ error: 'Failed to toggle like' });
  }
});

/**
 * POST /api/posts/:id/bookmark
 * Toggle bookmark on a post
 */
router.post('/:id/bookmark', requireAuth, (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const existing = db.prepare('SELECT id FROM bookmarks WHERE user_id = ? AND post_id = ?').get(userId, postId);

    let bookmarked = false;
    if (existing) {
      db.prepare('DELETE FROM bookmarks WHERE id = ?').run(existing.id);
      bookmarked = false;
    } else {
      db.prepare('INSERT INTO bookmarks (user_id, post_id) VALUES (?, ?)').run(userId, postId);
      bookmarked = true;
    }

    return res.json({
      bookmarked,
      message: bookmarked ? 'Post saved to bookmarks' : 'Post removed from bookmarks'
    });
  } catch (err) {
    console.error('Bookmark error:', err);
    return res.status(500).json({ error: 'Failed to bookmark post' });
  }
});

/**
 * POST /api/posts/:id/repost
 * Toggle repost on a post
 */
router.post('/:id/repost', requireAuth, (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;
    const { quote = null } = req.body;

    const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const existing = db.prepare('SELECT id FROM reposts WHERE user_id = ? AND post_id = ?').get(userId, postId);

    let reposted = false;
    if (existing && !quote) {
      db.prepare('DELETE FROM reposts WHERE id = ?').run(existing.id);
      reposted = false;
    } else {
      db.prepare('INSERT OR REPLACE INTO reposts (user_id, post_id, quote) VALUES (?, ?, ?)').run(userId, postId, quote || null);
      reposted = true;
    }

    const repostCount = db.prepare('SELECT COUNT(*) AS count FROM reposts WHERE post_id = ?').get(postId).count;

    return res.json({
      reposted,
      repost_count: repostCount,
      message: reposted ? 'Reposted to your followers' : 'Repost removed'
    });
  } catch (err) {
    console.error('Repost error:', err);
    return res.status(500).json({ error: 'Failed to repost' });
  }
});

/**
 * POST /api/posts/:id/pin
 * Toggle pinned status of post on user profile (owner only)
 */
router.post('/:id/pin', requireAuth, (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    const post = db.prepare('SELECT id, user_id, is_pinned FROM posts WHERE id = ?').get(postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.user_id !== userId) return res.status(403).json({ error: 'You can only pin your own posts' });

    const newPinned = post.is_pinned ? 0 : 1;
    db.prepare('UPDATE posts SET is_pinned = ? WHERE id = ?').run(newPinned, postId);

    return res.json({
      is_pinned: Boolean(newPinned),
      message: newPinned ? 'Post pinned to profile' : 'Post unpinned from profile'
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to pin post' });
  }
});

/**
 * POST /api/posts/:id/poll/vote
 * Vote on a poll option
 */
router.post('/:id/poll/vote', requireAuth, (req, res) => {
  try {
    const postId = req.params.id;
    const { option_id } = req.body;
    const userId = req.user.id;

    const poll = db.prepare(`
      SELECT id, expires_at, (expires_at <= CURRENT_TIMESTAMP) AS is_expired 
      FROM polls WHERE post_id = ?
    `).get(postId);

    if (!poll) return res.status(404).json({ error: 'Poll not found for this post' });
    if (poll.is_expired) return res.status(400).json({ error: 'This poll has ended' });

    const option = db.prepare('SELECT id FROM poll_options WHERE id = ? AND poll_id = ?').get(option_id, poll.id);
    if (!option) return res.status(400).json({ error: 'Invalid poll option' });

    // Check existing vote
    const existingVote = db.prepare('SELECT id FROM poll_votes WHERE poll_id = ? AND user_id = ?').get(poll.id, userId);
    if (existingVote) {
      return res.status(400).json({ error: 'You have already voted in this poll' });
    }

    db.prepare('INSERT INTO poll_votes (poll_id, option_id, user_id) VALUES (?, ?, ?)').run(poll.id, option_id, userId);

    // Return updated poll data
    const rawPost = db.prepare(`
      SELECT p.*, u.username, u.avatar_url,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS like_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comment_count,
        EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) AS is_liked
      FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?
    `).get(userId, postId);

    const post = hydratePost(rawPost, userId);

    return res.json({
      message: 'Vote cast successfully',
      poll: post.poll
    });
  } catch (err) {
    console.error('Poll vote error:', err);
    return res.status(500).json({ error: 'Failed to cast vote' });
  }
});

/**
 * POST /api/posts/:id/report
 * Report a post with a reason
 */
router.post(
  '/:id/report',
  requireAuth,
  [
    body('reason').trim().notEmpty().withMessage('Please specify a report reason'),
    validate
  ],
  (req, res) => {
    try {
      const postId = req.params.id;
      const { reason, details = '' } = req.body;
      const userId = req.user.id;

      const post = db.prepare('SELECT id, user_id FROM posts WHERE id = ?').get(postId);
      if (!post) return res.status(404).json({ error: 'Post not found' });

      db.prepare(`
        INSERT INTO reports (reporter_id, post_id, user_id, reason, details)
        VALUES (?, ?, ?, ?, ?)
      `).run(userId, postId, post.user_id, reason, details);

      return res.json({ message: 'Thank you. Your report has been submitted for review.' });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to submit report' });
    }
  }
);

/**
 * GET /api/posts/:id/comments
 * Fetch nested comments with sorting ('top' or 'newest') and like counts
 */
router.get('/:id/comments', optionalAuth, (req, res) => {
  try {
    const postId = req.params.id;
    const currentUserId = req.user ? req.user.id : null;
    const sort = req.query.sort || 'newest'; // 'top' or 'newest'

    const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    let orderClause = sort === 'top' ? 'like_count DESC, c.created_at DESC' : 'c.created_at ASC';

    // Top-level comments
    const comments = db.prepare(`
      SELECT 
        c.id, c.post_id, c.user_id, c.parent_id, c.content, c.created_at,
        u.username, u.avatar_url,
        (SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id) AS like_count,
        CASE WHEN ? IS NOT NULL THEN
          EXISTS(SELECT 1 FROM comment_likes WHERE comment_id = c.id AND user_id = ?)
        ELSE 0 END AS is_liked
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ? AND c.parent_id IS NULL
      ORDER BY ${orderClause}
    `).all(currentUserId, currentUserId, postId);

    // Fetch replies for each top-level comment
    const getReplies = db.prepare(`
      SELECT 
        c.id, c.post_id, c.user_id, c.parent_id, c.content, c.created_at,
        u.username, u.avatar_url,
        (SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id) AS like_count,
        CASE WHEN ? IS NOT NULL THEN
          EXISTS(SELECT 1 FROM comment_likes WHERE comment_id = c.id AND user_id = ?)
        ELSE 0 END AS is_liked
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.parent_id = ?
      ORDER BY c.created_at ASC
    `);

    comments.forEach(c => {
      c.replies = getReplies.all(currentUserId, currentUserId, c.id);
    });

    return res.json({ comments });
  } catch (err) {
    console.error('Get comments error:', err);
    return res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

/**
 * POST /api/posts/:id/comments
 * Add a comment or reply (supports parent_id for 2-level nesting)
 */
router.post(
  '/:id/comments',
  requireAuth,
  [
    body('content')
      .trim()
      .notEmpty()
      .withMessage('Comment content cannot be empty')
      .isLength({ max: 500 })
      .withMessage('Comment cannot exceed 500 characters'),
    validate
  ],
  (req, res) => {
    try {
      const postId = req.params.id;
      const { content, parent_id = null } = req.body;
      const userId = req.user.id;

      const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      if (parent_id) {
        const parent = db.prepare('SELECT id, parent_id FROM comments WHERE id = ? AND post_id = ?').get(parent_id, postId);
        if (!parent) return res.status(400).json({ error: 'Parent comment not found' });
      }

      const result = db.prepare(`
        INSERT INTO comments (post_id, user_id, parent_id, content)
        VALUES (?, ?, ?, ?)
      `).run(postId, userId, parent_id || null, content);

      const newComment = db.prepare(`
        SELECT 
          c.id, c.post_id, c.user_id, c.parent_id, c.content, c.created_at,
          u.username, u.avatar_url,
          0 AS like_count,
          0 AS is_liked
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.id = ?
      `).get(result.lastInsertRowid);

      newComment.replies = [];

      const commentCount = db.prepare('SELECT COUNT(*) AS count FROM comments WHERE post_id = ?').get(postId).count;

      return res.status(201).json({
        message: 'Comment added successfully',
        comment: newComment,
        comment_count: commentCount
      });
    } catch (err) {
      console.error('Add comment error:', err);
      return res.status(500).json({ error: 'Failed to add comment' });
    }
  }
);

module.exports = router;
