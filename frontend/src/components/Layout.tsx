export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-200">
      <main className="flex-1 overflow-hidden relative">
        {children}
      </main>
    </div>
  )
}
