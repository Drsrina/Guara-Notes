import api from './client'

export interface Folder {
  id: string
  name: string
  parent_folder_id: string | null
  order_index: number
  user_id: string
}

export const foldersApi = {
  list: () => api.get<Folder[]>('/folders/'),
  create: (data: { name: string; parent_folder_id?: string | null; order_index?: number }) =>
    api.post<Folder>('/folders/', data),
  update: (id: string, data: Partial<{ name: string; parent_folder_id: string | null; order_index: number }>) =>
    api.put<Folder>(`/folders/${id}`, data),
  delete: (id: string) => api.delete(`/folders/${id}`),
}
