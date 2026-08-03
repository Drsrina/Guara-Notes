import api from './client'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatRequest {
  message: string
  scope: 'note' | 'folder' | 'database'
  scope_ref_id?: string | null
  session_id?: string | null
}

export interface ChatResponse {
  reply: string
  session_id: string
}

export interface GhostWriterRequest {
  instruction: string
  current_content?: string
  note_id?: string | null
}

export const aiApi = {
  chat: (data: ChatRequest) => api.post<ChatResponse>('/ai/chat', data),
  ghostWriter: (data: GhostWriterRequest) =>
    api.post<{ suggestion: string }>('/ai/ghost-writer', data),
  listSessions: () => api.get<{ id: string; scope: string; created_at: string }[]>('/ai/sessions'),
}
