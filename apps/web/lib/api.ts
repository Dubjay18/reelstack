import axios, { AxiosError } from 'axios'
import { getStoredToken, clearToken } from '@/lib/auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'

class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'APIError'
  }
}

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request Interceptor to attach JWT
axiosInstance.interceptors.request.use(
  (config) => {
    const token = getStoredToken()
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response Interceptor to handle 401s and wrap errors
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ error?: string }>) => {
    if (error.response) {
      const status = error.response.status
      const message = error.response.data?.error ?? error.message

      if (status === 401) {
        const isAuthRoute = error.config?.url?.includes('/api/v1/auth/')
        if (!isAuthRoute) {
          if (typeof window !== 'undefined') {
            clearToken()
            window.location.href = '/login'
          }
          return Promise.reject(new APIError(401, 'Session expired'))
        }
      }

      return Promise.reject(new APIError(status, message))
    }
    return Promise.reject(new APIError(500, error.message || 'Network error'))
  }
)

export const api = {
  get: async <T>(path: string, _auth = false): Promise<T> => {
    const res = await axiosInstance.get<T>(path)
    return res.data
  },

  post: async <T>(path: string, body?: unknown, _auth = false): Promise<T> => {
    const res = await axiosInstance.post<T>(path, body)
    return res.data
  },

  patch: async <T>(path: string, body?: unknown, _auth = true): Promise<T> => {
    const res = await axiosInstance.patch<T>(path, body)
    return res.data
  },

  put: async <T>(path: string, body?: unknown, _auth = true): Promise<T> => {
    const res = await axiosInstance.put<T>(path, body)
    return res.data
  },

  delete: async <T>(path: string, _auth = true): Promise<T> => {
    const res = await axiosInstance.delete<T>(path)
    return res.data
  },
}

export { axiosInstance }
export { APIError }
