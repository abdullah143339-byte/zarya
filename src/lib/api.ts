const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

interface ApiOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  token?: string;
}

class ApiClient {
  private baseUrl: string;
  private refreshPromise: Promise<string | null> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getAuthHeaders(token?: string): Record<string, string> {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('novax_token') : null;
    const authToken = token || stored;
    return authToken ? { Authorization: `Bearer ${authToken}` } : {};
  }

  private isAuthEndpoint(endpoint: string): boolean {
    return /^\/auth\/(login|refresh|forgot-password|reset-password|2fa\/verify-login|password-reset|google|github)/.test(endpoint);
  }

  // Refresh the access token using the HttpOnly `novax_refresh` cookie, once per
  // burst of 401s. Returns the new token or null if the refresh failed.
  private tryRefresh(): Promise<string | null> {
    if (!this.refreshPromise) {
      this.refreshPromise = fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: '{}',
      })
        .then(async (res) => {
          if (!res.ok) return null;
          const data = await res.json();
          const token = data?.accessToken || data?.data?.accessToken || null;
          if (token) localStorage.setItem('novax_token', token);
          return token;
        })
        .catch(() => null)
        .finally(() => {
          this.refreshPromise = null;
        });
    }
    return this.refreshPromise;
  }

  async request<T = any>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {}, token } = options;

    const makeRequest = async (authToken?: string): Promise<Response> => {
      const config: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(authToken),
          ...headers,
        },
        credentials: 'include',
      };

      if (body && method !== 'GET') {
        config.body = JSON.stringify(body);
      }

      return fetch(`${this.baseUrl}${endpoint}`, config);
    };

    let response = await makeRequest(token);

    // Session expired mid-use: silently refresh once and retry the request.
    if (response.status === 401 && !this.isAuthEndpoint(endpoint) && !token) {
      const newToken = await this.tryRefresh();
      if (newToken) {
        response = await makeRequest(newToken);
      }
    }

    const data = await response.json();

    if (!response.ok || !data.success) {
      const error = new Error(data.error?.message || data.message || 'API Error');
      (error as any).status = response.status;
      (error as any).data = data;
      throw error;
    }

    return data;
  }

  async uploadFile(file: File, type: string, duration?: number) {
    const token = localStorage.getItem('novax_token');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    if (duration !== undefined) formData.append('duration', String(duration));

    const response = await fetch(`${this.baseUrl}/uploads/post-media`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
      body: formData,
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      const error = new Error(data.error?.message || data.message || 'Upload failed');
      (error as any).status = response.status;
      (error as any).data = data;
      throw error;
    }
    return data;
  }

  get<T = any>(endpoint: string, token?: string) {
    return this.request<T>(endpoint, { method: 'GET', token });
  }

  post<T = any>(endpoint: string, body?: any, token?: string) {
    return this.request<T>(endpoint, { method: 'POST', body, token });
  }

  patch<T = any>(endpoint: string, body?: any, token?: string) {
    return this.request<T>(endpoint, { method: 'PATCH', body, token });
  }

  delete<T = any>(endpoint: string, token?: string) {
    return this.request<T>(endpoint, { method: 'DELETE', token });
  }

  deleteWithBody<T = any>(endpoint: string, body?: any, token?: string) {
    return this.request<T>(endpoint, { method: 'DELETE', body, token });
  }

  // Auth
  register(data: any) { return this.post('/auth/register', data); }
  login(data: any) { return this.post('/auth/login', data); }
  verify2faLogin(tempToken: string, code: string) { return this.post('/auth/2fa/verify-login', { tempToken, code }); }
  refresh(refreshToken?: string) {
    // Prefer the HttpOnly `novax_refresh` cookie; body token kept for backward compat.
    return this.post('/auth/refresh', refreshToken ? { refreshToken } : {});
  }
  logout() { return this.post('/auth/logout'); }
  getMe() { return this.get('/auth/me'); }
  forgotPassword(email: string) { return this.post('/auth/forgot-password', { email }); }
  resetPassword(token: string, password: string) { return this.post('/auth/reset-password', { token, password }); }
  validateResetToken(token: string) { return this.get(`/auth/password-reset/validate?token=${encodeURIComponent(token)}`); }
  changePassword(currentPassword: string, newPassword: string) { return this.post('/auth/change-password', { currentPassword, newPassword }); }
  deleteAccount(password?: string) { return this.deleteWithBody('/auth/account', { password }); }
  setup2FA() { return this.post('/auth/2fa/setup'); }
  enable2FA(token: string) { return this.post('/auth/2fa/enable', { token }); }
  disable2FA(token: string) { return this.post('/auth/2fa/disable', { token }); }
  get2FAStatus() { return this.get('/auth/2fa/status'); }

  // Users
  getUserProfile(username: string) { return this.get(`/users/${username}`); }
  updateProfile(data: any) { return this.patch('/users/me', data); }
  followUser(id: string) { return this.post(`/users/${id}/follow`); }
  getFollowers(username: string, page = 1) { return this.get(`/users/${username}/followers?page=${page}`); }
  getFollowing(username: string, page = 1) { return this.get(`/users/${username}/following?page=${page}`); }
  blockUser(id: string) { return this.post(`/users/${id}/block`, {}); }
  unblockUser(id: string) { return this.delete(`/users/${id}/block`); }
  getBlockedUsers(page = 1) { return this.get(`/users/me/blocked?page=${page}`); }
  getBlockStatus(id: string) { return this.get(`/users/${id}/block-status`); }
  reportUser(id: string, reason: string, description?: string) { return this.post(`/users/${id}/report`, { reason, description }); }
  searchUsers(q: string) { return this.get(`/users/search/q?q=${encodeURIComponent(q)}`); }
  getRecommendedPeople(limit = 6) { return this.get(`/users/recommended?limit=${limit}`); }

  // Posts
  createPost(data: any) { return this.post('/posts', data); }
  getFeed(page = 1) { return this.get(`/posts/feed?page=${page}`); }
  getPost(id: string) { return this.get(`/posts/${id}`); }
  deletePost(id: string) { return this.delete(`/posts/${id}`); }
  reactToPost(id: string, type?: string) { return this.post(`/posts/${id}/react`, { type }); }
  commentOnPost(id: string, content: string, parentId?: string) { return this.post(`/posts/${id}/comment`, { content, parentId }); }
  getPostComments(id: string, page = 1) { return this.get(`/posts/${id}/comments?page=${page}`); }
  getUserPosts(userId: string, page = 1) { return this.get(`/posts/user/${userId}?page=${page}`); }

  // Stories
  getStoryFeed(page = 1) { return this.get(`/stories/feed?page=${page}`); }
  createStory(media: string, mediaType = 'IMAGE', caption?: string) { return this.post('/stories', { media, mediaType, caption }); }
  getUserStories(userId: string) { return this.get(`/stories/user/${userId}`); }
  markStoryViewed(storyId: string) { return this.post(`/stories/${storyId}/view`); }
  getStoryViews(storyId: string) { return this.get(`/stories/${storyId}/views`); }
  deleteStory(storyId: string) { return this.delete(`/stories/${storyId}`); }

  // Reels
  getReelsFeed(category: string, page = 1, limit = 8) {
    // Server filters by `type`; `category=Following` limits to followed accounts and
    // `category=Trending` sorts by reactions. Other categories use the default feed order.
    return this.get(`/posts/feed?page=${page}&limit=${limit}&type=VIDEO&category=${encodeURIComponent(category)}`);
  }
  // Public, no-auth reels feed for the landing page (guests).
  getPublicReels(page = 1, limit = 8, sort = 'trending') {
    return this.get(`/posts/reels/public?page=${page}&limit=${limit}&sort=${encodeURIComponent(sort)}`);
  }
  // TODO(backend): no comment-reaction endpoint exists yet; integrate when added.
  reactToComment(commentId: string, type = 'LIKE') { return this.post(`/comments/${commentId}/react`, { type }); }
  // TODO(backend): no comment-delete endpoint exists yet; integrate when added.
  deleteComment(postId: string, commentId: string) { return this.delete(`/posts/${postId}/comments/${commentId}`); }
  uploadFileWithProgress(file: File, type: string, duration: number | undefined, onProgress?: (pct: number) => void): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${this.baseUrl}/uploads/post-media`);
      xhr.withCredentials = true;
      const token = typeof window !== 'undefined' ? localStorage.getItem('novax_token') : null;
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300 && data.success) resolve(data);
          else reject(new Error(data.error?.message || data.message || 'Upload failed'));
        } catch { reject(new Error('Upload failed')); }
      };
      xhr.onerror = () => reject(new Error('Network error'));
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', type);
      if (duration !== undefined) fd.append('duration', String(duration));
      xhr.send(fd);
    });
  }

  // Messages
  getConversations() { return this.get('/messages/conversations'); }
  createConversation(data: any) { return this.post('/messages/conversations', data); }
  sendMessage(convId: string, content: string, type = 'TEXT', media?: any[], replyToId?: string) {
    return this.post(`/messages/conversations/${convId}/messages`, { content, type, media, replyToId });
  }
  getMessages(convId: string, page = 1) { return this.get(`/messages/conversations/${convId}/messages?page=${page}`); }

  // Bookmarks
  toggleBookmark(postId: string) { return this.post(`/posts/${postId}/bookmark`); }
  getMyBookmarks(page = 1) { return this.get(`/posts/bookmarks/mine?page=${page}`); }

  // Share
  sharePost(postId: string, platform?: string) { return this.post(`/posts/${postId}/share`, { platform }); }
  reportPost(postId: string, reason: string, description?: string) { return this.post(`/posts/${postId}/report`, { reason, description }); }
  recordPostView(postId: string) { return this.post(`/posts/${postId}/view`); }

  // Notifications
  getNotifications(page = 1) { return this.get(`/notifications?page=${page}`); }
  markNotificationRead(id: string) { return this.patch(`/notifications/${id}/read`); }
  markAllNotificationsRead() { return this.patch('/notifications/read-all'); }

  // Communities
  createCommunity(data: any) { return this.post('/communities', data); }
  getCommunities(page = 1, category?: string) { return this.get(`/communities?page=${page}${category ? `&category=${category}` : ''}`); }
  getCommunity(slug: string) { return this.get(`/communities/${slug}`); }
  joinCommunity(id: string) { return this.post(`/communities/${id}/join`); }
  leaveCommunity(id: string) { return this.delete(`/communities/${id}/leave`); }

  // Marketplace
  createMarketplaceItem(data: any) { return this.post('/marketplace', data); }
  getMarketplaceItems(page = 1, type?: string, category?: string, sellerId?: string) { return this.get(`/marketplace?page=${page}${type ? `&type=${type}` : ''}${category ? `&category=${category}` : ''}${sellerId ? `&sellerId=${sellerId}` : ''}`); }
  getMarketplaceItem(id: string) { return this.get(`/marketplace/${id}`); }
  purchaseItem(id: string) { return this.post(`/marketplace/${id}/purchase`); }

  // AI
  createAIConversation(title?: string) { return this.post('/ai/conversations', { title }); }
  getAIConversations() { return this.get('/ai/conversations'); }
  sendAIMessage(convId: string, content: string) { return this.post(`/ai/conversations/${convId}/messages`, { content }); }
  getAIMessages(convId: string, page = 1) { return this.get(`/ai/conversations/${convId}/messages?page=${page}`); }

  // Search
  globalSearch(q: string, type?: string) { return this.get(`/search?q=${encodeURIComponent(q)}${type ? `&type=${type}` : ''}`); }
  getTrendingTags() { return this.get('/search/trending-tags'); }
  getSearchSuggestions(q: string) { return this.get(`/search/suggestions?q=${encodeURIComponent(q)}`); }

  // Reputation
  getLeaderboard(limit = 20) { return this.get(`/reputation/leaderboard?limit=${limit}`); }
  getUserReputation(userId: string) { return this.get(`/reputation/${userId}`); }

  // Wallet
  getWallet() { return this.get('/wallet'); }
  getWalletTransactions(page = 1) { return this.get(`/wallet/transactions?page=${page}`); }

  // RAG
  ragQuery(query: string) { return this.post('/rag/query', { query }); }
  getRAGStats() { return this.get('/rag/stats'); }

  // AI Router
  aiRouteTask(task: string, complexity = 'medium') { return this.get(`/security/ai/route?task=${encodeURIComponent(task)}&complexity=${encodeURIComponent(complexity)}`); }
  getRouterInfo() { return this.get('/ai-router/info'); }
  aiChat(messages: any[], temperature?: number) { return this.post('/ai-router/chat', { messages, temperature }); }
  aiGenerateImage(prompt: string, style?: string) { return this.post('/ai-router/image', { prompt, style }); }

  aiGenerateCode(prompt: string, language?: string, task?: string) { return this.post('/ai-router/code', { prompt, language, task }); }
  aiTranslate(text: string, targetLanguage: string, sourceLanguage?: string) { return this.post('/ai-router/translate', { text, targetLanguage, sourceLanguage }); }
  aiDetectLanguage(text: string) { return this.get(`/ai-router/translate/detect?text=${encodeURIComponent(text)}`); }
  aiDeepSearch(query: string, depth?: string) { return this.post('/ai-router/search', { query, depth }); }
  aiAutoRoute(input: string, type?: string) { return this.post('/ai-router/auto', { input, type }); }
  // Security / Audit
  getAuditLogs(page = 1) { return this.get(`/security/audit-logs?page=${page}`); }

  // Admin
  adminGetAllUsers(page = 1, limit = 50) { return this.get(`/admin/users?page=${page}&limit=${limit}`); }
  adminDeleteUser(userId: string) { return this.delete(`/admin/users/${userId}`); }
  adminBanUser(userId: string) { return this.post(`/admin/users/${userId}/ban`); }
  adminUnbanUser(userId: string) { return this.post(`/admin/users/${userId}/unban`); }
  adminSuspendUser(userId: string) { return this.post(`/admin/users/${userId}/suspend`); }
  adminWarnUser(userId: string, reason?: string) { return this.post(`/admin/users/${userId}/warn`, { reason }); }
  adminUpdateUserRole(userId: string, role: string) { return this.patch(`/admin/users/${userId}/role`, { role }); }
  adminGetRoles() { return this.get('/admin/roles'); }
  adminGetAllPosts(page = 1, limit = 50) { return this.get(`/admin/posts?page=${page}&limit=${limit}`); }
  adminDeletePost(postId: string) { return this.delete(`/admin/posts/${postId}`); }
  adminPublishPost(postId: string) { return this.post(`/admin/posts/${postId}/publish`); }
  adminGetReels(page = 1, limit = 50) { return this.get(`/admin/reels?page=${page}&limit=${limit}`); }
  adminGetStories(page = 1, limit = 50) { return this.get(`/admin/stories?page=${page}&limit=${limit}`); }
  adminGetComments(page = 1, limit = 50) { return this.get(`/admin/comments?page=${page}&limit=${limit}`); }
  adminDeleteComment(commentId: string) { return this.delete(`/admin/comments/${commentId}`); }
  adminGetReports(page = 1, limit = 50) { return this.get(`/admin/reports?page=${page}&limit=${limit}`); }
  adminResolveReport(reportId: string, resolution?: string) { return this.post(`/admin/reports/${reportId}/resolve`, { resolution }); }
  adminDismissReport(reportId: string) { return this.post(`/admin/reports/${reportId}/dismiss`); }
  adminGetAllCommunities(page = 1, limit = 50) { return this.get(`/admin/communities?page=${page}&limit=${limit}`); }
  adminDeleteCommunity(communityId: string) { return this.delete(`/admin/communities/${communityId}`); }
  adminGetMarketplaceItems(page = 1, limit = 50) { return this.get(`/admin/marketplace?page=${page}&limit=${limit}`); }
  adminUpdateItemStatus(itemId: string, status: string) { return this.patch(`/admin/marketplace/${itemId}/status`, { status }); }
  adminToggleItemFeatured(itemId: string) { return this.post(`/admin/marketplace/${itemId}/feature`); }
  adminGetOrders(page = 1, limit = 50) { return this.get(`/admin/orders?page=${page}&limit=${limit}`); }
  adminUpdateOrderStatus(orderId: string, status: string) { return this.patch(`/admin/orders/${orderId}/status`, { status }); }
  adminGetReviews(page = 1, limit = 50) { return this.get(`/admin/reviews?page=${page}&limit=${limit}`); }
  adminDeleteReview(reviewId: string) { return this.delete(`/admin/reviews/${reviewId}`); }
  adminGetMessagesOverview(page = 1, limit = 50) { return this.get(`/admin/messages?page=${page}&limit=${limit}`); }
  adminGetAiOverview() { return this.get('/admin/ai/overview'); }
  adminGetAnalyticsOverview(days = 30) { return this.get(`/admin/analytics/overview?days=${days}`); }
  adminGetFinancials() { return this.get('/admin/financials'); }
  adminGetSecurityEvents(page = 1, limit = 50) { return this.get(`/admin/security/events?page=${page}&limit=${limit}`); }
  adminResolveSecurityEvent(eventId: string) { return this.post(`/admin/security/events/${eventId}/resolve`); }
  adminBroadcastNotification(title: string, body?: string) { return this.post('/admin/notifications/broadcast', { title, body }); }
  adminGetHealth() { return this.get('/admin/health'); }
  adminGetAllAuditLogs(page = 1, limit = 50) { return this.get(`/admin/audit-logs?page=${page}&limit=${limit}`); }
  adminGetSystemStats() { return this.get('/admin/stats'); }

  // Learning Hub
  getLearningState() { return this.get('/learning/state'); }
  createLearning(resource: string, data: any) { return this.post(`/learning/${resource}`, data); }
  updateLearning(resource: string, id: string, data: any) { return this.patch(`/learning/${resource}/${id}`, data); }
  trashLearning(resource: string, id: string) { return this.delete(`/learning/${resource}/${id}`); }
  restoreLearning(resource: string, id: string) { return this.post(`/learning/${resource}/${id}/restore`); }
  deleteLearningForever(resource: string, id: string) { return this.delete(`/learning/${resource}/${id}/permanent`); }
  toggleLearningBookmark(refType: string, refId: string) { return this.post('/learning/bookmarks', { refType, refId }); }
  removeLearningBookmark(refType: string, refId: string) { return this.delete(`/learning/bookmarks?refType=${encodeURIComponent(refType)}&refId=${encodeURIComponent(refId)}`); }
  trackStudySession(minutes: number, date?: string) { return this.post('/learning/sessions', { minutes, date }); }
  resetLearning() { return this.post('/learning/reset'); }
}

export const api = new ApiClient(API_BASE);
export default api;
