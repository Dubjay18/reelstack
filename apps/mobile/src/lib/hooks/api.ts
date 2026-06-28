import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { User, List, ListItem, SearchResult, StreamingProvider, Movie, TVShow, Notification } from '@/types';

// Auth Input Types
export interface LoginCredentials {
  email: string;
  password?: string;
}

export interface RegisterCredentials {
  email: string;
  username: string;
  password?: string;
}

// 1. Auth Hooks
export function useLogin() {
  const { login } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const data = await api.post<{ success: boolean; token: string }>('/api/v1/auth/login', credentials);
      if (data.token) {
        await login(data.token);
        // Reset query caches
        queryClient.clear();
      }
      return data;
    },
  });
}

export function useRegister() {
  const { login } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (credentials: RegisterCredentials) => {
      const data = await api.post<{ success: boolean; token: string; user: User }>('/api/v1/auth/register', credentials);
      if (data.token) {
        await login(data.token);
        queryClient.clear();
      }
      return data;
    },
  });
}

// 2. Profile Hooks
export function usePublicProfile(username: string) {
  return useQuery({
    queryKey: ['profile', username],
    queryFn: () => api.get<{
      id: string;
      username: string;
      avatar_url: string | null;
      bio: string | null;
      public_links: List[];
      item_count: number;
      followers_count: number;
      following_count: number;
    }>(`/api/v1/users/${username}`),
    enabled: !!username,
  });
}

export interface UpdateProfileInput {
  username?: string;
  bio?: string;
  avatar_url?: string;
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { login } = useAuth();
  return useMutation({
    mutationFn: async (body: UpdateProfileInput) => {
      const data = await api.put<{ success: boolean; user: User; token: string }>('/api/v1/users/profile', body);
      if (data.token) {
        await login(data.token);
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

export function useCheckUsernameAvailability(username: string) {
  return useQuery({
    queryKey: ['username-availability', username],
    queryFn: () => api.get<{ available: boolean; error?: string }>(`/api/v1/users/check-username?username=${encodeURIComponent(username)}`),
    enabled: !!username && username.trim().length >= 3,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

// 3. Lists Hooks
export function useUserLists() {
  return useQuery({
    queryKey: ['lists'],
    queryFn: () => api.get<List[]>('/api/v1/lists'),
  });
}

export function useListDetail(id: string) {
  return useQuery({
    queryKey: ['lists', id],
    queryFn: () => api.get<List>(`/api/v1/lists/${id}`),
    enabled: !!id,
  });
}

export function useCreateList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<List>) => api.post<List>('/api/v1/lists', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
    },
  });
}

export function useUpdateList(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<List>) => api.put<List>(`/api/v1/lists/${id}`, body),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      queryClient.setQueryData(['lists', id], data);
    },
  });
}

export function useDeleteList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/v1/lists/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
    },
  });
}

// 4. List Items Hooks
export function useListItems(listId: string) {
  return useQuery({
    queryKey: ['list-items', listId],
    queryFn: () => api.get<ListItem[]>(`/api/v1/lists/${listId}/items`),
    enabled: !!listId,
  });
}

export function useAddListItem(listId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<ListItem>) => api.post<ListItem>(`/api/v1/lists/${listId}/items`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list-items', listId] });
      queryClient.invalidateQueries({ queryKey: ['lists', listId] });
    },
  });
}

export function useUpdateListItem(listId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, body }: { itemId: string; body: Partial<ListItem> }) =>
      api.put<ListItem>(`/api/v1/lists/${listId}/items/${itemId}`, body),
    // Implement Optimistic Updates for premium UX on mobile
    onMutate: async ({ itemId, body }) => {
      await queryClient.cancelQueries({ queryKey: ['list-items', listId] });
      const previousItems = queryClient.getQueryData<ListItem[]>(['list-items', listId]);

      if (previousItems) {
        queryClient.setQueryData<ListItem[]>(
          ['list-items', listId],
          previousItems.map((item) =>
            item.id === itemId ? { ...item, ...body } : item
          )
        );
      }

      return { previousItems };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(['list-items', listId], context.previousItems);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['list-items', listId] });
      queryClient.invalidateQueries({ queryKey: ['lists', listId] });
    },
  });
}

export function useDeleteListItem(listId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => api.delete<void>(`/api/v1/lists/${listId}/items/${itemId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list-items', listId] });
      queryClient.invalidateQueries({ queryKey: ['lists', listId] });
    },
  });
}

// 5. Content Hooks
export function useSearchContent(query: string) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: () => api.get<SearchResult[]>(`/api/v1/content/search?query=${encodeURIComponent(query)}`),
    enabled: !!query && query.trim().length > 0,
  });
}

export function useTrendingContent() {
  return useQuery({
    queryKey: ['trending'],
    queryFn: () => api.get<SearchResult[]>('/api/v1/content/trending'),
    staleTime: 60 * 60 * 1000, // 1 hour — matches Redis cache TTL
  });
}

export function useStreamingAvailability(mediaType: string, tmdbId: number, country = 'US') {
  return useQuery({
    queryKey: ['streaming', mediaType, tmdbId, country],
    queryFn: () => api.get<StreamingProvider[]>(`/api/v1/content/${mediaType}/${tmdbId}/streaming?country=${country}`),
    enabled: !!mediaType && !!tmdbId,
  });
}

export function useContentDetails(mediaType: string, tmdbId: number) {
  return useQuery({
    queryKey: ['content-details', mediaType, tmdbId],
    queryFn: () => api.get<Movie | TVShow>(`/api/v1/content/${mediaType}/${tmdbId}`),
    enabled: !!mediaType && !!tmdbId,
  });
}

// 6. Follow Hooks
export function useFollowUser(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ success: boolean }>(`/api/v1/users/${userId}/follow`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-status', userId] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

export function useUnfollowUser(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete<{ success: boolean }>(`/api/v1/users/${userId}/follow`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-status', userId] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

export function useFollowStatus(userId: string, enabled = true) {
  return useQuery({
    queryKey: ['follow-status', userId],
    queryFn: () => api.get<{ is_following: boolean }>(`/api/v1/users/${userId}/follow-status`),
    enabled: !!userId && enabled,
  });
}

// 7. Notification Hooks
export function useNotifications(enabled = true) {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<Notification[]>('/api/v1/notifications'),
    refetchInterval: 30000, // Poll every 30s
    enabled,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notifId: string) => api.put<{ success: boolean }>(`/api/v1/notifications/${notifId}/read`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.put<{ success: boolean }>('/api/v1/notifications/read-all', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
