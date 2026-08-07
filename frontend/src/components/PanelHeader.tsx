import { useState } from 'react'

interface PanelHeaderProps {
  title: string
  onClose?: () => void
  onSplit?: () => void
  onChangeType?: (type: 'editor' | 'graph2d' | 'brain3d' | 'chat') => void
  onExportMd?: () => void
  onExportPdf?: () => void
}

export function PanelHeader({ title, onClose, onSplit, onChangeType, onExportMd, onExportPdf }: PanelHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-bg-secondary/50 shrink-0 select-none">
      <div className="text-sm font-medium text-text-primary truncate">{title}</div>
      <div className="flex items-center gap-1">

        {/* Menu ⋮ */}
        <div className="relative">
          <button
            aria-label="Opções do Painel"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            title="Opções do Painel"
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-text-secondary transition-colors"
          >
            ⋮
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-1 w-48 glass-panel py-1 z-50 shadow-xl"
              onMouseLeave={() => setMenuOpen(false)}
            >
              {onChangeType && (
                <>
                  <div className="px-3 py-1 text-xs text-text-muted uppercase tracking-wider font-semibold">Mudar Vista</div>
                  <button onClick={() => { onChangeType('editor'); setMenuOpen(false) }} className="w-full text-left px-4 py-1.5 text-sm hover:bg-white/10 text-text-primary">📝 Editor Markdown</button>
                  <button onClick={() => { onChangeType('graph2d'); setMenuOpen(false) }} className="w-full text-left px-4 py-1.5 text-sm hover:bg-white/10 text-text-primary">🕸️ Grafo 2D</button>
                  <button onClick={() => { onChangeType('brain3d'); setMenuOpen(false) }} className="w-full text-left px-4 py-1.5 text-sm hover:bg-white/10 text-text-primary">🧠 Cérebro 3D</button>
                  <button onClick={() => { onChangeType('chat'); setMenuOpen(false) }} className="w-full text-left px-4 py-1.5 text-sm hover:bg-white/10 text-text-primary">🤖 Chat com IA</button>
                  <div className="border-t border-white/10 my-1"></div>
                </>
              )}

              <div className="px-3 py-1 text-xs text-text-muted uppercase tracking-wider font-semibold">Ações</div>
              {onSplit && <button onClick={() => { onSplit(); setMenuOpen(false) }} className="w-full text-left px-4 py-1.5 text-sm hover:bg-white/10 text-text-primary">◫ Dividir Painel</button>}
              {onExportMd && <button onClick={() => { onExportMd(); setMenuOpen(false) }} className="w-full text-left px-4 py-1.5 text-sm hover:bg-white/10 text-text-primary">⬇️ Exportar .MD</button>}
              {onExportPdf && <button onClick={() => { onExportPdf(); setMenuOpen(false) }} className="w-full text-left px-4 py-1.5 text-sm hover:bg-white/10 text-text-primary">📄 Exportar .PDF</button>}
            </div>
          )}
        </div>

        {onClose && (
          <button
            aria-label="Fechar Painel"
            title="Fechar Painel"
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-text-secondary hover:text-red-400 transition-colors"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}
