/** Temperature history: points [time ms, value] resampled on a regular grid for the chart. */

export type HistoryRange = '24h' | '7d' | '30d'

export const HISTORY_RANGES: Record<HistoryRange, { hours: number; points: number; step: number }> = {
  '24h': { hours: 24, points: 49, step: 0.5 },
  '7d': { hours: 168, points: 169, step: 1 },
  '30d': { hours: 720, points: 181, step: 4 },
}

/** Value at each grid point (last known value), the last one replaced by the live value. */
export function resample(points: [number, number][], range: HistoryRange, end: number, current: number | null): number[] {
  const { points: n, step } = HISTORY_RANGES[range]
  const start = end - (n - 1) * step * 3600e3
  if (!points.length) return new Array(n).fill(current ?? 0)
  const out: number[] = []
  let j = 0
  let last = points[0][1]
  for (let i = 0; i < n; i++) {
    const t = start + ((end - start) * i) / (n - 1)
    while (j < points.length && points[j][0] <= t) {
      last = points[j][1]
      j++
    }
    out.push(last)
  }
  if (current != null) out[n - 1] = current
  return out
}

/** Chart geometry for one or two series and an optional target line. */
export function historyChart(a: number[], b: number[], target: number | null, width: number, height: number) {
  let lo = Math.floor(Math.min(...a, ...b))
  let hi = Math.ceil(Math.max(...a, ...b, ...(target !== null ? [target] : [])))
  if (hi - lo < 2) {
    lo -= 1
    hi += 1
  }
  const x = (i: number, n: number) => ((i / (n - 1)) * width).toFixed(1)
  const y = (v: number) => ((hi - v) / (hi - lo)) * height
  const path = (s: number[]) => 'M' + s.map((v, i) => `${x(i, s.length)} ${y(v).toFixed(1)}`).join(' L')
  const ticks: number[] = []
  const step = hi - lo > 10 ? 2 : 1
  for (let v = lo; v <= hi; v += step) ticks.push(v)
  return {
    lineA: path(a),
    areaA: `${path(a)} L${width} ${height} L0 ${height} Z`,
    lineB: b.length ? path(b) : undefined,
    endA: y(a[a.length - 1]),
    endB: b.length ? y(b[b.length - 1]) : undefined,
    ticks: ticks.map((v) => ({ value: v, top: y(v) })),
    targetTop: target !== null ? y(target) : undefined,
  }
}

export function seriesStats(s: number[]) {
  return { min: Math.min(...s), avg: s.reduce((x, v) => x + v, 0) / s.length, max: Math.max(...s) }
}

/** Hours ago of each x label. */
export const HISTORY_LABELS: Record<HistoryRange, number[]> = {
  '24h': [24, 20, 16, 12, 8, 4, 0],
  '7d': [168, 144, 120, 96, 72, 48, 24, 0],
  '30d': [720, 600, 480, 360, 240, 120, 0],
}
