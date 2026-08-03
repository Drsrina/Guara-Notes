import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Editor from './components/Editor'
import AIChat from './components/AIChat'
import Graph2D from './components/Graph2D'
import Brain3D from './components/Brain3D'
import Sidebar from './components/Sidebar'
import LoginPage from './pages/LoginPage'
import { useAuthStore, useAppStore } from './store'
import { notesApi } from './api/notes'
import { foldersApi } from './api/folders'
import { authApi } from './api/auth'
import { useState } from 'react'

// Componente da view principal com tabs
function MainView() {
  const [activeTab, setActiveTab] = useState<'editor' | 'graph2d' | 'brain3d'>('editor')
  const { activeNoteId } = useAppStore()

  return (
    <Layout>
      <div className="flex h-full w-full">
        <Sidebar />
        <div className="flex-1 flex flex-col relative h-full min-w-0">
          <div className="flex border-b border-white/10 bg-zinc-950 px-2 pt-2 gap-1 z-20 shrink-0">
            <button
              id="tab-editor"
              className={`px-4 py-2 text-sm rounded-t transition-colors ${activeTab === 'editor' ? 'bg-white/10 text-guara-neon' : 'text-zinc-400 hover:bg-white/5'}`}
              onClick={() => setActiveTab('editor')}
            >
              Editor
            </button>
            <button
              id="tab-graph2d"
              className={`px-4 py-2 text-sm rounded-t transition-colors ${activeTab === 'graph2d' ? 'bg-white/10 text-guara-neon' : 'text-zinc-400 hover:bg-white/5'}`}
              onClick={() => setActiveTab('graph2d')}
            >
              Grafo 2D
            </button>
            <button
              id="tab-brain3d"
              className={`px-4 py-2 text-sm rounded-t transition-colors ${activeTab === 'brain3d' ? 'bg-white/10 text-guara-neon' : 'text-zinc-400 hover:bg-white/5'}`}
              onClick={() => setActiveTab('brain3d')}
            >
              Cérebro 3D
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            {activeTab === 'editor' && <Editor noteId={activeNoteId} />}
            {activeTab === 'graph2d' && <Graph2D />}
            {activeTab === 'brain3d' && <Brain3D />}
          </div>
        </div>
        <AIChat />
      </div>
    </Layout>
  )
}

// Guard de autenticação
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

// Carrega dados iniciais quando autenticado
function DataLoader({ children }: { children: React.ReactNode }) {
  const { token, setUser } = useAuthStore()
  const { setNotes, setFolders, setNotesLoading, setFoldersLoading } = useAppStore()

  useEffect(() => {
    if (!token) return

    // Carrega perfil
    authApi.me().then((r) => setUser(r.data)).catch(() => {})

    // Carrega notas
    setNotesLoading(true)
    notesApi.list().then((r) => setNotes(r.data)).finally(() => setNotesLoading(false))

    // Carrega pastas
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
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <DataLoader>
                <MainView />
              </DataLoader>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
