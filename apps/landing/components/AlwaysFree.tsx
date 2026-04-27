'use client'

import type { Lang } from '@repo/types'

const copy = {
  en: {
    badge: 'Impact & Donations',
    heading: 'Free for everyone, whether you donate or not.',
    subheading:
      'Safety should not have a price tag. This app will never have a subscription, a Pro tier, or a paywall — ever.',
    donateIntro: 'If this app helps your family, you can optionally support the mission:',
    tiers: [
      {
        amount: '₱280',
        usd: '~$5',
        label: 'Covers API costs for 1 month',
        icon: '☁️',
      },
      {
        amount: '₱830',
        usd: '~$15',
        label: 'Covers server hosting costs',
        icon: '🖥️',
        featured: true,
      },
      {
        amount: '₱1,660+',
        usd: '~$30+',
        label: 'Funds epilepsy research',
        icon: '🔬',
      },
    ],
    gcashLabel: 'GCash / Maya (Philippines)',
    globalLabel: 'Ko-fi / Stripe (Global)',
    gcashNote: 'QR code coming soon',
    kofiNote: 'Link coming soon',
    disclaimer:
      'You will never be asked to donate inside the app. This section exists only for those who want to help.',
    missionFooter: '"Every peso and dollar donated goes directly to keeping this app free and funding epilepsy research. Not a salary. Not a profit."',
    missionSig: '— A Dad on a Mission',
  },
  tl: {
    badge: 'Epekto at Donasyon',
    heading: 'Libre para sa lahat, kahit mag-donate ka o hindi.',
    subheading:
      'Ang kaligtasan ay hindi dapat bayaran. Ang app na ito ay hindi magkakaroon ng subscription, Pro tier, o paywall — kailanman.',
    donateIntro: 'Kung nakatulong ang app na ito sa iyong pamilya, maaari kang mag-suporta ng opsyonal:',
    tiers: [
      {
        amount: '₱280',
        usd: '~$5',
        label: 'Saklaw ang gastos sa API ng isang buwan',
        icon: '☁️',
      },
      {
        amount: '₱830',
        usd: '~$15',
        label: 'Saklaw ang gastos sa server hosting',
        icon: '🖥️',
        featured: true,
      },
      {
        amount: '₱1,660+',
        usd: '~$30+',
        label: 'Nagpopondo ng pananaliksik sa epilepsy',
        icon: '🔬',
      },
    ],
    gcashLabel: 'GCash / Maya (Pilipinas)',
    globalLabel: 'Ko-fi / Stripe (Global)',
    gcashNote: 'QR code — paparating',
    kofiNote: 'Link — paparating',
    disclaimer:
      'Hindi ka kailanman hihilingang mag-donate sa loob ng app. Ang seksyong ito ay para lamang sa mga gustong tumulong.',
    missionFooter: '"Ang bawat pisong at dolyar na nai-donate ay direktang napupunta sa pagpapanatiling libre ng app at pagpopondo ng pananaliksik sa epilepsy. Hindi sahod. Hindi kita."',
    missionSig: '— Isang Ama na May Misyon',
  },
}

export function AlwaysFree({ lang }: { lang: Lang }) {
  const t = copy[lang]

  return (
    <section className="bg-slate-900 py-20 px-6">
      <div className="max-w-3xl mx-auto">
        {/* Badge */}
        <div className="flex justify-center mb-4">
          <span className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full">
            {t.badge}
          </span>
        </div>

        {/* Heading */}
        <h2 className="text-3xl font-bold text-white text-center mb-4">{t.heading}</h2>
        <p className="text-slate-400 text-center max-w-xl mx-auto mb-12">{t.subheading}</p>

        {/* Donation intro */}
        <p className="text-slate-300 text-center mb-8 font-medium">{t.donateIntro}</p>

        {/* Tier cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          {t.tiers.map((tier) => (
            <div
              key={tier.amount}
              className={`rounded-2xl border p-6 text-center transition-transform hover:scale-105 ${
                tier.featured
                  ? 'bg-emerald-500/10 border-emerald-500/40'
                  : 'bg-slate-800 border-slate-700'
              }`}
            >
              <div className="text-3xl mb-3">{tier.icon}</div>
              <p className="text-2xl font-bold text-white mb-0.5">{tier.amount}</p>
              <p className="text-slate-400 text-xs mb-3">{tier.usd}</p>
              <p
                className={`text-sm font-medium ${
                  tier.featured ? 'text-emerald-300' : 'text-slate-300'
                }`}
              >
                {tier.label}
              </p>
            </div>
          ))}
        </div>

        {/* Payment methods */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          {/* GCash / Maya */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 text-center">
            <p className="text-sm font-semibold text-slate-300 mb-3">{t.gcashLabel}</p>
            <div className="w-32 h-32 bg-slate-700 rounded-xl mx-auto flex items-center justify-center">
              <span className="text-slate-500 text-xs">{t.gcashNote}</span>
            </div>
          </div>

          {/* Ko-fi / Stripe */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 text-center">
            <p className="text-sm font-semibold text-slate-300 mb-3">{t.globalLabel}</p>
            <div className="w-32 h-32 bg-slate-700 rounded-xl mx-auto flex items-center justify-center">
              <span className="text-slate-500 text-xs">{t.kofiNote}</span>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-slate-500 text-xs text-center mb-8">{t.disclaimer}</p>

        {/* Mission statement */}
        <div className="border-t border-slate-800 pt-8 text-center">
          <p className="text-slate-300 italic text-lg mb-2">{t.missionFooter}</p>
          <p className="text-emerald-400 font-semibold">{t.missionSig}</p>
        </div>
      </div>
    </section>
  )
}
