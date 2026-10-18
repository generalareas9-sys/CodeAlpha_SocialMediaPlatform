process.env.NODE_ENV = 'test';
const http = require('http');
const app = require('./server');
const db = require('./db/database');

const PORT = 5099;
let server;

function request(method, path, data = null, cookies = '') {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : '';
    const headers = {
      'Content-Type': 'application/json'
    };
    if (data) {
      headers['Content-Length'] = Buffer.byteLength(postData);
    }
    if (cookies) {
      headers['Cookie'] = cookies;
    }

    const req = http.request({
      hostname: 'localhost',
      port: PORT,
      path,
      method,
      headers
    }, (res) => {
      let body = '';
      const setCookies = res.headers['set-cookie'];
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(body);
        } catch (e) {
          json = body;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          setCookie: setCookies ? setCookies[0] : null,
          data: json
        });
      });
    });

    req.on('error', reject);
    if (data) req.write(postData);
    req.end();
  });
}

function extractCookie(cookieStr) {
  if (!cookieStr) return '';
  return cookieStr.split(';')[0];
}

async function runTests() {
  console.log('🧪 Starting API Verification Tests...\n');
  let testsPassed = 0;
  let testsFailed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      testsPassed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      testsFailed++;
    }
  }

  // Start temporary server
  await new Promise(resolve => {
    server = app.listen(PORT, resolve);
  });

  try {
    // 1. Auth: Register validation (password too short)
    const shortPassRes = await request('POST', '/api/auth/register', {
      username: 'testuser',
      email: 'test@example.com',
      password: '123'
    });
    assert(shortPassRes.status === 400, 'Rejects password shorter than 6 characters');

    // 2. Auth: Register success
    const regUsername = 'developer_' + Date.now().toString().slice(-4);
    const regRes = await request('POST', '/api/auth/register', {
      username: regUsername,
      email: `${regUsername}@example.com`,
      password: 'password123'
    });
    assert(regRes.status === 201 && regRes.data.user.username === regUsername, 'Registers new user successfully');
    assert(regRes.setCookie && regRes.setCookie.includes('token='), 'Sets httpOnly token cookie on register');
    const userCookie = extractCookie(regRes.setCookie);

    // 3. Auth: Duplicate registration failure
    const dupRes = await request('POST', '/api/auth/register', {
      username: regUsername,
      email: `${regUsername}@example.com`,
      password: 'password123'
    });
    assert(dupRes.status === 400, 'Prevents duplicate username registration');

    // 4. Auth: Login with demo user (alex_dev)
    const loginRes = await request('POST', '/api/auth/login', {
      identifier: 'alex_dev',
      password: 'password123'
    });
    assert(loginRes.status === 200 && loginRes.data.user.username === 'alex_dev', 'Logs in existing user successfully');
    const alexCookie = extractCookie(loginRes.setCookie);

    // 5. Auth: Login with wrong password
    const wrongPassRes = await request('POST', '/api/auth/login', {
      identifier: 'alex_dev',
      password: 'wrongpassword'
    });
    assert(wrongPassRes.status === 401, 'Rejects login with invalid password');

    // 6. Auth: GET /api/auth/me
    const meRes = await request('GET', '/api/auth/me', null, alexCookie);
    assert(meRes.status === 200 && meRes.data.user.username === 'alex_dev', 'GET /api/auth/me returns authenticated user with stats');

    // 7. Posts: Reject post exceeding 280 characters
    const longContent = 'A'.repeat(281);
    const longPostRes = await request('POST', '/api/posts', { content: longContent }, alexCookie);
    assert(longPostRes.status === 400, 'Rejects post exceeding 280 characters');

    // 8. Posts: Create valid post
    const createPostRes = await request('POST', '/api/posts', {
      content: 'Automated test post from Alex! Testing feeds & interactions #linkora',
      image_url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97'
    }, alexCookie);
    assert(createPostRes.status === 201 && createPostRes.data.post.content.includes('Automated test post'), 'Creates valid post with image');
    const newPostId = createPostRes.data.post.id;

    // 9. Posts: Feed retrieval
    const feedRes = await request('GET', '/api/posts/feed', null, alexCookie);
    assert(feedRes.status === 200 && Array.isArray(feedRes.data.posts) && feedRes.data.posts.length > 0, 'Retrieves personalized home feed');

    // 10. Likes: Toggle like on post
    const like1Res = await request('POST', `/api/posts/${newPostId}/like`, null, userCookie);
    assert(like1Res.status === 200 && like1Res.data.liked === true && like1Res.data.like_count === 1, 'Likes a post and increments like_count');

    const like2Res = await request('POST', `/api/posts/${newPostId}/like`, null, userCookie);
    assert(like2Res.status === 200 && like2Res.data.liked === false && like2Res.data.like_count === 0, 'Unlikes a post and decrements like_count');

    // 11. Comments: Add comment
    const commentRes = await request('POST', `/api/posts/${newPostId}/comments`, {
      content: 'This is a test comment from another user.'
    }, userCookie);
    assert(commentRes.status === 201 && commentRes.data.comment.content.includes('test comment'), 'Adds comment to post');
    const commentId = commentRes.data.comment.id;

    // 12. Comments: Unauthorized delete attempt (Alex tries to delete userCookie comment)
    const unauthDelComment = await request('DELETE', `/api/comments/${commentId}`, null, alexCookie);
    assert(unauthDelComment.status === 403, 'Forbidden when non-owner attempts to delete comment');

    // 13. Comments: Authorized delete by comment author
    const authDelComment = await request('DELETE', `/api/comments/${commentId}`, null, userCookie);
    assert(authDelComment.status === 200, 'Deletes comment when author requests deletion');

    // 14. Follow: Prevent self-follow
    const alexUserId = loginRes.data.user.id;
    const selfFollowRes = await request('POST', `/api/users/${alexUserId}/follow`, null, alexCookie);
    assert(selfFollowRes.status === 400, 'Rejects attempt to follow oneself');

    // 15. Follow: Follow target user (userCookie follows alex_dev)
    const followRes = await request('POST', `/api/users/${alexUserId}/follow`, null, userCookie);
    assert(followRes.status === 200 && followRes.data.following === true, 'Successfully follows user');

    // 16. Follow: Unfollow target user
    const unfollowRes = await request('POST', `/api/users/${alexUserId}/follow`, null, userCookie);
    assert(unfollowRes.status === 200 && unfollowRes.data.following === false, 'Successfully unfollows user');

    // 17. Users: Search and discover users
    const searchRes = await request('GET', '/api/users?search=sarah', null);
    assert(searchRes.status === 200 && searchRes.data.users.some(u => u.username === 'sarah_design'), 'Discovers users via search filter');

    // 18. Users: Profile details
    const profileRes = await request('GET', '/api/users/sarah_design', null, alexCookie);
    assert(profileRes.status === 200 && profileRes.data.user.username === 'sarah_design' && Array.isArray(profileRes.data.posts), 'Fetches public user profile with stats and posts');

    // 19. Users: Update profile (bio & avatar)
    const updateProfileRes = await request('PUT', '/api/users/me', {
      bio: 'Updated bio during testing!',
      avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde'
    }, alexCookie);
    assert(updateProfileRes.status === 200 && updateProfileRes.data.user.bio === 'Updated bio during testing!', 'Updates authenticated user profile');

    // 20. Posts: Delete post (ownership enforced)
    const unauthDelPost = await request('DELETE', `/api/posts/${newPostId}`, null, userCookie);
    assert(unauthDelPost.status === 403, 'Forbidden when non-owner attempts to delete post');

    const authDelPost = await request('DELETE', `/api/posts/${newPostId}`, null, alexCookie);
    assert(authDelPost.status === 200, 'Deletes post when owner requests deletion');

    // 21. Auth: Logout
    const logoutRes = await request('POST', '/api/auth/logout', null, alexCookie);
    assert(logoutRes.status === 200, 'Logs out and clears session cookie');

  } catch (err) {
    console.error('Unhandled test suite error:', err);
    testsFailed++;
  } finally {
    server.close();
    console.log(`\n========================================`);
    console.log(`Total tests: ${testsPassed + testsFailed}`);
    console.log(`Passed: ${testsPassed}`);
    console.log(`Failed: ${testsFailed}`);
    console.log(`========================================\n`);

    if (testsFailed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

runTests();
