import { useState, useEffect, useCallback, useRef } from 'react'
import MDEditor from '@uiw/react-md-editor'
import { notesApi } from '../api/notes'
import { useAppStore, useTagsStore, useSettingsStore } from '../store'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import Whiteboard from './Whiteboard'
import Dataview from './Dataview'
import { motion, AnimatePresence } from 'framer-motion'
import { useContextMenu } from './ContextMenu'
import toast from 'react-hot-toast'

interface EditorProps {
  noteId: string | null
  inFocusMode?: boolean
  panelId?: string
}

export default function Editor({ noteId, inFocusMode = false, panelId }: EditorProps) {
  useEffect(() => {
    if (!panelId) return
    const handleExportMd = () => document.getElementById(`export-md-btn-${panelId}`)?.click()
    const handleExportPdf = () => document.getElementById(`export-pdf-btn-${panelId}`)?.click()
    document.addEventListener(`export-md-${panelId}`, handleExportMd)
    document.addEventListener(`export-pdf-${panelId}`, handleExportPdf)
    return () => {
      document.removeEventListener(`export-md-${panelId}`, handleExportMd)
      document.removeEventListener(`export-pdf-${panelId}`, handleExportPdf)
    }
  }, [panelId])

  const { notes, upsertNote, toggleFocusMode } = useAppStore()
  const { getTagColor, addTag } = useTagsStore()
  const { settings } = useSettingsStore()
  const note = notes.find(n => n.id === noteId)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const [showTagPanel, setShowTagPanel] = useState(false)
  const [versions, setVersions] = useState<any[]>([])
  const [showVersions, setShowVersions] = useState(false)
  const [viewMode, setViewMode] = useState<'markdown' | 'whiteboard' | 'dataview'>('markdown')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  
  const { open: openCtx, render: renderCtx } = useContextMenu()

  // Sync with note state
  useEffect(() => {
    if (note) {
      setTitle(note.title)
      setContent(note.content)
      setTags(note.tags || [])
      loadVersions()
    } else {
      setTitle('')
      setContent('')
      setTags([])
      setVersions([])
    }
  }, [noteId])

  const loadVersions = async () => {
    if (!noteId) return
    try {
      const res = await notesApi.getVersions(noteId)
      setVersions(res.data)
    } catch (e) {
      console.error("Erro ao carregar versões", e)
    }
  }

  const handleRestore = async (versionId: string) => {
    if (!noteId) return
    try {
      const res = await notesApi.restoreVersion(noteId, versionId)
      upsertNote(res.data)
      setTitle(res.data.title)
      setContent(res.data.content)
      setShowVersions(false)
      loadVersions()
    } catch (e) {}
  }

  const doSave = useCallback(async (newTitle: string, newContent: string, newTags: string[]) => {
    if (!noteId) return
    setSaving(true)
    try {
      const res = await notesApi.update(noteId, { title: newTitle, content: newContent, tags: newTags })
      upsertNote(res.data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      loadVersions()
    } catch (e) {
      toast.error('Erro ao salvar nota')
    } finally {
      setSaving(false)
    }
  }, [noteId, upsertNote])

  const scheduleAutosave = (newTitle: string, newContent: string, newTags: string[]) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSave(newTitle, newContent, newTags), settings.autoSaveDelay * 1000)
  }

  const handleContentChange = (val?: string) => {
    const v = val ?? ''
    setContent(v)
    scheduleAutosave(title, v, tags)
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value)
    scheduleAutosave(e.target.value, content, tags)
  }

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTag.trim()) {
      const t = newTag.trim().toLowerCase()
      if (!tags.includes(t)) {
        const updatedTags = [...tags, t]
        setTags(updatedTags)
        addTag({ name: t, color: getTagColor(t) }) // Ensure tag config exists
        scheduleAutosave(title, content, updatedTags)
      }
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    const updatedTags = tags.filter(t => t !== tagToRemove)
    setTags(updatedTags)
    scheduleAutosave(title, content, updatedTags)
  }

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [noteId])

  const exportMD = () => {
    const blob = new Blob([`# ${title || 'nota'}\n\n${content}`], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title || 'nota'}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportPDF = async () => {
    if (!editorRef.current) return
    const preview = editorRef.current.querySelector('.wmde-markdown') as HTMLElement
    if (!preview) return
    try {
      const canvas = await html2canvas(preview, { backgroundColor: '#09090b', scale: 2 })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [canvas.width, canvas.height] })
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height)
      pdf.save(`${title || 'nota'}.pdf`)
    } catch (e) {}
  }

  if (!noteId) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-bg-primary">
        <div className="text-center">
          <div className="text-5xl mb-4">🐺</div>
          <p className="text-text-muted text-sm">Selecione uma nota ou crie uma nova</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`h-full flex relative overflow-hidden bg-bg-primary`} data-color-mode={settings.theme}>
      {/* Editor Content Area */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Hidden buttons for external export trigger */}
        <button id={`export-md-btn-${panelId}`} onClick={exportMD} className="hidden" />
        <button id={`export-pdf-btn-${panelId}`} onClick={exportPDF} className="hidden" />
        
        {/* Topbar: Only show in regular mode, not in focus mode (handled by Layout/MainView) */}
        {!inFocusMode && (
          <div className="flex items-center justify-between px-6 py-3 border-b border-white/10 shrink-0">
            <input
              value={title}
              onChange={handleTitleChange}
              className="flex-1 bg-transparent text-text-primary text-xl font-bold focus:outline-none placeholder-text-muted"
              placeholder="Título da nota..."
            />

            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted mr-2">
                {saving ? '💾 Salvando...' : saved ? '✅ Salvo' : ''}
              </span>

              {/* View Mode Toggle */}
              <div className="flex bg-bg-tertiary rounded-md p-1 mr-2 border border-white/5">
                {(['markdown', 'whiteboard', 'dataview'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-2 py-1 text-[10px] rounded uppercase font-bold tracking-wider transition-colors ${
                      viewMode === mode ? 'bg-accent-primary/20 text-accent-primary' : 'text-text-muted hover:text-text-secondary'
                    }`}
                    title={`Modo ${mode}`}
                  >
                    {mode === 'markdown' ? 'MD' : mode === 'whiteboard' ? 'Wb' : 'Db'}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowTagPanel(!showTagPanel)}
                className={`px-3 py-1.5 text-xs rounded transition-colors flex items-center gap-1 ${showTagPanel ? 'bg-accent-primary/20 text-accent-primary' : 'bg-white/5 hover:bg-white/10 text-text-secondary'}`}
              >
                🏷️ Tags <span className="bg-white/10 px-1.5 rounded-full text-[10px] ml-1">{tags.length}</span>
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowVersions(!showVersions)}
                  className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 text-text-secondary rounded transition-colors"
                  title="Histórico de Versões"
                >
                  ⏱️
                </button>
                {showVersions && (
                  <div className="absolute right-0 mt-2 w-64 glass-panel border border-accent-primary/20 rounded-md shadow-xl py-2 z-50">
                    <div className="px-3 pb-2 mb-2 border-b border-white/10 text-xs font-semibold text-accent-primary text-glow-neon">
                      Histórico de Versões
                    </div>
                    {versions.length === 0 ? (
                      <div className="px-3 text-xs text-text-muted">Nenhum backup disponível.</div>
                    ) : (
                      versions.map((v) => (
                        <div key={v.id} className="px-3 py-2 hover:bg-white/5 flex flex-col gap-1 transition-colors">
                          <span className="text-xs text-text-primary truncate">{v.title}</span>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-text-muted">{new Date(v.created_at).toLocaleString()}</span>
                            <button 
                              onClick={() => handleRestore(v.id)}
                              className="text-[10px] text-accent-primary hover:text-accent-glow"
                            >
                              Restaurar
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={async () => {
                  try {
                    await notesApi.forceEmbed(noteId);
                    toast.success('Re-embedding enfileirado para esta nota.');
                  } catch(e) {
                    toast.error('Erro ao forçar re-embedding');
                  }
                }}
                className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 text-text-secondary rounded transition-colors"
                title="Forçar Re-embedding"
              >
                🔄
              </button>

              <button
                onClick={toggleFocusMode}
                className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 text-text-secondary rounded transition-colors"
                title="Modo Escritor (Focus)"
              >
                ⤢ Focus
              </button>
            </div>
          </div>
        )}

        {inFocusMode && (
           <div className="px-6 py-4 border-b border-white/10 shrink-0">
              <input
                value={title}
                onChange={handleTitleChange}
                className="w-full bg-transparent text-text-primary text-3xl font-bold focus:outline-none placeholder-text-muted"
                placeholder="Título da nota..."
              />
           </div>
        )}

        {/* View Area */}
        <div 
          className={`flex-1 overflow-hidden relative ${settings.editorMaxWidth && inFocusMode ? 'max-w-4xl mx-auto w-full' : 'w-full'}`} 
          ref={editorRef}
          onContextMenu={(e) => {
            openCtx(e, [
              { label: 'Formatação Básica', disabled: true },
              { label: 'Negrito', icon: 'B', action: () => document.execCommand('bold') },
              { label: 'Itálico', icon: 'I', action: () => document.execCommand('italic') },
              { type: 'separator' },
              { label: 'Inserir Wikilink', icon: '🔗', action: () => {
                 document.execCommand('insertText', false, '[[]]');
              }},
            ]);
          }}
        >
          {viewMode === 'markdown' && (
            <MDEditor
              value={content}
              onChange={handleContentChange}
              height="100%"
              preview={settings.livePreview ? 'live' : 'edit'}
              className="!h-full !bg-transparent !border-none custom-scrollbar"
              style={{ height: '100%', fontSize: `${settings.editorFontSize}px` }}
              textareaProps={{
                placeholder: 'Comece a escrever... (Markdown suportado, use [[título]] para wikilinks)',
              }}
            />
          )}
          {viewMode === 'whiteboard' && <Whiteboard noteId={noteId} />}
          {viewMode === 'dataview' && <Dataview />}
        </div>
      </div>

      {/* Right Sidebar: Tag Panel */}
      <AnimatePresence>
        {showTagPanel && !inFocusMode && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 256, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="h-full border-l border-white/10 bg-bg-secondary/30 backdrop-blur-md flex flex-col shrink-0 overflow-hidden"
          >
            <div className="p-4 border-b border-white/10">
              <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                🏷️ Tags da Nota
              </h3>
              <input
                type="text"
                placeholder="Adicionar tag... (Enter)"
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                onKeyDown={handleAddTag}
                className="w-full input-glass text-xs py-1.5 px-2"
              />
            </div>
            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar flex flex-wrap gap-2 content-start">
              {tags.map(tag => {
                const color = getTagColor(tag)
                return (
                  <div
                    key={tag}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border"
                    style={{
                      backgroundColor: `${color}20`, // 20% opacity
                      borderColor: `${color}50`,
                      color: color
                    }}
                  >
                    #{tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:bg-white/20 rounded-full w-4 h-4 flex items-center justify-center transition-colors"
                    >
                      ×
                    </button>
                  </div>
                )
              })}
              {tags.length === 0 && (
                <div className="text-xs text-text-muted text-center w-full mt-4">
                  Nenhuma tag adicionada.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {renderCtx}
    </div>
  )
}
