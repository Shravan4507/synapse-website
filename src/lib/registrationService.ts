/**
 * Competition Registration Service
 * Handles team registrations for competitions
 */

import {
    collection,
    doc,
    getDocs,
    addDoc,
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

export interface TeamMember {
    name: string
    email: string
    phone: string
    role?: string // e.g., "Team Leader", "Member"
}

export interface Registration {
    id?: string
    competitionId: string
    competitionName: string
    teamName: string
    teamMembers: TeamMember[]
    collegeName: string
    transactionId?: string
    paymentScreenshot?: string // base64 image
    status: 'pending' | 'approved' | 'rejected'
    notes?: string
    createdAt?: Timestamp
}

// ========================================
// REGISTRATION CRUD
// ========================================

/**
 * Get all registrations for a specific competition
 */
export const getRegistrationsByCompetition = async (competitionId: string): Promise<Registration[]> => {
    try {
        const q = query(
            collection(db, 'registrations'),
            where('competitionId', '==', competitionId),
            orderBy('createdAt', 'desc')
        )
        const snapshot = await getDocs(q)
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Registration))
    } catch (error) {
        console.error('Error fetching registrations:', error)
        return []
    }
}

/**
 * Get all registrations (for admin view)
 */
export const getAllRegistrations = async (): Promise<Registration[]> => {
    try {
        const q = query(collection(db, 'registrations'), orderBy('createdAt', 'desc'))
        const snapshot = await getDocs(q)
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Registration))
    } catch (error) {
        console.error('Error fetching all registrations:', error)
        return []
    }
}

/**
 * Create a new registration
 */
export const createRegistration = async (
    registration: Omit<Registration, 'id' | 'status' | 'createdAt'>
): Promise<{ success: boolean; id?: string; error?: string }> => {
    try {
        const docRef = await addDoc(collection(db, 'registrations'), {
            ...registration,
            status: 'pending',
            createdAt: serverTimestamp()
        })
        return { success: true, id: docRef.id }
    } catch (error) {
        console.error('Error creating registration:', error)
        return { success: false, error: 'Failed to submit registration' }
    }
}

/**
 * Delete a registration
 */
export const deleteRegistration = async (id: string): Promise<{ success: boolean }> => {
    try {
        await deleteDoc(doc(db, 'registrations', id))
        return { success: true }
    } catch (error) {
        console.error('Error deleting registration:', error)
        return { success: false }
    }
}

// ========================================
// EXPORT FUNCTIONS
// ========================================

/**
 * Convert registrations to CSV format
 */
export const exportRegistrationsToCSV = (registrations: Registration[]): string => {
    if (registrations.length === 0) return ''

    // Headers
    const headers = [
        'Registration ID',
        'Competition',
        'Team Name',
        'College',
        'Member 1 Name',
        'Member 1 Email',
        'Member 1 Phone',
        'Member 2 Name',
        'Member 2 Email',
        'Member 2 Phone',
        'Member 3 Name',
        'Member 3 Email',
        'Member 3 Phone',
        'Member 4 Name',
        'Member 4 Email',
        'Member 4 Phone',
        'Member 5 Name',
        'Member 5 Email',
        'Member 5 Phone',
        'Transaction ID',
        'Status',
        'Registered At'
    ]

    const rows = registrations.map(reg => {
        const members = reg.teamMembers || []
        const row = [
            reg.id || '',
            reg.competitionName,
            reg.teamName,
            reg.collegeName,
            // Member 1-5 (pad with empty if less)
            members[0]?.name || '',
            members[0]?.email || '',
            members[0]?.phone || '',
            members[1]?.name || '',
            members[1]?.email || '',
            members[1]?.phone || '',
            members[2]?.name || '',
            members[2]?.email || '',
            members[2]?.phone || '',
            members[3]?.name || '',
            members[3]?.email || '',
            members[3]?.phone || '',
            members[4]?.name || '',
            members[4]?.email || '',
            members[4]?.phone || '',
            reg.transactionId || '',
            reg.status,
            reg.createdAt?.toDate().toLocaleString() || ''
        ]
        // Escape commas and quotes
        return row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    })

    return [headers.join(','), ...rows].join('\n')
}

/**
 * Download CSV file
 */
export const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
    URL.revokeObjectURL(link.href)
}

/**
 * Get registration stats for a competition
 */
export const getRegistrationStats = (registrations: Registration[]) => {
    return {
        total: registrations.length,
        pending: registrations.filter(r => r.status === 'pending').length,
        approved: registrations.filter(r => r.status === 'approved').length,
        rejected: registrations.filter(r => r.status === 'rejected').length,
        totalMembers: registrations.reduce((sum, r) => sum + (r.teamMembers?.length || 0), 0)
    }
}
