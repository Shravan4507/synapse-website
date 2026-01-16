/**
 * Event Registration Service
 * Handles individual registrations for events
 */

import {
    collection,
    doc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore'
import { db } from './firebase'

// ========================================
// TYPES
// ========================================

export interface EventRegistration {
    id?: string
    eventId: string
    eventName: string
    // User details
    userId?: string       // If linked to a user account
    synapseId?: string    // Synapse ID if registered user
    name: string
    email: string
    phone: string
    collegeName: string
    // Payment
    transactionId?: string
    paymentScreenshot?: string
    amountPaid: number
    // Status
    status: 'pending' | 'approved' | 'rejected'
    attended?: boolean    // For attendance tracking
    notes?: string
    createdAt?: Timestamp
}

// ========================================
// REGISTRATION CRUD
// ========================================

/**
 * Get all registrations for a specific event
 */
export const getEventRegistrationsByEvent = async (eventId: string): Promise<EventRegistration[]> => {
    try {
        const q = query(
            collection(db, 'event_registrations'),
            where('eventId', '==', eventId),
            orderBy('createdAt', 'desc')
        )
        const snapshot = await getDocs(q)
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as EventRegistration))
    } catch (error) {
        console.error('Error fetching event registrations:', error)
        return []
    }
}

/**
 * Get all event registrations (for admin view)
 */
export const getAllEventRegistrations = async (): Promise<EventRegistration[]> => {
    try {
        const q = query(collection(db, 'event_registrations'), orderBy('createdAt', 'desc'))
        const snapshot = await getDocs(q)
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as EventRegistration))
    } catch (error) {
        console.error('Error fetching all event registrations:', error)
        return []
    }
}

/**
 * Create a new event registration
 */
export const createEventRegistration = async (
    registration: Omit<EventRegistration, 'id' | 'status' | 'attended' | 'createdAt'>
): Promise<{ success: boolean; id?: string; error?: string }> => {
    try {
        const docRef = await addDoc(collection(db, 'event_registrations'), {
            ...registration,
            status: 'pending',
            attended: false,
            createdAt: serverTimestamp()
        })
        return { success: true, id: docRef.id }
    } catch (error) {
        console.error('Error creating event registration:', error)
        return { success: false, error: 'Failed to submit registration' }
    }
}

/**
 * Update event registration status
 */
export const updateEventRegistrationStatus = async (
    id: string,
    status: 'pending' | 'approved' | 'rejected'
): Promise<{ success: boolean }> => {
    try {
        await updateDoc(doc(db, 'event_registrations', id), { status })
        return { success: true }
    } catch (error) {
        console.error('Error updating registration status:', error)
        return { success: false }
    }
}

/**
 * Mark attendance for an event registration
 */
export const markEventAttendance = async (
    id: string,
    attended: boolean
): Promise<{ success: boolean }> => {
    try {
        await updateDoc(doc(db, 'event_registrations', id), { attended })
        return { success: true }
    } catch (error) {
        console.error('Error marking attendance:', error)
        return { success: false }
    }
}

/**
 * Delete an event registration
 */
export const deleteEventRegistration = async (id: string): Promise<{ success: boolean }> => {
    try {
        await deleteDoc(doc(db, 'event_registrations', id))
        return { success: true }
    } catch (error) {
        console.error('Error deleting event registration:', error)
        return { success: false }
    }
}

// ========================================
// EXPORT FUNCTIONS
// ========================================

/**
 * Convert event registrations to CSV format
 */
export const exportEventRegistrationsToCSV = (registrations: EventRegistration[]): string => {
    if (registrations.length === 0) return ''

    const headers = [
        'Registration ID',
        'Event',
        'Name',
        'Email',
        'Phone',
        'College',
        'Synapse ID',
        'Amount Paid',
        'Transaction ID',
        'Status',
        'Attended',
        'Registered At'
    ]

    const rows = registrations.map(reg => {
        const row = [
            reg.id || '',
            reg.eventName,
            reg.name,
            reg.email,
            reg.phone,
            reg.collegeName,
            reg.synapseId || '',
            reg.amountPaid.toString(),
            reg.transactionId || '',
            reg.status,
            reg.attended ? 'Yes' : 'No',
            reg.createdAt?.toDate().toLocaleString() || ''
        ]
        return row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    })

    return [headers.join(','), ...rows].join('\n')
}

/**
 * Download CSV file
 */
export const downloadEventCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
    URL.revokeObjectURL(link.href)
}

/**
 * Get event registration stats
 */
export const getEventRegistrationStats = (registrations: EventRegistration[]) => {
    return {
        total: registrations.length,
        pending: registrations.filter(r => r.status === 'pending').length,
        approved: registrations.filter(r => r.status === 'approved').length,
        rejected: registrations.filter(r => r.status === 'rejected').length,
        attended: registrations.filter(r => r.attended).length,
        totalRevenue: registrations.reduce((sum, r) => sum + (r.amountPaid || 0), 0)
    }
}
