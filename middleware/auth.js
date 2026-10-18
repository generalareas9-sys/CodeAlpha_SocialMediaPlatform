const jwt = require('jsonwebtoken');
const db = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'codealpha_default_secret_key_change_in_production';

/**
 * Middleware to require authentication via JWT stored in httpOnly cookie or Bearer header
 */
function requireAuth(req, res, next) {
  const token = req.cookies?.token || 
    (req.headers.authorization && req.headers.authorization.startsWith('Bearer ') 
      ? req.headers.authorization.split(' ')[1] 
      : null);

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Fetch fresh user from DB without password
    const user = db.prepare(`
      SELECT id, username, email, bio, avatar_url, created_at 
      FROM users 
      WHERE id = ?
    `).get(decoded.id);

    if (!user) {
      res.clearCookie('token');
      return res.status(401).json({ error: 'User account no longer exists.' });
    }

    req.user = user;
    next();
  } catch (err) {
    res.clearCookie('token');
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
}

/**
 * Optional authentication: if token is present and valid, attaches user; otherwise req.user remains null
 */
function optionalAuth(req, res, next) {
  const token = req.cookies?.token || 
    (req.headers.authorization && req.headers.authorization.startsWith('Bearer ') 
      ? req.headers.authorization.split(' ')[1] 
      : null);

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare(`
      SELECT id, username, email, bio, avatar_url, created_at 
      FROM users 
      WHERE id = ?
    `).get(decoded.id);
    req.user = user || null;
  } catch (err) {
    req.user = null;
  }

  next();
}

module.exports = { requireAuth, optionalAuth, JWT_SECRET };
