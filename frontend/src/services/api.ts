import { supabase } from '../lib/supabase'

const API_BASE = import.meta.env.VITE_API_URL || 'https://media.heytime.cc'

async function getAccessToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getAccessToken()

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.detail || `Request failed: ${response.status}`)
  }

  return response.json()
}

// Account types
export interface Account {
  id: string
  platform: string
  platform_user_id: string
  username: string
  avatar_url: string | null
  status: 'active' | 'expired'
  created_at: string
}

// Content types
export type ContentType = 'video' | 'image_text' | 'article'
export type DistributionMode = 'broadcast' | 'one_to_one'
export type Visibility = 'public' | 'private' | 'draft'

export interface AccountConfig {
  title?: string
  description?: string
  topics?: string[]
}

// Task types
export interface TaskAccount {
  account_id: string
  username: string
  avatar_url: string | null
  status: 'pending' | 'success' | 'failed'
  error_message: string | null
  published_url: string | null
}

export interface Task {
  id: string
  title: string
  description: string | null
  content_type: ContentType
  video_url: string | null
  image_urls: string[]
  article_content: string | null
  cover_url: string | null
  visibility: string
  ai_content: boolean
  topics: string[]
  distribution_mode: string | null
  batch_id: string | null
  status: 'pending_share' | 'scheduled' | 'publishing' | 'completed' | 'failed' | 'cancelled'
  scheduled_at: string | null
  share_id: string | null
  created_at: string
  accounts: TaskAccount[]
}

export interface ShareSchema {
  schema_url: string
  share_id: string
}

export interface Draft {
  id: string
  content_type: ContentType
  title: string | null
  description: string | null
  video_urls: string[]
  image_urls: string[]
  article_content: string | null
  cover_url: string | null
  visibility: Visibility
  ai_content: boolean
  topics: string[]
  account_ids: string[]
  account_configs: Record<string, AccountConfig>
  distribution_mode: DistributionMode
  scheduled_at: string | null
  created_at: string
  updated_at: string
}

// API functions
export const api = {
  // Auth
  getPlatformAuthUrl: async (platform: string) => {
    const token = await getAccessToken()
    return `${API_BASE}/api/auth/${platform}?token=${token}`
  },

  // Accounts
  getAccounts: () => request<Account[]>('/api/accounts'),

  deleteAccount: (id: string) =>
    request<void>(`/api/accounts/${id}`, { method: 'DELETE' }),

  refreshAccount: (id: string) =>
    request<Account>(`/api/accounts/${id}/refresh`, { method: 'POST' }),

  // Tasks
  getTasks: () => request<Task[]>('/api/tasks'),

  getTask: (id: string) => request<Task>(`/api/tasks/${id}`),

  createTask: (data: {
    title: string
    description?: string
    content_type?: ContentType
    video_url?: string
    video_urls?: string[]
    image_urls?: string[]
    article_content?: string
    cover_url?: string
    visibility?: Visibility
    ai_content?: boolean
    topics?: string[]
    account_ids: string[]
    account_configs?: Record<string, AccountConfig>
    distribution_mode?: DistributionMode
    scheduled_at?: string
  }) => request<Task[]>('/api/tasks', { method: 'POST', body: JSON.stringify(data) }),

  cancelTask: (id: string) =>
    request<Task>(`/api/tasks/${id}/cancel`, { method: 'POST' }),

  // Drafts
  getDrafts: () => request<Draft[]>('/api/drafts'),

  getDraft: (id: string) => request<Draft>(`/api/drafts/${id}`),

  createDraft: (data: Omit<Draft, 'id' | 'created_at' | 'updated_at'>) =>
    request<Draft>('/api/drafts', { method: 'POST', body: JSON.stringify(data) }),

  updateDraft: (id: string, data: Omit<Draft, 'id' | 'created_at' | 'updated_at'>) =>
    request<Draft>(`/api/drafts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteDraft: (id: string) =>
    request<void>(`/api/drafts/${id}`, { method: 'DELETE' }),

  // Share
  getShareSchema: (taskId: string) =>
    request<ShareSchema>(`/api/share/douyin/${taskId}`),
}
