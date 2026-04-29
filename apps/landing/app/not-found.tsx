export default function NotFound() {
  return (
    <main className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center px-6 text-center">
      <div className="text-6xl mb-4">🛡️</div>
      <h1 className="text-4xl font-bold mb-2">Page Not Found</h1>
      <p className="text-slate-400 mb-6">This page does not exist.</p>
      <a
        href="/"
        className="bg-emerald-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-emerald-500 transition-colors"
      >
        Go Home
      </a>
    </main>
  )
}
