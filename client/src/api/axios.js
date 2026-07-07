// client/src/api/axios.js
import axios from 'axios';

// Vite automatically sets import.meta.env.DEV to true when you run 'npm run dev'
// and false when you build for production ('npm run build')
const isLocal = import.meta.env.DEV;

// Dynamically assign the URL based on the environment
const API_BASE_URL = isLocal 
    ? 'http://127.0.0.1:8000/api/'          // Local development backend
    : 'https://heavenautos.com.bd/api/';    // Live production backend

// Create a custom instance
const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 5000,
    headers: {
        'Content-Type': 'application/json',
        accept: 'application/json',
    },
});

// Flag to track if token refresh is in progress
let isRefreshing = false;
// Queue to hold failed requests while refreshing
let failedQueue = [];

// Process queued requests
const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// Intercept requests to automatically add the JWT token if it exists
axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle token refresh
axiosInstance.interceptors.response.use(
    (response) => {
        // If response is successful, just return it
        return response;
    },
    async (error) => {
        const originalRequest = error.config;
        
        // If error is not 401 or request already retried, reject
        if (error.response?.status !== 401 || originalRequest._retry) {
            return Promise.reject(error);
        }

        // If refresh token doesn't exist, reject and redirect to login
        if (!localStorage.getItem('refresh_token')) {
            // Clear any existing tokens
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');
            
            // Redirect to login if not already there
            if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
                window.location.href = '/login';
            }
            return Promise.reject(error);
        }

        // If token refresh is already in progress, queue the request
        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                failedQueue.push({ resolve, reject });
            })
            .then(token => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return axiosInstance(originalRequest);
            })
            .catch(err => {
                return Promise.reject(err);
            });
        }

        // Start token refresh
        originalRequest._retry = true;
        isRefreshing = true;

        try {
            const refreshToken = localStorage.getItem('refresh_token');
            
            // Call the refresh endpoint
            const response = await axios.post(`${API_BASE_URL}users/auth/refresh/`, {
                refresh: refreshToken
            });

            const newToken = response.data.access;
            
            // Store new token
            localStorage.setItem('access_token', newToken);
            
            // Update authorization header
            axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
            originalRequest.headers.Authorization = `Bearer ${newToken}`;

            // Process queued requests with the new token
            processQueue(null, newToken);
            
            // Retry the original request with new token
            return axiosInstance(originalRequest);
        } catch (refreshError) {
            // Refresh token failed - force logout
            processQueue(refreshError, null);
            
            // Clear tokens
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');
            
            // Redirect to login
            if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
                window.location.href = '/login';
            }
            
            return Promise.reject(refreshError);
        } finally {
            isRefreshing = false;
        }
    }
);

export default axiosInstance;