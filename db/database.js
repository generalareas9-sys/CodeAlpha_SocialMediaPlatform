const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const dbPath = process.env.DATABASE_PATH 
  ? path.resolve(__dirname, '..', process.env.DATABASE_PATH)
  : path.join(__dirname, 'social.db');

// Ensure database directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Connect to SQLite database
const db = new Database(dbPath);

// Enable foreign keys and WAL mode for better concurrency
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

// Safely ensure new columns on existing tables before schema load
function ensureColumns() {
  try {
    const postCols = db.prepare("PRAGMA table_info(posts)").all().map(c => c.name);
    if (postCols.length > 0) {
      if (!postCols.includes('visibility')) {
        db.exec("ALTER TABLE posts ADD COLUMN visibility TEXT DEFAULT 'public'");
      }
      if (!postCols.includes('edited_at')) {
        db.exec("ALTER TABLE posts ADD COLUMN edited_at DATETIME DEFAULT NULL");
      }
      if (!postCols.includes('is_pinned')) {
        db.exec("ALTER TABLE posts ADD COLUMN is_pinned INTEGER DEFAULT 0");
      }
    }
  } catch (e) {
    // Table might not exist yet, schema.sql will create it
  }

  try {
    const commentCols = db.prepare("PRAGMA table_info(comments)").all().map(c => c.name);
    if (commentCols.length > 0) {
      if (!commentCols.includes('parent_id')) {
        db.exec("ALTER TABLE comments ADD COLUMN parent_id INTEGER DEFAULT NULL REFERENCES comments(id) ON DELETE CASCADE");
      }
    }
  } catch (e) {
    // Table might not exist yet
  }
}

ensureColumns();

// Execute schema to ensure all tables and indexes are ready
const schemaPath = path.join(__dirname, 'schema.sql');
if (fs.existsSync(schemaPath)) {
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql);
}

// Re-verify columns after schema
ensureColumns();

module.exports = db;
