'use client'

import type { Lang } from '@repo/types'

const copy = {
  en: {
    heading: 'Our Privacy Promise',
    promise:
      '"We don\'t sell your sickness. We don\'t track your identity. We only track what helps you stay safe."',
    checklistTitle: 'What we collect — and what we never will:',
    checklist: [
      { yes: true, text: 'Your email address — to create your account.' },
      { yes: true, text: 'A nickname for each patient — not a full legal name.' },
      { yes: true, text: 'Seizure times and weather data — to help your neurologist.' },
      { yes: true, text: 'Phone numbers for emergency contacts — only for SMS BEACON alerts, never for your account.' },
      { yes: false, text: 'We will NEVER require your full legal name.' },
      { yes: false, text: 'We will NEVER require a phone number just to create your account.' },
      { yes: false, text: 'We will NEVER sell your data, location history, or medical condition.' },
      { yes: false, text: 'We will NEVER show ads. We are not a data business.' },
    ],
    signupNote: 'Sign up with just an email and a nickname. That\'s all we need.',
    architectureNote: '🔒 Technical guarantee: Every database query is isolated by a HouseholdID. It is architecturally impossible for one family\'s data to be accessed by another.',
    retentionHeading: 'Data Retention',
    retentionText: 'We retain your data for as long as your account is active. If you delete your account, all associated data — including seizure logs, patient profiles, and emergency contacts — is permanently deleted from our servers within 30 days.',
    deletionHeading: 'How to Delete Your Data',
    deletionText: 'You can request full deletion of your account and all data at any time by emailing us at kristianjvsacdalan@gmail.com with the subject "Delete My Account". We will process your request within 7 business days and confirm once complete. You may also delete individual seizure logs directly from within the app.',
  },
  tl: {
    heading: 'Ang Aming Pangako sa Privacy',
    promise:
      '"Hindi namin ibinebenta ang iyong karamdaman. Hindi namin tinutukoy ang iyong pagkakakilanlan. Tinutukoy lang namin ang tumutulong sa iyong manatiling ligtas."',
    checklistTitle: 'Ano ang kinokolekta namin — at ano ang hindi namin kailanman gagawin:',
    checklist: [
      { yes: true, text: 'Ang iyong email address — para gumawa ng account.' },
      { yes: true, text: 'Palayaw para sa bawat pasyente — hindi legal na pangalan.' },
      { yes: true, text: 'Oras ng seizure at datos ng panahon — para sa iyong neurologist.' },
      { yes: true, text: 'Numero ng telepono ng emergency contacts — para sa SMS BEACON alerts lamang, hindi para sa iyong account.' },
      { yes: false, text: 'HINDI namin kailanman hihilingin ang iyong buong legal na pangalan.' },
      { yes: false, text: 'HINDI namin kailanman hihilingin ang numero ng telepono para lang gumawa ng account.' },
      { yes: false, text: 'HINDI namin kailanman ibebenta ang iyong data, kasaysayan ng lokasyon, o kondisyong medikal.' },
      { yes: false, text: 'HINDI namin kailanman magpapakita ng ads. Hindi kami negosyo ng datos.' },
    ],
    signupNote: 'Mag-sign up gamit lang ang email at palayaw. Iyon lang ang kailangan namin.',
    architectureNote: '🔒 Teknikal na garantiya: Bawat query sa database ay nakabukod sa pamamagitan ng HouseholdID. Imposible sa arkitektura na ma-access ng isang pamilya ang datos ng iba.',
    retentionHeading: 'Panahon ng Pag-iingat ng Data',
    retentionText: 'Iniiingat namin ang iyong data habang aktibo ang iyong account. Kung ide-delete mo ang iyong account, lahat ng nauugnay na data — kabilang ang mga seizure log, profile ng pasyente, at emergency contacts — ay permanenteng mabubura mula sa aming mga server sa loob ng 30 araw.',
    deletionHeading: 'Paano Burahin ang Iyong Data',
    deletionText: 'Maaari kang humiling ng kumpletong pagbura ng iyong account at lahat ng data anumang oras sa pamamagitan ng pagpapadala ng email sa kristianjvsacdalan@gmail.com na may subject na "Delete My Account". Ipoproseso namin ang iyong kahilingan sa loob ng 7 araw ng negosyo at magpapadala ng kumpirmasyon. Maaari ka ring mag-delete ng mga indibidwal na seizure log direkta mula sa loob ng app.',
  },
}

export function PrivacyPromise({ lang }: { lang: Lang }) {
  const t = copy[lang]

  return (
    <section
      id="privacy"
      className="bg-slate-800 py-20 px-6"
    >
      <div className="max-w-2xl mx-auto">
        {/* Section heading */}
        <h2 className="text-2xl font-bold text-emerald-400 mb-6">{t.heading}</h2>

        {/* The verbatim privacy promise */}
        <blockquote className="border-l-4 border-emerald-400 pl-6 mb-8">
          <p className="text-white text-xl md:text-2xl italic leading-relaxed font-medium">
            {t.promise}
          </p>
        </blockquote>

        {/* Checklist */}
        <h3 className="text-slate-300 font-semibold mb-4">{t.checklistTitle}</h3>
        <ul className="space-y-3 mb-8">
          {t.checklist.map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <span
                className={`mt-0.5 text-lg font-bold flex-shrink-0 ${
                  item.yes ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {item.yes ? '✓' : '✗'}
              </span>
              <span
                className={`text-sm leading-relaxed ${
                  item.yes ? 'text-slate-200' : 'text-slate-300'
                }`}
              >
                {item.text}
              </span>
            </li>
          ))}
        </ul>

        {/* Sign-up note */}
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-6">
          <p className="text-emerald-300 font-semibold text-center">{t.signupNote}</p>
        </div>

        {/* Architecture note */}
        <p className="text-slate-400 text-xs leading-relaxed text-center">{t.architectureNote}</p>

        {/* Data Retention */}
        <div className="mt-8 border-t border-slate-700 pt-8">
          <h3 className="text-slate-200 font-semibold mb-2">📅 {t.retentionHeading}</h3>
          <p className="text-slate-400 text-sm leading-relaxed">{t.retentionText}</p>
        </div>

        {/* Data Deletion */}
        <div className="mt-6">
          <h3 className="text-slate-200 font-semibold mb-2">🗑️ {t.deletionHeading}</h3>
          <p className="text-slate-400 text-sm leading-relaxed">{t.deletionText}</p>
        </div>
      </div>
    </section>
  )
}
