import { useState } from 'react'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { useSettingsStore, useAuthStore, useAppStore } from '../store'
import { authApi } from '../api/auth'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

type TabId = 'appearance' | 'editor' | 'graph' | 'ai' | 'data' | 'profile'

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('appearance')
  const { settings, updateSettings } = useSettingsStore()
  const { user, setUser, logout } = useAuthStore()
  const { notes } = useAppStore()

  // Profile Form state
  const [displayName, setDisplayName] = useState(user?.display_name || '')

  const handleSaveProfile = async () => {
    // In a real app we'd have an update endpoint
    try {
      const res = await authApi.me() // Simulating for now, no update endpoint in auth API yet
      // If we had update: await authApi.update({ display_name: displayName })
      setUser({ ...res.data, display_name: displayName })
      alert('Perfil atualizado (simulado)')
    } catch (e) {}
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

  const tabs: { id: TabId, label: string, icon: string }[] = [
    { id: 'appearance', label: 'Aparência', icon: '🎨' },
    { id: 'editor', label: 'Editor', icon: '📝' },
    { id: 'graph', label: 'Grafo & Cérebro', icon: '🧠' },
    { id: 'ai', label: 'IA Companion', icon: '🤖' },
    { id: 'data', label: 'Dados & Sync', icon: '💾' },
    { id: 'profile', label: 'Perfil', icon: '👤' },
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Configurações" className="w-[800px] max-w-[95vw] h-[600px] max-h-[90vh]">
      <div className="flex h-full -mx-6 -my-6">
        {/* Sidebar Tabs */}
        <div className="w-48 border-r border-white/10 bg-bg-secondary/30 p-2 flex flex-col gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/30'
                  : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">

          {/* APARÊNCIA */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-text-primary border-b border-white/10 pb-2 mb-4">Aparência</h3>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-text-secondary mb-1">Tema</label>
                  <select
                    value={settings.theme}
                    onChange={e => updateSettings({ theme: e.target.value as any })}
                    className="w-full bg-bg-tertiary border border-white/10 rounded p-2 text-sm focus:border-accent-primary"
                  >
                    <option value="dark">Dark</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-text-secondary mb-1">Densidade de UI</label>
                  <select
                    value={settings.uiDensity}
                    onChange={e => updateSettings({ uiDensity: e.target.value as any })}
                    className="w-full bg-bg-tertiary border border-white/10 rounded p-2 text-sm focus:border-accent-primary"
                  >
                    <option value="compact">Compacto</option>
                    <option value="normal">Normal</option>
                    <option value="spacious">Espaçoso</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-text-secondary mb-1">Animações</label>
                  <select
                    value={settings.animations}
                    onChange={e => updateSettings({ animations: e.target.value as any })}
                    className="w-full bg-bg-tertiary border border-white/10 rounded p-2 text-sm focus:border-accent-primary"
                  >
                    <option value="smooth">Suave</option>
                    <option value="fast">Rápido</option>
                    <option value="off">Desativado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-text-secondary mb-1">Blur do Glassmorphism (px)</label>
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
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-text-primary border-b border-white/10 pb-2 mb-4">Editor</h3>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-text-secondary mb-1">Tamanho da Fonte (px)</label>
                  <input
                    type="range" min="12" max="24"
                    value={settings.editorFontSize}
                    onChange={e => updateSettings({ editorFontSize: parseInt(e.target.value) })}
                    className="w-full accent-accent-primary"
                  />
                  <div className="text-right text-xs text-text-muted">{settings.editorFontSize}px</div>
                </div>

                <div>
                  <label className="block text-sm text-text-secondary mb-1">Auto-save delay (s)</label>
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

          {/* GRAFO & CÉREBRO */}
          {activeTab === 'graph' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-text-primary border-b border-white/10 pb-2 mb-4">Grafo & Cérebro 3D</h3>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-text-secondary mb-1">Modo de Cor</label>
                  <select
                    value={settings.colorMode}
                    onChange={e => updateSettings({ colorMode: e.target.value as any })}
                    className="w-full bg-bg-tertiary border border-white/10 rounded p-2 text-sm focus:border-accent-primary"
                  >
                    <option value="tag">Por Tag</option>
                    <option value="folder">Por Pasta</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-text-secondary mb-1">Tamanho dos Nós</label>
                  <select
                    value={settings.nodeSize}
                    onChange={e => updateSettings({ nodeSize: e.target.value as any })}
                    className="w-full bg-bg-tertiary border border-white/10 rounded p-2 text-sm focus:border-accent-primary"
                  >
                    <option value="small">Pequeno</option>
                    <option value="medium">Médio</option>
                    <option value="large">Grande</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-text-secondary mb-1">Força de Atração</label>
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
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-text-primary border-b border-white/10 pb-2 mb-4">IA Companion</h3>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-text-secondary mb-1">Provedor</label>
                  <select
                    value={settings.aiProvider}
                    onChange={e => updateSettings({ aiProvider: e.target.value as any })}
                    className="w-full bg-bg-tertiary border border-white/10 rounded p-2 text-sm focus:border-accent-primary"
                  >
                    <option value="local">Ollama (Local)</option>
                    <option value="gemini">Google Gemini</option>
                    <option value="claude">Anthropic Claude</option>
                  </select>
                </div>

                {settings.aiProvider === 'local' && (
                  <div>
                    <label className="block text-sm text-text-secondary mb-1">Modelo</label>
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
                  <label className="block text-sm text-text-secondary mb-1">Temperatura: {settings.aiTemperature}</label>
                  <input
                    type="range" min="0" max="1" step="0.1"
                    value={settings.aiTemperature}
                    onChange={e => updateSettings({ aiTemperature: parseFloat(e.target.value) })}
                    className="w-full accent-accent-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm text-text-secondary mb-1">Contexto RAG (Top K): {settings.aiRagTopK}</label>
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

          {/* DADOS & SYNC */}
          {activeTab === 'data' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-text-primary border-b border-white/10 pb-2 mb-4">Dados & Sincronização</h3>

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

              <div className="pt-4">
                <Button variant="secondary" onClick={handleExportBase} className="w-full sm:w-auto">
                  Exportar Base (JSON)
                </Button>
              </div>
            </div>
          )}

          {/* PERFIL */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-text-primary border-b border-white/10 pb-2 mb-4">Perfil</h3>

              <div className="max-w-md space-y-4">
                <div>
                  <label className="block text-sm text-text-secondary mb-1">Nome de Exibição</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    className="w-full bg-bg-tertiary border border-white/10 rounded p-2 text-sm focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <Button variant="primary" onClick={handleSaveProfile}>Salvar Perfil</Button>
                  <Button variant="ghost" onClick={logout} className="text-red-400 hover:text-red-300">Logout</Button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </Modal>
  )
}
