import { create } from 'zustand'
import { persist } from 'zustand/middleware'
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

// ─── Settings Store ───────────────────────────────────────────────────────────

export interface GlobalSettings {
  theme: 'dark'
  uiDensity: 'compact' | 'normal' | 'spacious'
  glassBlur: number // 5-20
  panelOpacity: number // 0.3-0.8
  editorFontSize: number // 12-18
  editorMaxWidth: boolean
  showLineNumbers: boolean
  livePreview: boolean
  animations: 'smooth' | 'fast' | 'off'

  // Editor
  indentation: 'spaces' | 'tabs'
  indentSize: number
  wordWrap: boolean
  autoSaveDelay: number // 0.5 - 5
  syntaxTheme: string

  // Graph & Brain
  graphAttraction: number
  graphRepulsion: number
  semanticThreshold: number
  nodeSize: 'small' | 'medium' | 'large'
  showNodeLabels: boolean
  renderSemantic: boolean
  colorMode: 'tag' | 'folder' | 'date' | 'relevance'
  glowEffects: boolean
  hideEmptyNotes: boolean

  // AI Companion
  aiProvider: 'local' | 'gemini' | 'claude'
  aiModel: string
  aiTemperature: number
  aiMaxTokens: number
  aiRagTopK: number
  aiDefaultMode: 'note' | 'folder' | 'all'
}

export const defaultSettings: GlobalSettings = {
  theme: 'dark',
  uiDensity: 'normal',
  glassBlur: 15,
  panelOpacity: 0.5,
  editorFontSize: 16,
  editorMaxWidth: false,
  showLineNumbers: false,
  livePreview: true,
  animations: 'smooth',

  indentation: 'spaces',
  indentSize: 2,
  wordWrap: true,
  autoSaveDelay: 2,
  syntaxTheme: 'dark',

  graphAttraction: 1,
  graphRepulsion: 1,
  semanticThreshold: 0.5,
  nodeSize: 'medium',
  showNodeLabels: true,
  renderSemantic: true,
  colorMode: 'tag',
  glowEffects: true,
  hideEmptyNotes: false,

  aiProvider: 'local',
  aiModel: 'llama3.2:3b',
  aiTemperature: 0.7,
  aiMaxTokens: 1024,
  aiRagTopK: 5,
  aiDefaultMode: 'note',
}

interface SettingsState {
  settings: GlobalSettings
  updateSettings: (partial: Partial<GlobalSettings>) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      updateSettings: (partial) => set((state) => ({ settings: { ...state.settings, ...partial } })),
    }),
    { name: 'guara-settings' }
  )
)

// ─── Tags Store ───────────────────────────────────────────────────────────────

export interface TagConfig {
  name: string
  color: string
}

interface TagsState {
  tags: TagConfig[]
  addTag: (tag: TagConfig) => void
  removeTag: (name: string) => void
  updateTag: (name: string, color: string) => void
  getTagColor: (name: string) => string
}

export const defaultTagColors = [
  '#FF6B1A', '#FF1493', '#00D9FF', '#00FF41',
  '#FFD700', '#FF4444', '#9D4EDD', '#3A86FF',
  '#FB5607', '#06D6A0', '#EF476F', '#FFD60A'
]

export const useTagsStore = create<TagsState>()(
  persist(
    (set, get) => ({
      tags: [],
      addTag: (tag) => set((state) => ({ tags: [...state.tags.filter(t => t.name !== tag.name), tag] })),
      removeTag: (name) => set((state) => ({ tags: state.tags.filter(t => t.name !== name) })),
      updateTag: (name, color) => set((state) => ({ tags: state.tags.map(t => t.name === name ? { ...t, color } : t) })),
      getTagColor: (name) => {
        const tag = get().tags.find(t => t.name === name)
        if (tag) return tag.color
        // Assign deterministic default color
        let hash = 0
        for (let i = 0; i < name.length; i++) {
          hash = name.charCodeAt(i) + ((hash << 5) - hash)
        }
        return defaultTagColors[Math.abs(hash) % defaultTagColors.length]
      }
    }),
    { name: 'guara-tags' }
  )
)

// ─── App Store ────────────────────────────────────────────────────────────────

interface AppState {
  // Dados
  notes: Note[]
  folders: Folder[]
  activeNoteId: string | null
  focusMode: boolean

  // Loading states
  notesLoading: boolean
  foldersLoading: boolean

  // Setters
  setNotes: (notes: Note[]) => void
  setFolders: (folders: Folder[]) => void
  setActiveNoteId: (id: string | null) => void
  setNotesLoading: (v: boolean) => void
  setFoldersLoading: (v: boolean) => void
  setFocusMode: (v: boolean) => void
  toggleFocusMode: () => void

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
  focusMode: false,
  notesLoading: false,
  foldersLoading: false,

  setNotes: (notes) => set({ notes }),
  setFolders: (folders) => set({ folders }),
  setActiveNoteId: (id) => set({ activeNoteId: id }),
  setNotesLoading: (v) => set({ notesLoading: v }),
  setFoldersLoading: (v) => set({ foldersLoading: v }),
  setFocusMode: (v) => set({ focusMode: v }),
  toggleFocusMode: () => set((state) => ({ focusMode: !state.focusMode })),

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
