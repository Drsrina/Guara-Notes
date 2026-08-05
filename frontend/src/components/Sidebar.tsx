import { useState, useMemo } from 'react'
import { useAuthStore, useAppStore, useWorkspaceStore } from '../store'
import { notesApi } from '../api/notes'
import { foldersApi } from '../api/folders'
import { SettingsModal } from './SettingsModal'
import { Button } from './ui/Button'
import { motion, AnimatePresence } from 'framer-motion'

type SortKey = 'updated_at' | 'created_at' | 'title'

export default function Sidebar() {
  const { user } = useAuthStore()
  const { notes, folders, activeNoteId, setActiveNoteId, upsertNote, removeNote, upsertFolder, notesLoading } = useAppStore()
  const { sidebarCollapsed: isCollapsed, setSidebarCollapsed: setIsCollapsed } = useWorkspaceStore()
  const [showSettings, setShowSettings] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('updated_at')
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

  const sortedNotes = useMemo(() => {
    return [...notes].sort((a, b) => {
      if (sortKey === 'title') return a.title.localeCompare(b.title)
      return new Date(b[sortKey]).getTime() - new Date(a[sortKey]).getTime()
    })
  }, [notes, sortKey])

  const handleNewNote = async () => {
    try {
      const res = await notesApi.create({ title: 'Nova Nota', content: '' })
      upsertNote(res.data)
      setActiveNoteId(res.data.id)
      if (isCollapsed) setIsCollapsed(false)
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
    <>
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 64 : 256 }}
        className="glass flex flex-col h-full border-r border-white/10 shrink-0 relative transition-all overflow-hidden"
      >
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-6 z-10 w-6 h-6 rounded-full glass-panel flex items-center justify-center text-text-secondary hover:text-accent-primary"
        >
           {isCollapsed ? '▶' : '◀'}
        </button>

        {/* Header */}
        <div className="p-4 border-b border-white/10 flex-shrink-0">
          <div className={`flex items-center justify-between mb-4 ${isCollapsed ? 'flex-col gap-4' : ''}`}>
            {!isCollapsed ? (
              <h1 className="text-lg font-bold text-accent-primary tracking-wide text-glow-neon truncate">Guará-Notes</h1>
            ) : (
              <span className="text-2xl" title="Guará-Notes">🐺</span>
            )}

            <div className={`flex gap-2 items-center ${isCollapsed ? 'flex-col' : ''}`}>
              <button
                onClick={() => setShowSettings(true)}
                title="Configurações"
                className="text-text-muted hover:text-text-primary transition-colors text-sm"
              >
                ⚙️
              </button>
            </div>
          </div>

          <div className={`flex gap-1 ${isCollapsed ? 'flex-col items-center' : ''}`}>
            <Button
              variant="primary"
              size="sm"
              onClick={handleNewNote}
              className="flex-1 w-full"
              title="Nova Nota"
            >
              {isCollapsed ? '+' : '+ Nota'}
            </Button>
            {!isCollapsed && (
              <Button
                variant="glass"
                size="sm"
                onClick={handleNewFolder}
                className="flex-1 w-full"
                title="Nova Pasta"
              >
                📁 Pasta
              </Button>
            )}
          </div>
        </div>

        {/* Árvore de Arquivos (Apenas se não colapsado) */}
        {!isCollapsed && (
          <>
            {/* Sort */}
            <div className="px-3 py-2 border-b border-white/5 flex gap-1 bg-bg-secondary/20">
              {(['updated_at', 'created_at', 'title'] as SortKey[]).map(k => (
                <button
                  key={k}
                  onClick={() => setSortKey(k)}
                  className={`text-[10px] px-2 py-1 rounded transition-colors uppercase tracking-wider font-semibold ${sortKey === k ? 'bg-accent-primary/20 text-accent-primary' : 'text-text-muted hover:text-text-secondary'}`}
                >
                  {k === 'updated_at' ? 'Edição' : k === 'created_at' ? 'Criação' : 'Nome'}
                </button>
              ))}
            </div>

            {/* Tree */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {notesLoading && (
                <div className="text-text-muted text-xs text-center py-4">Carregando...</div>
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
                        } catch (err) {}
                      }}
                      className="w-full flex items-center px-2 py-1.5 text-sm text-text-secondary hover:bg-white/5 rounded-lg cursor-pointer transition-colors"
                    >
                      <span className="mr-1.5 text-xs opacity-60">{isExpanded ? '▼' : '▶'}</span>
                      <span className="mr-1.5">📁</span>
                      <span className="truncate">{folder.name}</span>
                      <span className="ml-auto text-text-muted text-[10px] bg-white/5 px-1.5 py-0.5 rounded-full">{folderNotes.length}</span>
                    </button>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="pl-5 space-y-0.5 mt-0.5 overflow-hidden"
                        >
                          {folderNotes.map(note => (
                            <NoteItem
                              key={note.id}
                              note={note}
                              active={note.id === activeNoteId}
                              onClick={() => setActiveNoteId(note.id)}
                              onDelete={(e) => handleDeleteNote(e, note.id)}
                            />
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}

              {/* Notas sem pasta */}
              <div
                className="mt-4 min-h-[50px]"
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
                  } catch (err) {}
                }}
              >
                <div className="text-[10px] text-text-muted uppercase tracking-widest font-bold px-2 py-1 mb-1">Sem pasta</div>
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
          </>
        )}

        {/* Footer / Status Bar */}
        <div className="p-3 border-t border-white/10 bg-bg-secondary/50 text-[10px] text-text-muted flex items-center justify-between flex-shrink-0">
          {!isCollapsed ? (
             <>
               <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]"></div>
                 <span className="truncate max-w-[100px]" title={user?.display_name || user?.username}>{user?.display_name || user?.username}</span>
               </div>
               <span className="text-accent-primary/60">✓ Sincronizado</span>
             </>
          ) : (
             <div className="mx-auto w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]"></div>
          )}
        </div>
      </motion.aside>

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </>
  )
}

function NoteItem({
  note, active, onClick, onDelete
}: {
  note: { id: string; title: string; tags?: string[] }
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
        active
          ? 'bg-accent-primary/15 text-accent-primary border border-accent-primary/20'
          : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
      }`}
    >
      <span className="mr-2 text-xs opacity-70">📝</span>
      <span className="truncate flex-1">{note.title || 'Sem título'}</span>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-400 transition-all ml-1 px-1"
        title="Excluir"
      >
        ✕
      </button>
    </div>
  )
}
