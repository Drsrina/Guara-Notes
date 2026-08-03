import { create } from 'zustand'
import type { Note } from '../api/notes'
import type { Folder } from '../api/folders'
import type { UserProfile } from '../api/auth'

// ─── Auth Store ───────────────────────────────────────────────────────────────

interface AuthState {
  token: string | null
  user: UserProfile | null
  setToken: (token: string | null) => void
  setUser: (user: UserProfile | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('token'),
  user: null,
  setToken: (token) => {
    if (token) {
      localStorage.setItem('token', token)
    } else {
      localStorage.removeItem('token')
    }
    set({ token })
  },
  setUser: (user) => set({ user }),
  logout: () => {
    localStorage.removeItem('token')
    set({ token: null, user: null })
  },
}))

// ─── App Store ────────────────────────────────────────────────────────────────

interface AppState {
  // Dados
  notes: Note[]
  folders: Folder[]
  activeNoteId: string | null

  // Loading states
  notesLoading: boolean
  foldersLoading: boolean

  // Setters
  setNotes: (notes: Note[]) => void
  setFolders: (folders: Folder[]) => void
  setActiveNoteId: (id: string | null) => void
  setNotesLoading: (v: boolean) => void
  setFoldersLoading: (v: boolean) => void

  // Mutações locais (otimistic updates)
  upsertNote: (note: Note) => void
  removeNote: (id: string) => void
  upsertFolder: (folder: Folder) => void
  removeFolder: (id: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  notes: [],
  folders: [],
  activeNoteId: null,
  notesLoading: false,
  foldersLoading: false,

  setNotes: (notes) => set({ notes }),
  setFolders: (folders) => set({ folders }),
  setActiveNoteId: (id) => set({ activeNoteId: id }),
  setNotesLoading: (v) => set({ notesLoading: v }),
  setFoldersLoading: (v) => set({ foldersLoading: v }),

  upsertNote: (note) =>
    set((state) => ({
      notes: state.notes.some((n) => n.id === note.id)
        ? state.notes.map((n) => (n.id === note.id ? note : n))
        : [note, ...state.notes],
    })),

  removeNote: (id) =>
    set((state) => ({
      notes: state.notes.filter((n) => n.id !== id),
      activeNoteId: state.activeNoteId === id ? null : state.activeNoteId,
    })),

  upsertFolder: (folder) =>
    set((state) => ({
      folders: state.folders.some((f) => f.id === folder.id)
        ? state.folders.map((f) => (f.id === folder.id ? folder : f))
        : [...state.folders, folder],
    })),

  removeFolder: (id) =>
    set((state) => ({
      folders: state.folders.filter((f) => f.id !== id),
    })),
}))
