import { useState } from 'react'
import { useAppStore } from '../store'

export default function Dataview() {
  const { notes, folders, setActiveNoteId } = useAppStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFolder, setSelectedFolder] = useState<string>('all')
  const [selectedTag, setSelectedTag] = useState<string>('all')
  const [sortKey, setSortKey] = useState<'updated_at' | 'title'>('updated_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // Extrair todas as tags únicas
  const allTags = Array.from(new Set(notes.flatMap(n => n.tags || []))).sort()

  const filteredNotes = notes.filter(n => {
    if (searchTerm && !n.title.toLowerCase().includes(searchTerm.toLowerCase()) && !n.content.toLowerCase().includes(searchTerm.toLowerCase())) return false
    if (selectedFolder !== 'all' && n.folder_id !== selectedFolder) return false
    if (selectedTag !== 'all' && !(n.tags || []).includes(selectedTag)) return false
    return true
  }).sort((a, b) => {
    const valA = a[sortKey]
    const valB = b[sortKey]
    const mod = sortDir === 'asc' ? 1 : -1
    if (valA < valB) return -1 * mod
    if (valA > valB) return 1 * mod
    return 0
  })

  return (
    <div className="h-full w-full bg-zinc-950 flex flex-col text-zinc-300">
      <div className="p-4 border-b border-white/10 shrink-0">
        <h2 className="text-lg font-bold text-guara-neon text-glow-neon mb-4">Dataview (Consultas)</h2>
        
        <div className="flex gap-4 flex-wrap text-sm">
          <input
            type="text"
            placeholder="Buscar..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="bg-zinc-900 border border-white/10 rounded px-3 py-1.5 focus:outline-none focus:border-guara-neon"
          />
          
          <select
            value={selectedFolder}
            onChange={e => setSelectedFolder(e.target.value)}
            className="bg-zinc-900 border border-white/10 rounded px-3 py-1.5 focus:outline-none focus:border-guara-neon"
          >
            <option value="all">Todas as Pastas</option>
            {folders.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>

          <select
            value={selectedTag}
            onChange={e => setSelectedTag(e.target.value)}
            className="bg-zinc-900 border border-white/10 rounded px-3 py-1.5 focus:outline-none focus:border-guara-neon"
          >
            <option value="all">Todas as Tags</option>
            {allTags.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Ordenar por:</span>
            <select
              value={sortKey}
              onChange={e => setSortKey(e.target.value as any)}
              className="bg-zinc-900 border border-white/10 rounded px-3 py-1.5 focus:outline-none focus:border-guara-neon"
            >
              <option value="updated_at">Data de Modificação</option>
              <option value="title">Título</option>
            </select>
            <button 
              onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
              className="px-2 py-1.5 bg-zinc-800 rounded hover:bg-zinc-700 transition-colors"
            >
              {sortDir === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/10 text-zinc-500">
              <th className="py-2 px-4 font-medium">Título</th>
              <th className="py-2 px-4 font-medium">Pasta</th>
              <th className="py-2 px-4 font-medium">Tags</th>
              <th className="py-2 px-4 font-medium">Modificado em</th>
              <th className="py-2 px-4 font-medium text-right">Ação</th>
            </tr>
          </thead>
          <tbody>
            {filteredNotes.map(n => (
              <tr key={n.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="py-3 px-4 font-medium text-zinc-200">
                  {n.title || 'Sem título'}
                </td>
                <td className="py-3 px-4 text-zinc-400">
                  {folders.find(f => f.id === n.folder_id)?.name || '-'}
                </td>
                <td className="py-3 px-4">
                  <div className="flex gap-1 flex-wrap">
                    {(n.tags || []).map(t => (
                      <span key={t} className="px-1.5 py-0.5 bg-guara-neon/20 text-guara-neon text-[10px] rounded">
                        #{t}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-3 px-4 text-zinc-400 text-xs">
                  {new Date(n.updated_at).toLocaleString()}
                </td>
                <td className="py-3 px-4 text-right">
                  <button
                    onClick={() => setActiveNoteId(n.id)}
                    className="text-xs bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded transition-colors"
                  >
                    Abrir
                  </button>
                </td>
              </tr>
            ))}
            {filteredNotes.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-zinc-500">
                  Nenhuma nota encontrada com os filtros atuais.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
