const bcrypt = require('bcryptjs');
const db = require('./database');

console.log('🌱 Starting database seed...');

// Wrap in transaction for atomic execution
const seed = db.transaction(() => {
  // Clear existing data in reverse order of dependencies
  db.prepare('DELETE FROM follows').run();
  db.prepare('DELETE FROM likes').run();
  db.prepare('DELETE FROM comments').run();
  db.prepare('DELETE FROM posts').run();
  db.prepare('DELETE FROM users').run();

  // Reset sqlite sequences
  db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('users', 'posts', 'comments', 'likes', 'follows')").run();

  const saltRounds = 10;
  const passwordHash = bcrypt.hashSync('password123', saltRounds);

  // 1. Insert 3 demo users
  const insertUser = db.prepare(`
    INSERT INTO users (username, email, password, bio, avatar_url)
    VALUES (?, ?, ?, ?, ?)
  `);

  const user1 = insertUser.run(
    'alex_dev',
    'alex@linkora.dev',
    passwordHash,
    'Full-stack engineer & open-source enthusiast. Building clean, fast web systems.',
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80'
  );

  const user2 = insertUser.run(
    'sarah_design',
    'sarah@linkora.dev',
    passwordHash,
    'Product Designer & UI specialist. Focused on typography, calm aesthetics, and consistent spacing.',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80'
  );

  const user3 = insertUser.run(
    'marcus_tech',
    'marcus@linkora.dev',
    passwordHash,
    'Cloud Architect & Systems Engineer. Automating infrastructure and developer tooling.',
    'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=400&auto=format&fit=crop&q=80'
  );

  const u1Id = user1.lastInsertRowid;
  const u2Id = user2.lastInsertRowid;
  const u3Id = user3.lastInsertRowid;

  console.log(`✅ Created 3 demo users: alex_dev (ID: ${u1Id}), sarah_design (ID: ${u2Id}), marcus_tech (ID: ${u3Id})`);

  // 2. Insert demo posts
  const insertPost = db.prepare(`
    INSERT INTO posts (user_id, content, image_url, created_at)
    VALUES (?, ?, ?, datetime('now', ?))
  `);

  const p1 = insertPost.run(
    u1Id,
    'Excited to launch on Linkora today! Clean architecture, zero framework bloat on the frontend, and lightning-fast SQLite on the backend. What are you building this week?',
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80',
    '-2 hours'
  );

  const p2 = insertPost.run(
    u2Id,
    'A calm color palette with deep dark surfaces and subtle 1px borders creates such a focused reading experience. Consistent typography and spacing make all the difference.',
    'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&auto=format&fit=crop&q=80',
    '-1 hour'
  );

  const p3 = insertPost.run(
    u3Id,
    'Containerized our dev environments today. Spun up SQLite with WAL mode enabled — 10x throughput improvement for concurrent reads. Always benchmark before optimizing! ⚡',
    '',
    '-45 minutes'
  );

  const p4 = insertPost.run(
    u1Id,
    'Just pushed a commit adding optimistic UI updates for likes and follows. The app feels completely native without any page flicker. Details matter.',
    '',
    '-20 minutes'
  );

  const p5 = insertPost.run(
    u2Id,
    'Taking a quick breather after a productive design session before the next release.',
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80',
    '-10 minutes'
  );

  const p1Id = p1.lastInsertRowid;
  const p2Id = p2.lastInsertRowid;
  const p3Id = p3.lastInsertRowid;
  const p4Id = p4.lastInsertRowid;
  const p5Id = p5.lastInsertRowid;

  console.log(`✅ Created 5 demo posts across users`);

  // 3. Insert demo comments
  const insertComment = db.prepare(`
    INSERT INTO comments (post_id, user_id, content, created_at)
    VALUES (?, ?, ?, datetime('now', ?))
  `);

  insertComment.run(p1Id, u2Id, 'Looks incredible Alex! The UI transitions are super smooth.', '-1 hour');
  insertComment.run(p1Id, u3Id, 'Awesome stack choice. SQLite with better-sqlite3 is seriously underrated.', '-50 minutes');
  insertComment.run(p2Id, u1Id, 'Love the color palette Sarah! That violet glow really pops.', '-30 minutes');
  insertComment.run(p3Id, u1Id, 'WAL mode is a game changer for SQLite indeed.', '-25 minutes');

  console.log(`✅ Created 4 demo comments`);

  // 4. Insert demo likes
  const insertLike = db.prepare(`
    INSERT INTO likes (user_id, post_id)
    VALUES (?, ?)
  `);

  insertLike.run(u2Id, p1Id);
  insertLike.run(u3Id, p1Id);
  insertLike.run(u1Id, p2Id);
  insertLike.run(u3Id, p2Id);
  insertLike.run(u1Id, p3Id);
  insertLike.run(u2Id, p3Id);
  insertLike.run(u2Id, p4Id);
  insertLike.run(u1Id, p5Id);

  console.log(`✅ Created demo likes`);

  // 5. Insert demo follows
  const insertFollow = db.prepare(`
    INSERT INTO follows (follower_id, following_id)
    VALUES (?, ?)
  `);

  // Alex follows Sarah & Marcus
  insertFollow.run(u1Id, u2Id);
  insertFollow.run(u1Id, u3Id);
  // Sarah follows Alex
  insertFollow.run(u2Id, u1Id);
  // Marcus follows Alex & Sarah
  insertFollow.run(u3Id, u1Id);
  insertFollow.run(u3Id, u2Id);

  console.log(`✅ Created demo follow connections`);
});

try {
  seed();
  console.log('🎉 Database seeded successfully!');
  console.log('\nDemo user login credentials:');
  console.log('1. alex_dev / password123');
  console.log('2. sarah_design / password123');
  console.log('3. marcus_tech / password123\n');
} catch (err) {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
}
