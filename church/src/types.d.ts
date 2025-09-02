declare module 'react-sparklines'
declare module 'react-calendar-heatmap'

// Vite environment variables typings for TypeScript
interface ImportMetaEnv {
	readonly VITE_FIREBASE_API_KEY?: string
	readonly VITE_FIREBASE_AUTH_DOMAIN?: string
	readonly VITE_FIREBASE_PROJECT_ID?: string
	readonly VITE_FIREBASE_STORAGE_BUCKET?: string
	readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string
	readonly VITE_FIREBASE_APP_ID?: string
	readonly VITE_FIRESTORE_COLLECTION?: string
	readonly VITE_FIRESTORE_ALERTS_COLLECTION?: string
	readonly VITE_PROXY_URL?: string
	readonly VITE_ALERT_THRESHOLD?: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}
