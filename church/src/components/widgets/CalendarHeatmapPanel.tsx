import React from 'react'
import CalendarHeatmap from 'react-calendar-heatmap'
import 'react-calendar-heatmap/dist/styles.css'
import { format } from 'date-fns'

export default function CalendarHeatmapPanel({ data }: { data: any[] }) {
  const byDay = new Map<string, { sum:number, count:number, max:number }>()
  for (const d of data) {
    const key = format(d.timestamp, 'yyyy-MM-dd')
    const cur = byDay.get(key) || { sum:0, count:0, max: -Infinity }
    cur.sum += d.temperature
    cur.count += 1
    cur.max = Math.max(cur.max, d.temperature)
    byDay.set(key, cur)
  }
  const values = Array.from(byDay.entries()).map(([date, v]) => ({ date, count: Math.round(v.sum / v.count) }))

  const classForValue = (value:any) => {
    if (!value) return 'color-empty'
    const t = value.count
    if (t < 28) return 'color-scale-1'
    if (t < 32) return 'color-scale-2'
    return 'color-scale-3'
  }

  return (
    <div>
      <div className="small">Daily Heatmap (avg)</div>
      <CalendarHeatmap
        startDate={new Date(new Date().getFullYear(), 0, 1)}
        endDate={new Date()}
        values={values}
        classForValue={classForValue}
        tooltipDataAttrs={value => ({ 'data-tip': `${value.date}: ${value.count}°C` })}
      />
    </div>
  )
}
