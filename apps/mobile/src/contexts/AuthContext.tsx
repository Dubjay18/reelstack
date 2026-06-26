import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser, storeToken, clearToken, getStoredToken } from '@/lib/auth';
import type { User } from '@/types';
import { router } from 'expo-router';

interface AuthContextType {
  user: Pick<User, 'id' | 'username'> | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Pick<User, 'id' | 'username'> | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStoredAuth() {
      try {
        const storedToken = await getStoredToken();
        if (storedToken) {
          const currentUser = await getCurrentUser();
          if (currentUser) {
            setUser(currentUser);
            setToken(storedToken);
          } else {
            // Token expired or invalid
            await clearToken();
          }
        }
      } catch (e) {
        console.error('Failed to load auth token', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadStoredAuth();
  }, []);

  const login = async (newToken: string) => {
    await storeToken(newToken);
    const currentUser = await getCurrentUser();
    setUser(currentUser);
    setToken(newToken);
  };

  const logout = async () => {
    await clearToken();
    setUser(null);
    setToken(null);
    router.replace('/');
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
