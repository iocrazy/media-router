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
  video_url: string
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

// API functions
export const api = {
  // Auth
  getDouyinAuthUrl: async () => {
    const token = await getAccessToken()
    return `${API_BASE}/api/auth/douyin?token=${token}`
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
    video_url: string
    account_ids: string[]
    scheduled_at?: string
  }) => request<Task>('/api/tasks', { method: 'POST', body: JSON.stringify(data) }),

  cancelTask: (id: string) =>
    request<Task>(`/api/tasks/${id}/cancel`, { method: 'POST' }),

  // Share
  getShareSchema: (taskId: string) =>
    request<ShareSchema>(`/api/share/douyin/${taskId}`),
}
