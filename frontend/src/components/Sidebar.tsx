import { useState } from 'react'
import { useAppStore, useAuthStore } from '../store'
import { notesApi } from '../api/notes'
import { foldersApi } from '../api/folders'

type SortKey = 'updated_at' | 'created_at' | 'title'

export default function Sidebar() {
  const { notes, folders, activeNoteId, setActiveNoteId, upsertNote, removeNote, upsertFolder, notesLoading } = useAppStore()
  const { logout, user, setUser } = useAuthStore()
  const [sortKey, setSortKey] = useState<SortKey>('updated_at')
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [showSettings, setShowSettings] = useState(false)
  const [aiProvider, setAiProvider] = useState<string>((user?.theme_prefs as any)?.ai_provider || 'local')

  const handleSaveSettings = async () => {
    try {
      // Mock da chamada da API se api/auth.ts não tiver método update, depois atualizamos lá também.
      // fetch PUT /api/auth/users/me
      const token = useAuthStore.getState().token
      const res = await fetch('/api/auth/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ theme_prefs: { ...(user?.theme_prefs || {}), ai_provider: aiProvider } })
      })
      const data = await res.json()
      setUser(data)
      setShowSettings(false)
    } catch (e) {
      console.error('Erro ao salvar configurações', e)
    }
  }

  const sortedNotes = [...notes].sort((a, b) => {
    if (sortKey === 'title') return a.title.localeCompare(b.title)
    return new Date(b[sortKey]).getTime() - new Date(a[sortKey]).getTime()
  })

  const handleNewNote = async () => {
    try {
      const res = await notesApi.create({ title: 'Nova Nota', content: '' })
      upsertNote(res.data)
      setActiveNoteId(res.data.id)
    } catch (e) {
      console.error('Erro ao criar nota', e)
    }
  }

  const handleNewFolder = async () => {
    const name = prompt('Nome da pasta:')
    if (!name) return
    try {
      const res = await foldersApi.create({ name })
      upsertFolder(res.data)
    } catch (e) {
      console.error('Erro ao criar pasta', e)
    }
  }

  const handleDeleteNote = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm('Excluir esta nota?')) return
    try {
      await notesApi.delete(id)
      removeNote(id)
    } catch (e) {
      console.error('Erro ao excluir nota', e)
    }
  }

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <aside className="w-64 glass flex flex-col h-full border-r border-white/10 shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold text-guara-neon tracking-wide text-glow-neon">Guará-Notes</h1>
          <div className="flex gap-2 items-center">
            <button
              onClick={() => setShowSettings(true)}
              title="Configurações"
              className="text-zinc-500 hover:text-zinc-300 transition-colors text-sm"
            >
              ⚙️
            </button>
            <button
              id="sidebar-logout"
              onClick={logout}
              title="Sair"
              className="text-zinc-500 hover:text-zinc-300 transition-colors text-xs"
            >
              ⎋
            </button>
          </div>
        </div>

        {/* Ações rápidas */}
        <div className="flex gap-1">
          <button
            id="new-note-btn"
            onClick={handleNewNote}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 rounded-lg border border-orange-500/20 transition-all"
          >
            <span>+</span> Nota
          </button>
          <button
            id="new-folder-btn"
            onClick={handleNewFolder}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-white/5 hover:bg-white/10 text-zinc-400 rounded-lg border border-white/10 transition-all"
          >
            <span>📁</span> Pasta
          </button>
        </div>
      </div>

      {/* Sort */}
      <div className="px-3 py-2 border-b border-white/5 flex gap-1">
        {(['updated_at', 'created_at', 'title'] as SortKey[]).map(k => (
          <button
            key={k}
            onClick={() => setSortKey(k)}
            className={`text-xs px-2 py-1 rounded transition-colors ${sortKey === k ? 'bg-white/10 text-zinc-200' : 'text-zinc-600 hover:text-zinc-400'}`}
          >
            {k === 'updated_at' ? 'Edição' : k === 'created_at' ? 'Criação' : 'Nome'}
          </button>
        ))}
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {notesLoading && (
          <div className="text-zinc-600 text-xs text-center py-4">Carregando...</div>
        )}

        {/* Pastas */}
        {folders.map(folder => {
          const folderNotes = sortedNotes.filter(n => n.folder_id === folder.id)
          const isExpanded = expandedFolders.has(folder.id)
          return (
            <div key={folder.id}>
              <button
                onClick={() => toggleFolder(folder.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={async (e) => {
                  e.preventDefault()
                  const noteId = e.dataTransfer.getData('noteId')
                  if (!noteId) return
                  try {
                    const note = notes.find(n => n.id === noteId)
                    if (note && note.folder_id !== folder.id) {
                      const res = await notesApi.update(noteId, { folder_id: folder.id })
                      upsertNote(res.data)
                    }
                  } catch (err) {
                    console.error('Erro ao mover nota', err)
                  }
                }}
                className="w-full flex items-center px-2 py-1.5 text-sm text-zinc-300 hover:bg-white/5 rounded-lg cursor-pointer transition-colors"
              >
                <span className="mr-1.5 text-xs text-zinc-500">{isExpanded ? '▼' : '▶'}</span>
                <span className="mr-1.5">📁</span>
                <span className="truncate">{folder.name}</span>
                <span className="ml-auto text-zinc-600 text-xs">{folderNotes.length}</span>
              </button>
              {isExpanded && (
                <div className="pl-5 space-y-0.5 mt-0.5">
                  {folderNotes.map(note => (
                    <NoteItem
                      key={note.id}
                      note={note}
                      active={note.id === activeNoteId}
                      onClick={() => setActiveNoteId(note.id)}
                      onDelete={(e) => handleDeleteNote(e, note.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {/* Notas sem pasta */}
        <div
          className="mt-2 min-h-[50px]"
          onDragOver={(e) => e.preventDefault()}
          onDrop={async (e) => {
            e.preventDefault()
            const noteId = e.dataTransfer.getData('noteId')
            if (!noteId) return
            try {
              const note = notes.find(n => n.id === noteId)
              if (note && note.folder_id !== null) {
                const res = await notesApi.update(noteId, { folder_id: null })
                upsertNote(res.data)
              }
            } catch (err) {
              console.error('Erro ao remover nota da pasta', err)
            }
          }}
        >
          <div className="text-xs text-zinc-600 uppercase tracking-wider px-2 py-1">Sem pasta</div>
          {sortedNotes.filter(n => n.folder_id === null).map(note => (
            <NoteItem
              key={note.id}
              note={note}
              active={note.id === activeNoteId}
              onClick={() => setActiveNoteId(note.id)}
              onDelete={(e) => handleDeleteNote(e, note.id)}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-white/10 text-xs text-zinc-600 text-center flex items-center justify-between">
        <span>{user?.display_name || user?.username}</span>
        <span className="text-orange-500/50">AI Powered 🐺</span>
      </div>

      {/* Modal de Configurações */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="glass-panel p-6 rounded-lg w-96 max-w-[90vw] shadow-2xl box-glow-neon border border-guara-neon/30">
            <h2 className="text-lg font-bold text-guara-neon mb-4">Configurações</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Provedor de IA (Companion)</label>
                <select 
                  value={aiProvider}
                  onChange={(e) => setAiProvider(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 rounded px-2 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-guara-neon"
                >
                  <option value="local">Ollama (Local)</option>
                  <option value="gemini">Google Gemini</option>
                  <option value="claude">Anthropic Claude</option>
                </select>
                <p className="text-[10px] text-zinc-500 mt-1">
                  Nota: Chaves de API para serviços externos devem ser configuradas no backend (.env).
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button 
                onClick={() => setShowSettings(false)}
                className="px-4 py-1.5 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-sm transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveSettings}
                className="px-4 py-1.5 rounded bg-guara-neon/20 border border-guara-neon text-guara-neon hover:bg-guara-neon hover:text-zinc-950 font-medium text-sm transition-colors"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}

function NoteItem({
  note, active, onClick, onDelete
}: {
  note: { id: string; title: string }
  active: boolean
  onClick: () => void
  onDelete: (e: React.MouseEvent) => void
}) {
  return (
    <div
      onClick={onClick}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('noteId', note.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      className={`group flex items-center px-2 py-1.5 text-sm rounded-lg cursor-pointer transition-colors ${
        active ? 'bg-orange-500/15 text-orange-300 border border-orange-500/20' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
      }`}
    >
      <span className="mr-1.5 opacity-50 text-xs">📄</span>
      <span className="truncate flex-1">{note.title || 'Sem título'}</span>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all ml-1 px-1"
        title="Excluir"
      >
        ×
      </button>
    </div>
  )
}
