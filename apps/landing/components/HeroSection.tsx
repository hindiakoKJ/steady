'use client'

import Image from 'next/image'
import type { Lang } from '@repo/types'

const copy = {
  en: {
    tagline: 'A Dad on a Mission',
    title: 'Steady',
    subtitle: 'Built by a father of two children with epilepsy. For every family living with epilepsy — children, adults, and the elderly.',
    freeBadge: '100% Free. Always.',
    freeNote: 'No subscriptions. No Pro version. No paywalls. Safety should not have a price tag.',
    ctaApp: 'Get it on Google Play',
    ctaLearn: 'Our Privacy Promise ↓',
    stat1: 'Free',
    stat1Label: 'Forever. No paywalls.',
    stat2: 'No Name',
    stat2Label: 'Required to sign up.',
    stat3: 'All Ages',
    stat3Label: 'Kids, adults, elderly.',
  },
  tl: {
    tagline: 'Isang Ama na May Misyon',
    title: 'Steady',
    subtitle: 'Ginawa ng isang amang may dalawang anak na may epilepsy. Para sa bawat pamilyang may epilepsy — bata, matanda, at matatanda.',
    freeBadge: '100% Libre. Palagi.',
    freeNote: 'Walang subscription. Walang Pro version. Walang bayad. Ang kaligtasan ay hindi dapat bayaran.',
    ctaApp: 'I-download sa Google Play',
    ctaLearn: 'Ang Aming Pangako sa Privacy ↓',
    stat1: 'Libre',
    stat1Label: 'Magpakailanman. Walang bayad.',
    stat2: 'Walang Pangalan',
    stat2Label: 'Kailangan para mag-sign up.',
    stat3: 'Lahat ng Edad',
    stat3Label: 'Bata, matanda, lolo/lola.',
  },
}

export function HeroSection({ lang }: { lang: Lang }) {
  const t = copy[lang]

  return (
    <section className="min-h-screen flex flex-col items-center justify-center bg-slate-900 px-6 pt-20 pb-16 text-center">
      {/* Steady logo */}
      <div className="mb-6">
        <Image
          src="/steady-icon.png"
          alt="Steady app logo"
          width={96}
          height={96}
          className="rounded-2xl shadow-lg shadow-black/40"
          priority
        />
      </div>

      {/* Founder tagline */}
      <p className="text-emerald-400 font-semibold text-base uppercase tracking-widest mb-3">
        {t.tagline}
      </p>

      {/* App name */}
      <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 leading-tight">
        {t.title}
      </h1>

      {/* Subtitle */}
      <p className="text-slate-300 text-lg md:text-xl max-w-2xl mb-8 leading-relaxed">
        {t.subtitle}
      </p>

      {/* Always Free badge */}
      <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-6 py-2 mb-4">
        <span className="text-2xl font-bold text-emerald-400">{t.freeBadge}</span>
      </div>
      <p className="text-slate-400 max-w-lg mb-10 text-sm">{t.freeNote}</p>

      {/* CTA buttons */}
      <div className="flex flex-col sm:flex-row gap-4 mb-16">
        <a
          href="https://play.google.com/store/apps/details?id=ph.hnscorpph.steady"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
        >
          <svg viewBox="30 336.7 120.9 129.2" width="18" height="18" fill="white" aria-hidden="true">
            <path d="M119.2,421.2c15.3-8.4,27-14.8,28-15.3c3.2-1.7,6.5-6.2,28,6.5c6.7,3.9,12.1,7.2,16.4,9.7L119.2,421.2z"/>
            <path d="M32,411.4l29.8,16.7l25.9-25.9L32,357v54.4V411.4z"/>
            <path d="M139.8,343.7L89,396.1l-25.9-25.9l75.8-42.6C139.1,327.6,140.1,338.5,139.8,343.7z"/>
            <path d="M89,402.3l-25.3,25.3l75.4,42.4c1.4-1.7,1.9-11.8,1.4-16.2L89,402.3z"/>
          </svg>
          {t.ctaApp}
        </a>
        <a
          href="#privacy"
          className="border border-slate-600 text-slate-300 hover:text-white hover:border-slate-400 font-semibold px-8 py-3 rounded-xl transition-colors"
        >
          {t.ctaLearn}
        </a>
      </div>

      {/* Three stats */}
      <div className="grid grid-cols-3 gap-6 max-w-lg w-full">
        {[
          { value: t.stat1, label: t.stat1Label },
          { value: t.stat2, label: t.stat2Label },
          { value: t.stat3, label: t.stat3Label },
        ].map((stat) => (
          <div
            key={stat.value}
            className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 text-center"
          >
            <p className="text-emerald-400 font-bold text-lg leading-tight">{stat.value}</p>
            <p className="text-slate-400 text-xs mt-1 leading-snug">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
