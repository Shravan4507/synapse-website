import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getAnalytics, isSupported } from 'firebase/analytics'
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check'

// Firebase configuration using Vite environment variables
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
}

// Validate that required Firebase config is present
const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'appId'] as const
const missingKeys = requiredKeys.filter(key => !firebaseConfig[key])

if (missingKeys.length > 0) {
    console.error('❌ Missing Firebase configuration:', missingKeys.join(', '))
    console.error('Make sure these environment variables are set:')
    missingKeys.forEach(key => {
        const envVar = `VITE_FIREBASE_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`
        console.error(`  - ${envVar}`)
    })
    throw new Error(`Firebase configuration incomplete. Missing: ${missingKeys.join(', ')}`)
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase App Check for security (optional - only if reCAPTCHA key is provided)
if (typeof window !== 'undefined' && import.meta.env.VITE_RECAPTCHA_SITE_KEY) {
    try {
        initializeAppCheck(app, {
            provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
            isTokenAutoRefreshEnabled: true
        })
        console.info('✅ Firebase App Check initialized')
    } catch (error) {
        console.warn('⚠️ App Check initialization failed (non-critical):', error)
    }
}

// Initialize Firebase services
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

// Initialize Analytics (only in browser, non-blocking)
export const initAnalytics = async () => {
    try {
        if (await isSupported()) {
            return getAnalytics(app)
        }
    } catch {
        console.warn('⚠️ Analytics not supported in this environment')
    }
    return null
}

export default app
