/**
 * Centralized API client for Linkora Social Media Platform
 * Connect. Share. Grow.
 */
const API = {
  baseUrl: '/api',

  async request(endpoint, options = {}) {
    const isFormData = options.body instanceof FormData;
    const config = {
      credentials: 'include', // Transmit httpOnly JWT cookie
      ...options
    };

    if (!isFormData) {
      config.headers = {
        'Content-Type': 'application/json',
        ...options.headers
      };
      if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
      }
    } else {
      config.headers = {
        ...options.headers
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, config);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err);
      throw err;
    }
  },

  // Auth Endpoints
  async register(username, email, password) {
    return this.request('/auth/register', {
      method: 'POST',
      body: { username, email, password }
    });
  },

  async login(identifier, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: { identifier, password }
    });
  },

  async logout() {
    return this.request('/auth/logout', { method: 'POST' });
  },

  async getMe() {
    return this.request('/auth/me', { method: 'GET' });
  },

  // Post Endpoints
  async getFeed(filter = '', cursor = null, limit = 20) {
    let query = `?filter=${encodeURIComponent(filter)}&limit=${limit}`;
    if (cursor) query += `&cursor=${cursor}`;
    return this.request(`/posts/feed${query}`, { method: 'GET' });
  },

  async createPost(postData, legacyImageUrl = '') {
    // Supports both old signature createPost(content, image_url) and new createPost({ content, media_urls, poll, visibility })
    if (typeof postData === 'string') {
      return this.request('/posts', {
        method: 'POST',
        body: { content: postData, image_url: legacyImageUrl }
      });
    }
    return this.request('/posts', {
      method: 'POST',
      body: postData
    });
  },

  async getPost(id) {
    return this.request(`/posts/${id}`, { method: 'GET' });
  },

  async editPost(id, content) {
    return this.request(`/posts/${id}`, {
      method: 'PUT',
      body: { content }
    });
  },

  async deletePost(id) {
    return this.request(`/posts/${id}`, { method: 'DELETE' });
  },

  async toggleLike(postId) {
    return this.request(`/posts/${postId}/like`, { method: 'POST' });
  },

  async toggleBookmark(postId) {
    return this.request(`/posts/${postId}/bookmark`, { method: 'POST' });
  },

  async toggleRepost(postId, quote = null) {
    return this.request(`/posts/${postId}/repost`, {
      method: 'POST',
      body: { quote }
    });
  },

  async togglePin(postId) {
    return this.request(`/posts/${postId}/pin`, { method: 'POST' });
  },

  async votePoll(postId, optionId) {
    return this.request(`/posts/${postId}/poll/vote`, {
      method: 'POST',
      body: { option_id: optionId }
    });
  },

  async reportPost(postId, reason, details = '') {
    return this.request(`/posts/${postId}/report`, {
      method: 'POST',
      body: { reason, details }
    });
  },

  // Upload Endpoint (multer)
  async uploadImages(formData) {
    return this.request('/upload', {
      method: 'POST',
      body: formData
    });
  },

  // Comment Endpoints
  async getComments(postId, sort = 'newest') {
    return this.request(`/posts/${postId}/comments?sort=${encodeURIComponent(sort)}`, { method: 'GET' });
  },

  async addComment(postId, content, parentId = null) {
    return this.request(`/posts/${postId}/comments`, {
      method: 'POST',
      body: { content, parent_id: parentId }
    });
  },

  async editComment(commentId, content) {
    return this.request(`/comments/${commentId}`, {
      method: 'PUT',
      body: { content }
    });
  },

  async deleteComment(commentId) {
    return this.request(`/comments/${commentId}`, { method: 'DELETE' });
  },

  async toggleCommentLike(commentId) {
    return this.request(`/comments/${commentId}/like`, { method: 'POST' });
  },

  // User & Safety Endpoints
  async getUserProfile(username) {
    return this.request(`/users/${encodeURIComponent(username)}`, { method: 'GET' });
  },

  async updateProfile(bio, avatar_url) {
    return this.request('/users/me', {
      method: 'PUT',
      body: { bio, avatar_url }
    });
  },

  async discoverUsers(search = '') {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.request(`/users${query}`, { method: 'GET' });
  },

  async getSuggestedUsers() {
    return this.request('/users?suggested=true', { method: 'GET' });
  },

  async getTrendingHashtags() {
    return this.request('/posts/trending/hashtags', { method: 'GET' });
  },

  async toggleFollow(userId) {
    return this.request(`/users/${userId}/follow`, { method: 'POST' });
  },

  async followUser(userId) {
    return this.toggleFollow(userId);
  },

  async toggleMute(userId) {
    return this.request(`/users/${userId}/mute`, { method: 'POST' });
  },

  async toggleBlock(userId) {
    return this.request(`/users/${userId}/block`, { method: 'POST' });
  },

  async getFollowers(userId) {
    return this.request(`/users/${userId}/followers`, { method: 'GET' });
  },

  async getFollowing(userId) {
    return this.request(`/users/${userId}/following`, { method: 'GET' });
  }
};
