// TASK-042 — Auth context + useAuth() hook
'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { getCurrentUser, clearToken } from '@/lib/auth'
import type { User } from '@/types'

interface AuthContextValue {
  user: Pick<User, 'id' | 'username'> | null
  isLoading: boolean
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Pick<User, 'id' | 'username'> | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setUser(getCurrentUser())
    setIsLoading(false)
  }, [])

  const logout = () => {
    clearToken()
    setUser(null)
    window.location.href = '/'
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
