const bcrypt = require('bcryptjs');
const db = require('./database');

console.log('🌱 Starting comprehensive database seed for Linkora...');

const seed = db.transaction(() => {
  // 1. Clear existing data in reverse order of foreign key dependencies
  db.prepare('DELETE FROM poll_votes').run();
  db.prepare('DELETE FROM poll_options').run();
  db.prepare('DELETE FROM polls').run();
  db.prepare('DELETE FROM post_media').run();
  db.prepare('DELETE FROM post_hashtags').run();
  db.prepare('DELETE FROM hashtags').run();
  db.prepare('DELETE FROM comment_likes').run();
  db.prepare('DELETE FROM comments').run();
  db.prepare('DELETE FROM likes').run();
  db.prepare('DELETE FROM bookmarks').run();
  db.prepare('DELETE FROM reposts').run();
  db.prepare('DELETE FROM follows').run();
  db.prepare('DELETE FROM mutes').run();
  db.prepare('DELETE FROM blocks').run();
  db.prepare('DELETE FROM reports').run();
  db.prepare('DELETE FROM posts').run();
  db.prepare('DELETE FROM users').run();

  // Reset sqlite sequences
  db.prepare(`
    DELETE FROM sqlite_sequence 
    WHERE name IN (
      'users', 'posts', 'post_media', 'polls', 'poll_options', 'poll_votes',
      'comments', 'comment_likes', 'likes', 'bookmarks', 'reposts', 'follows',
      'hashtags'
    )
  `).run();

  const saltRounds = 10;
  const passwordHash = bcrypt.hashSync('password123', saltRounds);

  // 2. Insert 12 diverse demo users
  const insertUser = db.prepare(`
    INSERT INTO users (username, email, password, bio, avatar_url, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now', ?))
  `);

  const demoUsersData = [
    {
      username: 'alex_dev',
      email: 'alex@linkora.dev',
      bio: 'Full-stack engineer & open-source creator. Building clean, fast web systems. #buildinpublic #webdev',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80',
      time: '-30 days'
    },
    {
      username: 'sarah_design',
      email: 'sarah@linkora.dev',
      bio: 'Staff Product Designer & UI specialist. Focused on typography, calm aesthetics, and consistent 8px grids. ✨',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
      time: '-28 days'
    },
    {
      username: 'marcus_tech',
      email: 'marcus@linkora.dev',
      bio: 'Cloud Architect & Systems Engineer. Automating infrastructure, container pipelines, and high-performance databases. ⚡',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=400&auto=format&fit=crop&q=80',
      time: '-25 days'
    },
    {
      username: 'elena_ai',
      email: 'elena@linkora.dev',
      bio: 'AI researcher & ML practitioner. Working on agentic workflows, LLM reasoning, and computer vision. 🤖',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
      time: '-20 days'
    },
    {
      username: 'david_mobile',
      email: 'david@linkora.dev',
      bio: 'Mobile craftsman building high-framerate iOS & Android apps. SwiftUI, React Native & gesture animations.',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
      time: '-18 days'
    },
    {
      username: 'maya_product',
      email: 'maya@linkora.dev',
      bio: 'Head of Product. Obsessed with user empathy, intuitive micro-interactions, and metrics that actually matter.',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
      time: '-15 days'
    },
    {
      username: 'liam_frontend',
      email: 'liam@linkora.dev',
      bio: 'Design systems engineer. Writing semantic HTML, accessible CSS, and zero-runtime animations. #css #webdev',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
      time: '-12 days'
    },
    {
      username: 'chloe_security',
      email: 'chloe@linkora.dev',
      bio: 'Application security engineer. Breaking web apps responsibly, fixing auth flows, and hardening cookies. 🛡️',
      avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&auto=format&fit=crop&q=80',
      time: '-10 days'
    },
    {
      username: 'noah_backend',
      email: 'noah@linkora.dev',
      bio: 'Database geek & distributed systems enthusiast. SQLite in WAL mode is magic. #sqlite #backend',
      avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400&auto=format&fit=crop&q=80',
      time: '-8 days'
    },
    {
      username: 'zara_creative',
      email: 'zara@linkora.dev',
      bio: '3D motion artist & generative UI explorer. Blending math, shaders, and web graphics. 🎨',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
      time: '-6 days'
    },
    {
      username: 'sam_devops',
      email: 'sam@linkora.dev',
      bio: 'DevOps & SRE. Keeping uptime at 99.99%, optimizing Docker image sizes, and automating CI/CD.',
      avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&auto=format&fit=crop&q=80',
      time: '-4 days'
    },
    {
      username: 'olivia_writer',
      email: 'olivia@linkora.dev',
      bio: 'Tech journalist & community builder. Documenting the future of independent web platforms and social software.',
      avatar: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=400&auto=format&fit=crop&q=80',
      time: '-2 days'
    }
  ];

  const userIds = {};
  demoUsersData.forEach(u => {
    const res = insertUser.run(u.username, u.email, passwordHash, u.bio, u.avatar, u.time);
    userIds[u.username] = Number(res.lastInsertRowid);
  });

  console.log(`✅ Created 12 diverse demo users with credentials (password: password123)`);

  // Helper to extract and register hashtags
  const insertTagStmt = db.prepare('INSERT OR IGNORE INTO hashtags (name) VALUES (?)');
  const getTagStmt = db.prepare('SELECT id FROM hashtags WHERE name = ?');
  const linkTagStmt = db.prepare('INSERT OR IGNORE INTO post_hashtags (post_id, hashtag_id) VALUES (?, ?)');

  function indexHashtags(postId, text) {
    if (!text) return;
    const matches = Array.from(new Set((text.match(/#[a-zA-Z0-9_]+/g) || []).map(t => t.slice(1).toLowerCase())));
    for (const tag of matches) {
      insertTagStmt.run(tag);
      const row = getTagStmt.get(tag);
      if (row) {
        linkTagStmt.run(postId, row.id);
      }
    }
  }

  // Prepared statements for posts and attachments
  const insertPost = db.prepare(`
    INSERT INTO posts (user_id, content, image_url, visibility, edited_at, is_pinned, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now', ?))
  `);

  const insertMedia = db.prepare(`
    INSERT INTO post_media (post_id, media_url, media_type, order_index)
    VALUES (?, ?, 'image', ?)
  `);

  const insertPoll = db.prepare(`
    INSERT INTO polls (post_id, question, duration_hours, expires_at, created_at)
    VALUES (?, ?, ?, datetime('now', '+24 hours'), datetime('now', ?))
  `);

  const insertPollOption = db.prepare(`
    INSERT INTO poll_options (poll_id, option_text, order_index)
    VALUES (?, ?, ?)
  `);

  const insertPollVote = db.prepare(`
    INSERT INTO poll_votes (poll_id, option_id, user_id, created_at)
    VALUES (?, ?, ?, datetime('now', ?))
  `);

  const insertComment = db.prepare(`
    INSERT INTO comments (post_id, user_id, parent_id, content, created_at)
    VALUES (?, ?, ?, ?, datetime('now', ?))
  `);

  const insertCommentLike = db.prepare(`
    INSERT INTO comment_likes (comment_id, user_id, created_at)
    VALUES (?, ?, datetime('now', ?))
  `);

  const insertLike = db.prepare(`
    INSERT INTO likes (user_id, post_id, created_at)
    VALUES (?, ?, datetime('now', ?))
  `);

  const insertBookmark = db.prepare(`
    INSERT INTO bookmarks (user_id, post_id, created_at)
    VALUES (?, ?, datetime('now', ?))
  `);

  const insertRepost = db.prepare(`
    INSERT INTO reposts (user_id, post_id, quote, created_at)
    VALUES (?, ?, ?, datetime('now', ?))
  `);

  const insertFollow = db.prepare(`
    INSERT INTO follows (follower_id, following_id, created_at)
    VALUES (?, ?, datetime('now', ?))
  `);

  // 3. Insert Posts with rich attachments (images, polls, tags, mentions)
  const postsList = [
    // Post 1: Alex's Welcome / Architecture Pinned Post
    {
      user: 'alex_dev',
      content: 'Welcome to Linkora! 🚀 Built with zero frontend bloat, vanilla web standards, and lightning-fast SQLite on Express.js. Real-time updates powered by Socket.io. What are your favorite lightweight web architectures? #webdev #buildinpublic #javascript',
      images: ['https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&auto=format&fit=crop&q=80'],
      is_pinned: 1,
      edited_at: null,
      time: '-2 hours'
    },
    // Post 2: Sarah's Design System 4-Image Grid Showcase
    {
      user: 'sarah_design',
      content: 'Shipped the new Linkora design system foundations today! 🎨 Clean 8px rhythm, layered elevation shadows, Plus Jakarta Sans headings, and harmonious light/dark tokens. Swipe through the components: #designsystems #css #ui',
      images: [
        'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1542744094-24638eff58bb?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80'
      ],
      is_pinned: 0,
      edited_at: null,
      time: '-1 hour 45 minutes'
    },
    // Post 3: Liam's Interactive Poll on CSS Methodologies
    {
      user: 'liam_frontend',
      content: 'Curious to hear from the community: When starting a new greenfield web project in 2026, which styling approach do you reach for first? Vote below and drop your reasoning in the replies! 👇 #css #webdev #frontend',
      images: [],
      poll: {
        question: 'What is your primary styling approach?',
        options: [
          'Vanilla CSS + Modern Variables',
          'Tailwind CSS v4',
          'CSS Modules / Scoped',
          'Zero-runtime CSS-in-JS'
        ]
      },
      is_pinned: 0,
      edited_at: null,
      time: '-1 hour 30 minutes'
    },
    // Post 4: Marcus on High Throughput Systems (Edited post)
    {
      user: 'marcus_tech',
      content: 'Benchmarked SQLite with WAL mode on NVMe storage vs standard hosted Postgres over network latency: 12,000 read queries/sec with sub-millisecond p99. For single-node apps, local DBs are unbeatable. #sqlite #backend #cloud',
      images: ['https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1000&auto=format&fit=crop&q=80'],
      is_pinned: 0,
      edited_at: "-20 minutes",
      time: '-1 hour 15 minutes'
    },
    // Post 5: Elena's 2-Image AI Research Sprint
    {
      user: 'elena_ai',
      content: 'Testing local multimodal models running directly inside the browser using WebGPU and WASM. We are getting closer to zero-cloud private intelligence! Here are the inference latency charts: #ai #opensource',
      images: [
        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&auto=format&fit=crop&q=80'
      ],
      is_pinned: 0,
      edited_at: null,
      time: '-1 hour'
    },
    // Post 6: David's 3-Image Mobile Workspace & Testing Setup
    {
      user: 'david_mobile',
      content: 'Testing Linkora bottom tab navigation and smooth swipe gestures across devices. 120Hz scrolling on mobile web feels indistinguishable from native when layout thrashing is eliminated. Huge credit to @sarah_design and @alex_dev! #mobile #creators',
      images: [
        'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1556656793-08538906a9f8?w=800&auto=format&fit=crop&q=80'
      ],
      is_pinned: 0,
      edited_at: null,
      time: '-50 minutes'
    },
    // Post 7: Maya's State Management Poll
    {
      user: 'maya_product',
      content: 'Quick poll for engineers and engineering leaders: How often does your team ship updates to production? Are you continuous delivery or sprint releases? #buildinpublic #devops',
      images: [],
      poll: {
        question: 'How often do you deploy to production?',
        options: [
          'Multiple times a day',
          'Once a day',
          'Once per sprint (1-2 weeks)',
          'Monthly or less'
        ]
      },
      is_pinned: 0,
      edited_at: null,
      time: '-40 minutes'
    },
    // Post 8: Chloe on Web Security
    {
      user: 'chloe_security',
      content: 'Quick security reminder for web builders: Always enforce httpOnly and SameSite=Lax on auth cookies, use helmet for secure headers, and validate file magic bytes instead of trusting user MIME types! Stay safe out there. 🛡️ #security #webdev',
      images: [],
      is_pinned: 0,
      edited_at: null,
      time: '-35 minutes'
    },
    // Post 9: Zara's Generative 3D Canvas
    {
      user: 'zara_creative',
      content: 'Experimenting with noise shaders and SVG gradient displacement. Love how fluid these color transitions look at 60fps! #designsystems #creators #javascript',
      images: ['https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1000&auto=format&fit=crop&q=80'],
      is_pinned: 0,
      edited_at: null,
      time: '-25 minutes'
    },
    // Post 10: Noah on Database Architecture
    {
      user: 'noah_backend',
      content: 'Wrote a quick migration script for nested comment hierarchies using parent_id pointers and recursive queries. Clean, normalized, and easy to index! #sqlite #backend',
      images: [],
      is_pinned: 0,
      edited_at: null,
      time: '-20 minutes'
    },
    // Post 11: Olivia on Community Building
    {
      user: 'olivia_writer',
      content: 'The open web is having its renaissance. Social networks that prioritize transparency, fast user experience, and genuine creator ownership are the future. Thrilled to be here on Linkora! #buildinpublic #creators',
      images: ['https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1000&auto=format&fit=crop&q=80'],
      is_pinned: 0,
      edited_at: null,
      time: '-15 minutes'
    },
    // Post 12: Sam on Docker Image Optimization
    {
      user: 'sam_devops',
      content: 'Shrank our multi-stage Node.js container image from 1.1GB down to 88MB using Alpine and omitting devDependencies. Cold starts went from 4.2s to 380ms! ⚡ #devops #cloud',
      images: [],
      is_pinned: 0,
      edited_at: null,
      time: '-10 minutes'
    },
    // Post 13: Sarah's Workspace photo
    {
      user: 'sarah_design',
      content: 'Morning coffee, a clean desk, and Figma opened to our design token library. What is your morning creative ritual? ☕ #designsystems #creators',
      images: ['https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1000&auto=format&fit=crop&q=80'],
      is_pinned: 0,
      edited_at: null,
      time: '-5 minutes'
    }
  ];

  const createdPosts = [];

  for (const p of postsList) {
    const authorId = userIds[p.user];
    const legacyImg = (p.images && p.images.length > 0) ? p.images[0] : '';
    const editedTime = p.edited_at ? `datetime('now', '${p.edited_at}')` : null;

    const res = insertPost.run(
      authorId,
      p.content,
      legacyImg,
      'public',
      editedTime,
      p.is_pinned || 0,
      p.time
    );

    const postId = Number(res.lastInsertRowid);
    createdPosts.push({ id: postId, ...p, authorId });

    // Store multi-images into post_media
    if (p.images && p.images.length > 0) {
      p.images.forEach((imgUrl, idx) => {
        insertMedia.run(postId, imgUrl, idx);
      });
    }

    // Index hashtags
    indexHashtags(postId, p.content);

    // If post has a poll, create poll + options
    if (p.poll) {
      const pollRes = insertPoll.run(postId, p.poll.question, 24, p.time);
      const pollId = Number(pollRes.lastInsertRowid);

      const optionIds = [];
      p.poll.options.forEach((optText, optIdx) => {
        const optRes = insertPollOption.run(pollId, optText, optIdx);
        optionIds.push(Number(optRes.lastInsertRowid));
      });

      // Seed realistic votes from diverse users
      const voterUsernames = Object.keys(userIds).filter(u => u !== p.user);
      voterUsernames.forEach((uname, vIdx) => {
        const chosenOptionId = optionIds[vIdx % optionIds.length];
        insertPollVote.run(pollId, chosenOptionId, userIds[uname], p.time);
      });
    }
  }

  console.log(`✅ Created ${createdPosts.length} rich demo posts (with multi-image grids, polls, and tags)`);

  // 4. Insert Nested Comments & Replies
  const p1 = createdPosts[0]; // Alex's welcome post
  const p2 = createdPosts[1]; // Sarah's design system post
  const p3 = createdPosts[2]; // Liam's CSS poll
  const p4 = createdPosts[3]; // Marcus's benchmark

  // Comments on Post 1 (Alex)
  const c1_1 = insertComment.run(p1.id, userIds['sarah_design'], null, 'The UI transitions and 8px spacing feel so buttery smooth Alex! Really loving the dark theme palette too.', '-1 hour 50 minutes');
  const c1_1_id = Number(c1_1.lastInsertRowid);
  // Reply to c1_1
  insertComment.run(p1.id, userIds['alex_dev'], c1_1_id, 'Thanks Sarah! Credit goes to your color system tokens. Clean CSS variables make all the difference.', '-1 hour 40 minutes');
  // Another root comment
  const c1_2 = insertComment.run(p1.id, userIds['noah_backend'], null, 'better-sqlite3 + WAL mode is seriously the secret weapon of modern Node.js backends.', '-1 hour 30 minutes');
  const c1_2_id = Number(c1_2.lastInsertRowid);
  // Reply to c1_2
  insertComment.run(p1.id, userIds['marcus_tech'], c1_2_id, 'Totally agree @noah_backend! Eliminating socket roundtrips to an external database drops p99 drastically.', '-1 hour 20 minutes');

  // Comments on Post 2 (Sarah's 4-image grid)
  const c2_1 = insertComment.run(p2.id, userIds['liam_frontend'], null, 'That 4-image grid layout looks gorgeous! The aspect ratios adapt so nicely on mobile.', '-1 hour 35 minutes');
  const c2_1_id = Number(c2_1.lastInsertRowid);
  insertComment.run(p2.id, userIds['sarah_design'], c2_1_id, 'Appreciate it Liam! Lightbox navigation with keyboard arrows makes viewing full-res shots a breeze.', '-1 hour 25 minutes');
  insertComment.run(p2.id, userIds['zara_creative'], null, 'In love with that gradient ring and subtle card elevation! 🔥', '-1 hour 10 minutes');

  // Comments on Post 3 (Liam's poll)
  insertComment.run(p3.id, userIds['alex_dev'], null, 'Voted Vanilla CSS + Variables! Native CSS has gotten so powerful in recent years that extra build layers feel unnecessary.', '-1 hour 15 minutes');
  insertComment.run(p3.id, userIds['maya_product'], null, 'Whatever gives developers the fastest feedback loop and lowest bug regression rate wins for me.', '-1 hour 5 minutes');

  // Comments on Post 4 (Marcus)
  insertComment.run(p4.id, userIds['chloe_security'], null, 'Just remember to set PRAGMA synchronous = NORMAL with WAL to prevent any rare OS power crash corruption. Great numbers!', '-55 minutes');

  console.log(`✅ Created nested comments & multi-level conversation replies`);

  // 5. Insert Comment Likes
  insertCommentLike.run(c1_1_id, userIds['alex_dev'], '-1 hour 45 minutes');
  insertCommentLike.run(c1_1_id, userIds['marcus_tech'], '-1 hour 40 minutes');
  insertCommentLike.run(c1_1_id, userIds['elena_ai'], '-1 hour 30 minutes');
  insertCommentLike.run(c1_2_id, userIds['alex_dev'], '-1 hour 25 minutes');
  insertCommentLike.run(c2_1_id, userIds['sarah_design'], '-1 hour 30 minutes');
  insertCommentLike.run(c2_1_id, userIds['maya_product'], '-1 hour 20 minutes');

  console.log(`✅ Created comment likes`);

  // 6. Insert Post Likes across diverse posts
  createdPosts.forEach((post, pIdx) => {
    // Like by 3-7 users
    const allUsers = Object.keys(userIds);
    const likeCount = 3 + (pIdx % 6);
    for (let i = 0; i < likeCount; i++) {
      const u = allUsers[(pIdx + i + 1) % allUsers.length];
      insertLike.run(userIds[u], post.id, '-1 hour');
    }
  });

  console.log(`✅ Created realistic post likes`);

  // 7. Insert Bookmarks
  insertBookmark.run(userIds['alex_dev'], p2.id, '-1 hour');
  insertBookmark.run(userIds['alex_dev'], p4.id, '-45 minutes');
  insertBookmark.run(userIds['sarah_design'], p1.id, '-1 hour');
  insertBookmark.run(userIds['marcus_tech'], p3.id, '-30 minutes');

  console.log(`✅ Created bookmarks`);

  // 8. Insert Reposts / Quotes
  insertRepost.run(userIds['liam_frontend'], p2.id, 'Check out these design system tokens by @sarah_design — clean work!', '-1 hour');
  insertRepost.run(userIds['elena_ai'], p1.id, null, '-45 minutes');
  insertRepost.run(userIds['david_mobile'], p4.id, 'Incredible latency stats from @marcus_tech. A must-read for systems builders.', '-30 minutes');

  console.log(`✅ Created reposts & quotes`);

  // 9. Insert Realistic Follow Network
  // Alex follows Sarah, Marcus, Elena, Liam, Noah
  insertFollow.run(userIds['alex_dev'], userIds['sarah_design'], '-20 days');
  insertFollow.run(userIds['alex_dev'], userIds['marcus_tech'], '-19 days');
  insertFollow.run(userIds['alex_dev'], userIds['elena_ai'], '-15 days');
  insertFollow.run(userIds['alex_dev'], userIds['liam_frontend'], '-10 days');
  insertFollow.run(userIds['alex_dev'], userIds['noah_backend'], '-8 days');

  // Sarah follows Alex, Liam, Zara, Maya
  insertFollow.run(userIds['sarah_design'], userIds['alex_dev'], '-20 days');
  insertFollow.run(userIds['sarah_design'], userIds['liam_frontend'], '-12 days');
  insertFollow.run(userIds['sarah_design'], userIds['zara_creative'], '-8 days');
  insertFollow.run(userIds['sarah_design'], userIds['maya_product'], '-6 days');

  // Marcus follows Alex, Sarah, Noah, Sam, Chloe
  insertFollow.run(userIds['marcus_tech'], userIds['alex_dev'], '-18 days');
  insertFollow.run(userIds['marcus_tech'], userIds['sarah_design'], '-18 days');
  insertFollow.run(userIds['marcus_tech'], userIds['noah_backend'], '-7 days');
  insertFollow.run(userIds['marcus_tech'], userIds['sam_devops'], '-5 days');
  insertFollow.run(userIds['marcus_tech'], userIds['chloe_security'], '-4 days');

  // Everyone else follows some creators
  insertFollow.run(userIds['elena_ai'], userIds['alex_dev'], '-14 days');
  insertFollow.run(userIds['elena_ai'], userIds['marcus_tech'], '-14 days');
  insertFollow.run(userIds['david_mobile'], userIds['alex_dev'], '-10 days');
  insertFollow.run(userIds['david_mobile'], userIds['sarah_design'], '-10 days');
  insertFollow.run(userIds['maya_product'], userIds['alex_dev'], '-8 days');
  insertFollow.run(userIds['liam_frontend'], userIds['sarah_design'], '-12 days');
  insertFollow.run(userIds['chloe_security'], userIds['marcus_tech'], '-4 days');
  insertFollow.run(userIds['noah_backend'], userIds['alex_dev'], '-7 days');
  insertFollow.run(userIds['zara_creative'], userIds['sarah_design'], '-5 days');
  insertFollow.run(userIds['sam_devops'], userIds['marcus_tech'], '-3 days');
  insertFollow.run(userIds['olivia_writer'], userIds['alex_dev'], '-2 days');
  insertFollow.run(userIds['olivia_writer'], userIds['sarah_design'], '-2 days');

  console.log(`✅ Created organic follow relationships across all 12 creators`);
});

try {
  seed();
  console.log('\n🎉 Linkora database seeded successfully with rich, alive content!');
  console.log('------------------------------------------------------------');
  console.log('Demo Login Accounts (Password for all: password123):');
  console.log('  1. alex_dev       (alex@linkora.dev)');
  console.log('  2. sarah_design   (sarah@linkora.dev)');
  console.log('  3. marcus_tech    (marcus@linkora.dev)');
  console.log('  4. elena_ai       (elena@linkora.dev)');
  console.log('  5. david_mobile   (david@linkora.dev)');
  console.log('  6. liam_frontend  (liam@linkora.dev)');
  console.log('------------------------------------------------------------\n');
} catch (err) {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
}
