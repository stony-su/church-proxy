const express = require('express')
const cors = require('cors')
const admin = require('firebase-admin')
const dotenv = require('dotenv')

dotenv.config()

if (!process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
  console.error('Missing FIREBASE_SERVICE_ACCOUNT_BASE64 in .env')
  process.exit(1)
}

const serviceAccountJson = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8')
const serviceAccount = JSON.parse(serviceAccountJson)

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})

const db = admin.firestore()

const app = express()
// allow configuring allowed origin(s) via env var VITE_ALLOWED_ORIGINS (comma-separated)
const allowedOriginsEnv = process.env.VITE_ALLOWED_ORIGINS || 'http://localhost:4000,https://church-proxy.vercel.app'
const allowedOrigins = allowedOriginsEnv.split(',').map(s => s.trim()).filter(Boolean)
app.use(cors({
  origin: function(origin, callback) {
    // allow requests with no origin (curl, server-to-server)
    if (!origin) return callback(null, true)
    if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true)
    return callback(new Error('CORS not allowed by server'))
  }
}))
app.use(express.json())

// simple in-memory trend setting: -1 (down), 0 (flat/random), +1 (up)
let trend = 0
let baseTemp = parseFloat(process.env.START_TEMPERATURE || '25')
// alert threshold (can be overridden by env)
const ALERT_THRESHOLD = typeof process.env.ALERT_THRESHOLD !== 'undefined' ? Number(process.env.ALERT_THRESHOLD) : 18
// phone to alert
const ALERT_PHONE = process.env.ALERT_PHONE || '+13659968616'
// twilio config
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const TWILIO_FROM = process.env.TWILIO_FROM
let twilioClient = null
if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  const twilio = require('twilio')
  twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
}

function nextTemp() {
  // small random walk influenced by trend
  const drift = trend * (Math.random() * 0.2 + 0.05) // trend bias
  const noise = (Math.random() - 0.5) * 0.4
  baseTemp = baseTemp + drift + noise
  // clamp
  if (baseTemp < 5) baseTemp = 5
  if (baseTemp > 40) baseTemp = 40
  return Number(baseTemp.toFixed(2))
}

app.get('/set-trend/:dir', (req, res) => {
  const dir = req.params.dir
  if (dir === 'up') trend = 1
  else if (dir === 'down') trend = -1
  else if (dir === 'flat') trend = 0
  else return res.status(400).json({ error: 'invalid dir' })
  return res.json({ trend })
})

app.post('/push', async (req, res) => {
  const temperature = typeof req.body.temperature === 'number' ? req.body.temperature : nextTemp()
  try {
    await pushTemperature(temperature)
    return res.json({ ok: true, temperature })
  } catch (err) {
    console.error('push error', err)
    return res.status(500).json({ error: String(err) })
  }
})

// endpoint to set threshold at runtime
app.post('/set-threshold', (req, res) => {
  const t = Number(req.body.threshold)
  if (Number.isFinite(t)) {
    // Note: this only changes in-memory threshold for this process
    // For persistent config, store in Firestore or env vars
    // But support quick override
    // eslint-disable-next-line no-unused-vars
    global.__ALERT_THRESHOLD = t
    return res.json({ ok: true, threshold: t })
  }
  return res.status(400).json({ error: 'invalid threshold' })
})

// endpoint to set alert phone at runtime (affects which phone receives SMS alerts)
app.post('/set-alert-phone', (req, res) => {
  const p = req.body.phone
  if (typeof p === 'string' && p.trim().length > 0) {
    // runtime override only for this process
    // eslint-disable-next-line no-unused-vars
    global.__ALERT_PHONE = p.trim()
    return res.json({ ok: true, phone: global.__ALERT_PHONE })
  }
  return res.status(400).json({ error: 'invalid phone' })
})

// endpoint to send an arbitrary/test SMS (requires Twilio config and TWILIO_FROM)
app.post('/send-sms', async (req, res) => {
  if (!twilioClient || !TWILIO_FROM) return res.status(400).json({ error: 'twilio not configured on server' })
  const to = req.body.to || (typeof global.__ALERT_PHONE === 'string' ? global.__ALERT_PHONE : ALERT_PHONE)
  const body = typeof req.body.body === 'string' ? req.body.body : 'Test message from Church Proxy'
  if (!to) return res.status(400).json({ error: 'no destination phone provided' })
  try {
    const msg = await twilioClient.messages.create({ body, from: TWILIO_FROM, to })
    return res.json({ ok: true, sid: msg.sid })
  } catch (err) {
    console.error('send-sms error', err)
    return res.status(500).json({ error: String(err) })
  }
})

app.get('/health', (req, res) => res.json({ ok: true, trend, baseTemp }))

const port = process.env.PORT || 4000
app.listen(port, () => console.log(`proxy listening on ${port}`))

// Helper: push a temperature to Firestore and handle alert recording/sms
async function pushTemperature(temperature) {
  const doc = {
    temperature,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  }
  const col = db.collection(process.env.FIRESTORE_COLLECTION || 'temperatures')
  await col.add(doc)

  // determine threshold (allow runtime override via global.__ALERT_THRESHOLD)
  const runtimeThreshold = typeof global.__ALERT_THRESHOLD === 'number' ? global.__ALERT_THRESHOLD : ALERT_THRESHOLD

  try {
    if (Number.isFinite(runtimeThreshold) && temperature < runtimeThreshold) {
      const alertCol = db.collection(process.env.FIRESTORE_ALERTS_COLLECTION || 'alerts')
      const alertDoc = {
        temperature,
        threshold: runtimeThreshold,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        phone: ALERT_PHONE
      }
      await alertCol.add(alertDoc)
      // send SMS if twilio configured
      if (twilioClient && TWILIO_FROM) {
        await twilioClient.messages.create({
          body: `Alert: temperature ${temperature}°C dropped below ${runtimeThreshold}°C`,
          from: TWILIO_FROM,
          to: ALERT_PHONE
        })
      }
    }
  } catch (ae) {
    console.error('alert push/send error', ae)
  }
}

// Optional automatic pushing interval (seconds). Set AUTO_PUSH_INTERVAL_SEC > 0 to enable.
const AUTO_PUSH_INTERVAL_SEC = typeof process.env.AUTO_PUSH_INTERVAL_SEC !== 'undefined'
  ? Number(process.env.AUTO_PUSH_INTERVAL_SEC)
  : 1
if (Number.isFinite(AUTO_PUSH_INTERVAL_SEC) && AUTO_PUSH_INTERVAL_SEC > 0) {
  console.log(`Auto-push enabled: pushing every ${AUTO_PUSH_INTERVAL_SEC} seconds`)
  setInterval(async () => {
    try {
      const temp = nextTemp()
      await pushTemperature(temp)
      console.log('auto-pushed temperature', temp)
    } catch (e) {
      console.error('auto-push error', e)
    }
  }, AUTO_PUSH_INTERVAL_SEC * 1000)
} else {
  console.log('Auto-push disabled (set AUTO_PUSH_INTERVAL_SEC to enable)')
}
