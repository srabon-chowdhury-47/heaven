// client/src/api/user.js
import axios from './axios';

export const userService = {
  // Get all users (admin only)
  getUsers: async (params = {}) => {
    const response = await axios.get('/users/users/', { params });
    return response.data;
  },

  // Get user by ID
  getUser: async (id) => {
    const response = await axios.get(`/users/users/${id}/`);
    return response.data;
  },

  // Create new user (admin only)
  createUser: async (userData) => {
    const response = await axios.post('/users/users/', userData);
    return response.data;
  },

  // Update user (admin only)
  updateUser: async (id, userData) => {
    const response = await axios.put(`/users/users/${id}/`, userData);
    return response.data;
  },

  // Partial update user
  partialUpdateUser: async (id, userData) => {
    const response = await axios.patch(`/users/users/${id}/`, userData);
    return response.data;
  },

  // Delete user (admin only)
  deleteUser: async (id) => {
    const response = await axios.delete(`/users/users/${id}/`);
    return response.data;
  },

  // Toggle user active status (admin only)
  toggleUserActive: async (id) => {
    const response = await axios.post(`/users/users/${id}/toggle_active/`);
    return response.data;
  },

  // Get current user profile
  getCurrentUser: async () => {
    const response = await axios.get('/users/users/me/');
    return response.data;
  },

  // Update current user profile
  updateCurrentUser: async (userData) => {
    const response = await axios.put('/users/users/update_profile/', userData);
    return response.data;
  },

  // Change password
  changePassword: async (passwordData) => {
    const response = await axios.post('/users/users/change_password/', passwordData);
    return response.data;
  },

  // Get user count
  getUserCount: async () => {
    const response = await axios.get('/users/users/count/');
    return response.data;
  },

  // Login
  login: async (credentials) => {
    const response = await axios.post('/users/auth/login/', credentials);
    if (response.data.tokens) {
      localStorage.setItem('access_token', response.data.tokens.access);
      localStorage.setItem('refresh_token', response.data.tokens.refresh);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  // Logout
  logout: async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      try {
        await axios.post('/users/auth/logout/', { refresh_token: refreshToken });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  },

  // Refresh token
  refreshToken: async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) throw new Error('No refresh token available');
    
    const response = await axios.post('/users/auth/refresh/', {
      refresh: refreshToken
    });
    
    if (response.data.access) {
      localStorage.setItem('access_token', response.data.access);
    }
    return response.data;
  },

  // Check if user is admin
  isAdmin: () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.is_superuser === true;
  },

  // Get current user from storage
  getCurrentUserFromStorage: () => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return null;
    }
  }
};