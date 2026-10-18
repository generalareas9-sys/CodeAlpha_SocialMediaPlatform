<p align="center">
  <img src="public/assets/logo.svg" alt="Linkora Logo" width="220" />
</p>

<p align="center">
  <strong>Connect. Share. Grow.</strong><br>
  A modern, minimalist full-stack social media platform for builders and creators.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18+-4338CA?logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-4.21-4F46E5?logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/SQLite-better--sqlite3-003B57?logo=sqlite&logoColor=white" alt="SQLite" />
  <img src="https://img.shields.io/badge/Auth-JWT%20%2B%20httpOnly-10B981" alt="Auth" />
  <img src="https://img.shields.io/badge/Design-Inter%20%2B%20theme.css-6366F1" alt="Design" />
</p>

---

## Overview

**Linkora** is a refined, high-performance social media application designed without client framework overhead. Built using vanilla HTML, CSS (`theme.css`), and JavaScript, served directly by Express.js with a lightning-fast SQLite backend (`better-sqlite3`).

It features a calm, deep dark surface palette (#0F172A), an accessible light/dark theme switch, consistent typography with Inter, real-time optimistic interactions, and complete session security via JWT in `httpOnly` cookies.

---

## Key Features

1. **Identity & Authentication**
   - User registration with unique username/email constraints and password validation.
   - Secure password hashing with `bcryptjs`.
   - `httpOnly` cookie JWT sessions with automatic expiration and cross-site scripting mitigation.
   - Show/hide password toggles and instant inline validation feedback.
   - Quick one-click demo login accounts for immediate testing.

2. **Feeds & Content Creation**
   - 280-character post composer with real-time character counter and optional image attachment preview.
   - Post button states: disabled when empty, enabled when text is present, turns red near the 280-character threshold.
   - Chronological personalized feed (posts from followed creators + your own) with "Explore All" toggle.
   - Share button to copy direct post link with instant toast feedback.
   - Contextual "..." menu with owner-only post deletion (cascades to comments and likes).

3. **Engagements & Interactions**
   - Optimistic UI for like/unlike toggling with instant feedback and automatic rollback on network failure.
   - In-place expandable comments drawer with author avatars, relative timestamps, and owner deletion.
   - Correct pluralization everywhere ("1 follower", "2 followers", "1 post", "1 comment").

4. **Follow System & Creator Discovery**
   - Accurate Follow/Following status sourced from the SQLite `follows` table.
   - "Suggested Creators" sidebar that intelligently excludes yourself and creators you already follow.
   - Discover page with debounced search by username or bio.
   - Interactive follower and following lists accessible from any profile.

5. **Profile Dashboard & Customization**
   - Customizable bio and image avatar URL with live preview modal.
   - Comprehensive user statistics (posts count, follower count, following count).
   - Public profile viewer with stream of author's posts.

6. **Design System & Aesthetics**
   - Single CSS design system (`public/css/theme.css`) with standard spacing scale (4, 8, 12, 16, 24, 32, 48), radius, and elevation tokens.
   - Light/Dark theme toggle with preference persistence in `localStorage` and `prefers-color-scheme` support.
   - Modern Lucide SVG icon set and clean typography powered by Inter.
   - Shimmer loading skeletons and empty states with friendly guidance.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | Vanilla HTML5, Vanilla JavaScript (ES6+), `theme.css` design system |
| **Icons & Typography** | Lucide SVG icons, Inter (Google Fonts) |
| **Backend** | Node.js, Express.js (REST API) |
| **Database** | SQLite via `better-sqlite3` (foreign keys enabled, WAL mode) |
| **Authentication** | JSON Web Tokens (JWT) stored in `httpOnly` cookies, `bcryptjs` |
| **Validation** | `express-validator` |

---

## Project Structure

```
CodeAlpha_SocialMediaPlatform/
├── server.js               # Express application entry point & routing
├── package.json            # Linkora package definition & dependencies
├── test-api.js             # Automated API integration test suite
├── generate-assets.js      # Brand asset generator (SVG, PNG, ICO)
├── .env.example            # Environment template
├── .gitignore              # Git ignore rules
├── README.md               # Documentation & setup guide
├── db/
│   ├── database.js         # SQLite connection with WAL mode & foreign keys
│   ├── schema.sql          # Tables, constraints, & indexes
│   └── seed.js             # Demo accounts and initial community data
├── middleware/
│   ├── auth.js             # JWT extraction from httpOnly cookies
│   └── validate.js         # express-validator result handler
├── routes/
│   ├── auth.js             # /api/auth (register, login, logout, me)
│   ├── users.js            # /api/users (profile, follow toggle, search, suggestions)
│   ├── posts.js            # /api/posts (feed, create, get, delete, like, comments)
│   └── comments.js         # /api/comments (delete comment)
└── public/
    ├── index.html          # Feed & Post Composer
    ├── login.html          # Sign In page
    ├── register.html       # Create Account page
    ├── profile.html        # Profile & bio editor
    ├── discover.html       # Creator discovery & search
    ├── assets/             # Brand logos, favicons, touch icons, OG image
    ├── css/
    │   └── theme.css       # Unified design system & light/dark tokens
    └── js/
        ├── api.js          # Centralized fetch API client
        ├── utils.js        # Theme manager, toast notifications, pluralization
        ├── nav.js          # Navbar, theme toggle, avatar dropdown, footer
        ├── feed.js         # Feed controller & composer
        ├── profile.js      # Profile views & edit modals
        ├── discover.js     # Creator search & follow actions
        └── auth.js         # Login/register handlers & password reveal
```

---

## Getting Started

### 1. Prerequisites
- **Node.js** (v18.x or later)
- **npm** (v9.x or later)

### 2. Setup & Installation
```bash
# Clone the repository
git clone https://github.com/your-username/CodeAlpha_SocialMediaPlatform.git
cd CodeAlpha_SocialMediaPlatform

# Install dependencies
npm install

# Seed the database with demo accounts and content
npm run seed

# Start the application
npm start
```

Visit **[http://localhost:5000](http://localhost:5000)** in your browser.

For local development with file watching:
```bash
npm run dev
```

---

## Demo Accounts

You can test immediately using any of the pre-configured accounts (click on any chip on the login page):

| Username | Email | Password | Role |
| :--- | :--- | :--- | :--- |
| **`alex_dev`** | `alex@linkora.dev` | `password123` | Full-stack Engineer |
| **`sarah_design`** | `sarah@linkora.dev` | `password123` | Product & UI Designer |
| **`marcus_tech`** | `marcus@linkora.dev` | `password123` | Cloud Architect & DevOps |

---

## REST API Endpoints

All endpoints are mounted under `/api`.

### Authentication (`/api/auth`)
- `POST /api/auth/register` - Create a new user account
- `POST /api/auth/login` - Authenticate and set `httpOnly` cookie
- `POST /api/auth/logout` - Clear session cookie
- `GET /api/auth/me` - Get current session profile & statistics

### Users & Relationships (`/api/users`)
- `GET /api/users?search=` - Search creators by username or bio
- `GET /api/users?suggested=true` - Get suggested creators (excludes self and already-followed users)
- `GET /api/users/:username` - Get user profile, statistics, and posts
- `PUT /api/users/me` - Update current user's bio and avatar URL
- `POST /api/users/:id/follow` - Toggle follow/unfollow
- `GET /api/users/:id/followers` - List followers for a user
- `GET /api/users/:id/following` - List creators followed by a user

### Posts & Interactions (`/api/posts`)
- `GET /api/posts/feed?filter=` - Get personalized feed (`all` for global)
- `POST /api/posts` - Create post (max 280 chars, optional image URL)
- `GET /api/posts/:id` - Fetch single post details
- `DELETE /api/posts/:id` - Delete post (author only)
- `POST /api/posts/:id/like` - Toggle like on post

### Comments (`/api/posts/:id/comments` & `/api/comments`)
- `GET /api/posts/:id/comments` - Fetch comments for a post
- `POST /api/posts/:id/comments` - Add comment to post
- `DELETE /api/comments/:id` - Delete comment (author only)

---

## Automated Tests

Run the complete integration suite:
```bash
npm test
```

Verifies authentication flows, 280-char limits, like/follow mechanics, cascade deletions, and ownership rules.

---

## Screenshots

<p align="center">
  <em>Screenshots placeholder - Dark and Light modes of Linkora Feed, Profile, and Discover pages.</em>
</p>

---

## License

MIT License. Designed and maintained for the CodeAlpha Social Media Platform project.
