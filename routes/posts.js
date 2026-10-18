const express = require('express');
const { body, param } = require('express-validator');
const db = require('../db/database');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

/**
 * GET /api/posts/feed
 * Home feed: posts from followed users + user's own posts, ordered newest first.
 * If user follows no one or has empty feed, falls back to latest global posts.
 */
router.get('/feed', requireAuth, (req, res) => {
  try {
    const currentUserId = req.user.id;
    const feedType = req.query.filter; // 'all' or default following feed

    let posts;
    if (feedType === 'all') {
      // Global feed
      posts = db.prepare(`
        SELECT 
          p.id, p.user_id, p.content, p.image_url, p.created_at,
          u.username, u.avatar_url,
          (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS like_count,
          (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comment_count,
          EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) AS is_liked
        FROM posts p
        JOIN users u ON p.user_id = u.id
        ORDER BY p.created_at DESC
        LIMIT 50
      `).all(currentUserId);
    } else {
      // Followed + own posts
      posts = db.prepare(`
        SELECT 
          p.id, p.user_id, p.content, p.image_url, p.created_at,
          u.username, u.avatar_url,
          (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS like_count,
          (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comment_count,
          EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) AS is_liked
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.user_id = ? 
           OR p.user_id IN (SELECT following_id FROM follows WHERE follower_id = ?)
        ORDER BY p.created_at DESC
        LIMIT 50
      `).all(currentUserId, currentUserId, currentUserId);

      // If followed feed is empty, fall back to global feed with a flag
      if (posts.length === 0) {
        posts = db.prepare(`
          SELECT 
            p.id, p.user_id, p.content, p.image_url, p.created_at,
            u.username, u.avatar_url,
            (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS like_count,
            (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comment_count,
            EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) AS is_liked
          FROM posts p
          JOIN users u ON p.user_id = u.id
          ORDER BY p.created_at DESC
          LIMIT 50
        `).all(currentUserId);

        return res.json({ posts, isFallback: true });
      }
    }

    return res.json({ posts, isFallback: false });
  } catch (err) {
    console.error('Feed error:', err);
    return res.status(500).json({ error: 'Failed to fetch feed' });
  }
});

/**
 * POST /api/posts
 * Create a new post (max 280 characters, optional image URL)
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
      .trim()
      .isURL()
      .withMessage('Image URL must be a valid web link'),
    validate
  ],
  (req, res) => {
    try {
      const { content, image_url = '' } = req.body;
      const userId = req.user.id;

      const result = db.prepare(`
        INSERT INTO posts (user_id, content, image_url)
        VALUES (?, ?, ?)
      `).run(userId, content, image_url || '');

      const newPost = db.prepare(`
        SELECT 
          p.id, p.user_id, p.content, p.image_url, p.created_at,
          u.username, u.avatar_url,
          0 AS like_count,
          0 AS comment_count,
          0 AS is_liked
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.id = ?
      `).get(result.lastInsertRowid);

      return res.status(201).json({
        message: 'Post created successfully',
        post: newPost
      });
    } catch (err) {
      console.error('Create post error:', err);
      return res.status(500).json({ error: 'Failed to create post' });
    }
  }
);

/**
 * GET /api/posts/:id
 * Retrieve a single post by ID
 */
router.get('/:id', optionalAuth, (req, res) => {
  try {
    const postId = req.params.id;
    const currentUserId = req.user ? req.user.id : null;

    const post = db.prepare(`
      SELECT 
        p.id, p.user_id, p.content, p.image_url, p.created_at,
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

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    return res.json({ post });
  } catch (err) {
    console.error('Get post error:', err);
    return res.status(500).json({ error: 'Failed to fetch post' });
  }
});

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

    // Verify post exists
    const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check if like exists
    const existingLike = db.prepare(`
      SELECT id FROM likes WHERE user_id = ? AND post_id = ?
    `).get(userId, postId);

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
 * GET /api/posts/:id/comments
 * Fetch comments for a post
 */
router.get('/:id/comments', optionalAuth, (req, res) => {
  try {
    const postId = req.params.id;
    const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const comments = db.prepare(`
      SELECT 
        c.id, c.post_id, c.user_id, c.content, c.created_at,
        u.username, u.avatar_url
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
    `).all(postId);

    return res.json({ comments });
  } catch (err) {
    console.error('Get comments error:', err);
    return res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

/**
 * POST /api/posts/:id/comments
 * Add a comment to a post
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
      const { content } = req.body;
      const userId = req.user.id;

      // Verify post exists
      const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      const result = db.prepare(`
        INSERT INTO comments (post_id, user_id, content)
        VALUES (?, ?, ?)
      `).run(postId, userId, content);

      const newComment = db.prepare(`
        SELECT 
          c.id, c.post_id, c.user_id, c.content, c.created_at,
          u.username, u.avatar_url
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.id = ?
      `).get(result.lastInsertRowid);

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
