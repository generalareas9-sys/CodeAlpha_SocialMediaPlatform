const express = require('express');
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');

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

module.exports = router;
