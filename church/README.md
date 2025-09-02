# Baptism Pool Dashboard

A React + Vite TypeScript starter dashboard wired to Firebase Firestore for tracking baptism pool temperature.

Setup

1. Copy `.env.example` to `.env` and fill Firebase config values.
2. npm install
3. npm run dev

Proxy server (simulated temperature feed)

1. cd ../proxy
2. npm install
3. Create a `.env` containing a base64 encoded Firebase service account JSON as FIREBASE_SERVICE_ACCOUNT_BASE64, or use the provided `.env.example`.
4. npm start

The proxy exposes endpoints to set trend and push temperature documents to Firestore.

Firebase

Expect a Firestore collection (default `temperatures`) with documents shaped:

{
  timestamp: Firebase Timestamp,
  temperature: number
}

Charts

Uses `recharts` and `react-calendar-heatmap`.
