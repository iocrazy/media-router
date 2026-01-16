const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    credentials: 'include',
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
  status: 'publishing' | 'completed' | 'failed'
  created_at: string
  accounts: TaskAccount[]
}

// API functions
export const api = {
  // Auth
  getDouyinAuthUrl: () => `${API_BASE}/api/auth/douyin`,

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
  }) => request<Task>('/api/tasks', { method: 'POST', body: JSON.stringify(data) }),
}
