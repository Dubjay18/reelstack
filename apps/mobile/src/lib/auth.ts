import * as SecureStore from 'expo-secure-store';
import type { User } from '@/types';

const TOKEN_KEY = 'rs_token';

interface JWTClaims {
  user_id: string;
  username: string;
  exp: number;
}

export function decodeToken(token: string): JWTClaims | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    
    // Custom base64 decoding to support React Native environment without atob/Buffer
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    const str = payload.replace(/-/g, '+').replace(/_/g, '/');
    let output = '';
    let buffer = 0;
    let bits = 0;
    for (let i = 0; i < str.length; i++) {
      const idx = chars.indexOf(str.charAt(i));
      if (idx >= 0) {
        buffer = (buffer << 6) | idx;
        bits += 6;
        if (bits >= 8) {
          bits -= 8;
          const byte = (buffer >> bits) & 0xff;
          output += String.fromCharCode(byte);
        }
      }
    }
    return JSON.parse(output) as JWTClaims;
  } catch (e) {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const claims = decodeToken(token);
  if (!claims) return true;
  return Date.now() / 1000 >= claims.exp;
}

export async function getStoredToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(TOKEN_KEY);
}

export async function storeToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function getCurrentUser(): Promise<Pick<User, 'id' | 'username'> | null> {
  const token = await getStoredToken();
  if (!token || isTokenExpired(token)) return null;
  const claims = decodeToken(token);
  if (!claims) return null;
  return { id: claims.user_id, username: claims.username };
}
