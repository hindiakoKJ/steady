'use client'

import { useState } from 'react'
import type { Lang } from '@repo/types'
import { HeroSection } from '@/components/HeroSection'
import { PrivacyPromise } from '@/components/PrivacyPromise'
import { AlwaysFree } from '@/components/AlwaysFree'
import { LanguageToggle } from '@/components/LanguageToggle'

export default function Home() {
  const [lang, setLang] = useState<Lang>('en')

  return (
    <main className="min-h-screen bg-slate-900 text-white">
      {/* Fixed language toggle — always accessible */}
      <div className="fixed top-4 right-4 z-50">
        <LanguageToggle lang={lang} setLang={setLang} />
      </div>

      <HeroSection lang={lang} />
      <PrivacyPromise lang={lang} />
      <AlwaysFree lang={lang} />

      {/* Footer */}
      <footer className="bg-slate-950 py-8 px-6 text-center text-slate-500 text-sm">
        <p className="mb-1">
          {lang === 'en'
            ? 'Steady — Built by a dad, for every family.'
            : 'Steady — Ginawa ng isang ama, para sa bawat pamilya.'}
        </p>
        <p>
          {lang === 'en'
            ? 'We do not sell your data, your location history, or your medical condition.'
            : 'Hindi namin ibinebenta ang iyong data, lokasyon, o kalagayan sa kalusugan.'}
        </p>
      </footer>
    </main>
  )
}
