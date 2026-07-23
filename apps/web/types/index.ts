// Reelstack shared types
// Keep these in sync with Go struct JSON tags in apps/api/internal/

export interface User {
  id: string
  username: string
  email: string
  avatar_url: string | null
  bio: string | null
  created_at: string
  updated_at: string
  score?: number
  rank?: number | null
  films_logged?: number
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
  save_count: number
  created_at: string
  updated_at: string
  // Populated on detail view
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
  // Populated by content service
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
  title: string           // unified: movie.title or tv.name
  poster_path: string | null
  year: string            // release_date[:4] or first_air_date[:4]
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

export interface UserProfile {
  id: string
  username: string
  avatar_url: string | null
  bio: string | null
  followers_count: number
  following_count: number
  score: number
  rank: number | null
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

export interface LeaderboardEntry {
  user_id: string
  username: string
  avatar_url: string | null
  score: number
  rank: number
  followers_count: number
  list_count: number
  item_count: number
  watched_count: number
}

export interface StreamingProvider {
  provider_id: number
  provider_name: string
  logo_path: string | null
  display_priority: number
  link: string
  type: 'subscription' | 'rent' | 'buy' | 'free'
}

// API response envelope
export interface APIResponse<T> {
  data: T
  success: boolean
  error?: string
}

export interface AuthResponse {
  token: string
  user: User
}

export interface Comment {
  id: string
  user_id: string
  tmdb_id: number
  media_type: 'movie' | 'tv'
  body: string
  parent_id: string | null
  created_at: string
  updated_at: string
  username?: string
  avatar_url?: string | null
  replies?: Comment[]
}

export interface ListComment {
  id: string
  list_id: string
  user_id: string
  type: 'comment' | 'suggestion'
  body: string
  parent_id: string | null
  created_at: string
  updated_at: string
  username?: string
  avatar_url?: string | null
  replies?: ListComment[]
}

export interface Notification {
  id: string
  user_id: string
  actor_id: string
  type: 'new_follower' | 'list_created' | 'list_saved' | 'comment_reply' | 'list_comment'
  entity_id?: string
  is_read: boolean
  created_at: string
  actor_username?: string
  actor_avatar_url?: string
  entity_title?: string
  comment_tmdb_id?: number
  comment_media_type?: string
  comment_list_id?: string
  list_comment_type?: 'comment' | 'suggestion'
}

export interface SaveStatusResponse {
  saved: boolean
  save_count: number
}

export interface SavedList extends List {
  owner_username: string
  owner_avatar: string | null
}

// Riley AI agent
export interface RileyStory {
  headline: string
  summary: string
  source: string
  url: string
}

export interface RileyDigest {
  generated_at: string
  stories: RileyStory[]
}

export interface RileyTopPick {
  tmdb_id: number
  media_type: string
  title: string
  poster_path: string | null
  year: string
  vote_average: number
  blurb: string
}

export interface RileyTopList {
  generated_at: string
  picks: RileyTopPick[]
}

export interface RileyTopResponse {
  top_movies: RileyTopList | null
  top_series: RileyTopList | null
  top_ten: RileyTopList | null
}

export interface RileyChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface RileyChatResponse {
  reply: string
  recommendations: RileyTopPick[]
}
