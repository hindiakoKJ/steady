import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import type { SeizureLog, EmergencyContact } from '@repo/types'

const SEIZURE_TYPE_LABEL: Record<string, string> = {
  'tonic-clonic': 'Tonic-clonic (full body shaking)',
  'absence':      'Absence (brief staring)',
  'focal':        'Focal (one side of body)',
  'myoclonic':    'Myoclonic (muscle jerks)',
  'unknown':      'Unknown type',
}

function getMostCommonSeizureType(logs: SeizureLog[]): string {
  const real = logs.filter((l) => !l.isFalseAlarm && l.seizureType)
  if (real.length === 0) return 'Epileptic seizures'
  const counts: Record<string, number> = {}
  real.forEach((l) => {
    const t = l.seizureType!
    counts[t] = (counts[t] ?? 0) + 1
  })
  const top = Object.entries(counts).sort(([, a], [, b]) => b - a)[0]
  return top ? (SEIZURE_TYPE_LABEL[top[0]] ?? top[0]) : 'Epileptic seizures'
}

function getTopTriggers(logs: SeizureLog[]): string {
  const real = logs.filter((l) => !l.isFalseAlarm)
  const counts: Record<string, number> = {}
  real.forEach((l) => {
    (l.triggers ?? []).forEach((t) => {
      counts[t] = (counts[t] ?? 0) + 1
    })
  })
  const top = Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)
    .map(([t]) => t.replace(/_/g, ' '))
  return top.length > 0 ? top.join(', ') : '—'
}

function getAvgDuration(logs: SeizureLog[]): string {
  const real = logs.filter((l) => !l.isFalseAlarm && l.durationSeconds != null)
  if (real.length === 0) return '—'
  const avg = Math.round(real.reduce((s, l) => s + (l.durationSeconds ?? 0), 0) / real.length)
  const m = Math.floor(avg / 60)
  const s = avg % 60
  return m > 0 ? `${m} min ${s} sec` : `${s} sec`
}

export async function exportEmergencyCard(
  patientNickname: string,
  logs: SeizureLog[],
  contacts: EmergencyContact[],
) {
  const seizureType = getMostCommonSeizureType(logs)
  const triggers = getTopTriggers(logs)
  const avgDuration = getAvgDuration(logs)
  const totalEpisodes = logs.filter((l) => !l.isFalseAlarm).length
  const now = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  const contactRows = contacts.map((c) => `
    <div class="contact-row">
      <span class="contact-name">${c.nickname}</span>
      ${c.phoneNumber ? `<a class="contact-phone" href="tel:${c.phoneNumber}">${c.phoneNumber}</a>` : '<span class="contact-phone-none">App-only contact</span>'}
    </div>
  `).join('')

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  /* Each page is exactly one ID card face — opens at readable size on screen */
  @page { size: 85.6mm 54mm; margin: 0; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1A1F24; }

  .cut-label { display: none; }

  /* ── Full-page card face ── */
  .id-card {
    width: 85.6mm;
    height: 54mm;
    overflow: hidden;
    position: relative;
    page-break-after: always;
  }

  /* ──────────── FRONT ──────────── */
  .front { background: #fff; display: flex; flex-direction: column; }

  .front-header {
    background: #C8312B;
    padding: 3.5mm 4mm 3mm;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .front-header-left { display: flex; flex-direction: column; gap: 0.5mm; }
  .front-tag {
    font-size: 6.5px;
    font-weight: 800;
    letter-spacing: 1.2px;
    color: rgba(255,255,255,0.8);
    text-transform: uppercase;
  }
  .front-title {
    font-size: 11px;
    font-weight: 900;
    color: #fff;
    letter-spacing: 0.3px;
    line-height: 1;
  }
  .front-badge {
    background: rgba(255,255,255,0.2);
    border-radius: 2mm;
    padding: 1.5mm 3mm;
    font-size: 8px;
    font-weight: 800;
    color: #fff;
    letter-spacing: 0.5px;
    text-align: center;
    line-height: 1.3;
  }

  .front-body {
    flex: 1;
    padding: 3mm 4mm;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .patient-block { display: flex; flex-direction: column; gap: 0.8mm; }
  .patient-label {
    font-size: 6px;
    font-weight: 700;
    letter-spacing: 1.2px;
    color: #8B95A1;
    text-transform: uppercase;
  }
  .patient-name {
    font-size: 16px;
    font-weight: 900;
    color: #1A1F24;
    letter-spacing: -0.3px;
    line-height: 1;
  }
  .patient-condition {
    font-size: 8px;
    font-weight: 700;
    color: #C8312B;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5mm;
  }
  .info-cell {
    background: #F8F5F0;
    border-radius: 1.5mm;
    padding: 1.5mm 2mm;
  }
  .info-cell-label {
    font-size: 5.5px;
    font-weight: 700;
    color: #8B95A1;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    margin-bottom: 0.5mm;
  }
  .info-cell-value {
    font-size: 7.5px;
    font-weight: 700;
    color: #1A1F24;
    line-height: 1.2;
  }

  .front-footer {
    border-top: 0.3mm solid #EDE8E0;
    padding: 1.5mm 4mm;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .front-footer-app { font-size: 6px; font-weight: 700; color: #2E7D7A; letter-spacing: 0.3px; }
  .front-footer-date { font-size: 5.5px; color: #aaa; }

  /* ──────────── BACK ──────────── */
  .back { background: #1A1F24; display: flex; flex-direction: column; }

  .back-header {
    background: #C8312B;
    padding: 2.5mm 4mm;
    display: flex;
    align-items: center;
    gap: 2mm;
  }
  .back-header-title {
    font-size: 8px;
    font-weight: 900;
    color: #fff;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .back-body {
    flex: 1;
    padding: 2.5mm 4mm;
    display: flex;
    gap: 3mm;
  }

  .steps-col { flex: 1; display: flex; flex-direction: column; gap: 1.5mm; }
  .step-row { display: flex; align-items: flex-start; gap: 1.5mm; }
  .step-num {
    width: 3.5mm; height: 3.5mm; border-radius: 50%;
    background: #2E7D7A;
    color: #fff;
    font-size: 5.5px;
    font-weight: 900;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    margin-top: 0.3mm;
  }
  .step-text { font-size: 6.5px; color: #F2F4F7; font-weight: 500; line-height: 1.3; }
  .step-text b { color: #fff; font-weight: 800; }

  .divider-v { width: 0.3mm; background: rgba(255,255,255,0.1); flex-shrink: 0; }

  .contacts-col { width: 28mm; display: flex; flex-direction: column; gap: 1.5mm; }
  .contacts-title {
    font-size: 5.5px;
    font-weight: 700;
    color: #A8B2BD;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    margin-bottom: 0.5mm;
  }
  .contact-item { display: flex; flex-direction: column; gap: 0.3mm; }
  .contact-name-text { font-size: 7px; font-weight: 700; color: #F2F4F7; line-height: 1; }
  .contact-phone-text { font-size: 8px; font-weight: 900; color: #C8312B; line-height: 1; }
  .contact-push-text { font-size: 6px; color: #A8B2BD; }

  .donot-strip {
    background: rgba(200,49,43,0.15);
    border-top: 0.3mm solid rgba(200,49,43,0.4);
    padding: 1.5mm 4mm;
    display: flex;
    align-items: center;
    gap: 2mm;
    flex-wrap: wrap;
  }
  .donot-label { font-size: 6px; font-weight: 900; color: #C8312B; letter-spacing: 0.5px; flex-shrink: 0; }
  .donot-item-text { font-size: 6px; color: #F2F4F7; font-weight: 500; }
  .donot-item-text::before { content: '✗ '; color: #C8312B; font-weight: 900; }

  .back-footer {
    border-top: 0.3mm solid rgba(255,255,255,0.08);
    padding: 1.5mm 4mm;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .back-footer-911 { font-size: 7px; font-weight: 900; color: #C8312B; }
  .back-footer-app { font-size: 5.5px; color: #5A6470; }

  /* ── separator between front and back ── */
  .card-separator {
    width: 85.6mm;
    margin: 5mm 0;
    border: none;
    border-top: 0.3mm dashed #ccc;
    position: relative;
  }
  .card-separator::before {
    content: '✂  fold or cut here';
    position: absolute;
    top: -4px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 7px;
    color: #bbb;
    background: #fff;
    padding: 0 2mm;
    letter-spacing: 0.5px;
  }
</style>
</head>
<body>

  <!-- ── FRONT ────────────────────────────────────── -->
  <div class="id-card front">
    <div class="front-header">
      <div class="front-header-left">
        <div class="front-tag">Medical Alert</div>
        <div class="front-title">EPILEPSY CARD</div>
      </div>
      <div class="front-badge">🚨<br/>SEIZURE<br/>PRONE</div>
    </div>

    <div class="front-body">
      <div class="patient-block">
        <div class="patient-label">Patient</div>
        <div class="patient-name">${patientNickname}</div>
        <div class="patient-condition">Has epilepsy · ${totalEpisodes > 0 ? `${totalEpisodes} episodes on record` : 'Epilepsy patient'}</div>
      </div>

      <div class="info-grid">
        <div class="info-cell">
          <div class="info-cell-label">Seizure type</div>
          <div class="info-cell-value">${seizureType}</div>
        </div>
        <div class="info-cell">
          <div class="info-cell-label">Avg duration</div>
          <div class="info-cell-value">${avgDuration !== '—' ? avgDuration : 'Not recorded'}</div>
        </div>
        ${triggers !== '—' ? `
        <div class="info-cell" style="grid-column: span 2;">
          <div class="info-cell-label">Known triggers</div>
          <div class="info-cell-value">${triggers}</div>
        </div>` : ''}
      </div>
    </div>

    <div class="front-footer">
      <div class="front-footer-app">Steady — Free epilepsy companion</div>
      <div class="front-footer-date">${now}</div>
    </div>
  </div>

  <!-- ── BACK ─────────────────────────────────────── -->
  <div class="id-card back">
    <div class="back-header">
      <div class="back-header-title">⚡ If I am having a seizure — here's what to do</div>
    </div>

    <div class="back-body">
      <div class="steps-col">
        <div class="step-row">
          <div class="step-num">1</div>
          <div class="step-text"><b>Stay calm</b> and time the seizure</div>
        </div>
        <div class="step-row">
          <div class="step-num">2</div>
          <div class="step-text">Roll me on my <b>LEFT side</b></div>
        </div>
        <div class="step-row">
          <div class="step-num">3</div>
          <div class="step-text"><b>Clear</b> hard objects around me</div>
        </div>
        <div class="step-row">
          <div class="step-num">4</div>
          <div class="step-text">Stay until I am <b>fully awake</b></div>
        </div>
      </div>

      ${contacts.length > 0 ? `
      <div class="divider-v"></div>
      <div class="contacts-col">
        <div class="contacts-title">Call my family</div>
        ${contacts.slice(0, 3).map((c) => `
        <div class="contact-item">
          <div class="contact-name-text">${c.nickname}</div>
          ${c.phoneNumber
            ? `<div class="contact-phone-text">${c.phoneNumber}</div>`
            : `<div class="contact-push-text">app alert only</div>`
          }
        </div>`).join('')}
      </div>` : ''}
    </div>

    <div class="donot-strip">
      <div class="donot-label">DO NOT</div>
      <div class="donot-item-text">Hold me down</div>
      <div class="donot-item-text">Put anything in my mouth</div>
      <div class="donot-item-text">Leave me alone</div>
    </div>

    <div class="back-footer">
      <div class="back-footer-911">📞 Call 911 if seizure &gt; 5 min</div>
      <div class="back-footer-app">Steady App</div>
    </div>
  </div>

</body>
</html>`

  const { uri } = await Print.printToFileAsync({ html, base64: false })
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: `Emergency Card — ${patientNickname}`,
    UTI: 'com.adobe.pdf',
  })
}

/** Build plain-text content for QR code — readable by ANY scanner app, no server needed */
export function buildQrText(
  patientNickname: string,
  logs: SeizureLog[],
  contacts: EmergencyContact[],
): string {
  const seizureType = getMostCommonSeizureType(logs)
  const triggers = getTopTriggers(logs)

  const contactLines = contacts
    .map((c) => `  ${c.nickname}${c.phoneNumber ? `: ${c.phoneNumber}` : ' (app only)'}`)
    .join('\n')

  return [
    '=== STEADY EMERGENCY CARD ===',
    `${patientNickname} HAS EPILEPSY`,
    '',
    `SEIZURE TYPE: ${seizureType}`,
    triggers !== '—' ? `TRIGGERS: ${triggers}` : null,
    '',
    'WHAT TO DO:',
    '1. Stay calm. TIME the seizure.',
    '2. Roll on LEFT side (airway clear)',
    '3. Clear area - do NOT restrain',
    '4. Nothing in their mouth',
    '5. Call 911 if over 5 minutes',
    '',
    contacts.length > 0 ? 'EMERGENCY CONTACTS:' : null,
    contacts.length > 0 ? contactLines : null,
    '',
    `Scanned: ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
  ]
    .filter((line) => line !== null)
    .join('\n')
}
