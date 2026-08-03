import api from './client'

export interface Note {
  id: string
  title: string
  content: string
  folder_id: string | null
  tags: string[]
  created_at: string
  updated_at: string
  user_id: string
}

export interface NoteCreate {
  title: string
  content: string
  folder_id?: string | null
  tags?: string[]
}

export interface NoteUpdate {
  title?: string
  content?: string
  folder_id?: string | null
  tags?: string[]
}

export const notesApi = {
  list: (folder_id?: string) =>
    api.get<Note[]>('/notes/', { params: folder_id ? { folder_id } : undefined }),

  get: (id: string) => api.get<Note>(`/notes/${id}`),

  create: (data: NoteCreate) => api.post<Note>('/notes/', data),

  update: (id: string, data: NoteUpdate) => api.put<Note>(`/notes/${id}`, data),

  delete: (id: string) => api.delete(`/notes/${id}`),
}
