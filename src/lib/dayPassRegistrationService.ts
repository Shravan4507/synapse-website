/**
 * Day Pass Registration Service
 * Handles day pass registrations and unified QR generation
 */

import {
    collection,
    doc,
    getDocs,
    addDoc,
    updateDoc,
    query,
    where,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore'
import { db } from './firebase'

// ========================================
// TYPES
// ========================================

export interface DayPassRegistration {
    id?: string
    userId: string
    synapseId: string
    userName: string
    email: string
    phone: string
    college: string
    governmentIdLast4: string
    selectedDays: number[]      // [1, 2, 3] or any combination
    totalAmount: number
    status: 'pending' | 'approved' | 'rejected'
    paymentStatus: 'pending' | 'paid' | 'free'
    transactionId?: string
    createdAt?: Timestamp
    updatedAt?: Timestamp
}

// ========================================
// QR DATA GENERATION
// ========================================

/**
 * Generate encrypted QR data for a user's registrations
 * Contains all registration info in a single string
 */
export const generateUnifiedQRData = (
    synapseId: string,
    governmentIdLast4: string,
    registrations: { type: 'daypass' | 'competition' | 'event'; id: string; name: string }[]
): string => {
    // Create a structured data object
    const qrPayload = {
        sid: synapseId,
        gid: governmentIdLast4,
        reg: registrations.map(r => ({
            t: r.type.charAt(0), // 'd', 'c', or 'e'
            id: r.id,
            n: r.name
        })),
        ts: Date.now()
    }

    // Convert to JSON and encode as base64 (simple encryption for now)
    // In production, use proper encryption
    const jsonString = JSON.stringify(qrPayload)
    const encoded = btoa(jsonString)

    return `SYN:${encoded}`
}

/**
 * Decode QR data (for scanner)
 */
export const decodeQRData = (qrString: string): {
    synapseId: string
    governmentIdLast4: string
    registrations: { type: string; id: string; name: string }[]
    timestamp: number
} | null => {
    try {
        if (!qrString.startsWith('SYN:')) return null

        const encoded = qrString.substring(4)
        const jsonString = atob(encoded)
        const payload = JSON.parse(jsonString)

        return {
            synapseId: payload.sid,
            governmentIdLast4: payload.gid,
            registrations: payload.reg.map((r: { t: string; id: string; n: string }) => ({
                type: r.t === 'd' ? 'daypass' : r.t === 'c' ? 'competition' : 'event',
                id: r.id,
                name: r.n
            })),
            timestamp: payload.ts
        }
    } catch {
        return null
    }
}

// ========================================
// REGISTRATION CRUD
// ========================================

/**
 * Create a new day pass registration
 */
export const createDayPassRegistration = async (
    registration: Omit<DayPassRegistration, 'id' | 'status' | 'paymentStatus' | 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; id?: string; error?: string }> => {
    try {
        // Check if user already has a registration
        const existing = await getDayPassRegistrationByUser(registration.userId)
        if (existing) {
            return { success: false, error: 'You already have a day pass registration' }
        }

        const docRef = await addDoc(collection(db, 'day_pass_registrations'), {
            ...registration,
            status: 'approved', // Auto-approve for now (no payment verification yet)
            paymentStatus: registration.totalAmount > 0 ? 'pending' : 'free',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        })

        return { success: true, id: docRef.id }
    } catch (error) {
        console.error('Error creating day pass registration:', error)
        return { success: false, error: 'Failed to create registration' }
    }
}

/**
 * Get day pass registration by user ID
 */
export const getDayPassRegistrationByUser = async (userId: string): Promise<DayPassRegistration | null> => {
    try {
        const q = query(
            collection(db, 'day_pass_registrations'),
            where('userId', '==', userId)
        )
        const snapshot = await getDocs(q)

        if (snapshot.empty) return null

        const docSnap = snapshot.docs[0]
        return {
            id: docSnap.id,
            ...docSnap.data()
        } as DayPassRegistration
    } catch (error) {
        console.error('Error fetching day pass registration:', error)
        return null
    }
}

/**
 * Add more days to an existing registration
 */
export const addDaysToRegistration = async (
    registrationId: string,
    newDays: number[],
    additionalAmount: number,
    existingDays: number[]
): Promise<{ success: boolean; error?: string }> => {
    try {
        // Combine existing and new days, removing duplicates
        const allDays = [...new Set([...existingDays, ...newDays])].sort((a, b) => a - b)

        await updateDoc(doc(db, 'day_pass_registrations', registrationId), {
            selectedDays: allDays,
            totalAmount: additionalAmount,  // This is the NEW total
            updatedAt: serverTimestamp()
        })

        return { success: true }
    } catch (error) {
        console.error('Error adding days to registration:', error)
        return { success: false, error: 'Failed to update registration' }
    }
}

/**
 * Get all registrations for a user (day passes + competitions + events)
 * Returns unified registration list for QR generation
 */
export const getAllUserRegistrations = async (userId: string): Promise<{
    dayPass: DayPassRegistration | null
    competitions: { id: string; name: string }[]
    events: { id: string; name: string }[]
}> => {
    try {
        // Fetch day pass registration
        const dayPass = await getDayPassRegistrationByUser(userId)

        // Fetch competition registrations
        const compQuery = query(
            collection(db, 'registrations'),
            where('userId', '==', userId)
        )
        const compSnapshot = await getDocs(compQuery)
        const competitions = compSnapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().competitionName || 'Competition'
        }))

        // Fetch event registrations
        const eventQuery = query(
            collection(db, 'event_registrations'),
            where('userId', '==', userId)
        )
        const eventSnapshot = await getDocs(eventQuery)
        const events = eventSnapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().eventName || 'Event'
        }))

        return { dayPass, competitions, events }
    } catch (error) {
        console.error('Error fetching all user registrations:', error)
        return { dayPass: null, competitions: [], events: [] }
    }
}

/**
 * Check if user has any registrations (for showing/hiding holo card)
 */
export const hasAnyRegistration = async (userId: string): Promise<boolean> => {
    const { dayPass, competitions, events } = await getAllUserRegistrations(userId)
    return dayPass !== null || competitions.length > 0 || events.length > 0
}

// ========================================
// ADMIN FUNCTIONS
// ========================================

/**
 * Get all day pass registrations (for admin)
 */
export const getAllDayPassRegistrations = async (): Promise<DayPassRegistration[]> => {
    try {
        const snapshot = await getDocs(collection(db, 'day_pass_registrations'))
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as DayPassRegistration))
    } catch (error) {
        console.error('Error fetching all day pass registrations:', error)
        return []
    }
}

/**
 * Delete a day pass registration
 */
export const deleteDayPassRegistration = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const { deleteDoc } = await import('firebase/firestore')
        await deleteDoc(doc(db, 'day_pass_registrations', id))
        return { success: true }
    } catch (error) {
        console.error('Error deleting day pass registration:', error)
        return { success: false, error: 'Failed to delete registration' }
    }
}

/**
 * Update a day pass registration
 */
export const updateDayPassRegistration = async (
    id: string,
    updates: Partial<Omit<DayPassRegistration, 'id' | 'createdAt'>>
): Promise<{ success: boolean; error?: string }> => {
    try {
        const { updateDoc } = await import('firebase/firestore')
        await updateDoc(doc(db, 'day_pass_registrations', id), {
            ...updates,
            updatedAt: serverTimestamp()
        })
        return { success: true }
    } catch (error) {
        console.error('Error updating day pass registration:', error)
        return { success: false, error: 'Failed to update registration' }
    }
}

/**
 * Update registration status (approve/reject)
 */
export const updateDayPassStatus = async (
    id: string,
    status: 'pending' | 'approved' | 'rejected'
): Promise<{ success: boolean; error?: string }> => {
    return updateDayPassRegistration(id, { status })
}

/**
 * Update payment status
 */
export const updateDayPassPaymentStatus = async (
    id: string,
    paymentStatus: 'pending' | 'paid' | 'free',
    transactionId?: string
): Promise<{ success: boolean; error?: string }> => {
    return updateDayPassRegistration(id, {
        paymentStatus,
        ...(transactionId && { transactionId })
    })
}

/**
 * Get stats for day pass registrations
 */
export const getDayPassRegistrationStats = (registrations: DayPassRegistration[]) => {
    const total = registrations.length
    const pending = registrations.filter(r => r.status === 'pending').length
    const approved = registrations.filter(r => r.status === 'approved').length
    const rejected = registrations.filter(r => r.status === 'rejected').length
    const totalRevenue = registrations
        .filter(r => r.status === 'approved')
        .reduce((sum, r) => sum + r.totalAmount, 0)

    return { total, pending, approved, rejected, totalRevenue }
}

/**
 * Export day pass registrations to CSV
 */
export const exportDayPassRegistrationsToCSV = (registrations: DayPassRegistration[]): string => {
    if (registrations.length === 0) return ''

    const headers = [
        'Synapse ID',
        'Name',
        'Email',
        'Phone',
        'College',
        'Selected Days',
        'Amount',
        'Status',
        'Payment Status',
        'Gov ID (Last 4)',
        'Registered At'
    ]

    const rows = registrations.map(reg => [
        reg.synapseId,
        reg.userName,
        reg.email,
        reg.phone,
        reg.college,
        reg.selectedDays.join(' + '),
        reg.totalAmount.toString(),
        reg.status,
        reg.paymentStatus,
        reg.governmentIdLast4,
        reg.createdAt?.toDate().toLocaleString() || ''
    ])

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    return csvContent
}

/**
 * Download CSV file
 */
export const downloadDayPassCSV = (csvContent: string, filename: string): void => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
}

/**
 * Get registration counts for each day
 * Returns { 1: count, 2: count, 3: count }
 */
export const getRegistrationCountsPerDay = async (): Promise<{ [day: number]: number }> => {
    try {
        const registrations = await getAllDayPassRegistrations()
        const counts: { [day: number]: number } = { 1: 0, 2: 0, 3: 0 }

        registrations.forEach(reg => {
            reg.selectedDays?.forEach(day => {
                if (counts[day] !== undefined) {
                    counts[day]++
                }
            })
        })

        return counts
    } catch (error) {
        console.error('Error getting registration counts:', error)
        return { 1: 0, 2: 0, 3: 0 }
    }
}
