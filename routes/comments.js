const express = require('express');
const { body } = require('express-validator');
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

/**
 * DELETE /api/comments/:id
 * Delete a comment (owner only)
 */
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const commentId = req.params.id;
    const comment = db.prepare('SELECT id, post_id, user_id FROM comments WHERE id = ?').get(commentId);

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: You can only delete your own comments' });
    }

    // Delete comment (cascade will delete nested replies)
    db.prepare('DELETE FROM comments WHERE id = ?').run(commentId);

    const remainingCount = db.prepare('SELECT COUNT(*) AS count FROM comments WHERE post_id = ?').get(comment.post_id).count;

    return res.json({
      message: 'Comment deleted successfully',
      post_id: comment.post_id,
      comment_count: remainingCount
    });
  } catch (err) {
    console.error('Delete comment error:', err);
    return res.status(500).json({ error: 'Failed to delete comment' });
  }
});

/**
 * PUT /api/comments/:id
 * Edit a comment (owner only)
 */
router.put(
  '/:id',
  requireAuth,
  [
    body('content').trim().notEmpty().withMessage('Comment content cannot be empty').isLength({ max: 500 }),
    validate
  ],
  (req, res) => {
    try {
      const commentId = req.params.id;
      const { content } = req.body;
      const userId = req.user.id;

      const comment = db.prepare('SELECT id, user_id, post_id FROM comments WHERE id = ?').get(commentId);
      if (!comment) return res.status(404).json({ error: 'Comment not found' });
      if (comment.user_id !== userId) return res.status(403).json({ error: 'Forbidden: You can only edit your own comment' });

      db.prepare('UPDATE comments SET content = ? WHERE id = ?').run(content, commentId);

      return res.json({
        message: 'Comment updated successfully',
        content
      });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to update comment' });
    }
  }
);

/**
 * POST /api/comments/:id/like
 * Toggle like on a comment
 */
router.post('/:id/like', requireAuth, (req, res) => {
  try {
    const commentId = req.params.id;
    const userId = req.user.id;

    const comment = db.prepare('SELECT id FROM comments WHERE id = ?').get(commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    const existing = db.prepare('SELECT id FROM comment_likes WHERE comment_id = ? AND user_id = ?').get(commentId, userId);

    let liked = false;
    if (existing) {
      db.prepare('DELETE FROM comment_likes WHERE id = ?').run(existing.id);
      liked = false;
    } else {
      db.prepare('INSERT INTO comment_likes (comment_id, user_id) VALUES (?, ?)').run(commentId, userId);
      liked = true;
    }

    const likeCount = db.prepare('SELECT COUNT(*) AS count FROM comment_likes WHERE comment_id = ?').get(commentId).count;

    return res.json({
      liked,
      like_count: likeCount,
      message: liked ? 'Comment liked' : 'Comment unliked'
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to toggle comment like' });
  }
});

module.exports = router;
