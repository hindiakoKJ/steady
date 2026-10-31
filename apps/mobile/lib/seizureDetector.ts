// Rhythmic-shaking detector shared by the in-app hook (expo-sensors, foreground)
// and the Android background monitoring service (react-native-sensors).
// All samples must be fed in units of g.
//
// v2.1 — per-axis gravity-residual processing with time-based scoring.
// Design drivers, each from a demonstrated failure of earlier versions:
//   • v1 counted crossings of a fixed 1.2g line: vigorous shaking lifted the
//     force floor above the line (zero peaks counted) and fast shaking
//     hard-reset its counter — observed on device.
//   • Magnitude-domain processing quadratically suppresses motion orthogonal
//     to gravity (0.7 g sideways reads σ≈0.09 vs 0.49 parallel) and doubles
//     its apparent frequency → v2.1 removes gravity per axis (slow EMA) and
//     analyzes the dominant residual axis, restoring linear, orientation-free
//     response at the true motion frequency.
//   • Engine/vehicle vibration (20–50 Hz) aliased into the seizure band at
//     20 Hz sampling and fired in ~2.6 s → consumers now sample fast (10 ms
//     background / 20 ms foreground) and v2.1 low-passes at ~14 Hz, so
//     resolved high-frequency vibration is attenuated instead of folding in.
//   • A fixed 15-samples-per-window gate made delivery slower than ~15 Hz
//     silently blind (Android treats the requested interval as a hint) →
//     v2.1 gates on data SPAN, normalizes rates by actual time, and scores in
//     elapsed milliseconds, so behavior is delivery-rate invariant; it also
//     exposes effectiveRateHz so consumers can surface degraded delivery.
//   • Integer crossings-per-second quantization put jogging cadence
//     (2.7–3.0 Hz) inside the band edge → frequency is now estimated from the
//     median inter-crossing interval (no quantization), and minHz sits at
//     3.2 Hz, just above human running cadence but below late-clonus 3.5–4 Hz.
//
// This is a supplementary safety tool, not a medical diagnostic device.

export interface SeizureDetectorConfig {
  /** Lower band edge (Hz). 3.2 rejects running cadence (≤3.0 Hz) while
   *  keeping late-phase clonus (3.5–4 Hz) detectable. */
  minHz: number
  /** Upper band edge (Hz). 13 keeps deliberate violent hand-shaking visible;
   *  genuine clonus never exceeds ~10. */
  maxHz: number
  /** Minimum robust σ (g) of the dominant-axis residual — gates out gentle
   *  rocking, typing, vehicle rumble that survives the low-pass filter. */
  minIntensityG: number
  /** Sustained in-band milliseconds required to fire (~2 s). Off-rhythm time
   *  decays the score at 2×, so mixed input takes proportionally longer. */
  fireMs: number
}

export const DEFAULT_DETECTOR_CONFIG: SeizureDetectorConfig = {
  minHz: 3.2,
  maxHz: 13,
  minIntensityG: 0.15,
  fireMs: 2000,
}

/**
 * Normalize a sensor event timestamp to milliseconds.
 * react-native-sensors emits epoch ms; expo-sensors emits seconds; raw
 * SensorEvent nanoseconds appear on some paths. The detector only uses
 * differences, so any monotonic ms base is fine.
 */
export function normalizeSensorTimestamp(ts: number | undefined | null): number {
  if (ts == null || !isFinite(ts)) return Date.now()
  if (ts > 1e14) return ts / 1e6 // nanoseconds since boot
  if (ts > 1e12) return ts // epoch milliseconds
  return ts * 1000 // seconds (epoch or boot — differences still ms)
}

interface Sample {
  t: number
  rx: number
  ry: number
  rz: number
}

const BUFFER_MS = 2000        // analysis window (0.5 Hz frequency resolution)
const MIN_SPAN_MS = 700       // minimum data span before evaluating
const MIN_SAMPLES = 8         // minimum points for stable statistics
const EVAL_INTERVAL_MS = 50   // evaluate at most 20×/s regardless of input rate
const MAX_DT_MS = 250         // clamp per-step time credit across delivery gaps
const GRAVITY_TAU_MS = 530    // gravity EMA time constant (~0.3 Hz cutoff)
const SIGNAL_TAU_MS = 11.4    // anti-alias LPF time constant (~14 Hz cutoff, 2-pole)
const CROSSING_DEDUPE_MS = 25 // merge crossings from clumped/batched delivery

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = sorted.length >> 1
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/** Robust σ estimate: 1.4826 × median absolute deviation. */
function robustSigma(values: number[]): number {
  const med = median(values)
  return 1.4826 * median(values.map((v) => Math.abs(v - med)))
}

export class SeizureDetector {
  private buffer: Sample[] = []
  private scoreMs = 0
  private fired = false
  private lastSampleT = 0
  private lastEvalT = 0
  // Per-axis gravity EMA and 2-pole signal LPF states
  private g: [number, number, number] | null = null
  private s1: [number, number, number] = [0, 0, 0]
  private s2: [number, number, number] = [0, 0, 0]
  /** Delivery rate observed at the last evaluation (null before first eval).
   *  Consumers should warn the user when this stays well below 2×maxHz —
   *  the detector degrades honestly but cannot resolve rhythm it can't see. */
  effectiveRateHz: number | null = null

  constructor(private config: SeizureDetectorConfig = DEFAULT_DETECTOR_CONFIG) {}

  /**
   * Feed one accelerometer sample (units of g, any orientation).
   * Returns true exactly once when detection fires; stays latched until reset().
   */
  addSample(x: number, y: number, z: number, now: number = Date.now()): boolean {
    // ── Filters (run on every sample, any rate) ──
    // Floor dt at 8 ms: when timestamps clump (Date.now() fallback under
    // batched delivery) consecutive samples share a stamp, and a ~0 dt would
    // make the filters treat 10–20 ms of real motion as instantaneous —
    // over-smoothing the waveform into invisibility. No real sensor delivers
    // faster than ~8 ms in this app (10 ms is the fastest requested interval).
    const dt = this.lastSampleT > 0 ? Math.min(Math.max(now - this.lastSampleT, 8), MAX_DT_MS) : 20
    this.lastSampleT = now

    if (this.g === null) {
      this.g = [x, y, z]
    }
    const aG = dt / (dt + GRAVITY_TAU_MS)
    const aS = dt / (dt + SIGNAL_TAU_MS)
    const input: [number, number, number] = [x, y, z]
    const r: [number, number, number] = [0, 0, 0]
    for (let i = 0; i < 3; i++) {
      this.g[i] += aG * (input[i] - this.g[i])
      const residual = input[i] - this.g[i]
      this.s1[i] += aS * (residual - this.s1[i])
      this.s2[i] += aS * (this.s1[i] - this.s2[i])
      r[i] = this.s2[i]
    }

    this.buffer.push({ t: now, rx: r[0], ry: r[1], rz: r[2] })
    const cutoff = now - BUFFER_MS
    while (this.buffer.length > 0 && this.buffer[0].t < cutoff) this.buffer.shift()

    if (this.fired) return false

    // ── Evaluation (throttled; scoring is elapsed-time based) ──
    if (now - this.lastEvalT < EVAL_INTERVAL_MS) return false
    const dtEval = this.lastEvalT > 0 ? Math.min(now - this.lastEvalT, MAX_DT_MS) : 0
    this.lastEvalT = now

    const w = this.buffer
    const span = w[w.length - 1].t - w[0].t
    if (span < MIN_SPAN_MS || w.length < MIN_SAMPLES) return false
    this.effectiveRateHz = ((w.length - 1) * 1000) / span

    // Dominant axis = largest robust σ of the residual
    const sx = robustSigma(w.map((s) => s.rx))
    const sy = robustSigma(w.map((s) => s.ry))
    const sz = robustSigma(w.map((s) => s.rz))
    const sigma = Math.max(sx, sy, sz)

    if (sigma < this.config.minIntensityG) {
      this.scoreMs = Math.max(0, this.scoreMs - 2 * dtEval)
      return false
    }

    const axis: (s: Sample) => number = sigma === sx ? (s) => s.rx : sigma === sy ? (s) => s.ry : (s) => s.rz

    // Upward zero-crossings of the dominant residual with hysteresis; the
    // residual oscillates around 0, so crossing rate = true motion frequency
    const hyst = Math.max(0.05, 0.4 * sigma)
    const crossingTimes: number[] = []
    let below = axis(w[0]) < -hyst
    for (let i = 1; i < w.length; i++) {
      const v = axis(w[i])
      if (below && v > hyst) {
        const t = w[i].t
        if (crossingTimes.length === 0 || t - crossingTimes[crossingTimes.length - 1] >= CROSSING_DEDUPE_MS) {
          crossingTimes.push(t)
        }
        below = false
      } else if (!below && v < -hyst) {
        below = true
      }
    }

    // Frequency: median inter-crossing interval (quantization-free) when we
    // have enough cycles; crude count/span otherwise
    let hz: number
    if (crossingTimes.length >= 4) {
      const intervals: number[] = []
      for (let i = 1; i < crossingTimes.length; i++) intervals.push(crossingTimes[i] - crossingTimes[i - 1])
      hz = 1000 / median(intervals)
    } else {
      hz = (crossingTimes.length * 1000) / span
    }

    if (hz >= this.config.minHz && hz <= this.config.maxHz) {
      this.scoreMs += dtEval
    } else {
      this.scoreMs = Math.max(0, this.scoreMs - 2 * dtEval)
    }

    if (this.scoreMs >= this.config.fireMs) {
      this.fired = true
      return true
    }
    return false
  }

  get hasFired(): boolean {
    return this.fired
  }

  reset(): void {
    // Keep filter states — gravity doesn't change on reset, and warm filters
    // re-arm faster after a cooldown. Score and window start over.
    this.buffer = []
    this.scoreMs = 0
    this.fired = false
    this.lastSampleT = 0
    this.lastEvalT = 0
    this.effectiveRateHz = null
  }
}
