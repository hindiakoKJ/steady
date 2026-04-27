'use client'

import type { Lang } from '@repo/types'

interface Props {
  lang: Lang
  setLang: (lang: Lang) => void
}

export function LanguageToggle({ lang, setLang }: Props) {
  return (
    <div className="flex rounded-full bg-slate-800 border border-slate-700 overflow-hidden text-sm font-medium">
      <button
        onClick={() => setLang('en')}
        className={`px-3 py-1.5 transition-colors ${
          lang === 'en'
            ? 'bg-emerald-500 text-white'
            : 'text-slate-400 hover:text-white'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLang('tl')}
        className={`px-3 py-1.5 transition-colors ${
          lang === 'tl'
            ? 'bg-emerald-500 text-white'
            : 'text-slate-400 hover:text-white'
        }`}
      >
        Filipino
      </button>
    </div>
  )
}
