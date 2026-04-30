'use client'

import { useState } from 'react'
import Image from 'next/image'
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
    bdoLabel: 'BDO InstaPay (Philippines)',
    bdoNote: 'Scan with any Philippine banking app',
    bdoFree: 'BDO-to-BDO transfers are free. Fees may apply for other banks.',
    kofiLabel: 'Ko-fi (Global)',
    kofiBtn: 'Support on Ko-fi',
    kofiNote: 'Pay via PayPal — works internationally',
    intlLabel: 'International Bank Transfer (SWIFT)',
    intlToggle: 'Show wire transfer details',
    intlHide: 'Hide wire transfer details',
    intlDetails: [
      { key: 'Bank', value: 'Banco de Oro (BDO Unibank)' },
      { key: 'Account Name', value: 'Kristian Jeffrey V. Sacdalan' },
      { key: 'Account Number', value: '006826005181' },
      { key: 'SWIFT / BIC', value: 'BNORPHMM' },
      { key: 'Bank Address', value: 'BDO Head Office, 7899 Makati Ave, Makati City 0726, Philippines' },
    ],
    intlWarning: 'Your bank may charge a wire transfer fee. Please confirm with your bank before sending.',
    disclaimer:
      'You will never be asked to donate inside the app. This section exists only for those who want to help.',
    missionFooter:
      '"Every peso and dollar donated goes directly to keeping this app free and funding epilepsy research. Not a salary. Not a profit."',
    missionSig: '— A Dad on a Mission',
  },
  tl: {
    badge: 'Epekto at Donasyon',
    heading: 'Libre para sa lahat, kahit mag-donate ka o hindi.',
    subheading:
      'Ang kaligtasan ay hindi dapat bayaran. Ang app na ito ay hindi magkakaroon ng subscription, Pro tier, o paywall — kailanman.',
    donateIntro:
      'Kung nakatulong ang app na ito sa iyong pamilya, maaari kang mag-suporta ng opsyonal:',
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
    bdoLabel: 'BDO InstaPay (Pilipinas)',
    bdoNote: 'I-scan gamit ang anumang banking app sa Pilipinas',
    bdoFree: 'Libre ang BDO-to-BDO. Maaaring may bayad para sa ibang bangko.',
    kofiLabel: 'Ko-fi (Global)',
    kofiBtn: 'Suportahan sa Ko-fi',
    kofiNote: 'Bayad sa pamamagitan ng PayPal — gumagana sa buong mundo',
    intlLabel: 'International Bank Transfer (SWIFT)',
    intlToggle: 'Ipakita ang detalye ng wire transfer',
    intlHide: 'Itago ang detalye ng wire transfer',
    intlDetails: [
      { key: 'Bangko', value: 'Banco de Oro (BDO Unibank)' },
      { key: 'Pangalan ng Account', value: 'Kristian Jeffrey V. Sacdalan' },
      { key: 'Numero ng Account', value: '006826005181' },
      { key: 'SWIFT / BIC', value: 'BNORPHMM' },
      { key: 'Address ng Bangko', value: 'BDO Head Office, 7899 Makati Ave, Makati City 0726, Philippines' },
    ],
    intlWarning: 'Maaaring may wire transfer fee ang iyong bangko. Kumpirmahin muna bago magpadala.',
    disclaimer:
      'Hindi ka kailanman hihilingang mag-donate sa loob ng app. Ang seksyong ito ay para lamang sa mga gustong tumulong.',
    missionFooter:
      '"Ang bawat pisong at dolyar na nai-donate ay direktang napupunta sa pagpapanatiling libre ng app at pagpopondo ng pananaliksik sa epilepsy. Hindi sahod. Hindi kita."',
    missionSig: '— Isang Ama na May Misyon',
  },
}

export function AlwaysFree({ lang }: { lang: Lang }) {
  const t = copy[lang]
  const [showIntl, setShowIntl] = useState(false)

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

        {/* Payment methods — BDO + Ko-fi side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">

          {/* BDO InstaPay */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 text-center">
            <p className="text-sm font-semibold text-slate-300 mb-1">{t.bdoLabel}</p>
            <p className="text-slate-500 text-xs mb-4">{t.bdoNote}</p>
            <div className="relative w-48 h-48 mx-auto rounded-xl overflow-hidden bg-white">
              <Image
                src="/bdo-qr.jpg"
                alt="BDO InstaPay QR code for Kristian Jeffrey V. Sacdalan"
                fill
                className="object-contain"
                sizes="192px"
              />
            </div>
            <p className="text-slate-500 text-xs mt-3">{t.bdoFree}</p>
          </div>

          {/* Ko-fi */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center gap-4">
            <p className="text-sm font-semibold text-slate-300">{t.kofiLabel}</p>
            <a
              href="https://ko-fi.com/steadyseizuretrackerapp"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#FF5E5B] hover:bg-[#e54d4a] transition-colors text-white font-semibold text-sm px-6 py-3 rounded-xl"
            >
              {/* Ko-fi cup icon */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 7.422-2.831 6.649-6.916zm-11.062 3.511c-1.246 1.453-4.011 3.976-4.011 3.976s-.121.119-.31.023c-.076-.057-.108-.09-.108-.09-.443-.441-3.368-3.049-4.034-3.954-.709-.965-1.041-2.7-.091-3.71.951-1.01 3.005-1.086 4.363.407 0 0 1.565-1.782 3.468-.963 1.904.82 1.832 3.011.723 4.311zm6.173.478c-.928.116-1.682.028-1.682.028V7.284h1.77s1.971.551 1.971 2.638c0 1.913-.985 2.667-2.059 3.015z"/>
              </svg>
              {t.kofiBtn}
            </a>
            <p className="text-slate-500 text-xs text-center">{t.kofiNote}</p>
          </div>
        </div>

        {/* International Bank Transfer — collapsible */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl mb-10 overflow-hidden">
          <button
            onClick={() => setShowIntl((v) => !v)}
            className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-700/50 transition-colors"
            aria-expanded={showIntl}
          >
            <span className="text-sm font-semibold text-slate-300">{t.intlLabel}</span>
            <svg
              className={`w-4 h-4 text-slate-400 transition-transform ${showIntl ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showIntl && (
            <div className="px-6 pb-6 border-t border-slate-700">
              <div className="mt-4 space-y-3">
                {t.intlDetails.map((row) => (
                  <div key={row.key} className="flex flex-col sm:flex-row sm:gap-4">
                    <span className="text-slate-500 text-xs w-36 shrink-0 pt-0.5">{row.key}</span>
                    <span className="text-slate-200 text-sm font-mono break-all">{row.value}</span>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-amber-400/80 text-xs border border-amber-500/20 bg-amber-500/5 rounded-lg px-4 py-3">
                ⚠️ {t.intlWarning}
              </p>
            </div>
          )}
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
