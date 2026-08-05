import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import { Toaster } from 'react-hot-toast'
import Sidebar from './components/Sidebar'
import Workspace from './components/Workspace'
import Editor from './components/Editor'
import LoginPage from './pages/LoginPage'
import { useAuthStore, useAppStore, useWorkspaceStore, useSettingsStore } from './store'
import { notesApi } from './api/notes'
import { foldersApi } from './api/folders'
import { authApi } from './api/auth'


function MainView() {
  const { focusMode, setFocusMode } = useAppStore()
  const { panes, focusedPaneId } = useWorkspaceStore()
  const activeNoteId = panes.find(p => p.id === focusedPaneId)?.activeNoteId || null

  // ── Modo Escritor (Focus) ────────────────────────────────────────────────────
  if (focusMode) {
    return (
      <div className="flex h-screen w-screen bg-bg-primary items-center justify-center">
        <div className="w-full h-full flex flex-col overflow-hidden relative">
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
    )
  }

  // ── Layout IDE ───────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg-primary">
      {/* Sidebar recolhível */}
      <Sidebar />

      {/* Área principal: panes com tabs */}
      <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
        <Workspace />
      </div>
    </div>
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
    notesApi.list({ limit: 1000 }).then((r) => setNotes(r.data.items)).finally(() => setNotesLoading(false))
    setFoldersLoading(true)
    foldersApi.list().then((r) => setFolders(r.data)).finally(() => setFoldersLoading(false))
  }, [token])

  return <>{children}</>
}

function App() {
  const { settings } = useSettingsStore()

  useEffect(() => {
    const root = document.documentElement
    // Applica configurações globais como CSS Variables
    root.style.setProperty('--glass-blur', `${settings.glassBlur}px`)
    root.style.setProperty('--panel-opacity', `${settings.panelOpacity}`)
    if (settings.uiDensity === 'compact') {
      root.style.setProperty('--spacing-scale', '0.75')
    } else if (settings.uiDensity === 'spacious') {
      root.style.setProperty('--spacing-scale', '1.25')
    } else {
      root.style.setProperty('--spacing-scale', '1')
    }
  }, [settings.glassBlur, settings.panelOpacity, settings.uiDensity])

  return (
    <BrowserRouter>
      <Toaster position="bottom-right" toastOptions={{ 
        className: 'bg-bg-tertiary text-text-primary text-sm border border-white/10 shadow-xl backdrop-blur-md',
        style: { background: 'rgba(20, 20, 35, 0.8)', color: '#fff', borderRadius: '8px' } 
      }} />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={<ProtectedRoute><DataLoader><MainView /></DataLoader></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
