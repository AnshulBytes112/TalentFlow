import axios from 'axios';
import { signOut } from 'next-auth/react';
import { clearAccessToken, getAccessToken } from '@/lib/authToken';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add authorization header
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      clearAccessToken();
      // Token expired or invalid: clear NextAuth session and redirect to login.
      if (typeof window !== 'undefined') {
        void signOut({ callbackUrl: '/login' });
      }
    }
    return Promise.reject(error);
  }
);

export default api;
