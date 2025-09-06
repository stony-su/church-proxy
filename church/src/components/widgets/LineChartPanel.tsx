import React, { useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area } from 'recharts'
import { format } from 'date-fns'

export default function LineChartPanel({ data }: { data: any[] }) {
  const [mode, setMode] = useState<'raw'|'avg'>('raw')
  // Assumption: temperatures are in Celsius. Change this if using Fahrenheit.
  const UNIT = '°C'

  const chartData = useMemo(() => {
    if (!data.length) return []
    const list = data.map(d => ({ time: d.timestamp, temp: d.temperature }))
    if (mode === 'raw') return list
    // average by hour
    const map = new Map<string, { sum:number, count:number, time: Date }>()
    for (const p of list) {
      const key = format(p.time, 'yyyy-MM-dd HH:00')
      const cur = map.get(key) || { sum:0, count:0, time: p.time }
      cur.sum += p.temp
      cur.count += 1
      map.set(key, cur)
    }
    return Array.from(map.entries()).map(([k,v]) => ({ time: v.time, temp: v.sum / v.count }))
  }, [data, mode])

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div className="small">Temperature Over Time</div>
        <div className="small">
          <button onClick={() => setMode(m => m === 'raw' ? 'avg' : 'raw')}>Toggle: {mode}</button>
        </div>
      </div>
      <div style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            {/* show time down to the minute like "3:05pm" or "8:12am" */}
            <XAxis dataKey="time" tickFormatter={(t:any) => format(new Date(t), 'h:mm a').toLowerCase().replace(' ', '')} />
            {/* round Y ticks to nearest integer and compute a dynamic domain from data */}
            <YAxis
              domain={[(dataMin:any) => Math.floor(dataMin ?? 0), (dataMax:any) => Math.ceil(dataMax ?? 0)]}
              tickFormatter={(v:any) => String(Math.round(Number(v)))}
              label={{ value: `Temperature (${UNIT})`, angle: -90, position: 'insideLeft', dy: 40 }}
            />
            <Tooltip
              labelFormatter={(t:any) => format(new Date(t), 'PPpp')}
              contentStyle={{ backgroundColor: 'rgba(2,6,23,0.95)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, padding: 8 }}
              itemStyle={{ color: '#e6eef8' }}
              labelStyle={{ color: '#94a3b8' }}
            />
            <Area dataKey="temp" fill="rgba(6,182,212,0.32)" stroke="none" />
            <Line type="monotone" dataKey="temp" stroke="#06b6d4" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
