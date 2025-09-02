import React from 'react'

function colorForTemp(t: number | null) {
  if (t == null) return '#94a3b8'
  if (t < 28) return 'var(--bad)'
  if (t < 32) return 'var(--good)'
  if (t < 34) return 'var(--warn)'
  return 'var(--bad)'
}

export default function BigNumber({ value }: { value: number | null }) {
  const display = value == null ? '--' : `${value.toFixed(1)}°C`
  const color = colorForTemp(value)
  return (
    <div>
      <div className="small">Current Temperature</div>
      <div className="big-number" style={{ color }}>{display}</div>
    </div>
  )
}
