import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
const ResponsiveGridLayout = (RGL as any).Responsive || RGL
import RGL from 'react-grid-layout'

import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import Layout from './components/Layout'
import Editor from './components/Editor'
import AIChat from './components/AIChat'
import Graph2D from './components/Graph2D'
import Brain3D from './components/Brain3D'
import Sidebar from './components/Sidebar'
import LoginPage from './pages/LoginPage'
import { PanelHeader } from './components/PanelHeader'
import { useAuthStore, useAppStore } from './store'
import { notesApi } from './api/notes'
import { foldersApi } from './api/folders'
import { authApi } from './api/auth'


interface PanelState {
  id: string
  type: 'editor' | 'graph2d' | 'brain3d' | 'chat'
}

function MainView() {
  const { activeNoteId, focusMode, setFocusMode } = useAppStore()
  const [panels, setPanels] = useState<PanelState[]>([{ id: 'panel-1', type: 'editor' }])
  const [layouts, setLayouts] = useState<any>({
    lg: [{ i: 'panel-1', x: 0, y: 0, w: 12, h: 10 }]
  })

  // Modo Escritor (Focus)
  if (focusMode) {
    return (
      <Layout>
        <div className="flex h-full w-full bg-bg-primary items-center justify-center relative">
          <div className="w-full h-full glass-panel flex flex-col relative z-10 overflow-hidden">
             <button
                onClick={() => setFocusMode(false)}
                className="absolute top-4 right-4 z-50 text-text-muted hover:text-accent-primary bg-white/5 p-2 rounded-full backdrop-blur-md transition-all"
                title="Sair do Modo Foco"
             >
               ⤡
             </button>
             <Editor noteId={activeNoteId} inFocusMode={true} />
          </div>
        </div>
      </Layout>
    )
  }

  const handleSplit = (id: string) => {
    const newId = `panel-${Date.now()}`
    const sourcePanel = panels.find(p => p.id === id)

    setPanels([...panels, { id: newId, type: sourcePanel?.type || 'editor' }])

    // Add to layout (side by side roughly)
    const currentLayout = layouts.lg || []
    const sourceLayout = currentLayout.find((l: any) => l.i === id)

    if (sourceLayout) {
      const newW = Math.max(Math.floor(sourceLayout.w / 2), 2)
      setLayouts({
        ...layouts,
        lg: [
          ...currentLayout.map((l: any) => l.i === id ? { ...l, w: newW } : l),
          { i: newId, x: sourceLayout.x + newW, y: sourceLayout.y, w: sourceLayout.w - newW, h: sourceLayout.h }
        ]
      })
    }
  }

  const handleClosePanel = (id: string) => {
    if (panels.length <= 1) return // Don't close the last panel
    setPanels(panels.filter(p => p.id !== id))
    const currentLayout = layouts.lg || []
    setLayouts({
      ...layouts,
      lg: currentLayout.filter((l: any) => l.i !== id)
    })
  }

  const handleChangeType = (id: string, type: PanelState['type']) => {
    setPanels(panels.map(p => p.id === id ? { ...p, type } : p))
  }

  const renderPanelContent = (panel: PanelState) => {
    switch (panel.type) {
      case 'editor': return <Editor noteId={activeNoteId} panelId={panel.id} />
      case 'graph2d': return <Graph2D />
      case 'brain3d': return <Brain3D />
      case 'chat': return <AIChat inline={true} />
      default: return null
    }
  }

  const getPanelTitle = (type: string) => {
    switch(type) {
      case 'editor': return '📝 Editor'
      case 'graph2d': return '🕸️ Grafo 2D'
      case 'brain3d': return '🧠 Cérebro 3D'
      case 'chat': return '🤖 Chat IA'
      default: return 'Painel'
    }
  }

  return (
    <Layout>
      <div className="flex h-full w-full overflow-hidden bg-bg-primary">
        <Sidebar />

        <div className="flex-1 relative overflow-hidden h-full">
          <ResponsiveGridLayout
            // @ts-ignore
            className="layout h-full"
            layouts={layouts}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
            rowHeight={Math.max(window.innerHeight / 10, 50)}
            onLayoutChange={(_currentLayout: any, allLayouts: any) => setLayouts(allLayouts)}
            draggableHandle=".panel-drag-handle"
            margin={[8, 8]}
          >
            {panels.map((panel) => (
              <div key={panel.id} className="glass-panel flex flex-col overflow-hidden border border-white/5">
                <div className="panel-drag-handle cursor-move">
                  <PanelHeader
                    title={getPanelTitle(panel.type)}
                    onClose={panels.length > 1 ? () => handleClosePanel(panel.id) : undefined}
                    onSplit={() => handleSplit(panel.id)}
                    onChangeType={(type) => handleChangeType(panel.id, type)}
                    onExportMd={() => document.dispatchEvent(new CustomEvent(`export-md-${panel.id}`))}
                    onExportPdf={() => document.dispatchEvent(new CustomEvent(`export-pdf-${panel.id}`))}
                  />
                </div>
                <div className="flex-1 overflow-hidden relative">
                   {renderPanelContent(panel)}
                </div>
              </div>
            ))}
          </ResponsiveGridLayout>
        </div>
      </div>
    </Layout>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

function DataLoader({ children }: { children: React.ReactNode }) {
  const { token, setUser } = useAuthStore()
  const { setNotes, setFolders, setNotesLoading, setFoldersLoading } = useAppStore()

  useEffect(() => {
    if (!token) return
    authApi.me().then((r) => setUser(r.data)).catch(() => {})
    setNotesLoading(true)
    notesApi.list().then((r) => setNotes(r.data)).finally(() => setNotesLoading(false))
    setFoldersLoading(true)
    foldersApi.list().then((r) => setFolders(r.data)).finally(() => setFoldersLoading(false))
  }, [token])

  return <>{children}</>
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={<ProtectedRoute><DataLoader><MainView /></DataLoader></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
