import React, { useEffect, useMemo, useState } from 'react'
import { subscribeRecentTemps, subscribeAlerts } from '../firebase'
import { format } from 'date-fns'
import BigNumber from './widgets/BigNumber'
import LineChartPanel from './widgets/LineChartPanel'
import SparklinesRow from './widgets/SparklinesRow'
import CalendarHeatmapPanel from './widgets/CalendarHeatmapPanel'
import ComparisonPanel from './widgets/ComparisonPanel'

export default function Dashboard() {
  const [data, setData] = useState<any[]>([])
  const [proxyUrl, setProxyUrl] = useState<string>(() => import.meta.env.VITE_PROXY_URL || 'https://church-proxy-git-main-stony-sus-projects.vercel.app/')
  const [trendState, setTrendState] = useState<number>(0)
  const [alerts, setAlerts] = useState<any[]>([])
  const [threshold, setThreshold] = useState<number>(() => Number(import.meta.env.VITE_ALERT_THRESHOLD || '18'))

  useEffect(() => {
    const unsub = subscribeRecentTemps((items) => {
      // convert timestamps to Date
      const mapped = items.map(i => ({ ...i, timestamp: i.timestamp?.toDate ? i.timestamp.toDate() : new Date(i.timestamp) }))
      setData(mapped.sort((a,b) => a.timestamp - b.timestamp))
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    const unsub = subscribeAlerts((items) => {
      const mapped = items.map(i => ({ ...i, timestamp: i.timestamp?.toDate ? i.timestamp.toDate() : new Date(i.timestamp) }))
      setAlerts(mapped.sort((a,b) => (b.timestamp?.getTime?.() || 0) - (a.timestamp?.getTime?.() || 0)))
    })
    return () => unsub()
  }, [])

  const latest = data.length ? data[data.length - 1].temperature : null

  return (
    <div className="container">
      <div className="header">
        <h1>Baptism Pool Monitor</h1>
        <div className="small">Connected to Firebase</div>
      </div>
      <div className="grid">
        <div>
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={async () => { await fetch(`${proxyUrl}/set-trend/up`); setTrendState(1) }}>Trend ↑</button>
              <button onClick={async () => { await fetch(`${proxyUrl}/set-trend/flat`); setTrendState(0) }}>Trend •</button>
              <button onClick={async () => { await fetch(`${proxyUrl}/set-trend/down`); setTrendState(-1) }}>Trend ↓</button>
              <div style={{ marginLeft: 'auto' }}>
                <button onClick={async () => { await fetch(`${proxyUrl}/push`, { method: 'POST' }); }}>Push now</button>
              </div>
            </div>
            <div style={{ marginTop: 8 }}>Proxy: <input value={proxyUrl} onChange={e => setProxyUrl(e.target.value)} style={{ width: 320 }} /></div>
            <div style={{ marginTop: 8 }}>Current trend: {trendState === 1 ? '↑' : trendState === -1 ? '↓' : '•'}</div>
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

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="small">Alerts</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input value={String(threshold)} onChange={e => setThreshold(Number(e.target.value))} style={{ width: 80 }} />
                <button onClick={async () => { await fetch(`${proxyUrl}/set-threshold`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ threshold }) }) }}>Set threshold</button>
                <div className="tiny">alerts sent to +13659968616 via proxy</div>
              </div>
            </div>
            <div style={{ marginTop: 8 }}>
              <div style={{ maxHeight: 200, overflow: 'auto' }}>
                {alerts.length === 0 ? <div className="small">No alerts</div> : alerts.map(a => (
                  <div key={a.id} style={{ padding: 6, borderBottom: '1px solid #eee' }}>
                    <div style={{ fontSize: 12 }}>{format(new Date(a.timestamp), 'PPpp')}</div>
                    <div style={{ fontWeight: 600 }}>{a.temperature}°C</div>
                    <div style={{ fontSize: 12, color: '#666' }}>threshold: {a.threshold}°C</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
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
