/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_FIREBASE_API_KEY: string
    readonly VITE_FIREBASE_AUTH_DOMAIN: string
    readonly VITE_FIREBASE_PROJECT_ID: string
    readonly VITE_FIREBASE_STORAGE_BUCKET: string
    readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
    readonly VITE_FIREBASE_APP_ID: string
    readonly VITE_FIREBASE_MEASUREMENT_ID: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}

// User document type
export interface UserProfile {
    id: string
    email: string
    displayName: string
    synapseId: string
    college?: string
    gender?: string
    phone?: string
    photoURL?: string
    createdAt: Date
    updatedAt: Date
}

// Event document type
export interface Event {
    id: string
    name: string
    description: string
    date: Date
    venue: string
    imageURL?: string
    capacity: number
    registeredCount: number
    isActive: boolean
    createdAt: Date
    updatedAt: Date
}

// Competition document type
export interface Competition {
    id: string
    name: string
    description: string
    date: Date
    venue: string
    imageURL?: string
    teamSize: number
    prizePool?: string
    registrationFee?: number
    capacity: number
    registeredCount: number
    isActive: boolean
    createdAt: Date
    updatedAt: Date
}

// Registration document type
export interface Registration {
    id: string
    userId: string
    eventId?: string
    competitionId?: string
    type: 'event' | 'competition'
    status: 'pending' | 'confirmed' | 'cancelled'
    qrData: string
    teamName?: string
    teamMembers?: string[]
    createdAt: Date
    updatedAt: Date
}
