import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import type { SeizureLog } from '@repo/types'

function formatDuration(s?: number | null) {
  if (!s) return '—'
  const m = Math.floor(s / 60)
  const sec = s % 60
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function formatTriggers(triggers: string[]) {
  if (!triggers || triggers.length === 0) return '—'
  return triggers.map((t) => t.replace(/_/g, ' ')).join(', ')
}

const SEIZURE_TYPE_LABEL: Record<string, string> = {
  'tonic-clonic': 'Tonic-clonic',
  'absence':      'Absence',
  'focal':        'Focal',
  'myoclonic':    'Myoclonic',
  'unknown':      'Unknown',
}

function buildMonthlyChart(logs: SeizureLog[]) {
  const counts: Record<string, number> = {}
  logs.forEach((l) => {
    const key = new Date(l.startedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    counts[key] = (counts[key] ?? 0) + 1
  })
  const entries = Object.entries(counts).slice(-6)
  const max = Math.max(...entries.map(([, v]) => v), 1)
  return entries
    .map(([month, count]) => {
      const pct = Math.round((count / max) * 100)
      return `
        <div class="bar-row">
          <div class="bar-label">${month}</div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${pct}%"></div>
          </div>
          <div class="bar-count">${count}</div>
        </div>`
    })
    .join('')
}

export async function exportNeurologistPDF(
  patientNickname: string,
  allLogs: SeizureLog[],
) {
  // Neurologist report shows only real episodes — false alarms excluded
  const logs = allLogs.filter((l) => !l.isFalseAlarm)
  const falseAlarmCount = allLogs.length - logs.length

  const total = logs.length
  const avgDur = total > 0
    ? Math.round(logs.reduce((s, l) => s + (l.durationSeconds ?? 0), 0) / total)
    : 0
  const longest = logs.reduce((max, l) => Math.max(max, l.durationSeconds ?? 0), 0)

  // Trigger frequency summary
  const triggerCounts: Record<string, number> = {}
  logs.forEach((l) => {
    (l.triggers ?? []).forEach((t) => {
      triggerCounts[t] = (triggerCounts[t] ?? 0) + 1
    })
  })
  const topTriggers = Object.entries(triggerCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([t, n]) => `${t.replace(/_/g, ' ')} (${n}×)`)
    .join(', ')

  // Type frequency summary
  const typeCounts: Record<string, number> = {}
  logs.forEach((l) => {
    const t = l.seizureType ?? 'unknown'
    typeCounts[t] = (typeCounts[t] ?? 0) + 1
  })
  const typesSummary = Object.entries(typeCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([t, n]) => `${SEIZURE_TYPE_LABEL[t] ?? t} (${n})`)
    .join(', ')

  const injuryCount = logs.filter((l) => l.injuryOccurred).length
  const consciousnessLostCount = logs.filter((l) => l.consciousnessLost).length

  const now = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, Helvetica, sans-serif; color: #1A1F24; padding: 40px; }
  .header { border-bottom: 2px solid #2E7D7A; padding-bottom: 16px; margin-bottom: 24px; }
  .app-name { font-size: 11px; font-weight: 700; letter-spacing: 2px; color: #2E7D7A; }
  h1 { font-size: 24px; font-weight: 700; margin-top: 4px; }
  .meta { font-size: 13px; color: #5A6470; margin-top: 4px; }
  .stats { display: flex; gap: 16px; margin-bottom: 20px; }
  .stat { flex: 1; background: #F4F1EC; border-radius: 10px; padding: 14px; }
  .stat-value { font-size: 22px; font-weight: 700; }
  .stat-label { font-size: 11px; color: #5A6470; margin-top: 3px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  .clinical-summary { background: #f0f9f8; border: 1px solid #b2d8d6; border-radius: 10px; padding: 14px; margin-bottom: 20px; }
  .clinical-summary h2 { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #2E7D7A; margin-bottom: 8px; }
  .clinical-row { font-size: 13px; color: #1A1F24; margin-bottom: 5px; }
  .clinical-row strong { color: #1A1F24; }
  h2 { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #8B95A1; margin-bottom: 12px; }
  .chart { margin-bottom: 28px; }
  .bar-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .bar-label { font-size: 12px; color: #5A6470; width: 80px; }
  .bar-track { flex: 1; background: #EDE8E0; border-radius: 4px; height: 10px; }
  .bar-fill { height: 10px; border-radius: 4px; background: #2E7D7A; }
  .bar-count { font-size: 12px; font-weight: 700; width: 20px; text-align: right; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { text-align: left; padding: 8px 6px; background: #F4F1EC; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #5A6470; }
  td { padding: 8px 6px; border-bottom: 1px solid #EDE8E0; vertical-align: top; }
  .duration-warn { color: #D88820; font-weight: 700; }
  .duration-danger { color: #C8312B; font-weight: 700; }
  .injury-flag { color: #C8312B; font-weight: 700; }
  .false-alarm-note { font-size: 11px; color: #8B95A1; margin-top: 8px; font-style: italic; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #EDE8E0; font-size: 11px; color: #8B95A1; }
</style>
</head>
<body>
  <div class="header">
    <div class="app-name">STEADY — NEUROLOGIST SUMMARY</div>
    <h1>Seizure Report: ${patientNickname}</h1>
    <div class="meta">Generated ${now} · ${total} episode${total !== 1 ? 's' : ''} logged${falseAlarmCount > 0 ? ` · ${falseAlarmCount} false alarm${falseAlarmCount !== 1 ? 's' : ''} excluded` : ''}</div>
  </div>

  <div class="stats">
    <div class="stat">
      <div class="stat-value">${total}</div>
      <div class="stat-label">Episodes</div>
    </div>
    <div class="stat">
      <div class="stat-value">${formatDuration(avgDur)}</div>
      <div class="stat-label">Avg Duration</div>
    </div>
    <div class="stat">
      <div class="stat-value">${formatDuration(longest)}</div>
      <div class="stat-label">Longest</div>
    </div>
    <div class="stat">
      <div class="stat-value">${injuryCount}</div>
      <div class="stat-label">Injuries</div>
    </div>
  </div>

  ${total > 0 ? `
  <div class="clinical-summary">
    <h2>Clinical Overview</h2>
    ${typesSummary ? `<div class="clinical-row"><strong>Seizure types:</strong> ${typesSummary}</div>` : ''}
    ${topTriggers ? `<div class="clinical-row"><strong>Common triggers:</strong> ${topTriggers}</div>` : ''}
    ${consciousnessLostCount > 0 ? `<div class="clinical-row"><strong>Loss of consciousness:</strong> ${consciousnessLostCount} of ${total} episodes</div>` : ''}
    ${injuryCount > 0 ? `<div class="clinical-row injury-flag"><strong>⚠ Injuries reported:</strong> ${injuryCount} episode${injuryCount !== 1 ? 's' : ''}</div>` : ''}
  </div>` : ''}

  <div class="chart">
    <h2>Episodes per month (last 6 months)</h2>
    ${buildMonthlyChart(logs)}
  </div>

  <h2>Seizure Log</h2>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Time</th>
        <th>Type</th>
        <th>Duration</th>
        <th>Triggers</th>
        <th>Consciousness</th>
        <th>Injury</th>
        <th>Weather</th>
        <th>Notes</th>
      </tr>
    </thead>
    <tbody>
      ${logs.map((l) => {
        const dur = l.durationSeconds ?? 0
        const cls = dur >= 300 ? 'duration-danger' : dur >= 120 ? 'duration-warn' : ''
        const weather = l.weatherTempC != null
          ? `${l.weatherTempC}°C, ${l.weatherCondition ?? ''}${l.weatherHumidity != null ? `, ${l.weatherHumidity}% RH` : ''}`
          : '—'
        const seizureTypeLabel = l.seizureType ? (SEIZURE_TYPE_LABEL[l.seizureType] ?? l.seizureType) : '—'
        return `<tr>
          <td>${formatDate(l.startedAt)}</td>
          <td>${formatTime(l.startedAt)}</td>
          <td>${seizureTypeLabel}</td>
          <td class="${cls}">${formatDuration(l.durationSeconds)}</td>
          <td>${formatTriggers(l.triggers ?? [])}</td>
          <td>${l.consciousnessLost == null ? '—' : l.consciousnessLost ? 'Yes' : 'No'}</td>
          <td>${l.injuryOccurred == null ? '—' : l.injuryOccurred ? '<span class="injury-flag">Yes</span>' : 'No'}</td>
          <td>${weather}</td>
          <td>${l.notes ?? '—'}</td>
        </tr>`
      }).join('')}
    </tbody>
  </table>

  <div class="footer">
    This report was generated by Steady — a free, privacy-first epilepsy companion app.<br/>
    Data is provided for informational purposes only and does not constitute medical advice.
  </div>
</body>
</html>`

  const { uri } = await Print.printToFileAsync({ html, base64: false })
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: `Seizure Report — ${patientNickname}`,
    UTI: 'com.adobe.pdf',
  })
}
