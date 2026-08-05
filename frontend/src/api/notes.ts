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

export interface NoteVersion {
  id: string
  note_id: string
  title: string
  content: string
  created_at: string
}

export interface NoteSearchResult extends Note {
  score: number
}

export interface PaginatedNotes {
  items: Note[]
  total: number
  limit: number
  offset: number
}

export const notesApi = {
  list: (params?: { folder_id?: string; limit?: number; offset?: number }) =>
    api.get<PaginatedNotes>('/notes/', { params }),

  search: (q: string, mode: 'text' | 'semantic' | 'hybrid' = 'hybrid', limit = 20, folder_id?: string) =>
    api.get<NoteSearchResult[]>('/notes/search', { params: { q, mode, limit, folder_id } }),

  get: (id: string) => api.get<Note>(`/notes/${id}`),

  create: (data: NoteCreate) => api.post<Note>('/notes/', data),

  update: (id: string, data: NoteUpdate) => api.put<Note>(`/notes/${id}`, data),

  delete: (id: string) => api.delete(`/notes/${id}`),

  getVersions: (id: string) => api.get<NoteVersion[]>(`/notes/${id}/versions`),

  restoreVersion: (id: string, versionId: string) => api.post<Note>(`/notes/${id}/restore/${versionId}`),

  forceEmbed: (id: string) => api.post(`/notes/${id}/embed`),

  bulkEmbed: () => api.post('/notes/bulk-embed'),
}
