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
  @page { size: A4; margin: 20mm; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1A1F24; }

  .card {
    max-width: 560px;
    margin: 0 auto;
    border: 3px solid #C8312B;
    border-radius: 16px;
    overflow: hidden;
  }

  .card-header {
    background: #C8312B;
    padding: 20px 24px 16px;
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .header-icon { font-size: 36px; }
  .header-text h1 {
    font-size: 22px;
    font-weight: 800;
    color: #fff;
    letter-spacing: 0.5px;
  }
  .header-text p {
    font-size: 13px;
    color: rgba(255,255,255,0.85);
    margin-top: 3px;
  }

  .card-body { padding: 20px 24px; }

  .patient-name {
    font-size: 28px;
    font-weight: 800;
    color: #1A1F24;
    margin-bottom: 4px;
    letter-spacing: -0.5px;
  }
  .patient-sub {
    font-size: 14px;
    color: #5A6470;
    margin-bottom: 20px;
  }

  .section { margin-bottom: 18px; }
  .section-title {
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    color: #8B95A1;
    margin-bottom: 8px;
  }

  .info-row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px 12px;
    background: #F8F5F0;
    border-radius: 10px;
    margin-bottom: 6px;
  }
  .info-label { font-size: 12px; color: #5A6470; font-weight: 600; min-width: 90px; }
  .info-value { font-size: 13px; color: #1A1F24; font-weight: 500; flex: 1; }

  .steps-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .step {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px 12px;
    background: #f0f9f8;
    border-radius: 10px;
    border: 1px solid #b2d8d6;
  }
  .step-num {
    width: 22px;
    height: 22px;
    border-radius: 11px;
    background: #2E7D7A;
    color: #fff;
    font-size: 11px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 1px;
  }
  .step-text { font-size: 12px; color: #1A1F24; font-weight: 500; line-height: 16px; }

  .donot-box {
    background: #FFF4F4;
    border: 1px solid #F5C1BE;
    border-radius: 10px;
    padding: 12px 14px;
    margin-bottom: 18px;
  }
  .donot-title { font-size: 11px; font-weight: 800; color: #C8312B; letter-spacing: 1px; margin-bottom: 6px; }
  .donot-items { display: flex; flex-wrap: wrap; gap: 6px; }
  .donot-item { font-size: 12px; color: #C8312B; font-weight: 600; }
  .donot-item::before { content: '✗ '; }

  .contact-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    background: #F8F5F0;
    border-radius: 10px;
    margin-bottom: 6px;
  }
  .contact-name { font-size: 14px; font-weight: 700; color: #1A1F24; }
  .contact-phone { font-size: 15px; font-weight: 700; color: #C8312B; text-decoration: none; }
  .contact-phone-none { font-size: 12px; color: #8B95A1; }

  .card-footer {
    border-top: 1px solid #EDE8E0;
    padding: 12px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .footer-app { font-size: 13px; font-weight: 700; color: #2E7D7A; }
  .footer-meta { font-size: 11px; color: #8B95A1; }
</style>
</head>
<body>
  <div class="card">
    <div class="card-header">
      <div class="header-icon">🚨</div>
      <div class="header-text">
        <h1>EPILEPSY EMERGENCY CARD</h1>
        <p>This person may have a seizure. Please read and help.</p>
      </div>
    </div>

    <div class="card-body">
      <div class="patient-name">${patientNickname}</div>
      <div class="patient-sub">Has epilepsy · ${totalEpisodes > 0 ? `${totalEpisodes} episode${totalEpisodes !== 1 ? 's' : ''} on record` : 'Epilepsy patient'}</div>

      <div class="section">
        <div class="section-title">Seizure Profile</div>
        <div class="info-row">
          <span class="info-label">Seizure type</span>
          <span class="info-value">${seizureType}</span>
        </div>
        ${triggers !== '—' ? `
        <div class="info-row">
          <span class="info-label">Known triggers</span>
          <span class="info-value">${triggers}</span>
        </div>` : ''}
        ${avgDuration !== '—' ? `
        <div class="info-row">
          <span class="info-label">Avg duration</span>
          <span class="info-value">${avgDuration}</span>
        </div>` : ''}
      </div>

      <div class="section">
        <div class="section-title">What to do right now</div>
        <div class="steps-grid">
          <div class="step"><div class="step-num">1</div><div class="step-text">Stay calm. Time the seizure now.</div></div>
          <div class="step"><div class="step-num">2</div><div class="step-text">Roll on LEFT side — keeps airway clear</div></div>
          <div class="step"><div class="step-num">3</div><div class="step-text">Clear area — remove hard objects nearby</div></div>
          <div class="step"><div class="step-num">4</div><div class="step-text">Stay until they are fully awake and alert</div></div>
        </div>
      </div>

      <div class="donot-box">
        <div class="donot-title">DO NOT</div>
        <div class="donot-items">
          <span class="donot-item">Hold them down</span>
          <span class="donot-item">Put anything in their mouth</span>
          <span class="donot-item">Give water or medicine during seizure</span>
          <span class="donot-item">Leave them alone</span>
        </div>
      </div>

      ${contacts.length > 0 ? `
      <div class="section">
        <div class="section-title">Call their emergency contacts</div>
        ${contactRows}
        <div style="margin-top: 8px; font-size: 11px; color: #8B95A1;">
          ⚠ Call 911 immediately if seizure lasts more than 5 minutes
        </div>
      </div>` : `
      <div style="padding: 12px; background: #FFF4F4; border-radius: 10px; text-align: center; margin-bottom: 18px;">
        <div style="font-size: 14px; font-weight: 700; color: #C8312B; margin-bottom: 4px;">⚠ Call 911 if seizure &gt; 5 minutes</div>
        <div style="font-size: 12px; color: #5A6470;">This person has epilepsy. Do not leave them alone.</div>
      </div>`}
    </div>

    <div class="card-footer">
      <span class="footer-app">Steady — Free epilepsy companion</span>
      <span class="footer-meta">Generated ${now}</span>
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
