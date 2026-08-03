import { useState, useEffect, useCallback, useRef } from 'react'
import MDEditor from '@uiw/react-md-editor'
import { notesApi } from '../api/notes'
import { useAppStore } from '../store'

interface EditorProps {
  noteId: string | null
}

export default function Editor({ noteId }: EditorProps) {
  const { notes, upsertNote } = useAppStore()
  const note = notes.find(n => n.id === noteId)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sincroniza estado local quando a nota muda
  useEffect(() => {
    if (note) {
      setTitle(note.title)
      setContent(note.content)
    } else {
      setTitle('')
      setContent('')
    }
  }, [noteId])

  const doSave = useCallback(async (newTitle: string, newContent: string) => {
    if (!noteId) return
    setSaving(true)
    try {
      const res = await notesApi.update(noteId, { title: newTitle, content: newContent })
      upsertNote(res.data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
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
        <span className="text-xs text-zinc-600 shrink-0">
          {saving ? '💾 Salvando...' : saved ? '✅ Salvo' : ''}
        </span>
      </div>

      {/* Editor Markdown */}
      <div className="flex-1 overflow-hidden">
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
      </div>
    </div>
  )
}
