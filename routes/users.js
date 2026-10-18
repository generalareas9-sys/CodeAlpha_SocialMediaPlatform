const express = require('express');
const { body } = require('express-validator');
const db = require('../db/database');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

/**
 * GET /api/users
 * Discover/search users with optional ?search= query
 */
router.get('/', optionalAuth, (req, res) => {
  try {
    const search = req.query.search ? req.query.search.trim() : '';
    const isSuggested = req.query.suggested === 'true';
    const currentUserId = req.user ? req.user.id : null;

    let users;
    if (isSuggested) {
      // Suggested creators must not include people I already follow or myself
      users = db.prepare(`
        SELECT 
          u.id, u.username, u.bio, u.avatar_url, u.created_at,
          (SELECT COUNT(*) FROM posts WHERE user_id = u.id) AS post_count,
          (SELECT COUNT(*) FROM follows WHERE following_id = u.id) AS follower_count,
          (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) AS following_count,
          0 AS is_following
        FROM users u
        WHERE (? IS NULL OR u.id != ?)
          AND (? IS NULL OR u.id NOT IN (SELECT following_id FROM follows WHERE follower_id = ?))
        ORDER BY follower_count DESC, post_count DESC
        LIMIT 5
      `).all(currentUserId, currentUserId, currentUserId, currentUserId);
    } else if (search) {
      users = db.prepare(`
        SELECT 
          u.id, u.username, u.bio, u.avatar_url, u.created_at,
          (SELECT COUNT(*) FROM posts WHERE user_id = u.id) AS post_count,
          (SELECT COUNT(*) FROM follows WHERE following_id = u.id) AS follower_count,
          (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) AS following_count,
          CASE WHEN ? IS NOT NULL THEN
            EXISTS(SELECT 1 FROM follows WHERE follower_id = ? AND following_id = u.id)
          ELSE 0 END AS is_following
        FROM users u
        WHERE LOWER(u.username) LIKE LOWER(?) OR LOWER(u.bio) LIKE LOWER(?)
        ORDER BY follower_count DESC, u.created_at DESC
        LIMIT 50
      `).all(currentUserId, currentUserId, `%${search}%`, `%${search}%`);
    } else {
      // Discover all creators
      users = db.prepare(`
        SELECT 
          u.id, u.username, u.bio, u.avatar_url, u.created_at,
          (SELECT COUNT(*) FROM posts WHERE user_id = u.id) AS post_count,
          (SELECT COUNT(*) FROM follows WHERE following_id = u.id) AS follower_count,
          (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) AS following_count,
          CASE WHEN ? IS NOT NULL THEN
            EXISTS(SELECT 1 FROM follows WHERE follower_id = ? AND following_id = u.id)
          ELSE 0 END AS is_following
        FROM users u
        ORDER BY follower_count DESC, post_count DESC
        LIMIT 50
      `).all(currentUserId, currentUserId);
    }

    return res.json({ users });
  } catch (err) {
    console.error('Discover users error:', err);
    return res.status(500).json({ error: 'Failed to search users' });
  }
});

/**
 * PUT /api/users/me
 * Update authenticated user's profile (bio and avatar_url)
 */
router.put(
  '/me',
  requireAuth,
  [
    body('bio')
      .optional()
      .trim()
      .isLength({ max: 300 })
      .withMessage('Bio cannot exceed 300 characters'),
    body('avatar_url')
      .optional({ checkFalsy: true })
      .trim()
      .isURL()
      .withMessage('Avatar must be a valid image URL'),
    validate
  ],
  (req, res) => {
    try {
      const { bio = '', avatar_url = '' } = req.body;
      const userId = req.user.id;

      db.prepare(`
        UPDATE users 
        SET bio = ?, avatar_url = ? 
        WHERE id = ?
      `).run(bio, avatar_url, userId);

      const updatedUser = db.prepare(`
        SELECT id, username, email, bio, avatar_url, created_at 
        FROM users 
        WHERE id = ?
      `).get(userId);

      return res.json({
        message: 'Profile updated successfully',
        user: updatedUser
      });
    } catch (err) {
      console.error('Update profile error:', err);
      return res.status(500).json({ error: 'Failed to update profile' });
    }
  }
);

/**
 * GET /api/users/:username
 * Retrieve user profile, statistics, and user posts
 */
router.get('/:username', optionalAuth, (req, res) => {
  try {
    const { username } = req.params;
    const currentUserId = req.user ? req.user.id : null;

    const user = db.prepare(`
      SELECT 
        u.id, u.username, u.email, u.bio, u.avatar_url, u.created_at,
        (SELECT COUNT(*) FROM posts WHERE user_id = u.id) AS post_count,
        (SELECT COUNT(*) FROM follows WHERE following_id = u.id) AS follower_count,
        (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) AS following_count,
        CASE WHEN ? IS NOT NULL THEN
          EXISTS(SELECT 1 FROM follows WHERE follower_id = ? AND following_id = u.id)
        ELSE 0 END AS is_following
      FROM users u
      WHERE LOWER(u.username) = LOWER(?)
    `).get(currentUserId, currentUserId, username);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMe = currentUserId ? (currentUserId === user.id) : false;

    // Fetch user's posts
    const posts = db.prepare(`
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
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
    `).all(currentUserId, currentUserId, user.id);

    return res.json({
      user: {
        ...user,
        is_me: isMe
      },
      posts
    });
  } catch (err) {
    console.error('Get user profile error:', err);
    return res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

/**
 * POST /api/users/:id/follow
 * Toggle follow/unfollow a user by ID
 */
router.post('/:id/follow', requireAuth, (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    const followerId = req.user.id;

    if (isNaN(targetUserId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    if (targetUserId === followerId) {
      return res.status(400).json({ error: 'You cannot follow yourself' });
    }

    // Verify target user exists
    const targetUser = db.prepare('SELECT id, username FROM users WHERE id = ?').get(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already following
    const existingFollow = db.prepare(`
      SELECT id FROM follows WHERE follower_id = ? AND following_id = ?
    `).get(followerId, targetUserId);

    let isFollowing = false;
    if (existingFollow) {
      db.prepare('DELETE FROM follows WHERE id = ?').run(existingFollow.id);
      isFollowing = false;
    } else {
      db.prepare('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)').run(followerId, targetUserId);
      isFollowing = true;
    }

    const followerCount = db.prepare('SELECT COUNT(*) AS count FROM follows WHERE following_id = ?').get(targetUserId).count;
    const myFollowingCount = db.prepare('SELECT COUNT(*) AS count FROM follows WHERE follower_id = ?').get(followerId).count;

    return res.json({
      following: isFollowing,
      follower_count: followerCount,
      my_following_count: myFollowingCount,
      message: isFollowing ? `You are now following ${targetUser.username}` : `Unfollowed ${targetUser.username}`
    });
  } catch (err) {
    console.error('Follow toggle error:', err);
    return res.status(500).json({ error: 'Failed to update follow status' });
  }
});

/**
 * GET /api/users/:id/followers
 * Get list of followers for a user
 */
router.get('/:id/followers', optionalAuth, (req, res) => {
  try {
    const userId = req.params.id;
    const currentUserId = req.user ? req.user.id : null;

    const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const followers = db.prepare(`
      SELECT 
        u.id, u.username, u.bio, u.avatar_url,
        CASE WHEN ? IS NOT NULL THEN
          EXISTS(SELECT 1 FROM follows WHERE follower_id = ? AND following_id = u.id)
        ELSE 0 END AS is_following
      FROM follows f
      JOIN users u ON f.follower_id = u.id
      WHERE f.following_id = ?
      ORDER BY f.created_at DESC
    `).all(currentUserId, currentUserId, userId);

    return res.json({ user, followers });
  } catch (err) {
    console.error('Get followers error:', err);
    return res.status(500).json({ error: 'Failed to fetch followers' });
  }
});

/**
 * GET /api/users/:id/following
 * Get list of users that a user is following
 */
router.get('/:id/following', optionalAuth, (req, res) => {
  try {
    const userId = req.params.id;
    const currentUserId = req.user ? req.user.id : null;

    const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const following = db.prepare(`
      SELECT 
        u.id, u.username, u.bio, u.avatar_url,
        CASE WHEN ? IS NOT NULL THEN
          EXISTS(SELECT 1 FROM follows WHERE follower_id = ? AND following_id = u.id)
        ELSE 0 END AS is_following
      FROM follows f
      JOIN users u ON f.following_id = u.id
      WHERE f.follower_id = ?
      ORDER BY f.created_at DESC
    `).all(currentUserId, currentUserId, userId);

    return res.json({ user, following });
  } catch (err) {
    console.error('Get following error:', err);
    return res.status(500).json({ error: 'Failed to fetch following' });
  }
});

module.exports = router;
