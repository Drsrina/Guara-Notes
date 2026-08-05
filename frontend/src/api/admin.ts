import api from './client'

export interface UserAdminView {
  id: string
  username: string
  display_name: string
  is_admin: boolean
  created_at: string
  note_count: number
}

export interface UserAdminCreate {
  username: string
  password: string
  display_name: string
  is_admin: boolean
}

export interface UserAdminUpdate {
  display_name?: string
  is_admin?: boolean
  new_password?: string
}

export interface AdminStats {
  users: number
  notes: number
  embedded_notes: number
  pending_embed: number
  note_links: number
}

export const adminApi = {
  listUsers: () => api.get<UserAdminView[]>('/admin/users'),
  getStats: () => api.get<AdminStats>('/admin/stats'),
  createUser: (data: UserAdminCreate) => api.post<UserAdminView>('/admin/users', data),
  updateUser: (id: string, data: UserAdminUpdate) => api.put<UserAdminView>(`/admin/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
}
