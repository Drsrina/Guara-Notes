import { useState, useEffect, useCallback, useRef } from 'react'
import MDEditor from '@uiw/react-md-editor'
import { notesApi } from '../api/notes'
import { useAppStore } from '../store'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import Whiteboard from './Whiteboard'
import Dataview from './Dataview'

interface EditorProps {
  noteId: string | null
}

export default function Editor({ noteId }: EditorProps) {
  const { notes, upsertNote, focusMode, toggleFocusMode } = useAppStore()
  const note = notes.find(n => n.id === noteId)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [versions, setVersions] = useState<any[]>([])
  const [showVersions, setShowVersions] = useState(false)
  const [viewMode, setViewMode] = useState<'markdown' | 'whiteboard' | 'dataview'>('markdown')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const editorRef = useRef<HTMLDivElement>(null)

  // Sincroniza estado local quando a nota muda
  useEffect(() => {
    if (note) {
      setTitle(note.title)
      setContent(note.content)
      loadVersions()
    } else {
      setTitle('')
      setContent('')
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
    } catch (e) {
      console.error("Erro ao restaurar versão", e)
    }
  }

  const doSave = useCallback(async (newTitle: string, newContent: string) => {
    if (!noteId) return
    setSaving(true)
    try {
      const res = await notesApi.update(noteId, { title: newTitle, content: newContent })
      upsertNote(res.data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      loadVersions() // recarrega se criou um backup
    } catch (e) {
      console.error('Erro ao salvar nota', e)
    } finally {
      setSaving(false)
    }
  }, [noteId])

  const scheduleAutosave = (newTitle: string, newContent: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSave(newTitle, newContent), 2000)
  }

  const handleContentChange = (val?: string) => {
    const v = val ?? ''
    setContent(v)
    scheduleAutosave(title, v)
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value)
    scheduleAutosave(e.target.value, content)
  }

  // Cleanup debounce ao desmontar
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  const exportMD = () => {
    const blob = new Blob([content], { type: 'text/markdown' })
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
      const canvas = await html2canvas(preview, {
        backgroundColor: '#09090b', // zinc-950
        scale: 2,
      })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      })
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height)
      pdf.save(`${title || 'nota'}.pdf`)
    } catch (e) {
      console.error('Erro ao exportar PDF', e)
    }
  }

  if (!noteId) {
    return (
      <div className="h-full flex items-center justify-center bg-zinc-950">
        <div className="text-center">
          <div className="text-5xl mb-4">🐺</div>
          <p className="text-zinc-500 text-sm">Selecione uma nota ou crie uma nova</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-zinc-950" data-color-mode="dark">
      {/* Barra superior */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-white/10 shrink-0">
        <input
          id="note-title-input"
          value={title}
          onChange={handleTitleChange}
          className="flex-1 bg-transparent text-zinc-100 text-lg font-semibold focus:outline-none placeholder-zinc-600"
          placeholder="Título da nota..."
        />
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-600 mr-2">
            {saving ? '💾 Salvando...' : saved ? '✅ Salvo' : ''}
          </span>
          <select 
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as any)}
            className="bg-zinc-900 border border-white/10 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-guara-neon mr-1"
          >
            <option value="markdown">✏️ Editor Markdown</option>
            <option value="whiteboard">🎨 Quadro Branco</option>
            <option value="dataview">📊 Dataview</option>
          </select>
          <button
            onClick={() => alert('Nova janela não implementada na versão atual')}
            className="px-2 py-1 text-xs bg-white/5 hover:bg-white/10 rounded transition-colors text-zinc-300"
            title="Nova Janela"
          >
            +
          </button>
          <button
            onClick={() => alert('Split editor não implementado na versão atual')}
            className="px-2 py-1 text-xs bg-white/5 hover:bg-white/10 rounded transition-colors text-zinc-300"
            title="Split Editor"
          >
            ◫ Split
          </button>
          <div className="relative">
            <button
              onClick={() => setShowVersions(!showVersions)}
              className="px-2 py-1 text-xs bg-white/5 hover:bg-white/10 rounded transition-colors text-zinc-300"
              title="Histórico de Versões"
            >
              ⏱️
            </button>
            {showVersions && (
              <div className="absolute right-0 mt-2 w-64 glass-panel border border-guara-neon/20 rounded-md shadow-xl py-2 z-50">
                <div className="px-3 pb-2 mb-2 border-b border-white/10 text-xs font-semibold text-guara-neon">
                  Histórico de Versões
                </div>
                {versions.length === 0 ? (
                  <div className="px-3 text-xs text-zinc-500">Nenhum backup disponível.</div>
                ) : (
                  versions.map((v) => (
                    <div key={v.id} className="px-3 py-2 hover:bg-white/5 flex flex-col gap-1 transition-colors">
                      <span className="text-xs text-zinc-300 truncate">{v.title}</span>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-zinc-500">{new Date(v.created_at).toLocaleString()}</span>
                        <button 
                          onClick={() => handleRestore(v.id)}
                          className="text-[10px] text-orange-400 hover:text-orange-300"
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
            onClick={exportMD}
            className="px-2 py-1 text-xs bg-white/5 hover:bg-white/10 rounded transition-colors text-zinc-300"
            title="Baixar Markdown"
          >
            .MD
          </button>
          <button
            onClick={exportPDF}
            className="px-2 py-1 text-xs bg-white/5 hover:bg-white/10 rounded transition-colors text-zinc-300"
            title="Exportar PDF"
          >
            .PDF
          </button>
          <button
            onClick={toggleFocusMode}
            className={`px-2 py-1 text-xs rounded transition-colors ${focusMode ? 'bg-orange-500/20 text-orange-400' : 'bg-white/5 hover:bg-white/10 text-zinc-300'}`}
            title="Modo Escritor (Focus)"
          >
            {focusMode ? '⤡ Sair' : '⤢ Focus'}
          </button>
        </div>
      </div>

      {/* Área de Visualização */}
      <div className="flex-1 overflow-hidden relative" ref={editorRef}>
        {viewMode === 'markdown' && (
          <MDEditor
            value={content}
            onChange={handleContentChange}
            height="100%"
            preview="live"
            className="!h-full !bg-zinc-950 !border-none"
            style={{ height: '100%' }}
            textareaProps={{
              id: 'note-content-editor',
              placeholder: 'Comece a escrever... (Markdown suportado, use [[título]] para wikilinks)',
            }}
          />
        )}
        {viewMode === 'whiteboard' && <Whiteboard noteId={noteId} />}
        {viewMode === 'dataview' && <Dataview />}
      </div>
    </div>
  )
}
