import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import Sidebar from './components/Sidebar'
import Workspace from './components/Workspace'
import Editor from './components/Editor'
import LoginPage from './pages/LoginPage'
import { useAuthStore, useAppStore } from './store'
import { notesApi } from './api/notes'
import { foldersApi } from './api/folders'
import { authApi } from './api/auth'


function MainView() {
  const { activeNoteId, focusMode, setFocusMode } = useAppStore()

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
