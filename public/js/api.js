/**
 * Centralized API client for CodeAlpha Social Media Platform
 */
const API = {
  baseUrl: '/api',

  async request(endpoint, options = {}) {
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      credentials: 'include', // Ensures httpOnly JWT cookie is transmitted
      ...options
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
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
  async getFeed(filter = '') {
    const query = filter ? `?filter=${encodeURIComponent(filter)}` : '';
    return this.request(`/posts/feed${query}`, { method: 'GET' });
  },

  async createPost(content, image_url = '') {
    return this.request('/posts', {
      method: 'POST',
      body: { content, image_url }
    });
  },

  async getPost(id) {
    return this.request(`/posts/${id}`, { method: 'GET' });
  },

  async deletePost(id) {
    return this.request(`/posts/${id}`, { method: 'DELETE' });
  },

  async toggleLike(postId) {
    return this.request(`/posts/${postId}/like`, { method: 'POST' });
  },

  // Comment Endpoints
  async getComments(postId) {
    return this.request(`/posts/${postId}/comments`, { method: 'GET' });
  },

  async addComment(postId, content) {
    return this.request(`/posts/${postId}/comments`, {
      method: 'POST',
      body: { content }
    });
  },

  async deleteComment(commentId) {
    return this.request(`/comments/${commentId}`, { method: 'DELETE' });
  },

  // User & Follow Endpoints
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

  async toggleFollow(userId) {
    return this.request(`/users/${userId}/follow`, { method: 'POST' });
  },

  async getFollowers(userId) {
    return this.request(`/users/${userId}/followers`, { method: 'GET' });
  },

  async getFollowing(userId) {
    return this.request(`/users/${userId}/following`, { method: 'GET' });
  }
};
