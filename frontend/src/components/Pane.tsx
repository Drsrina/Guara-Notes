import { useWorkspaceStore } from '../store'
import type { TabType, PaneState } from '../store'
import Editor from './Editor'
import Graph2D from './Graph2D'
import Brain3D from './Brain3D'
import AIChat from './AIChat'

interface Tab {
  id: TabType
  label: string
  icon: string
}

const TABS: Tab[] = [
  { id: 'editor',  label: 'Editor',     icon: '📝' },
  { id: 'graph2d', label: 'Grafo 2D',   icon: '🕸️' },
  { id: 'brain3d', label: 'Cérebro 3D', icon: '🧠' },
  { id: 'chat',    label: 'Chat IA',    icon: '🤖' },
]

interface PaneProps {
  pane: PaneState
  canClose: boolean
  canSplit: boolean
}

export default function Pane({ pane, canClose, canSplit }: PaneProps) {
  const { panes, setActiveTab, addPane, removePane, setFocusedPane, focusedPaneId } = useWorkspaceStore()
  const isFocused = focusedPaneId === pane.id

  const renderContent = () => {
    switch (pane.activeTab) {
      case 'editor':  return <Editor noteId={pane.activeNoteId} panelId={pane.id} />
      case 'graph2d': return <Graph2D />
      case 'brain3d': return <Brain3D />
      case 'chat':    return <AIChat inline={true} noteId={pane.activeNoteId} paneId={pane.id} />
      default:        return null
    }
  }

  return (
    <div
      className={`flex flex-col h-full min-h-0 overflow-hidden bg-bg-primary transition-all ${
        isFocused && panes.length > 1 ? 'ring-1 ring-accent-primary/20 ring-inset' : ''
      }`}
      onClick={() => setFocusedPane(pane.id)}
    >
      {/* ── TabBar ──────────────────────────────────────────── */}
      <div className={`flex items-center h-9 shrink-0 border-b border-white/8 select-none ${
        isFocused && panes.length > 1 ? 'bg-[#0d0d1a]' : 'bg-[#0a0a17]'
      }`}>
        {/* Tabs */}
        <div className="flex items-stretch h-full overflow-x-auto scrollbar-none">
          {TABS.map((tab) => {
            const active = pane.activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={(e) => { e.stopPropagation(); setActiveTab(pane.id, tab.id) }}
                className={`
                  flex items-center gap-1.5 px-4 h-full text-xs font-medium whitespace-nowrap
                  border-r border-white/5 transition-colors relative
                  ${active
                    ? 'text-text-primary bg-bg-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-accent-primary'
                    : 'text-text-muted hover:text-text-secondary hover:bg-white/4'
                  }
                `}
              >
                <span className="text-[11px] leading-none">{tab.icon}</span>
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Ações direita */}
        <div className="ml-auto flex items-center gap-0.5 px-2 shrink-0">
          {canSplit && panes.length < 4 && (
            <button
              onClick={(e) => { e.stopPropagation(); addPane() }}
              title={`Dividir (${panes.length}/4 painéis)`}
              aria-label={`Dividir painel. ${panes.length} de 4 painéis abertos`}
              className="w-7 h-7 flex items-center justify-center rounded text-text-muted hover:text-accent-primary hover:bg-accent-primary/10 transition-colors text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
            >
              ⊞
            </button>
          )}
          {canClose && (
            <button
              onClick={(e) => { e.stopPropagation(); removePane(pane.id) }}
              title="Fechar painel"
              aria-label="Fechar painel"
              className="w-7 h-7 flex items-center justify-center rounded text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Conteúdo ────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        {renderContent()}
      </div>
    </div>
  )
}
