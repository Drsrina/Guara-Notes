import { useAppStore, useWorkspaceStore } from '../store'
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
  { id: 'editor',  label: 'Editor',      icon: '📝' },
  { id: 'graph2d', label: 'Grafo 2D',    icon: '🕸️' },
  { id: 'brain3d', label: 'Cérebro 3D',  icon: '🧠' },
  { id: 'chat',    label: 'Chat IA',     icon: '🤖' },
]

interface PaneProps {
  pane: PaneState
  canClose: boolean
  canSplit: boolean
}

export default function Pane({ pane, canClose, canSplit }: PaneProps) {
  const { activeNoteId } = useAppStore()
  const { setActiveTab, addPane, removePane } = useWorkspaceStore()

  const renderContent = () => {
    switch (pane.activeTab) {
      case 'editor':  return <Editor noteId={activeNoteId} panelId={pane.id} />
      case 'graph2d': return <Graph2D />
      case 'brain3d': return <Brain3D />
      case 'chat':    return <AIChat inline={true} />
      default:        return null
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden bg-bg-primary">
      {/* ── TabBar ──────────────────────────────────────────── */}
      <div className="flex items-center h-9 shrink-0 border-b border-white/8 bg-[#0d0d1a] select-none">
        {/* Tabs */}
        <div className="flex items-stretch h-full overflow-x-auto scrollbar-none">
          {TABS.map((tab) => {
            const active = pane.activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(pane.id, tab.id)}
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
          {canSplit && (
            <button
              onClick={() => addPane()}
              title="Dividir editor (⊞)"
              className="w-7 h-7 flex items-center justify-center rounded text-text-muted hover:text-accent-primary hover:bg-accent-primary/10 transition-colors text-xs"
            >
              ⊞
            </button>
          )}
          {canClose && (
            <button
              onClick={() => removePane(pane.id)}
              title="Fechar painel"
              className="w-7 h-7 flex items-center justify-center rounded text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors text-xs"
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
