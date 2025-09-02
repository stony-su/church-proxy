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
app.use(cors())
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
  const doc = {
    temperature,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  }
  try {
    const col = db.collection(process.env.FIRESTORE_COLLECTION || 'temperatures')
    await col.add(doc)
    // check alert condition and record/send if below threshold
    try {
      if (temperature < ALERT_THRESHOLD) {
        const alertCol = db.collection(process.env.FIRESTORE_ALERTS_COLLECTION || 'alerts')
        const alertDoc = {
          temperature,
          threshold: ALERT_THRESHOLD,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          phone: ALERT_PHONE
        }
        await alertCol.add(alertDoc)
        // send SMS if twilio configured
        if (twilioClient && TWILIO_FROM) {
          await twilioClient.messages.create({
            body: `Alert: temperature ${temperature}°C dropped below ${ALERT_THRESHOLD}°C`,
            from: TWILIO_FROM,
            to: ALERT_PHONE
          })
        }
      }
    } catch (ae) {
      console.error('alert push/send error', ae)
    }
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

app.get('/health', (req, res) => res.json({ ok: true, trend, baseTemp }))

const port = process.env.PORT || 4000
app.listen(port, () => console.log(`proxy listening on ${port}`))
