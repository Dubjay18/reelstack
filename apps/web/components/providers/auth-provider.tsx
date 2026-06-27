// TASK-042 — Auth context + useAuth() hook
'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { getCurrentUser, clearToken, storeToken } from '@/lib/auth'
import type { User } from '@/types'

interface AuthContextValue {
  user: Pick<User, 'id' | 'username'> | null
  isLoading: boolean
  login: (token: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: any }) {
  const [user, setUser] = useState<Pick<User, 'id' | 'username'> | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setUser(getCurrentUser())
    setIsLoading(false)
  }, [])

  const login = (newToken: string) => {
    storeToken(newToken)
    setUser(getCurrentUser())
  }

  const logout = () => {
    clearToken()
    setUser(null)
    window.location.href = '/'
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
