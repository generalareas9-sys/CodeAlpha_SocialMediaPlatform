const express = require('express');
const { body } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const { requireAuth, JWT_SECRET } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

// POST /api/auth/register
router.post(
  '/register',
  [
    body('username')
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be between 3 and 30 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores'),
    body('email')
      .trim()
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
    validate
  ],
  (req, res) => {
    try {
      const { username, email, password } = req.body;

      // Check if username already exists
      const existingUsername = db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?)').get(username);
      if (existingUsername) {
        return res.status(400).json({ error: 'Username is already taken' });
      }

      // Check if email already exists
      const existingEmail = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(email);
      if (existingEmail) {
        return res.status(400).json({ error: 'Email address is already registered' });
      }

      // Hash password
      const hashedPassword = bcrypt.hashSync(password, 10);

      // Insert new user
      const result = db.prepare(`
        INSERT INTO users (username, email, password, bio, avatar_url)
        VALUES (?, ?, ?, '', '')
      `).run(username, email, hashedPassword);

      const userId = result.lastInsertRowid;

      // Generate JWT
      const token = jwt.sign({ id: userId, username }, JWT_SECRET, { expiresIn: '7d' });

      // Set httpOnly cookie
      res.cookie('token', token, COOKIE_OPTIONS);

      const newUser = db.prepare(`
        SELECT id, username, email, bio, avatar_url, created_at 
        FROM users 
        WHERE id = ?
      `).get(userId);

      return res.status(201).json({
        message: 'Account created successfully',
        user: newUser
      });
    } catch (err) {
      console.error('Registration error:', err);
      return res.status(500).json({ error: 'Server error during registration' });
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('identifier')
      .trim()
      .notEmpty()
      .withMessage('Username or email is required'),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
    validate
  ],
  (req, res) => {
    try {
      const { identifier, password } = req.body;

      // Look up user by username or email
      const user = db.prepare(`
        SELECT id, username, email, password, bio, avatar_url, created_at 
        FROM users 
        WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)
      `).get(identifier, identifier);

      if (!user) {
        return res.status(401).json({ error: 'Invalid username/email or password' });
      }

      const isMatch = bcrypt.compareSync(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid username/email or password' });
      }

      // Generate JWT
      const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

      // Set httpOnly cookie
      res.cookie('token', token, COOKIE_OPTIONS);

      // Return user without password
      const { password: _, ...userSafe } = user;

      return res.json({
        message: 'Login successful',
        user: userSafe
      });
    } catch (err) {
      console.error('Login error:', err);
      return res.status(500).json({ error: 'Server error during login' });
    }
  }
);

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });
  return res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  // Augment user with follower, following, and post counts
  const stats = db.prepare(`
    SELECT 
      (SELECT COUNT(*) FROM posts WHERE user_id = ?) AS post_count,
      (SELECT COUNT(*) FROM follows WHERE following_id = ?) AS follower_count,
      (SELECT COUNT(*) FROM follows WHERE follower_id = ?) AS following_count
  `).get(req.user.id, req.user.id, req.user.id);

  return res.json({
    user: {
      ...req.user,
      ...stats
    }
  });
});

module.exports = router;
