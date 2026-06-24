// Client-side auth helpers — JWT decode + storage.
// No API calls needed: username and user_id live in JWT claims.

import type { User } from '@/types'

interface JWTClaims {
  user_id: string
  username: string
  exp: number
}

export function decodeToken(token: string): JWTClaims | null {
  try {
    const payload = token.split('.')[1]
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decoded) as JWTClaims
  } catch {
    return null
  }
}

export function isTokenExpired(token: string): boolean {
  const claims = decodeToken(token)
  if (!claims) return true
  return Date.now() / 1000 >= claims.exp
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('rs_token')
}

export function storeToken(token: string): void {
  localStorage.setItem('rs_token', token)
}

export function clearToken(): void {
  localStorage.removeItem('rs_token')
}

export function getCurrentUser(): Pick<User, 'id' | 'username'> | null {
  const token = getStoredToken()
  if (!token || isTokenExpired(token)) return null
  const claims = decodeToken(token)
  if (!claims) return null
  return { id: claims.user_id, username: claims.username }
}
