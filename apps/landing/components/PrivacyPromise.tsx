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
      { yes: false, text: 'We will NEVER require your full legal name.' },
      { yes: false, text: 'We will NEVER require a phone number to sign up.' },
      { yes: false, text: 'We will NEVER sell your data, location history, or medical condition.' },
      { yes: false, text: 'We will NEVER show ads. We are not a data business.' },
    ],
    signupNote: 'Sign up with just an email and a nickname. That\'s all we need.',
    architectureNote: '🔒 Technical guarantee: Every database query is isolated by a HouseholdID. It is architecturally impossible for one family\'s data to be accessed by another.',
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
      { yes: false, text: 'HINDI namin kailanman hihilingin ang iyong buong legal na pangalan.' },
      { yes: false, text: 'HINDI namin kailanman hihilingin ang numero ng telepono para mag-sign up.' },
      { yes: false, text: 'HINDI namin kailanman ibebenta ang iyong data, kasaysayan ng lokasyon, o kondisyong medikal.' },
      { yes: false, text: 'HINDI namin kailanman magpapakita ng ads. Hindi kami negosyo ng datos.' },
    ],
    signupNote: 'Mag-sign up gamit lang ang email at palayaw. Iyon lang ang kailangan namin.',
    architectureNote: '🔒 Teknikal na garantiya: Bawat query sa database ay nakabukod sa pamamagitan ng HouseholdID. Imposible sa arkitektura na ma-access ng isang pamilya ang datos ng iba.',
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
      </div>
    </section>
  )
}
