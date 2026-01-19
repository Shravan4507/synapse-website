/**
 * QR Verification Service
 * Handles volunteer management, attendance tracking, and QR verification
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

export interface QRVolunteer {
    id?: string
    userId: string
    synapseId: string
    displayName: string
    email: string
    assignedEvents?: string[]  // Event IDs they can scan for
    allowedEventTypes?: ('daypass' | 'competition' | 'event')[]  // Types of events they can scan
    isActive: boolean
    createdAt?: Timestamp
    createdBy?: string  // Admin who added them
    lastActiveAt?: Timestamp  // Last time they scanned
    totalScans?: number  // Total scans performed
}

export interface Attendance {
    id?: string
    userId: string
    synapseId: string
    displayName: string
    email?: string
    college?: string
    date: string           // YYYY-MM-DD format
    attended: boolean
    scannedBy: string      // Volunteer's Synapse ID
    scannedByName: string
    scannedAt: Timestamp
    syncedAt?: Timestamp
    offlineScanned: boolean
    // Event-specific tracking
    eventId?: string       // Specific event if applicable
    eventType?: string     // daypass, competition, event
    eventName?: string
    // Payment verification
    paymentStatus?: 'pending' | 'paid' | 'free'
    paymentVerified?: boolean
    // Registration info from QR
    registrations?: {
        type: string
        id: string
        name: string
    }[]
    // Audit fields
    notes?: string
    editedBy?: string
    editedAt?: Timestamp
    deviceInfo?: string    // Device used for scanning
}

export interface AttendanceRecord {
    date: string
    userId: string
    synapseId: string
    displayName: string
}

// Offline queue item
export interface OfflineQueueItem {
    id: string             // Local UUID
    attendance: Omit<Attendance, 'id' | 'syncedAt'>
    timestamp: number      // When it was queued
    retryCount: number
    lastError?: string
}

// Audit log entry
export interface AuditLog {
    id?: string
    action: 'create' | 'update' | 'delete' | 'scan'
    entityType: 'attendance' | 'volunteer' | 'settings'
    entityId: string
    performedBy: string    // User ID
    performedByName: string
    timestamp: Timestamp
    details: Record<string, any>
    ipAddress?: string
    userAgent?: string
}

// ========================================
// VOLUNTEER MANAGEMENT
// ========================================

/**
 * Get all volunteers
 */
export const getAllVolunteers = async (): Promise<QRVolunteer[]> => {
    try {
        const q = query(collection(db, 'qr_volunteers'), orderBy('createdAt', 'desc'))
        const snapshot = await getDocs(q)
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as QRVolunteer))
    } catch (error) {
        console.error('Error fetching volunteers:', error)
        return []
    }
}

/**
 * Get active volunteers only
 */
export const getActiveVolunteers = async (): Promise<QRVolunteer[]> => {
    try {
        const volunteers = await getAllVolunteers()
        return volunteers.filter(v => v.isActive)
    } catch (error) {
        console.error('Error fetching active volunteers:', error)
        return []
    }
}

/**
 * Check if a user is a volunteer
 */
export const isVolunteer = async (userId: string): Promise<boolean> => {
    try {
        const q = query(
            collection(db, 'qr_volunteers'),
            where('userId', '==', userId),
            where('isActive', '==', true)
        )
        const snapshot = await getDocs(q)
        return !snapshot.empty
    } catch (error) {
        console.error('Error checking volunteer status:', error)
        return false
    }
}

/**
 * Get volunteer by user ID
 */
export const getVolunteerByUserId = async (userId: string): Promise<QRVolunteer | null> => {
    try {
        const q = query(
            collection(db, 'qr_volunteers'),
            where('userId', '==', userId)
        )
        const snapshot = await getDocs(q)
        if (snapshot.empty) return null

        return {
            id: snapshot.docs[0].id,
            ...snapshot.docs[0].data()
        } as QRVolunteer
    } catch (error) {
        console.error('Error fetching volunteer:', error)
        return null
    }
}

/**
 * Add a new volunteer
 */
export const addVolunteer = async (
    volunteer: Omit<QRVolunteer, 'id' | 'createdAt'>
): Promise<{ success: boolean; id?: string; error?: string }> => {
    try {
        // Check if already a volunteer
        const existing = await getVolunteerByUserId(volunteer.userId)
        if (existing) {
            return { success: false, error: 'User is already a volunteer' }
        }

        const docRef = await addDoc(collection(db, 'qr_volunteers'), {
            ...volunteer,
            createdAt: serverTimestamp()
        })
        return { success: true, id: docRef.id }
    } catch (error) {
        console.error('Error adding volunteer:', error)
        return { success: false, error: 'Failed to add volunteer' }
    }
}

/**
 * Update volunteer status
 */
export const updateVolunteerStatus = async (
    volunteerId: string,
    isActive: boolean
): Promise<{ success: boolean }> => {
    try {
        await updateDoc(doc(db, 'qr_volunteers', volunteerId), { isActive })
        return { success: true }
    } catch (error) {
        console.error('Error updating volunteer status:', error)
        return { success: false }
    }
}

/**
 * Remove a volunteer
 */
export const removeVolunteer = async (volunteerId: string): Promise<{ success: boolean }> => {
    try {
        await deleteDoc(doc(db, 'qr_volunteers', volunteerId))
        return { success: true }
    } catch (error) {
        console.error('Error removing volunteer:', error)
        return { success: false }
    }
}

// ========================================
// ATTENDANCE TRACKING
// ========================================

/**
 * Get today's date in YYYY-MM-DD format
 */
export const getTodayDate = (): string => {
    const now = new Date()
    return now.toISOString().split('T')[0]
}

/**
 * Check if user already has attendance for today
 */
export const hasAttendanceToday = async (userId: string): Promise<boolean> => {
    try {
        const today = getTodayDate()
        const q = query(
            collection(db, 'attendances'),
            where('userId', '==', userId),
            where('date', '==', today)
        )
        const snapshot = await getDocs(q)
        return !snapshot.empty
    } catch (error) {
        console.error('Error checking attendance:', error)
        return false
    }
}

/**
 * Mark attendance for a user
 */
export const markAttendance = async (
    attendance: Omit<Attendance, 'id' | 'scannedAt' | 'syncedAt'>
): Promise<{ success: boolean; id?: string; error?: string; alreadyMarked?: boolean }> => {
    try {
        // Check if already marked
        const alreadyMarked = await hasAttendanceToday(attendance.userId)
        if (alreadyMarked) {
            return { success: false, error: 'Attendance already marked for today', alreadyMarked: true }
        }

        const docRef = await addDoc(collection(db, 'attendances'), {
            ...attendance,
            scannedAt: serverTimestamp(),
            syncedAt: serverTimestamp()
        })

        return { success: true, id: docRef.id }
    } catch (error) {
        console.error('Error marking attendance:', error)
        return { success: false, error: 'Failed to mark attendance' }
    }
}

/**
 * Get attendance records for a specific date
 */
export const getAttendanceByDate = async (date: string): Promise<Attendance[]> => {
    try {
        const q = query(
            collection(db, 'attendances'),
            where('date', '==', date),
            orderBy('scannedAt', 'desc')
        )
        const snapshot = await getDocs(q)
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Attendance))
    } catch (error) {
        console.error('Error fetching attendance by date:', error)
        return []
    }
}

/**
 * Get all attendance records
 */
export const getAllAttendance = async (): Promise<Attendance[]> => {
    try {
        const q = query(collection(db, 'attendances'), orderBy('scannedAt', 'desc'))
        const snapshot = await getDocs(q)
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Attendance))
    } catch (error) {
        console.error('Error fetching all attendance:', error)
        return []
    }
}

/**
 * Get attendance by volunteer
 */
export const getAttendanceByVolunteer = async (volunteerSynapseId: string): Promise<Attendance[]> => {
    try {
        const q = query(
            collection(db, 'attendances'),
            where('scannedBy', '==', volunteerSynapseId),
            orderBy('scannedAt', 'desc')
        )
        const snapshot = await getDocs(q)
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Attendance))
    } catch (error) {
        console.error('Error fetching attendance by volunteer:', error)
        return []
    }
}

/**
 * Delete an attendance record
 */
export const deleteAttendance = async (attendanceId: string): Promise<{ success: boolean }> => {
    try {
        await deleteDoc(doc(db, 'attendances', attendanceId))
        return { success: true }
    } catch (error) {
        console.error('Error deleting attendance:', error)
        return { success: false }
    }
}

/**
 * Update an attendance record
 */
export const updateAttendance = async (
    attendanceId: string,
    updates: Partial<Omit<Attendance, 'id' | 'scannedAt'>>
): Promise<{ success: boolean; error?: string }> => {
    try {
        await updateDoc(doc(db, 'attendances', attendanceId), updates)
        return { success: true }
    } catch (error) {
        console.error('Error updating attendance:', error)
        return { success: false, error: 'Failed to update attendance' }
    }
}

/**
 * Add manual attendance (for admin use)
 */
export const addManualAttendance = async (
    attendance: Omit<Attendance, 'id' | 'scannedAt' | 'syncedAt'>
): Promise<{ success: boolean; id?: string; error?: string }> => {
    try {
        const docRef = await addDoc(collection(db, 'attendances'), {
            ...attendance,
            scannedAt: serverTimestamp(),
            syncedAt: serverTimestamp()
        })
        return { success: true, id: docRef.id }
    } catch (error) {
        console.error('Error adding manual attendance:', error)
        return { success: false, error: 'Failed to add attendance' }
    }
}

// ========================================
// PAYMENT VERIFICATION
// ========================================

/**
 * Check payment status for a user's registration
 */
export const checkPaymentStatus = async (
    userId: string,
    registrationType: 'daypass' | 'competition' | 'event',
    registrationId: string
): Promise<{ verified: boolean; status: 'pending' | 'paid' | 'free'; error?: string }> => {
    try {
        let collectionName = ''

        switch (registrationType) {
            case 'daypass':
                collectionName = 'day_pass_registrations'
                break
            case 'competition':
                collectionName = 'registrations'
                break
            case 'event':
                collectionName = 'event_registrations'
                break
        }

        const q = query(
            collection(db, collectionName),
            where('userId', '==', userId)
        )
        const snapshot = await getDocs(q)

        if (snapshot.empty) {
            return { verified: false, status: 'pending', error: 'Registration not found' }
        }

        const registration = snapshot.docs[0].data()
        const paymentStatus = registration.paymentStatus || 'pending'
        const totalAmount = registration.totalAmount || 0

        // Free registrations are auto-verified
        if (totalAmount === 0) {
            return { verified: true, status: 'free' }
        }

        // Check if payment is confirmed
        const verified = paymentStatus === 'paid'

        return { verified, status: paymentStatus }
    } catch (error) {
        console.error('Error checking payment status:', error)
        return { verified: false, status: 'pending', error: 'Failed to verify payment' }
    }
}

/**
 * Verify all payments for a user's registrations
 */
export const verifyAllPayments = async (
    userId: string,
    registrations: { type: string; id: string; name: string }[]
): Promise<{ allVerified: boolean; details: Record<string, any> }> => {
    const results: Record<string, any> = {}
    let allVerified = true

    for (const reg of registrations) {
        const result = await checkPaymentStatus(userId, reg.type as any, reg.id)
        results[reg.id] = result

        if (!result.verified) {
            allVerified = false
        }
    }

    return { allVerified, details: results }
}

// ========================================
// EVENT-SPECIFIC VALIDATION
// ======================================== 

/**
 * Check if volunteer is authorized to scan for a specific event
 */
export const canVolunteerScanEvent = async (
    volunteerSynapseId: string,
    eventId?: string,
    eventType?: string
): Promise<{ authorized: boolean; reason?: string }> => {
    try {
        const q = query(
            collection(db, 'qr_volunteers'),
            where('synapseId', '==', volunteerSynapseId),
            where('isActive', '==', true)
        )
        const snapshot = await getDocs(q)

        if (snapshot.empty) {
            return { authorized: false, reason: 'Volunteer not found or inactive' }
        }

        const volunteer = snapshot.docs[0].data() as QRVolunteer

        // If no event restrictions, allow all
        if (!volunteer.assignedEvents && !volunteer.allowedEventTypes) {
            return { authorized: true }
        }

        // Check event ID restriction
        if (eventId && volunteer.assignedEvents) {
            if (!volunteer.assignedEvents.includes(eventId)) {
                return { authorized: false, reason: 'Not assigned to this event' }
            }
        }

        // Check event type restriction
        if (eventType && volunteer.allowedEventTypes) {
            if (!volunteer.allowedEventTypes.includes(eventType as any)) {
                return { authorized: false, reason: `Not authorized for ${eventType} scans` }
            }
        }

        return { authorized: true }
    } catch (error) {
        console.error('Error checking volunteer authorization:', error)
        return { authorized: false, reason: 'Authorization check failed' }
    }
}

/**
 * Update volunteer scan statistics
 */
export const updateVolunteerStats = async (volunteerSynapseId: string): Promise<void> => {
    try {
        const q = query(
            collection(db, 'qr_volunteers'),
            where('synapseId', '==', volunteerSynapseId)
        )
        const snapshot = await getDocs(q)

        if (!snapshot.empty) {
            const volunteerDoc = snapshot.docs[0]
            const currentScans = volunteerDoc.data().totalScans || 0

            await updateDoc(doc(db, 'qr_volunteers', volunteerDoc.id), {
                totalScans: currentScans + 1,
                lastActiveAt: serverTimestamp()
            })
        }
    } catch (error) {
        console.error('Error updating volunteer stats:', error)
    }
}

// ========================================
// STATISTICS
// ========================================

/**
 * Get attendance stats for a date
 */
export const getAttendanceStats = (attendances: Attendance[]) => {
    const uniqueUsers = new Set(attendances.map(a => a.userId)).size
    const uniqueVolunteers = new Set(attendances.map(a => a.scannedBy)).size
    const offlineCount = attendances.filter(a => a.offlineScanned).length

    return {
        total: attendances.length,
        uniqueUsers,
        uniqueVolunteers,
        offlineCount
    }
}

/**
 * Get stats grouped by date
 */
export const getAttendanceStatsByDate = (attendances: Attendance[]): Map<string, number> => {
    const stats = new Map<string, number>()

    attendances.forEach(a => {
        const count = stats.get(a.date) || 0
        stats.set(a.date, count + 1)
    })

    return stats
}

// ========================================
// EXPORT FUNCTIONS
// ========================================

/**
 * Export attendance to CSV
 */
export const exportAttendanceToCSV = (attendances: Attendance[]): string => {
    if (attendances.length === 0) return ''

    const headers = [
        'Date',
        'Synapse ID',
        'Name',
        'Email',
        'College',
        'Scanned By',
        'Scanned At',
        'Offline Scanned'
    ]

    const rows = attendances.map(a => [
        a.date,
        a.synapseId,
        a.displayName,
        a.email || '',
        a.college || '',
        `${a.scannedByName} (${a.scannedBy})`,
        a.scannedAt?.toDate?.()?.toLocaleString() || '',
        a.offlineScanned ? 'Yes' : 'No'
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
export const downloadAttendanceCSV = (csvContent: string, filename: string): void => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
    URL.revokeObjectURL(link.href)
}

// ========================================
// USER LOOKUP (for adding volunteers)
// ========================================

/**
 * Look up user by Synapse ID
 */
export const lookupUserBySynapseId = async (synapseId: string): Promise<{
    userId: string
    displayName: string
    email: string
    synapseId: string
    college?: string
} | null> => {
    try {
        // Check users collection
        const userQuery = query(
            collection(db, 'users'),
            where('synapseId', '==', synapseId)
        )
        const userSnapshot = await getDocs(userQuery)

        if (!userSnapshot.empty) {
            const userData = userSnapshot.docs[0].data()
            return {
                userId: userSnapshot.docs[0].id,
                displayName: userData.displayName || '',
                email: userData.email || '',
                synapseId: userData.synapseId,
                college: userData.college
            }
        }

        // Check admins collection
        const adminQuery = query(
            collection(db, 'admins'),
            where('synapseId', '==', synapseId)
        )
        const adminSnapshot = await getDocs(adminQuery)

        if (!adminSnapshot.empty) {
            const adminData = adminSnapshot.docs[0].data()
            return {
                userId: adminSnapshot.docs[0].id,
                displayName: adminData.displayName || '',
                email: adminData.email || '',
                synapseId: adminData.synapseId,
                college: adminData.college
            }
        }

        return null
    } catch (error) {
        console.error('Error looking up user:', error)
        return null
    }
}

// ========================================
// OFFLINE SYNC HELPERS
// ========================================

/**
 * Batch sync offline attendance records
 */
export const syncOfflineAttendance = async (
    records: Omit<Attendance, 'id' | 'syncedAt'>[]
): Promise<{ success: number; failed: number; alreadyExist: number }> => {
    let success = 0
    let failed = 0
    let alreadyExist = 0

    for (const record of records) {
        const result = await markAttendance(record)
        if (result.success) {
            success++
        } else if (result.alreadyMarked) {
            alreadyExist++
        } else {
            failed++
        }
    }

    return { success, failed, alreadyExist }
}
