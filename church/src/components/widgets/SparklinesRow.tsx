import React from 'react'
import { Sparklines, SparklinesLine } from 'react-sparklines'

export default function SparklinesRow({ data }: { data: any[] }) {
  const values = data.slice(-30).map(d => d.temperature || 0)
  return (
    <div>
      <div className="small">Recent Trend</div>
      <div className="sparklines">
        <div style={{ flex:1 }}>
          <Sparklines data={values} width={100} height={40}>
            <SparklinesLine color="#06b6d4" />
          </Sparklines>
        </div>
        <div style={{ width: 120, textAlign:'right' }}>
          <div className="small">Last 30 readings</div>
          <div style={{ fontWeight:700 }}>{values.length ? values[values.length-1].toFixed(1) + '°C' : '--'}</div>
        </div>
      </div>
    </div>
  )
}
