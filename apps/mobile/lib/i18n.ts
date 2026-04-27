import type { Lang } from '@repo/types'

export const strings = {
  en: {
    // Emergency Hub
    hubTitle: 'Emergency Hub',
    hubSubtitle: 'Tap immediately when a seizure begins.',
    auraButton: 'HELP / LOG AURA',
    auraSubtitle: 'Tap when you feel an aura — logs time & weather',
    beaconButton: 'BEACON',
    beaconSubtitle: 'Alert your family with your location',
    monitorOn: 'PASSIVE MONITOR: ON',
    monitorOff: 'PASSIVE MONITOR: OFF',
    monitorSubtitle: 'Auto-detects rhythmic shaking (for sleeping/non-verbal)',
    bystander: 'Bystander Mode',
    bystanderSubtitle: 'Show first-aid steps to a stranger',

    // Active seizure
    seizureActive: 'SEIZURE IN PROGRESS',
    tapToEnd: 'TAP TO END SEIZURE',
    timer: 'Duration',

    // Bystander screen
    bystanderTitle: 'STAY CALM',
    bystanderStep1: '1. Do NOT hold them down.',
    bystanderStep2: '2. Turn them on their side.',
    bystanderStep3: '3. Time the seizure.',
    bystanderStep4: '4. Clear the area of hard objects.',
    bystanderStep5: '5. Call emergency if over 5 minutes.',
    bystanderEmergency: '🇵🇭 Emergency: 911 / 163',
    bystanderFamily: 'I am their family',

    // Patient switcher
    currentPatient: 'Current patient',
    switchPatient: 'Switch patient',
    addPatient: 'Add patient',

    // History
    historyTitle: 'Seizure History',
    noHistory: 'No seizures logged yet.',

    // Settings
    settingsTitle: 'Settings',
    contacts: 'Emergency Contacts',
    addContact: 'Add contact',
    privacyNote: 'We do not sell your data, your location history, or your medical condition.',
    language: 'Language',
  },
  tl: {
    hubTitle: 'Emergency Hub',
    hubSubtitle: 'I-tap kaagad kapag nagsimula ang seizure.',
    auraButton: 'TULONG / LOG AURA',
    auraSubtitle: 'I-tap kapag naramdaman mo ang aura — nagtatala ng oras at panahon',
    beaconButton: 'BEACON',
    beaconSubtitle: 'I-alerto ang iyong pamilya gamit ang iyong lokasyon',
    monitorOn: 'PASSIVE MONITOR: BUKAS',
    monitorOff: 'PASSIVE MONITOR: SARADO',
    monitorSubtitle: 'Auto-detect ng rhythmic shaking (para sa natutulog/hindi makapagsalita)',
    bystander: 'Bystander Mode',
    bystanderSubtitle: 'Ipakita ang first-aid steps sa isang estranyer',

    seizureActive: 'SEIZURE NGAYON',
    tapToEnd: 'I-TAP PARA TAPUSIN',
    timer: 'Tagal',

    bystanderTitle: 'MANATILING KALMADO',
    bystanderStep1: '1. HUWAG pigilan.',
    bystanderStep2: '2. Ibalik sa tabi.',
    bystanderStep3: '3. Bilangin ang oras ng seizure.',
    bystanderStep4: '4. Alisin ang mga matitigas na bagay sa paligid.',
    bystanderStep5: '5. Tumawag ng emergency kung mahigit 5 minuto.',
    bystanderEmergency: '🇵🇭 Emergency: 911 / 163',
    bystanderFamily: 'Ako ang pamilya niya',

    currentPatient: 'Kasalukuyang pasyente',
    switchPatient: 'Palitan ng pasyente',
    addPatient: 'Magdagdag ng pasyente',

    historyTitle: 'Kasaysayan ng Seizure',
    noHistory: 'Wala pang naitalagang seizure.',

    settingsTitle: 'Mga Setting',
    contacts: 'Emergency Contacts',
    addContact: 'Magdagdag ng contact',
    privacyNote: 'Hindi namin ibinebenta ang iyong data, lokasyon, o kondisyong medikal.',
    language: 'Wika',
  },
}

export function t(lang: Lang, key: keyof typeof strings.en): string {
  return strings[lang][key] ?? strings.en[key]
}
