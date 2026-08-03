import api from './client'

export interface LoginResponse {
  access_token: string
  token_type: string
}

export interface UserProfile {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  bio: string | null
  theme_prefs: Record<string, unknown>
  created_at: string
  updated_at: string
}

export const authApi = {
  login: (username: string, password: string) => {
    // OAuth2PasswordRequestForm espera form-data
    const form = new URLSearchParams()
    form.append('username', username)
    form.append('password', password)
    return api.post<LoginResponse>('/auth/login', form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
  },

  register: (data: { username: string; password: string; display_name: string }) =>
    api.post<UserProfile>('/auth/register', data),

  me: () => api.get<UserProfile>('/auth/users/me'),
}
