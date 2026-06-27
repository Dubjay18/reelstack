import axios, { AxiosError } from 'axios';
import Constants from 'expo-constants';
import { getStoredToken, clearToken } from '@/lib/auth';
import { router } from 'expo-router';

// Retrieve dynamic API url configured in app.config.js
const API_URL = Constants.expoConfig?.extra?.apiUrl ?? 'https://reelstack-bv9f.onrender.com';

export class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'APIError';
  }
}

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor to fetch and attach JWT securely
axiosInstance.interceptors.request.use(
  async (config) => {
    const token = await getStoredToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor to intercept global 401 Session Expired events
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ error?: string }>) => {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.error ?? error.message;

      if (status === 401) {
        const isAuthRoute = error.config?.url?.includes('/api/v1/auth/');
        if (!isAuthRoute) {
          await clearToken();
          // Redirect to auth stack root
          router.replace('/(auth)/login');
          return Promise.reject(new APIError(401, 'Session expired'));
        }
      }

      return Promise.reject(new APIError(status, message));
    }
    return Promise.reject(new APIError(500, error.message || 'Network error'));
  }
);

export const api = {
  get: async <T>(path: string): Promise<T> => {
    const res = await axiosInstance.get<T>(path);
    return res.data;
  },

  post: async <T>(path: string, body: unknown): Promise<T> => {
    const res = await axiosInstance.post<T>(path, body);
    return res.data;
  },

  patch: async <T>(path: string, body: unknown): Promise<T> => {
    const res = await axiosInstance.patch<T>(path, body);
    return res.data;
  },

  put: async <T>(path: string, body: unknown): Promise<T> => {
    const res = await axiosInstance.put<T>(path, body);
    return res.data;
  },

  delete: async <T>(path: string): Promise<T> => {
    const res = await axiosInstance.delete<T>(path);
    return res.data;
  },
};

export { axiosInstance };
export default api;
