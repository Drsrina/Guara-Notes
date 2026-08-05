import { useState } from 'react'
import toast from 'react-hot-toast'
import { Button } from './Button'
import { Input } from './Input'

export const confirmDialog = (title: string, message: string, onConfirm: () => void) => {
  toast((t: any) => (
    <div className="flex flex-col gap-2 min-w-[200px]">
      <div className="font-bold text-accent-primary">{title}</div>
      <div className="text-sm text-text-secondary">{message}</div>
      <div className="flex gap-2 justify-end mt-2">
        <Button size="sm" variant="glass" onClick={() => toast.dismiss(t.id)}>Cancelar</Button>
        <Button size="sm" variant="primary" onClick={() => { onConfirm(); toast.dismiss(t.id); }}>Confirmar</Button>
      </div>
    </div>
  ), { duration: Infinity })
}

export const promptDialog = (title: string, defaultValue: string = '', onConfirm: (value: string) => void) => {
  toast((t: any) => {
    const PromptContent = () => {
      const [val, setVal] = useState(defaultValue)
      return (
        <div className="flex flex-col gap-2 min-w-[250px]">
          <div className="font-bold text-accent-primary">{title}</div>
          <Input 
            autoFocus
            value={val} 
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && val) {
                onConfirm(val)
                toast.dismiss(t.id)
              }
            }}
          />
          <div className="flex gap-2 justify-end mt-2">
            <Button size="sm" variant="glass" onClick={() => toast.dismiss(t.id)}>Cancelar</Button>
            <Button size="sm" variant="primary" disabled={!val} onClick={() => { onConfirm(val); toast.dismiss(t.id); }}>OK</Button>
          </div>
        </div>
      )
    }
    return <PromptContent />
  }, { duration: Infinity })
}
