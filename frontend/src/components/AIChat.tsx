import { useState, useRef, useEffect } from 'react'
import { aiApi } from '../api/ai'
import { useAppStore } from '../store'

type Scope = 'note' | 'folder' | 'database'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function AIChat() {
  const { activeNoteId } = useAppStore()
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Olá! Sou o Guará 🐺 — seu companion de escrita com IA. Como posso ajudar?' }
  ])
  const [input, setInput] = useState('')
  const [scope, setScope] = useState<Scope>('database')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll ao receber nova mensagem
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
        scope_ref_id: scope === 'note' ? activeNoteId : null,
        session_id: sessionId,
      })
      setSessionId(res.data.session_id)
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Erro ao conectar com a IA. Verifique se o backend e o Ollama estão rodando.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950/80 backdrop-blur-md border-l border-white/10 w-80 shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-lg">🐺</span>
          <h2 className="font-semibold text-guara-neon text-sm">Guará AI</h2>
        </div>
        <select
          id="ai-scope-select"
          className="bg-zinc-900 border border-white/10 rounded-lg px-2 py-1 text-xs text-zinc-300 outline-none focus:border-orange-500/40"
          value={scope}
          onChange={(e) => {
            setScope(e.target.value as Scope)
            setSessionId(null) // nova sessão ao mudar escopo
          }}
        >
          <option value="note">📄 Nota atual</option>
          <option value="folder">📁 Pasta</option>
          <option value="database">🗄️ Base completa</option>
        </select>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[88%] rounded-xl p-3 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-orange-500/20 text-zinc-100 border border-orange-500/30'
                : 'bg-zinc-900/80 text-zinc-300 border border-white/5'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-zinc-900/80 border border-white/5 rounded-xl p-3 text-zinc-500 text-sm">
              <span className="animate-pulse">Pensando...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/10">
        <div className="flex relative">
          <textarea
            id="ai-chat-input"
            className="w-full bg-zinc-900 rounded-xl pr-10 pl-3 py-2 text-sm text-zinc-200 border border-white/10 focus:border-orange-500/40 outline-none resize-none min-h-[40px] max-h-32"
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
            id="ai-chat-send"
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="absolute right-2 top-2 p-1 text-orange-400 hover:text-orange-300 disabled:opacity-30 transition-colors"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  )
}
