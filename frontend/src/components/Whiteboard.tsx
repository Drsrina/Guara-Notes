import { Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

interface WhiteboardProps {
  noteId?: string | null;
}

export default function Whiteboard({ noteId }: WhiteboardProps) {
  // Opcional: Podemos usar o noteId para carregar um quadro específico
  // Mas para esta etapa vamos criar uma experiência base de quadro branco contínuo 
  // usando o persistenceKey para manter no LocalStorage localmente.
  const persistenceKey = noteId ? `guara-whiteboard-${noteId}` : 'guara-whiteboard-default'

  return (
    <div className="h-full w-full bg-zinc-950 relative" data-color-mode="dark">
      <div className="absolute inset-0 z-0">
        <Tldraw persistenceKey={persistenceKey} />
      </div>
    </div>
  )
}
