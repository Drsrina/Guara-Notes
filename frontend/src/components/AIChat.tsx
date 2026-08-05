import { useState, useRef, useEffect } from 'react'
import { aiApi } from '../api/ai'
import { useWorkspaceStore } from '../store'

type Scope = 'note' | 'folder' | 'database'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface AIChatProps {
  inline?: boolean
  noteId?: string | null
  paneId?: string
}

export default function AIChat({ inline = false, noteId, paneId }: AIChatProps) {
  const { panes, setChatMessages } = useWorkspaceStore()
  const pane = panes.find(p => p.id === paneId)
  
  const [messages, setMessages] = useState<Message[]>(
    pane?.chatMessages?.length ? pane.chatMessages : [
      { role: 'assistant', content: 'Olá! Sou o Guará 🐺 — seu companion de escrita com IA. Como posso ajudar?' }
    ]
  )
  const [input, setInput] = useState('')
  const [scope, setScope] = useState<Scope>('database')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (paneId) {
      setChatMessages(paneId, messages)
    }
  }, [messages, paneId, setChatMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    try {
      const res = await aiApi.chat({
        message: userMsg,
        scope,
        scope_ref_id: scope === 'note' ? noteId : null,
        session_id: sessionId,
      })
      setSessionId(res.data.session_id)
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Erro ao conectar com a IA.' }])
    } finally {
      setLoading(false)
    }
  }

  const baseClasses = inline
    ? "flex flex-col h-full bg-transparent w-full"
    : "flex flex-col h-full bg-bg-secondary/30 backdrop-blur-md border-l border-white/10 w-80 shrink-0"

  return (
    <div className={baseClasses}>
      {!inline && (
        <div className="p-4 border-b border-white/10 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">🐺</span>
            <h2 className="font-semibold text-accent-primary text-sm text-glow-neon">Guará AI</h2>
          </div>
          <select
            className="bg-bg-tertiary border border-white/10 rounded-lg px-2 py-1 text-xs text-text-primary outline-none focus:border-accent-primary"
            value={scope}
            onChange={(e) => {
              setScope(e.target.value as Scope)
              setSessionId(null)
            }}
          >
            <option value="note">📄 Nota atual</option>
            <option value="folder">📁 Pasta</option>
            <option value="database">🗄️ Base completa</option>
          </select>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[88%] rounded-xl p-3 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-accent-primary/20 text-text-primary border border-accent-primary/30'
                : 'glass text-text-secondary'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="glass rounded-xl p-3 text-text-muted text-sm">
              <span className="animate-pulse">Pensando...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/10 shrink-0 bg-bg-primary/50 backdrop-blur">
        <div className="flex relative">
          <textarea
            className="w-full input-glass pr-10 resize-none min-h-[40px] max-h-32 text-sm"
            placeholder="Pergunte algo..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="absolute right-2 top-2 p-1 text-accent-primary hover:text-accent-glow disabled:opacity-30 transition-colors"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  )
}
