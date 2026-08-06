import api from './client'
import { useAuthStore } from '../store'

export interface OllamaModelInfo {
  name: string
  size: number
  size_gb: number
  modified_at: string
  digest: string
  is_chat_model: boolean
  is_embed_model: boolean
}

export interface OllamaStatus {
  status: 'online' | 'offline' | 'error'
  version?: string
  loaded_models?: any[]
  chat_model?: string
  embed_model?: string
  ollama_url?: string
  error?: string
}

export const ollamaApi = {
  getStatus: () => api.get<OllamaStatus>('/ollama/status'),
  
  listModels: () => api.get<{ models: OllamaModelInfo[]; total: number }>('/ollama/models'),
  
  deleteModel: (modelName: string) => api.delete(`/ollama/models/${encodeURIComponent(modelName)}`),
  
  updateConfig: (config: { chat_model?: string; embed_model?: string; ollama_url?: string }) =>
    api.put('/ollama/config', config),

  // Método especial para consumir o SSE
  pullModelSSE: (modelName: string, onProgress: (data: any) => void, onError: (err: any) => void, onComplete: () => void) => {
    return new Promise<void>((resolve, reject) => {
      const token = useAuthStore.getState().token
      // Usar fetch ao invés de EventSource para passar o Authorization header
      fetch(`${api.defaults.baseURL}/ollama/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ model: modelName })
      }).then(async (response) => {
        if (!response.ok || !response.body) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        
        while (true) {
          const { value, done } = await reader.read()
          if (done) {
            onComplete()
            resolve()
            break
          }
          
          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.substring(6))
                if (data.error) {
                  onError(data.error)
                  reject(new Error(data.error))
                  return
                }
                if (data.done) {
                  onComplete()
                  resolve()
                  return
                }
                onProgress(data)
              } catch (e) {
                // ignorar json inválido parcial
              }
            }
          }
        }
      }).catch(err => {
        onError(err.message)
        reject(err)
      })
    })
  }
}
