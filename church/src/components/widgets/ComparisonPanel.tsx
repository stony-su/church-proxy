import React, { useMemo } from 'react'
import { subDays, isSameDay } from 'date-fns'

export default function ComparisonPanel({ data }: { data: any[] }) {
  const latest = data.length ? data[data.length-1] : null

  const yesterdayAtSame = useMemo(() => {
    if (!latest) return null
    const target = subDays(latest.timestamp, 1)
    // find nearest by timestamp
    let best = null; let bestDiff = Infinity
    for (const d of data) {
      const diff = Math.abs(d.timestamp - target)
      if (diff < bestDiff) { bestDiff = diff; best = d }
    }
    return best
  }, [data])

  const delta = latest && yesterdayAtSame ? (latest.temperature - yesterdayAtSame.temperature) : null

  return (
    <div>
      <div className="small">Comparisons</div>
      <div style={{ marginTop:8 }}>
        <div>Now: {latest ? latest.temperature.toFixed(1) + '°C' : '--'}</div>
        <div>Compared to yesterday: {delta != null ? (delta > 0 ? '+' : '') + delta.toFixed(1) + '°C' : '--'}</div>
      </div>
    </div>
  )
}
