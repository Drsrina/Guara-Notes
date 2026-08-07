import { useState, useEffect } from 'react'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { useSettingsStore, useAuthStore, useAppStore } from '../store'
import { authApi } from '../api/auth'
import { notesApi } from '../api/notes'
import { adminApi } from '../api/admin'
import type { UserAdminView } from '../api/admin'
import { ollamaApi } from '../api/ollama'
import type { OllamaModelInfo, OllamaStatus } from '../api/ollama'
import { systemApi } from '../api/system'
import type { SystemStatus, RedisMetrics, PostgresMetrics, EnvConfig } from '../api/system'
import { confirmDialog } from './ui/Dialogs'
import toast from 'react-hot-toast'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

type TabId = 'appearance' | 'editor' | 'graph' | 'ai' | 'data' | 'profile' | 'admin' | 'ollama' | 'redis' | 'postgres' | 'system'

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('appearance')
  const { settings, updateSettings } = useSettingsStore()
  const { user, setUser, logout } = useAuthStore()
  const { notes } = useAppStore()

  // Profile Form state
  const [displayName, setDisplayName] = useState(user?.display_name || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  // Admin state
  const [usersList, setUsersList] = useState<UserAdminView[]>([])
  const [showNewUser, setShowNewUser] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [newUserPass, setNewUserPass] = useState('')
  const [newUserName, setNewUserName] = useState('')
  const [newUserAdmin, setNewUserAdmin] = useState(false)

  // Ollama state
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null)
  const [ollamaModels, setOllamaModels] = useState<OllamaModelInfo[]>([])
  const [pullModelName, setPullModelName] = useState('')
  const [pullProgress, setPullProgress] = useState<any>(null)
  const [isPulling, setIsPulling] = useState(false)

  // System / Redis / Postgres state
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)
  const [redisMetrics, setRedisMetrics] = useState<RedisMetrics | null>(null)
  const [postgresMetrics, setPostgresMetrics] = useState<PostgresMetrics | null>(null)
  const [envConfig, setEnvConfig] = useState<EnvConfig | null>(null)
  const [envEdits, setEnvEdits] = useState<Partial<EnvConfig>>({})
  const [systemLoading, setSystemLoading] = useState(false)
  const [vacuumLoading, setVacuumLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'admin' && user?.is_admin) {
        loadAdminUsers()
      } else if (activeTab === 'ollama' && user?.is_admin) {
        loadOllamaData()
      } else if (activeTab === 'system' && user?.is_admin) {
        loadSystemData()
      } else if (activeTab === 'redis' && user?.is_admin) {
        loadRedisData()
      } else if (activeTab === 'postgres' && user?.is_admin) {
        loadPostgresData()
      }
    }
  }, [isOpen, activeTab, user?.is_admin])

  // --- Profile Actions ---
  const handleSaveProfile = async () => {
    try {
      const res = await authApi.updateMe({ display_name: displayName, bio })
      setUser(res.data)
      toast.success('Perfil atualizado')
    } catch (e) {
      toast.error('Erro ao atualizar perfil')
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) return
    try {
      await authApi.changePassword({ current_password: currentPassword, new_password: newPassword })
      toast.success('Senha alterada com sucesso')
      setCurrentPassword('')
      setNewPassword('')
    } catch (e) {
      toast.error('Erro ao alterar senha')
    }
  }

  // --- Admin Actions ---
  const loadAdminUsers = async () => {
    try {
      const res = await adminApi.listUsers()
      setUsersList(res.data)
    } catch (e) {
      console.error(e)
    }
  }

  const handleCreateUser = async () => {
    if (!newUsername.trim() || !newUserPass.trim() || !newUserName.trim()) {
      toast.error('Preencha username, nome e senha')
      return
    }
    try {
      await adminApi.createUser({
        username: newUsername.trim(),
        password: newUserPass,
        display_name: newUserName.trim(),
        is_admin: newUserAdmin
      })
      toast.success(`Usuário '${newUsername}' criado!`)
      // Reset form
      setNewUsername('')
      setNewUserName('')
      setNewUserPass('')
      setNewUserAdmin(false)
      setShowNewUser(false)
      loadAdminUsers()
    } catch (e: any) {
      const detail = e?.response?.data?.detail
      toast.error(detail ? `Erro: ${detail}` : 'Erro ao criar usuário')
    }
  }

  const handleDeleteUser = async (id: string) => {
    confirmDialog('Excluir Usuário', 'Deseja excluir este usuário e TODAS as suas notas?', async () => {
      try {
        await adminApi.deleteUser(id)
        loadAdminUsers()
        toast.success('Usuário excluído')
      } catch (e) {
        toast.error('Erro ao excluir usuário')
      }
    })
  }

  // --- Ollama Actions ---
  const loadOllamaData = async () => {
    try {
      const st = await ollamaApi.getStatus()
      setOllamaStatus(st.data)
      const md = await ollamaApi.listModels()
      setOllamaModels(md.data.models)
    } catch (e) {
      console.error(e)
    }
  }

  const handlePullModel = () => {
    if (!pullModelName || isPulling) return
    setIsPulling(true)
    setPullProgress({ status: 'Iniciando...', completed: 0, total: 0 })
    ollamaApi.pullModelSSE(
      pullModelName,
      (data) => setPullProgress(data),
      (err) => { toast.error(`Erro: ${err}`); setIsPulling(false) },
      () => {
        setPullProgress({ status: 'Concluído ✅', completed: 1, total: 1 })
        setIsPulling(false)
        setPullModelName('')
        setTimeout(() => setPullProgress(null), 4000)
        loadOllamaData()
      }
    )
  }

  const handleDeleteModel = async (name: string) => {
    confirmDialog('Remover Modelo', `Remover o modelo ${name}?`, async () => {
      try {
        await ollamaApi.deleteModel(name)
        loadOllamaData()
        toast.success('Modelo removido')
      } catch (e: any) {
        toast.error('Erro: ' + (e.response?.data?.detail || e.message))
      }
    })
  }

  const handleUpdateActiveModel = async (type: 'chat' | 'embed', modelName: string) => {
    try {
      await ollamaApi.updateConfig({
        chat_model: type === 'chat' ? modelName : undefined,
        embed_model: type === 'embed' ? modelName : undefined
      })
      loadOllamaData()
      toast.success('Configuração atualizada')
    } catch (e) {
      toast.error('Erro ao atualizar config')
    }
  }

  const handleExportBase = () => {
    const data = JSON.stringify(notes, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `guara-notes-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // --- System / Redis / Postgres Actions ---
  const loadSystemData = async () => {
    try {
      setSystemLoading(true)
      const [statusRes, envRes] = await Promise.all([
        systemApi.getStatus(),
        systemApi.getEnvConfig(),
      ])
      setSystemStatus(statusRes.data)
      setEnvConfig(envRes.data)
      setEnvEdits({})
    } catch (e) {
      console.error(e)
    } finally {
      setSystemLoading(false)
    }
  }

  const loadRedisData = async () => {
    try {
      const res = await systemApi.getRedisMetrics()
      setRedisMetrics(res.data)
    } catch (e) {
      console.error(e)
    }
  }

  const loadPostgresData = async () => {
    try {
      const res = await systemApi.getPostgresMetrics()
      setPostgresMetrics(res.data)
    } catch (e) {
      console.error(e)
    }
  }

  const handleSaveEnv = async () => {
    try {
      await systemApi.updateEnvConfig(envEdits)
      toast.success('Configurações salvas! Algumas mudanças requerem restart.')
      loadSystemData()
    } catch (e) {
      toast.error('Erro ao salvar configurações')
    }
  }

  const handleVacuum = async () => {
    try {
      setVacuumLoading(true)
      await systemApi.runVacuum()
      toast.success('VACUUM ANALYZE executado com sucesso!')
      loadPostgresData()
    } catch (e: any) {
      toast.error('Erro: ' + (e.response?.data?.detail || e.message))
    } finally {
      setVacuumLoading(false)
    }
  }

  const handleFlushQueue = async () => {
    confirmDialog('Limpar Fila', 'Remover todas as tarefas pendentes da fila Celery?', async () => {
      try {
        await systemApi.flushQueue()
        toast.success('Fila limpa com sucesso!')
        loadRedisData()
      } catch (e) {
        toast.error('Erro ao limpar fila')
      }
    })
  }

  const tabs: { id: TabId, label: string, icon: string, adminOnly?: boolean }[] = [
    { id: 'appearance', label: 'Aparência', icon: '🎨' },
    { id: 'editor', label: 'Editor', icon: '📝' },
    { id: 'graph', label: 'Grafo & Cérebro', icon: '🧠' },
    { id: 'ai', label: 'IA Companion', icon: '🤖' },
    { id: 'data', label: 'Dados & Sync', icon: '💾' },
    { id: 'profile', label: 'Perfil', icon: '👤' },
    { id: 'ollama', label: 'Ollama', icon: '🦙', adminOnly: true },
    { id: 'redis', label: 'Redis', icon: '🔴', adminOnly: true },
    { id: 'postgres', label: 'PostgreSQL', icon: '🐘', adminOnly: true },
    { id: 'system', label: 'Sistema', icon: '🖥️', adminOnly: true },
    { id: 'admin', label: 'Usuários', icon: '🛡️', adminOnly: true },
  ]

  const visibleTabs = tabs.filter(t => !t.adminOnly || user?.is_admin)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Configurações" className="w-[900px] max-w-[95vw] h-[680px] max-h-[90vh]">
      <div className="flex h-full -mx-6 -my-6">
        {/* Sidebar Tabs */}
        <div className="w-56 border-r border-white/10 bg-bg-secondary/30 p-4 flex flex-col gap-1 overflow-y-auto custom-scrollbar">
          {visibleTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary ${
                activeTab === tab.id
                  ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/30'
                  : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'
              }`}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">

          {/* APARÊNCIA */}
          {activeTab === 'appearance' && (
            <div className="space-y-8">
              <h3 className="text-2xl font-bold text-text-primary border-b border-white/10 pb-4 mb-6">Aparência</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Tema</label>
                  <select
                    value={settings.theme}
                    onChange={e => updateSettings({ theme: e.target.value as any })}
                    className="w-full bg-bg-tertiary border border-white/10 rounded-md p-2.5 text-sm text-text-primary focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-all shadow-inner"
                  >
                    <option value="dark">Dark</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Densidade de UI</label>
                  <select
                    value={settings.uiDensity}
                    onChange={e => updateSettings({ uiDensity: e.target.value as any })}
                    className="w-full bg-bg-tertiary border border-white/10 rounded-md p-2.5 text-sm text-text-primary focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-all shadow-inner"
                  >
                    <option value="compact">Compacto</option>
                    <option value="normal">Normal</option>
                    <option value="spacious">Espaçoso</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Animações</label>
                  <select
                    value={settings.animations}
                    onChange={e => updateSettings({ animations: e.target.value as any })}
                    className="w-full bg-bg-tertiary border border-white/10 rounded-md p-2.5 text-sm text-text-primary focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-all shadow-inner"
                  >
                    <option value="smooth">Suave</option>
                    <option value="fast">Rápido</option>
                    <option value="off">Desativado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Blur do Glassmorphism (px)</label>
                  <input
                    type="range" min="5" max="30"
                    value={settings.glassBlur}
                    onChange={e => updateSettings({ glassBlur: parseInt(e.target.value) })}
                    className="w-full accent-accent-primary"
                  />
                  <div className="text-right text-xs text-text-muted">{settings.glassBlur}px</div>
                </div>
              </div>
            </div>
          )}

          {/* EDITOR */}
          {activeTab === 'editor' && (
            <div className="space-y-8">
              <h3 className="text-2xl font-bold text-text-primary border-b border-white/10 pb-4 mb-6">Editor</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Tamanho da Fonte (px)</label>
                  <input
                    type="range" min="12" max="24"
                    value={settings.editorFontSize}
                    onChange={e => updateSettings({ editorFontSize: parseInt(e.target.value) })}
                    className="w-full accent-accent-primary"
                  />
                  <div className="text-right text-xs text-text-muted">{settings.editorFontSize}px</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Auto-save delay (s)</label>
                  <input
                    type="range" min="1" max="10" step="0.5"
                    value={settings.autoSaveDelay}
                    onChange={e => updateSettings({ autoSaveDelay: parseFloat(e.target.value) })}
                    className="w-full accent-accent-primary"
                  />
                  <div className="text-right text-xs text-text-muted">{settings.autoSaveDelay}s</div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.editorMaxWidth}
                    onChange={e => updateSettings({ editorMaxWidth: e.target.checked })}
                    className="rounded border-white/10 text-accent-primary focus:ring-accent-primary bg-bg-tertiary"
                  />
                  Limitar largura máxima (Modo Foco)
                </label>

                <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.showLineNumbers}
                    onChange={e => updateSettings({ showLineNumbers: e.target.checked })}
                    className="rounded border-white/10 text-accent-primary focus:ring-accent-primary bg-bg-tertiary"
                  />
                  Mostrar números de linha
                </label>
              </div>
            </div>
          )}

          {/* GRAFO */}
          {activeTab === 'graph' && (
            <div className="space-y-8">
              <h3 className="text-2xl font-bold text-text-primary border-b border-white/10 pb-4 mb-6">Grafo & Cérebro 3D</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Modo de Cor</label>
                  <select
                    value={settings.colorMode}
                    onChange={e => updateSettings({ colorMode: e.target.value as any })}
                    className="w-full bg-bg-tertiary border border-white/10 rounded-md p-2.5 text-sm text-text-primary focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-all shadow-inner"
                  >
                    <option value="tag">Por Tag</option>
                    <option value="folder">Por Pasta</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Tamanho dos Nós</label>
                  <select
                    value={settings.nodeSize}
                    onChange={e => updateSettings({ nodeSize: e.target.value as any })}
                    className="w-full bg-bg-tertiary border border-white/10 rounded-md p-2.5 text-sm text-text-primary focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-all shadow-inner"
                  >
                    <option value="small">Pequeno</option>
                    <option value="medium">Médio</option>
                    <option value="large">Grande</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Força de Atração</label>
                  <input
                    type="range" min="0.1" max="2" step="0.1"
                    value={settings.graphAttraction}
                    onChange={e => updateSettings({ graphAttraction: parseFloat(e.target.value) })}
                    className="w-full accent-accent-primary"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.glowEffects}
                    onChange={e => updateSettings({ glowEffects: e.target.checked })}
                    className="rounded border-white/10 text-accent-primary bg-bg-tertiary"
                  />
                  Efeitos de Glow
                </label>

                <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.renderSemantic}
                    onChange={e => updateSettings({ renderSemantic: e.target.checked })}
                    className="rounded border-white/10 text-accent-primary bg-bg-tertiary"
                  />
                  Renderizar conexões semânticas
                </label>
              </div>
            </div>
          )}

          {/* IA COMPANION */}
          {activeTab === 'ai' && (
            <div className="space-y-8">
              <h3 className="text-2xl font-bold text-text-primary border-b border-white/10 pb-4 mb-6">IA Companion</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Provedor</label>
                  <select
                    value={settings.aiProvider}
                    onChange={e => updateSettings({ aiProvider: e.target.value as any })}
                    className="w-full bg-bg-tertiary border border-white/10 rounded-md p-2.5 text-sm text-text-primary focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-all shadow-inner"
                  >
                    <option value="local">Ollama (Local)</option>
                    <option value="gemini">Google Gemini</option>
                    <option value="claude">Anthropic Claude</option>
                  </select>
                </div>

                {settings.aiProvider === 'local' && (
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Modelo</label>
                    <input
                      type="text"
                      value={settings.aiModel}
                      onChange={e => updateSettings({ aiModel: e.target.value })}
                      className="w-full bg-bg-tertiary border border-white/10 rounded p-2 text-sm"
                      placeholder="ex: llama3.2:3b"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Temperatura: {settings.aiTemperature}</label>
                  <input
                    type="range" min="0" max="1" step="0.1"
                    value={settings.aiTemperature}
                    onChange={e => updateSettings({ aiTemperature: parseFloat(e.target.value) })}
                    className="w-full accent-accent-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Contexto RAG (Top K): {settings.aiRagTopK}</label>
                  <input
                    type="range" min="1" max="15" step="1"
                    value={settings.aiRagTopK}
                    onChange={e => updateSettings({ aiRagTopK: parseInt(e.target.value) })}
                    className="w-full accent-accent-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* DADOS */}
          {activeTab === 'data' && (
            <div className="space-y-8">
              <h3 className="text-2xl font-bold text-text-primary border-b border-white/10 pb-4 mb-6">Dados & Sincronização</h3>

              <div className="bg-bg-tertiary/50 p-4 rounded-lg border border-white/5 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Usuário Atual:</span>
                  <span className="text-text-primary">{user?.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Total de Notas:</span>
                  <span className="text-text-primary">{notes.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Status de Sync:</span>
                  <span className="text-green-400">✓ On-time</span>
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <Button variant="secondary" onClick={handleExportBase}>
                  Exportar Base (JSON)
                </Button>
                <Button variant="ghost" onClick={async () => {
                  try {
                    await notesApi.bulkEmbed();
                    toast.success('Re-embedding agendado para todas as notas.');
                  } catch(e) {}
                }}>
                  Forçar Re-embedding (Tudo)
                </Button>
              </div>
            </div>
          )}

          {/* PERFIL */}
          {activeTab === 'profile' && (
            <div className="space-y-8">
              <h3 className="text-2xl font-bold text-text-primary border-b border-white/10 pb-4 mb-6">Perfil</h3>

              <div className="max-w-md space-y-6">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Nome de Exibição</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    className="w-full bg-bg-tertiary border border-white/10 rounded-md p-2.5 text-sm text-text-primary focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-all shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Bio</label>
                  <textarea
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    className="w-full h-20 bg-bg-tertiary border border-white/10 rounded p-2 text-sm focus:border-accent-primary resize-none custom-scrollbar"
                  />
                </div>
                <div className="pt-2 flex gap-2 border-b border-white/10 pb-6">
                  <Button variant="primary" onClick={handleSaveProfile}>Salvar Perfil</Button>
                  <Button variant="ghost" onClick={logout} className="text-red-400 hover:text-red-300 ml-auto">Sair da Conta</Button>
                </div>

                <div className="pt-2">
                  <h4 className="text-sm font-medium mb-3">Trocar Senha</h4>
                  <div className="space-y-3">
                    <input
                      type="password"
                      placeholder="Senha atual"
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      className="w-full bg-bg-tertiary border border-white/10 rounded-md p-2.5 text-sm text-text-primary focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-all shadow-inner"
                    />
                    <input
                      type="password"
                      placeholder="Nova senha"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="w-full bg-bg-tertiary border border-white/10 rounded-md p-2.5 text-sm text-text-primary focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-all shadow-inner"
                    />
                    <Button variant="secondary" onClick={handleChangePassword}>Atualizar Senha</Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* OLLAMA */}
          {activeTab === 'ollama' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-4">
                <h3 className="text-lg font-medium text-text-primary">Servidor Ollama Local</h3>
                <div className="flex items-center gap-2 text-sm">
                  <div className={`w-2 h-2 rounded-full ${ollamaStatus?.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-text-secondary">{ollamaStatus?.status === 'online' ? `v${ollamaStatus.version}` : 'Offline'}</span>
                </div>
              </div>

              {/* Install New Model */}
              <div className="bg-bg-tertiary/30 p-4 rounded-lg border border-white/10">
                <h4 className="text-sm font-medium mb-3">Instalar Modelo (Pull)</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={pullModelName}
                    onChange={e => setPullModelName(e.target.value)}
                    placeholder="ex: mistral:instruct, nomic-embed-text"
                    className="flex-1 bg-bg-tertiary border border-white/10 rounded p-2 text-sm focus:border-accent-primary"
                  />
                  <Button variant="primary" onClick={handlePullModel}>Download</Button>
                </div>
                {pullProgress && (
                  <div className="mt-3 bg-bg-primary p-3 rounded text-xs font-mono text-text-secondary">
                    {pullProgress.status} {pullProgress.completed && pullProgress.total && `(${Math.round(pullProgress.completed / pullProgress.total * 100)}%)`}
                    {pullProgress.error && <span className="text-red-400 block mt-1">{pullProgress.error}</span>}
                  </div>
                )}
              </div>

              {/* Installed Models */}
              <div>
                <h4 className="text-sm font-medium mb-3">Modelos Instalados</h4>
                <div className="grid grid-cols-1 gap-2">
                  {ollamaModels.map(model => (
                    <div key={model.name} className="bg-bg-tertiary/30 p-3 rounded-lg border border-white/5 flex items-center justify-between group">
                      <div>
                        <div className="text-sm font-medium text-text-primary flex items-center gap-2">
                          {model.name}
                          {model.is_chat_model && <span className="text-[9px] bg-accent-primary/20 text-accent-primary px-1.5 py-0.5 rounded-full uppercase">Chat Ativo</span>}
                          {model.is_embed_model && <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full uppercase">Embed Ativo</span>}
                        </div>
                        <div className="text-xs text-text-muted mt-1">{model.size_gb} GB</div>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleUpdateActiveModel('chat', model.name)} className="text-[10px] bg-white/5 hover:bg-white/10 px-2 py-1 rounded text-text-secondary">Usar Chat</button>
                        <button onClick={() => handleUpdateActiveModel('embed', model.name)} className="text-[10px] bg-white/5 hover:bg-white/10 px-2 py-1 rounded text-text-secondary">Usar Embed</button>
                        <button onClick={() => handleDeleteModel(model.name)} aria-label={`Excluir modelo ${model.name}`} className="text-[10px] bg-red-500/10 hover:bg-red-500/20 px-2 py-1 rounded text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400">🗑️</button>
                      </div>
                    </div>
                  ))}
                  {ollamaModels.length === 0 && <div className="text-xs text-text-muted">Nenhum modelo instalado.</div>}
                </div>
              </div>
            </div>
          )}

          {/* ADMIN */}
          {activeTab === 'admin' && (
            <div className="space-y-8">
              <h3 className="text-2xl font-bold text-text-primary border-b border-white/10 pb-4 mb-6">Administração</h3>

              <div className="flex justify-between items-center">
                <h4 className="text-sm font-medium">Usuários do Sistema</h4>
                <Button variant="primary" size="sm" onClick={() => setShowNewUser(!showNewUser)}>
                  {showNewUser ? 'Cancelar' : '+ Novo Usuário'}
                </Button>
              </div>

              {showNewUser && (
                <div className="bg-bg-tertiary/50 p-4 rounded-lg border border-white/10 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" placeholder="Username (login)" value={newUsername} onChange={e => setNewUsername(e.target.value)} className="bg-bg-tertiary border border-white/10 rounded p-2 text-sm" />
                    <input type="text" placeholder="Nome de Exibição" value={newUserName} onChange={e => setNewUserName(e.target.value)} className="bg-bg-tertiary border border-white/10 rounded p-2 text-sm" />
                    <input type="password" placeholder="Senha" value={newUserPass} onChange={e => setNewUserPass(e.target.value)} className="bg-bg-tertiary border border-white/10 rounded p-2 text-sm" />
                    <div className="flex items-center gap-2 pl-2">
                      <input type="checkbox" checked={newUserAdmin} onChange={e => setNewUserAdmin(e.target.checked)} id="is_admin_check" />
                      <label htmlFor="is_admin_check" className="text-sm text-text-secondary cursor-pointer">Admin?</label>
                    </div>
                  </div>
                  <Button variant="primary" onClick={handleCreateUser} className="w-full">Criar Usuário</Button>
                </div>
              )}

              <div className="w-full border border-white/10 rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-bg-tertiary/50 border-b border-white/10 text-text-muted">
                    <tr>
                      <th className="px-4 py-2 font-medium">Login</th>
                      <th className="px-4 py-2 font-medium">Nome</th>
                      <th className="px-4 py-2 font-medium">Notas</th>
                      <th className="px-4 py-2 font-medium">Role</th>
                      <th className="px-4 py-2 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {usersList.map(u => (
                      <tr key={u.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-2 text-text-primary">{u.username}</td>
                        <td className="px-4 py-2 text-text-secondary">{u.display_name}</td>
                        <td className="px-4 py-2 text-text-muted">{u.note_count}</td>
                        <td className="px-4 py-2">
                          {u.is_admin ? (
                            <span className="text-[10px] bg-accent-primary/20 text-accent-primary px-1.5 py-0.5 rounded uppercase font-bold">Admin</span>
                          ) : (
                            <span className="text-[10px] bg-white/10 text-text-muted px-1.5 py-0.5 rounded uppercase">User</span>
                          )}
                        </td>
                        <td className="px-4 py-2 flex gap-2">
                          <button onClick={() => handleDeleteUser(u.id)} aria-label={`Excluir usuário ${u.username}`} className="text-red-400 hover:text-red-300 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 rounded" title="Excluir">🗑️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* REDIS */}
          {activeTab === 'redis' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h3 className="text-xl font-bold text-text-primary">🔴 Redis</h3>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${redisMetrics?.status === 'online' ? 'bg-green-500 shadow-[0_0_6px_#22c55e]' : 'bg-red-500'}`} />
                  <span className="text-xs text-text-muted">{redisMetrics?.version ? `v${redisMetrics.version}` : 'verificando...'}</span>
                  <Button variant="ghost" size="sm" onClick={loadRedisData}>↻</Button>
                </div>
              </div>
              {redisMetrics ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      { label: 'Memória Usada', value: redisMetrics.used_memory_human },
                      { label: 'Pico de Memória', value: redisMetrics.used_memory_peak_human },
                      { label: 'Limite Máximo', value: redisMetrics.maxmemory_human },
                      { label: 'Clientes Conectados', value: String(redisMetrics.connected_clients) },
                      { label: 'Uptime', value: `${redisMetrics.uptime_days}d` },
                      { label: 'AOF Persistência', value: redisMetrics.aof_enabled ? '✅ Ativo' : '⚠️ Inativo' },
                    ].map(stat => (
                      <div key={stat.label} className="bg-bg-tertiary/40 p-3 rounded-lg border border-white/5">
                        <div className="text-xs text-text-muted mb-1">{stat.label}</div>
                        <div className="text-sm font-semibold text-text-primary">{stat.value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-bg-tertiary/40 p-4 rounded-lg border border-white/5">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-sm font-medium text-text-primary">Fila Celery</div>
                        <div className="text-xs text-text-muted">{redisMetrics.queue_length} tarefas pendentes</div>
                      </div>
                      <Button variant="secondary" size="sm" onClick={handleFlushQueue}>🗑️ Limpar</Button>
                    </div>
                    <div className="w-full bg-bg-primary rounded-full h-2">
                      <div className="bg-red-500 h-2 rounded-full" style={{ width: `${Math.min(redisMetrics.queue_length * 10, 100)}%` }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs text-text-muted">
                    <div>Cache Hits: <span className="text-green-400">{redisMetrics.keyspace_hits?.toLocaleString()}</span></div>
                    <div>Cache Misses: <span className="text-red-400">{redisMetrics.keyspace_misses?.toLocaleString()}</span></div>
                  </div>
                </>
              ) : (
                <div className="text-text-muted text-sm">Carregando métricas do Redis...</div>
              )}
            </div>
          )}

          {/* POSTGRESQL */}
          {activeTab === 'postgres' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h3 className="text-xl font-bold text-text-primary">🐘 PostgreSQL</h3>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${postgresMetrics?.status === 'online' ? 'bg-green-500 shadow-[0_0_6px_#22c55e]' : 'bg-red-500'}`} />
                  <span className="text-xs text-text-muted">{postgresMetrics?.version ? `v${postgresMetrics.version}` : 'verificando...'}</span>
                  <Button variant="ghost" size="sm" onClick={loadPostgresData}>↻</Button>
                </div>
              </div>
              {postgresMetrics ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      { label: 'Tamanho do Banco', value: postgresMetrics.database_size },
                      { label: 'Conexões Ativas', value: String(postgresMetrics.active_connections) },
                      { label: 'Total de Notas', value: String(postgresMetrics.notes_total) },
                      { label: 'Notas com Embedding', value: `${postgresMetrics.notes_embedded} / ${postgresMetrics.notes_total}` },
                      { label: 'Usuários', value: String(postgresMetrics.users_total) },
                      { label: 'Links entre Notas', value: String(postgresMetrics.links_total) },
                    ].map(stat => (
                      <div key={stat.label} className="bg-bg-tertiary/40 p-3 rounded-lg border border-white/5">
                        <div className="text-xs text-text-muted mb-1">{stat.label}</div>
                        <div className="text-sm font-semibold text-text-primary">{stat.value}</div>
                      </div>
                    ))}
                  </div>
                  {postgresMetrics.notes_total > 0 && (
                    <div>
                      <div className="flex justify-between text-xs text-text-muted mb-1">
                        <span>Progresso de Embeddings</span>
                        <span>{Math.round(postgresMetrics.notes_embedded / postgresMetrics.notes_total * 100)}%</span>
                      </div>
                      <div className="w-full bg-bg-primary rounded-full h-2">
                        <div className="bg-accent-primary h-2 rounded-full" style={{ width: `${postgresMetrics.notes_embedded / postgresMetrics.notes_total * 100}%` }} />
                      </div>
                    </div>
                  )}
                  <div className="flex gap-3 pt-2 items-center">
                    <Button variant="secondary" onClick={handleVacuum} disabled={vacuumLoading}>
                      {vacuumLoading ? '⏳ Executando...' : '🧹 VACUUM ANALYZE'}
                    </Button>
                    <span className="text-xs text-text-muted">Otimiza o banco e recalcula estatísticas</span>
                  </div>
                </>
              ) : (
                <div className="text-text-muted text-sm">Carregando métricas do PostgreSQL...</div>
              )}
            </div>
          )}

          {/* SISTEMA */}
          {activeTab === 'system' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h3 className="text-xl font-bold text-text-primary">🖥️ Sistema</h3>
                <Button variant="ghost" size="sm" onClick={loadSystemData} disabled={systemLoading}>
                  {systemLoading ? '⏳' : '↻'} Atualizar
                </Button>
              </div>

              {systemStatus && (
                <div>
                  <h4 className="text-sm font-medium text-text-secondary mb-3">Status dos Serviços</h4>
                  <div className="space-y-2">
                    {(Object.entries(systemStatus) as [string, any][]).map(([svc, info]) => (
                      <div key={svc} className="flex items-center justify-between bg-bg-tertiary/40 px-4 py-2.5 rounded-lg border border-white/5">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${info.status === 'online' ? 'bg-green-500 shadow-[0_0_6px_#22c55e]' : info.status === 'offline' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                          <span className="text-sm font-medium text-text-primary capitalize">{svc}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          {info.version && <span className="text-text-muted">v{info.version}</span>}
                          {info.queue_length !== undefined && <span className="text-text-muted">{info.queue_length} na fila</span>}
                          {info.error && <span className="text-red-400 truncate max-w-[180px]" title={info.error}>{info.error}</span>}
                          <span className={`font-semibold ${info.status === 'online' ? 'text-green-400' : info.status === 'offline' ? 'text-red-400' : 'text-yellow-400'}`}>
                            {info.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {envConfig && (
                <div>
                  <h4 className="text-sm font-medium text-text-secondary mb-3">Configurações de Ambiente</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {([
                      { key: 'AI_PROVIDER', label: 'Provider de IA', type: 'select', options: ['local', 'gemini', 'claude'] as const },
                      { key: 'OLLAMA_MODEL_CHAT', label: 'Modelo Chat', type: 'text' },
                      { key: 'OLLAMA_MODEL_EMBED', label: 'Modelo Embed', type: 'text' },
                      { key: 'GEMINI_API_KEY', label: 'Gemini API Key', type: 'password' },
                      { key: 'CLAUDE_API_KEY', label: 'Claude API Key', type: 'password' },
                      { key: 'SEMANTIC_THRESHOLD', label: 'Limiar Semântico', type: 'text' },
                      { key: 'SEMANTIC_TOP_K', label: 'Links Semânticos Max', type: 'text' },
                      { key: 'RAG_TOP_K', label: 'Contexto RAG (Top K)', type: 'text' },
                      { key: 'CORS_ORIGINS', label: 'CORS Origins', type: 'text' },
                    ]).map(({ key, label, type, options }) => (
                      <div key={key}>
                        <label className="block text-xs text-text-muted mb-1">{label}</label>
                        {type === 'select' ? (
                          <select
                            value={(envEdits as any)[key] ?? (envConfig as any)[key]}
                            onChange={e => setEnvEdits(prev => ({ ...prev, [key]: e.target.value }))}
                            className="w-full bg-bg-tertiary border border-white/10 rounded p-2 text-sm text-text-primary focus:border-accent-primary"
                          >
                            {(options || []).map((o: string) => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : (
                          <input
                            type={type}
                            value={(envEdits as any)[key] ?? ((envConfig as any)[key] || '')}
                            onChange={e => setEnvEdits(prev => ({ ...prev, [key]: e.target.value }))}
                            className="w-full bg-bg-tertiary border border-white/10 rounded p-2 text-sm text-text-primary focus:border-accent-primary font-mono"
                            placeholder={type === 'password' ? '(não alterada)' : ''}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  {Object.keys(envEdits).length > 0 && (
                    <div className="mt-4 flex items-center gap-3 flex-wrap">
                      <Button variant="primary" onClick={handleSaveEnv}>💾 Salvar Configurações</Button>
                      <Button variant="ghost" onClick={() => setEnvEdits({})}>Cancelar</Button>
                      <span className="text-xs text-yellow-400">⚠️ API Keys requerem restart do backend</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </Modal>
  )
}
