import { useState } from 'react';

interface Note { id: string; title: string; folder_id: string | null }
interface Folder { id: string; name: string; parent_folder_id: string | null }

export default function Sidebar() {
  const [notes] = useState<Note[]>([
    { id: '1', title: 'Welcome to Guará-Notes', folder_id: null },
    { id: '2', title: 'AI Companion Setup', folder_id: 'f1' },
  ]);
  const [folders] = useState<Folder[]>([
    { id: 'f1', name: 'Tutorials', parent_folder_id: null }
  ]);

  return (
    <aside className="w-64 glass flex flex-col h-full border-r border-white/10 shrink-0">
      <div className="p-4 border-b border-white/10 flex justify-between items-center">
        <h1 className="text-xl font-bold text-guara-neon tracking-wide">Guará-Notes</h1>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-2 pt-2">
          Workspace
        </div>
        
        {folders.map(folder => (
          <div key={folder.id} className="group">
            <div className="flex items-center px-2 py-1.5 text-sm text-zinc-300 hover:bg-white/5 rounded cursor-pointer transition-colors">
              <span className="mr-2 text-zinc-500">📁</span>
              {folder.name}
            </div>
            <div className="pl-6 space-y-1 mt-1">
              {notes.filter(n => n.folder_id === folder.id).map(note => (
                <div key={note.id} className="flex items-center px-2 py-1 text-sm text-zinc-400 hover:text-guara-neon-light hover:bg-white/5 rounded cursor-pointer transition-colors">
                  <span className="mr-2 text-zinc-600 opacity-50">📄</span>
                  <span className="truncate">{note.title}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
        
        <div className="mt-4 space-y-1">
           {notes.filter(n => n.folder_id === null).map(note => (
              <div key={note.id} className="flex items-center px-2 py-1 text-sm text-zinc-400 hover:text-guara-neon-light hover:bg-white/5 rounded cursor-pointer transition-colors">
                <span className="mr-2 text-zinc-600 opacity-50">📄</span>
                <span className="truncate">{note.title}</span>
              </div>
            ))}
        </div>
      </div>
      
      <div className="p-4 border-t border-white/10 text-xs text-zinc-500 text-center">
         AI Powered
      </div>
    </aside>
  );
}
