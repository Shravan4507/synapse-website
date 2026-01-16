/**
 * Recruitment Applications Service - Manages job applications in Firestore
 */

import { collection, doc, addDoc, getDocs, getDoc, updateDoc, deleteDoc, query, where, Timestamp, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

const APPLICATIONS_COLLECTION = 'recruitment_applications'

export type ApplicationStatus = 'pending' | 'reviewed' | 'accepted' | 'rejected'

export interface RecruitmentApplication {
    id?: string
    // Synapse ID - Primary identifier
    synapseId: string
    // Personal Details
    name: string
    email: string
    contact: string
    whatsapp: string
    // Academic Credentials
    zprnNumber: string
    department: string
    class: string
    division: string
    // Team Preferences
    selectedTeams: string[]
    role: string
    // Additional Details
    skills: string
    contribution: string
    // Metadata
    status: ApplicationStatus
    submittedAt: Timestamp | null
    reviewedAt?: Timestamp | null
    reviewedBy?: string
    remark?: string
    isDeleted?: boolean // Soft delete - shows as rejected to user
}

/**
 * Submit a new application
 */
export const submitApplication = async (
    applicationData: Omit<RecruitmentApplication, 'id' | 'status' | 'submittedAt' | 'isDeleted'>
): Promise<{ success: boolean; id?: string; error?: string }> => {
    try {
        const docRef = await addDoc(collection(db, APPLICATIONS_COLLECTION), {
            ...applicationData,
            status: 'pending',
            submittedAt: serverTimestamp(),
            isDeleted: false
        })
        return { success: true, id: docRef.id }
    } catch (error) {
        console.error('Error submitting application:', error)
        return { success: false, error: 'Failed to submit application' }
    }
}

/**
 * Get application by Synapse ID (for user to check their status)
 */
export const getApplicationBySynapseId = async (synapseId: string): Promise<RecruitmentApplication | null> => {
    try {
        const q = query(
            collection(db, APPLICATIONS_COLLECTION),
            where('synapseId', '==', synapseId)
        )
        const querySnapshot = await getDocs(q)

        if (!querySnapshot.empty) {
            // Get the most recent application (sort by submittedAt in memory)
            const apps = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as RecruitmentApplication[]

            // Sort by submittedAt descending and return first
            apps.sort((a, b) => {
                const timeA = a.submittedAt?.toMillis?.() || 0
                const timeB = b.submittedAt?.toMillis?.() || 0
                return timeB - timeA
            })

            return apps[0]
        }
        return null
    } catch (error) {
        console.error('Error fetching application by Synapse ID:', error)
        return null
    }
}

/**
 * Get all applications (for admin)
 */
export const getAllApplications = async (): Promise<RecruitmentApplication[]> => {
    try {
        const q = query(
            collection(db, APPLICATIONS_COLLECTION)
        )
        const querySnapshot = await getDocs(q)

        const apps = (querySnapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as RecruitmentApplication[])
            .filter(app => !app.isDeleted)

        // Sort by submittedAt desc
        return apps.sort((a, b) => {
            const timeA = a.submittedAt?.toMillis?.() || 0
            const timeB = b.submittedAt?.toMillis?.() || 0
            return timeB - timeA
        })
    } catch (error) {
        console.error('Error fetching applications:', error)
        return []
    }
}

/**
 * Get a single application by ID
 */
export const getApplicationById = async (applicationId: string): Promise<RecruitmentApplication | null> => {
    try {
        const docRef = doc(db, APPLICATIONS_COLLECTION, applicationId)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
            return {
                id: docSnap.id,
                ...docSnap.data()
            } as RecruitmentApplication
        }
        return null
    } catch (error) {
        console.error('Error fetching application:', error)
        return null
    }
}

/**
 * Update application status with optional remark
 */
export const updateApplicationStatus = async (
    applicationId: string,
    status: ApplicationStatus,
    reviewedBy: string,
    remark?: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        const docRef = doc(db, APPLICATIONS_COLLECTION, applicationId)
        const updateData: Record<string, unknown> = {
            status,
            reviewedAt: serverTimestamp(),
            reviewedBy,
            // Always set remark (empty string clears it, undefined keeps old value)
            remark: remark ?? ''
        }

        await updateDoc(docRef, updateData)
        return { success: true }
    } catch (error) {
        console.error('Error updating application status:', error)
        return { success: false, error: 'Failed to update status' }
    }
}

/**
 * Delete an application (permanently removes from database)
 */
export const deleteApplication = async (
    applicationId: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        const docRef = doc(db, APPLICATIONS_COLLECTION, applicationId)
        await deleteDoc(docRef)
        return { success: true }
    } catch (error) {
        console.error('Error deleting application:', error)
        return { success: false, error: 'Failed to delete application' }
    }
}

/**
 * Delete user's own application (for re-apply)
 */
export const deleteOwnApplication = async (
    applicationId: string,
    synapseId: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        // Verify the application belongs to this user
        const application = await getApplicationById(applicationId)
        if (!application || application.synapseId !== synapseId) {
            return { success: false, error: 'Unauthorized' }
        }

        const docRef = doc(db, APPLICATIONS_COLLECTION, applicationId)
        await updateDoc(docRef, {
            isDeleted: true,
            status: 'rejected',
            remark: 'Deleted by applicant'
        })
        return { success: true }
    } catch (error) {
        console.error('Error deleting own application:', error)
        return { success: false, error: 'Failed to delete application' }
    }
}

/**
 * Get applications count by status
 */
export const getApplicationsCountByStatus = async (): Promise<{
    pending: number
    reviewed: number
    accepted: number
    rejected: number
    total: number
}> => {
    try {
        const applications = await getAllApplications()
        return {
            pending: applications.filter(a => a.status === 'pending').length,
            reviewed: applications.filter(a => a.status === 'reviewed').length,
            accepted: applications.filter(a => a.status === 'accepted').length,
            rejected: applications.filter(a => a.status === 'rejected').length,
            total: applications.length
        }
    } catch (error) {
        console.error('Error getting applications count:', error)
        return { pending: 0, reviewed: 0, accepted: 0, rejected: 0, total: 0 }
    }
}

/**
 * Export applications to CSV data
 */
export const exportApplicationsToCSV = (applications: RecruitmentApplication[]): string => {
    const headers = [
        'Synapse ID',
        'Name',
        'Email',
        'Contact',
        'WhatsApp',
        'ZPRN',
        'Department',
        'Class',
        'Division',
        'Teams (Priority)',
        'Role',
        'Skills',
        'Contribution',
        'Status',
        'Remark',
        'Submitted At'
    ]

    const rows = applications.map(app => [
        app.synapseId,
        app.name,
        app.email,
        app.contact,
        app.whatsapp,
        app.zprnNumber,
        app.department,
        app.class,
        app.division,
        app.selectedTeams.join(' > '),
        app.role,
        `"${(app.skills || '').replace(/"/g, '""')}"`,
        `"${(app.contribution || '').replace(/"/g, '""')}"`,
        app.status,
        app.remark || '',
        app.submittedAt?.toDate?.()?.toLocaleDateString('en-IN') || 'N/A'
    ])

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
}
