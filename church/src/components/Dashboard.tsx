import React, { useEffect, useState } from 'react'
import { subscribeRecentTemps } from '../firebase'
import { format } from 'date-fns'
import BigNumber from './widgets/BigNumber'
import LineChartPanel from './widgets/LineChartPanel'
import SparklinesRow from './widgets/SparklinesRow'
import CalendarHeatmapPanel from './widgets/CalendarHeatmapPanel'
import ComparisonPanel from './widgets/ComparisonPanel'

export default function Dashboard() {
  const [data, setData] = useState<any[]>([])
  // Alerts UI removed in this build (read-only dashboard)
  // Read-only UI: no proxy controls. The dashboard subscribes directly to Firestore.

  useEffect(() => {
    const unsub = subscribeRecentTemps((items) => {
      // convert timestamps to Date
      const mapped = items.map(i => ({ ...i, timestamp: i.timestamp?.toDate ? i.timestamp.toDate() : new Date(i.timestamp) }))
      setData(mapped.sort((a,b) => a.timestamp - b.timestamp))
    })
    return () => unsub()
  }, [])

  // Alerts subscription intentionally omitted for read-only dashboard

  const latest = data.length ? data[data.length - 1].temperature : null

  return (
    <div className="container">
      <div className="header">
        <h1>Baptism Pool Monitor</h1>
        <div className="small">Read-only — connected to Firebase (no proxy controls)</div>
      </div>
      <div className="grid">
        <div>
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="small">Read-only mode</div>
              <div style={{ fontSize: 12, color: '#666' }}>Proxy-based controls are disabled in this build</div>
            </div>
          </div>
          <div className="card">
            <BigNumber value={latest} />
          </div>

          <div style={{ height: 12 }} />

          <div className="card">
            <SparklinesRow data={data} />
          </div>

          <div style={{ height: 12 }} />

          <div className="card">
            <ComparisonPanel data={data} />
          </div>

          <div style={{ height: 12 }} />

          {/* Alerts card removed for this build (read-only dashboard) */}
        </div>

        <div>
          <div className="card" style={{ marginBottom: 12 }}>
            <LineChartPanel data={data} />
          </div>

          <div className="card" style={{ marginBottom: 12 }}>
            <CalendarHeatmapPanel data={data} />
          </div>

        </div>
      </div>
    </div>
  )
}
