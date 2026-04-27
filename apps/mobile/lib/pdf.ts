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
  logs: SeizureLog[],
) {
  const total = logs.length
  const avgDur = total > 0
    ? Math.round(logs.reduce((s, l) => s + (l.durationSeconds ?? 0), 0) / total)
    : 0
  const longest = logs.reduce((max, l) => Math.max(max, l.durationSeconds ?? 0), 0)
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
  .stats { display: flex; gap: 16px; margin-bottom: 28px; }
  .stat { flex: 1; background: #F4F1EC; border-radius: 10px; padding: 14px; }
  .stat-value { font-size: 22px; font-weight: 700; }
  .stat-label { font-size: 11px; color: #5A6470; margin-top: 3px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  h2 { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #8B95A1; margin-bottom: 12px; }
  .chart { margin-bottom: 28px; }
  .bar-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .bar-label { font-size: 12px; color: #5A6470; width: 80px; }
  .bar-track { flex: 1; background: #EDE8E0; border-radius: 4px; height: 10px; }
  .bar-fill { height: 10px; border-radius: 4px; background: #2E7D7A; }
  .bar-count { font-size: 12px; font-weight: 700; width: 20px; text-align: right; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; padding: 8px 10px; background: #F4F1EC; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #5A6470; }
  td { padding: 10px; border-bottom: 1px solid #EDE8E0; vertical-align: top; }
  .duration-warn { color: #D88820; font-weight: 700; }
  .duration-danger { color: #C8312B; font-weight: 700; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #EDE8E0; font-size: 11px; color: #8B95A1; }
</style>
</head>
<body>
  <div class="header">
    <div class="app-name">STEADY — NEUROLOGIST SUMMARY</div>
    <h1>Seizure Report: ${patientNickname}</h1>
    <div class="meta">Generated ${now} · ${total} event${total !== 1 ? 's' : ''} logged</div>
  </div>

  <div class="stats">
    <div class="stat">
      <div class="stat-value">${total}</div>
      <div class="stat-label">Total Events</div>
    </div>
    <div class="stat">
      <div class="stat-value">${formatDuration(avgDur)}</div>
      <div class="stat-label">Avg Duration</div>
    </div>
    <div class="stat">
      <div class="stat-value">${formatDuration(longest)}</div>
      <div class="stat-label">Longest</div>
    </div>
  </div>

  <div class="chart">
    <h2>Events per month (last 6 months)</h2>
    ${buildMonthlyChart(logs)}
  </div>

  <h2>Seizure Log</h2>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Time</th>
        <th>Duration</th>
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
        return `<tr>
          <td>${formatDate(l.startedAt)}</td>
          <td>${formatTime(l.startedAt)}</td>
          <td class="${cls}">${formatDuration(l.durationSeconds)}</td>
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
