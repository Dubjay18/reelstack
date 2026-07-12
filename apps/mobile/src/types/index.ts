export interface User {
  id: string
  username: string
  email: string
  avatar_url: string | null
  bio: string | null
  created_at: string
  updated_at: string
}

export interface List {
  id: string
  user_id: string
  title: string
  description: string | null
  is_public: boolean
  slug: string
  item_count: number
  watched_count: number
  created_at: string
  updated_at: string
  items?: ListItem[]
  user?: Pick<User, 'username' | 'avatar_url'>
}

export interface ListItem {
  id: string
  list_id: string
  tmdb_id: number
  media_type: 'movie' | 'tv'
  watched: boolean
  watched_at: string | null
  notes: string | null
  position: number
  added_at: string
  content?: Movie | TVShow
  streaming?: StreamingProvider[]
}

export interface Movie {
  id: number
  title: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  release_date: string
  runtime: number | null
  genres: string[]
  vote_average: number
  trailer_key?: string | null
}

export interface TVShow {
  id: number
  name: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  first_air_date: string
  number_of_seasons: number
  genres: string[]
  vote_average: number
  trailer_key?: string | null
}

export interface SearchResult {
  id: number
  media_type: 'movie' | 'tv'
  title: string
  poster_path: string | null
  year: string
  vote_average: number
  streaming?: StreamingProvider[]
}

export interface PersonKnownFor {
  id: number
  title: string
  media_type: 'movie' | 'tv'
  poster_path: string | null
  year: string
}

export interface PersonSearchResult {
  id: number
  name: string
  profile_path: string | null
  known_for_department: string
  known_for: PersonKnownFor[]
}

export interface UserSearchResult {
  id: string
  username: string
  avatar_url: string | null
  bio: string | null
  followers_count: number
  score: number
  rank: number | null
}

export interface StreamingProvider {
  provider_id: number
  provider_name: string
  logo_path: string | null
  display_priority: number
  link: string
  type: 'subscription' | 'rent' | 'buy' | 'free'
}

export interface APIResponse<T> {
  data: T
  success: boolean
  error?: string
}

export interface AuthResponse {
  token: string
  user: User
}

export interface Notification {
  id: string
  user_id: string
  actor_id: string
  type: 'new_follower' | 'list_created'
  entity_id?: string
  is_read: boolean
  created_at: string
  actor_username?: string
  actor_avatar_url?: string
  entity_title?: string
}
