import { useState, useMemo, useCallback, useEffect } from 'react'
import { useAuthStore, useAppStore, useWorkspaceStore } from '../store'
import { notesApi } from '../api/notes'
import { foldersApi } from '../api/folders'
import { SettingsModal } from './SettingsModal'
import { Button } from './ui/Button'
import { motion, AnimatePresence } from 'framer-motion'
import { useContextMenu } from './ContextMenu'
import { confirmDialog, promptDialog } from './ui/Dialogs'
import toast from 'react-hot-toast'

type SortKey = 'updated_at' | 'created_at' | 'title'

export default function Sidebar() {
  const { user } = useAuthStore()
  const { notes, folders, upsertNote, removeNote, upsertFolder, removeFolder, notesLoading, foldersLoading } = useAppStore()
  const { sidebarCollapsed: isCollapsed, setSidebarCollapsed: setIsCollapsed, openNoteInFocusedPane } = useWorkspaceStore()
  const [showSettings, setShowSettings] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('updated_at')
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<typeof notes | null>(null)
  const [searching, setSearching] = useState(false)
  const { open: openCtx, render: renderCtx } = useContextMenu()

  const sortedNotes = useMemo(() => {
    const source = searchResults !== null ? searchResults : notes
    return [...source].sort((a, b) => {
      if (sortKey === 'title') return a.title.localeCompare(b.title)
      return new Date(b[sortKey]).getTime() - new Date(a[sortKey]).getTime()
    })
  }, [notes, searchResults, sortKey])

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q)
    if (!q.trim()) {
      setSearchResults(null)
      return
    }
    setSearching(true)
  }, [])

  useEffect(() => {
    if (!searchQuery.trim()) return
    const timer = setTimeout(async () => {
      try {
        const res = await notesApi.search(searchQuery, 'hybrid', 30)
        setSearchResults(res.data as any)
      } catch {
        setSearchResults(null)
      } finally {
        setSearching(false)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleNewNote = async () => {
    try {
      const res = await notesApi.create({ title: 'Nova Nota', content: '' })
      upsertNote(res.data)
      openNoteInFocusedPane(res.data.id)
      if (isCollapsed) setIsCollapsed(false)
    } catch (e) {
      console.error('Erro ao criar nota', e)
    }
  }

  const handleNewFolder = async () => {
    promptDialog('Nova Pasta', '', async (name) => {
      if (!name) return
      try {
        const res = await foldersApi.create({ name })
        upsertFolder(res.data)
      } catch (e) {
        toast.error('Erro ao criar pasta')
      }
    })
  }

  const handleDeleteNote = async (id: string) => {
    confirmDialog('Excluir Nota', 'Tem certeza que deseja excluir esta nota?', async () => {
      try {
        await notesApi.delete(id)
        removeNote(id)
        toast.success('Nota excluída')
      } catch (e) {
        toast.error('Erro ao excluir nota')
      }
    })
  }

  const handleDeleteFolder = async (id: string) => {
    confirmDialog('Excluir Pasta', 'Excluir esta pasta e todas as notas dentro dela?', async () => {
      try {
        await foldersApi.delete(id)
        removeFolder(id)
        toast.success('Pasta excluída')
      } catch (e) {
        toast.error('Erro ao excluir pasta')
      }
    })
  }

  const handleForceEmbed = async (noteId: string, noteTitle: string) => {
    try {
      await notesApi.forceEmbed(noteId)
      toast.success(`Re-embedding enfileirado para "${noteTitle}"`)
    } catch (e) {
      toast.error('Erro ao enfileirar embedding')
    }
  }

  const handleRenameNote = async (noteId: string, currentTitle: string) => {
    promptDialog('Renomear Nota', currentTitle, async (newTitle) => {
      if (!newTitle || newTitle === currentTitle) return
      try {
        const res = await notesApi.update(noteId, { title: newTitle })
        upsertNote(res.data)
      } catch (e) {
        toast.error('Erro ao renomear nota')
      }
    })
  }

  const handleDuplicateNote = async (noteId: string) => {
    const note = notes.find(n => n.id === noteId)
    if (!note) return
    try {
      const res = await notesApi.create({
        title: `${note.title} (cópia)`,
        content: note.content,
        folder_id: note.folder_id || undefined,
        tags: note.tags,
      })
      upsertNote(res.data)
      openNoteInFocusedPane(res.data.id)
    } catch (e) {
      console.error('Erro ao duplicar nota', e)
    }
  }

  const handleExportNoteMd = (note: typeof notes[0]) => {
    const blob = new Blob([`# ${note.title}\n\n${note.content}`], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${note.title.replace(/[^a-z0-9]/gi, '_')}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleRenameFolder = async (folderId: string, currentName: string) => {
    promptDialog('Renomear Pasta', currentName, async (newName) => {
      if (!newName || newName === currentName) return
      try {
        const res = await foldersApi.update(folderId, { name: newName })
        upsertFolder(res.data)
      } catch (e) {
        toast.error('Erro ao renomear pasta')
      }
    })
  }

  const getNoteContextItems = (note: typeof notes[0]) => [
    {
      label: 'Abrir em novo painel', icon: '⊞',
      action: () => {
        useWorkspaceStore.getState().addPane()
        // Aguarda o painel ser criado
        setTimeout(() => openNoteInFocusedPane(note.id), 50)
      }
    },
    { label: 'Renomear', icon: '✏️', action: () => handleRenameNote(note.id, note.title) },
    { label: 'Duplicar', icon: '📋', action: () => handleDuplicateNote(note.id) },
    {
      label: 'Mover para pasta', icon: '📁',
      submenu: [
        { label: 'Sem pasta', icon: '📄', action: async () => {
          const res = await notesApi.update(note.id, { folder_id: null })
          upsertNote(res.data)
        }},
        ...folders.map(f => ({
          label: f.name, icon: '📁',
          action: async () => {
            const res = await notesApi.update(note.id, { folder_id: f.id })
            upsertNote(res.data)
          }
        }))
      ]
    },
    { label: 'Exportar como .md', icon: '⬇️', action: () => handleExportNoteMd(note) },
    { label: 'Forçar re-embedding', icon: '🔄', action: () => handleForceEmbed(note.id, note.title) },
    { type: 'separator' as const },
    { label: 'Excluir nota', icon: '🗑️', danger: true, action: () => handleDeleteNote(note.id) },
  ]

  const getFolderContextItems = (folder: typeof folders[0]) => [
    { label: 'Renomear', icon: '✏️', action: () => handleRenameFolder(folder.id, folder.name) },
    { type: 'separator' as const },
    { label: 'Excluir pasta', icon: '🗑️', danger: true, action: () => handleDeleteFolder(folder.id) },
  ]

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
          className="absolute -right-3 top-6 z-10 w-6 h-6 rounded-full glass-panel flex items-center justify-center text-text-secondary hover:text-accent-primary hover:scale-110 transition-transform shadow-md cursor-pointer"
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
            <Button variant="primary" size="sm" onClick={handleNewNote} className="flex-1 w-full" title="Nova Nota">
              {isCollapsed ? '+' : '+ Nota'}
            </Button>
            {!isCollapsed && (
              <Button variant="glass" size="sm" onClick={handleNewFolder} className="flex-1 w-full" title="Nova Pasta">
                📁 Pasta
              </Button>
            )}
          </div>
        </div>

        {/* Conteúdo */}
        {!isCollapsed && (
          <>
            {/* Barra de busca */}
            <div className="px-3 py-2 border-b border-white/5">
              <div className="relative flex items-center">
                <span className="absolute left-3 text-text-muted pointer-events-none">🔍</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                  placeholder="Pesquisar notas..."
                  className="w-full bg-bg-tertiary/60 border border-white/8 rounded-md pl-9 pr-8 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-primary/50 transition-all focus:ring-1 focus:ring-accent-primary/50 shadow-inner"
                />
                {searching && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-accent-primary animate-pulse">...</span>
                )}
                {searchQuery && !searching && (
                  <button
                    onClick={() => { setSearchQuery(''); setSearchResults(null) }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary text-[11px] transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>
              {searchResults !== null && (
                <div className="mt-1 text-[11px] text-text-muted">
                  {searchResults.length} resultado(s)
                </div>
              )}
            </div>

            {/* Sort */}
            <div className="px-3 py-2 border-b border-white/5 flex gap-1 bg-bg-secondary/20">
              {(['updated_at', 'created_at', 'title'] as SortKey[]).map(k => (
                <button
                  key={k}
                  onClick={() => setSortKey(k)}
                  className={`text-[11px] px-2 py-1 rounded transition-colors uppercase tracking-wider font-semibold ${sortKey === k ? 'bg-accent-primary/20 text-accent-primary' : 'text-text-muted hover:text-text-secondary'}`}
                >
                  {k === 'updated_at' ? 'Edição' : k === 'created_at' ? 'Criação' : 'Nome'}
                </button>
              ))}
            </div>

            {/* Árvore */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {(notesLoading || foldersLoading) && (
                <div className="text-text-muted text-xs text-center py-4 animate-pulse">Carregando...</div>
              )}

              {/* Modo busca: lista plana */}
              {searchResults !== null ? (
                <div className="space-y-0.5">
                  {sortedNotes.map(note => (
                    <NoteItem
                      key={note.id}
                      note={note}
                      active={false}
                      onClick={() => openNoteInFocusedPane(note.id)}
                      onContextMenu={e => openCtx(e, getNoteContextItems(note))}
                    />
                  ))}
                  {sortedNotes.length === 0 && (
                    <div className="text-text-muted text-xs text-center py-4">Nenhuma nota encontrada.</div>
                  )}
                </div>
              ) : (
                <>
                  {/* Pastas */}
                  {folders.map(folder => {
                    const folderNotes = sortedNotes.filter(n => n.folder_id === folder.id)
                    const isExpanded = expandedFolders.has(folder.id)
                    return (
                      <div key={folder.id}>
                        <button
                          onClick={() => toggleFolder(folder.id)}
                          onContextMenu={e => openCtx(e, getFolderContextItems(folder))}
                          onDragOver={e => e.preventDefault()}
                          onDrop={async e => {
                            e.preventDefault()
                            const noteId = e.dataTransfer.getData('noteId')
                            if (!noteId) return
                            try {
                              const note = notes.find(n => n.id === noteId)
                              if (note && note.folder_id !== folder.id) {
                                const res = await notesApi.update(noteId, { folder_id: folder.id })
                                upsertNote(res.data)
                              }
                            } catch {}
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
                                  active={false}
                                  onClick={() => openNoteInFocusedPane(note.id)}
                                  onContextMenu={e => openCtx(e, getNoteContextItems(note))}
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
                    onDragOver={e => e.preventDefault()}
                    onDrop={async e => {
                      e.preventDefault()
                      const noteId = e.dataTransfer.getData('noteId')
                      if (!noteId) return
                      try {
                        const note = notes.find(n => n.id === noteId)
                        if (note && note.folder_id !== null) {
                          const res = await notesApi.update(noteId, { folder_id: null })
                          upsertNote(res.data)
                        }
                      } catch {}
                    }}
                  >
                    <div className="text-[11px] text-text-muted uppercase tracking-widest font-bold px-2 py-1 mb-1">Sem pasta</div>
                    {sortedNotes.filter(n => n.folder_id === null).map(note => (
                      <NoteItem
                        key={note.id}
                        note={note}
                        active={false}
                        onClick={() => openNoteInFocusedPane(note.id)}
                        onContextMenu={e => openCtx(e, getNoteContextItems(note))}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="p-3 border-t border-white/10 bg-bg-secondary/50 text-[11px] text-text-muted flex items-center justify-between flex-shrink-0">
          {!isCollapsed ? (
            <>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]"></div>
                <span className="truncate max-w-[100px]" title={user?.display_name || user?.username}>
                  {user?.display_name || user?.username}
                </span>
                {user?.is_admin && <span className="text-accent-primary text-[9px] font-bold">ADMIN</span>}
              </div>
              <span className="text-accent-primary/60">✓ Sync</span>
            </>
          ) : (
            <div className="mx-auto w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]"></div>
          )}
        </div>
      </motion.aside>

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />

      {/* Context menu portal */}
      {renderCtx}
    </>
  )
}

function NoteItem({
  note, active, onClick, onContextMenu
}: {
  note: { id: string; title: string; tags?: string[] }
  active: boolean
  onClick: () => void
  onContextMenu: (e: React.MouseEvent) => void
}) {
  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      draggable
      onDragStart={e => {
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
    </div>
  )
}
