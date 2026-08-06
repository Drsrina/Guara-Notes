import api from './client'

export interface ServiceStatus {
  status: 'online' | 'offline' | 'error' | 'unknown'
  version?: string
  error?: string
  queue_length?: number
}

export interface SystemStatus {
  backend: ServiceStatus
  postgres: ServiceStatus
  redis: ServiceStatus
  ollama: ServiceStatus
  worker: ServiceStatus & { queue_length?: number }
}

export interface RedisMetrics {
  status: string
  version: string
  uptime_days: number
  used_memory_human: string
  used_memory_peak_human: string
  maxmemory_human: string
  connected_clients: number
  total_commands_processed: number
  keyspace_hits: number
  keyspace_misses: number
  queue_length: number
  aof_enabled: boolean
}

export interface PostgresMetrics {
  status: string
  version: string
  database_size: string
  database_size_bytes: number
  active_connections: number
  notes_total: number
  notes_embedded: number
  users_total: number
  links_total: number
}

export interface EnvConfig {
  AI_PROVIDER: string
  OLLAMA_URL: string
  OLLAMA_MODEL_CHAT: string
  OLLAMA_MODEL_EMBED: string
  GEMINI_API_KEY: string
  CLAUDE_API_KEY: string
  SEMANTIC_THRESHOLD: string
  SEMANTIC_TOP_K: string
  RAG_TOP_K: string
  CORS_ORIGINS: string
}

export interface EnvUpdate {
  AI_PROVIDER?: string
  OLLAMA_MODEL_CHAT?: string
  OLLAMA_MODEL_EMBED?: string
  GEMINI_API_KEY?: string
  CLAUDE_API_KEY?: string
  SEMANTIC_THRESHOLD?: string
  SEMANTIC_TOP_K?: string
  RAG_TOP_K?: string
  CORS_ORIGINS?: string
}

export const systemApi = {
  getStatus: () => api.get<SystemStatus>('/system/status'),
  getRedisMetrics: () => api.get<RedisMetrics>('/system/redis'),
  getPostgresMetrics: () => api.get<PostgresMetrics>('/system/postgres'),
  getEnvConfig: () => api.get<EnvConfig>('/system/env'),
  updateEnvConfig: (data: EnvUpdate) => api.put<{ status: string; changed_keys: string[]; note: string }>('/system/env', data),
  runVacuum: () => api.post<{ status: string; message: string }>('/system/postgres/vacuum', {}),
  flushQueue: () => api.post<{ status: string; deleted_queue: boolean }>('/system/redis/flush-queue', {}),
}
