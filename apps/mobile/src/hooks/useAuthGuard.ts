import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export function useAuthGuard({ required = true }: { required?: boolean } = {}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (required && !isLoading && !user) {
      router.replace('/(auth)/login');
    }
  }, [user, isLoading, required]);

  if (!required) {
    return { isAuthorized: !isLoading };
  }

  return { isAuthorized: !isLoading && !!user };
}
