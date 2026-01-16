/**
 * Contact Queries Service - Manages contact form submissions in Firestore
 */

import { collection, doc, addDoc, getDocs, getDoc, updateDoc, deleteDoc, query, where, Timestamp, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

const QUERIES_COLLECTION = 'contact_queries'

export type QueryStatus = 'unread' | 'read' | 'replied' | 'archived'

export interface ContactQuery {
    id?: string
    // Contact Details
    name: string
    email: string
    subject: string
    message: string
    // Metadata
    status: QueryStatus
    submittedAt: Timestamp | null
    readAt?: Timestamp | null
    repliedAt?: Timestamp | null
    repliedBy?: string
    notes?: string
    // For grouping spam
    queryCount?: number
}

/**
 * Submit a new contact query
 */
export const submitContactQuery = async (
    queryData: Pick<ContactQuery, 'name' | 'email' | 'subject' | 'message'>
): Promise<{ success: boolean; id?: string; error?: string }> => {
    try {
        // Check for existing queries from same email to stack them
        const existingQuery = await getQueryByEmail(queryData.email)

        if (existingQuery && existingQuery.status === 'unread') {
            // Stack with existing unread query - append message
            const stackedMessage = `${existingQuery.message}\n\n--- New Query (${new Date().toLocaleString()}) ---\nSubject: ${queryData.subject}\n${queryData.message}`

            await updateDoc(doc(db, QUERIES_COLLECTION, existingQuery.id!), {
                message: stackedMessage,
                subject: queryData.subject, // Update to latest subject
                queryCount: (existingQuery.queryCount || 1) + 1,
                submittedAt: serverTimestamp()
            })

            return { success: true, id: existingQuery.id }
        }

        // Create new query
        const docRef = await addDoc(collection(db, QUERIES_COLLECTION), {
            ...queryData,
            status: 'unread',
            submittedAt: serverTimestamp(),
            queryCount: 1
        })

        return { success: true, id: docRef.id }
    } catch (error) {
        console.error('Error submitting contact query:', error)
        return { success: false, error: 'Failed to submit query' }
    }
}

/**
 * Get query by email (to stack multiple queries)
 */
export const getQueryByEmail = async (email: string): Promise<ContactQuery | null> => {
    try {
        const q = query(
            collection(db, QUERIES_COLLECTION),
            where('email', '==', email),
            where('status', '==', 'unread')
        )
        const querySnapshot = await getDocs(q)

        if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0]
            return {
                id: doc.id,
                ...doc.data()
            } as ContactQuery
        }
        return null
    } catch (error) {
        console.error('Error fetching query by email:', error)
        return null
    }
}

/**
 * Get all contact queries (for admin)
 */
export const getAllQueries = async (): Promise<ContactQuery[]> => {
    try {
        const q = query(collection(db, QUERIES_COLLECTION))
        const querySnapshot = await getDocs(q)

        const queries = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as ContactQuery[]

        // Sort by submittedAt desc
        return queries.sort((a, b) => {
            const timeA = a.submittedAt?.toMillis?.() || 0
            const timeB = b.submittedAt?.toMillis?.() || 0
            return timeB - timeA
        })
    } catch (error) {
        console.error('Error fetching queries:', error)
        return []
    }
}

/**
 * Get a single query by ID
 */
export const getQueryById = async (queryId: string): Promise<ContactQuery | null> => {
    try {
        const docRef = doc(db, QUERIES_COLLECTION, queryId)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
            return {
                id: docSnap.id,
                ...docSnap.data()
            } as ContactQuery
        }
        return null
    } catch (error) {
        console.error('Error fetching query:', error)
        return null
    }
}

/**
 * Update query status
 */
export const updateQueryStatus = async (
    queryId: string,
    status: QueryStatus,
    adminUid?: string,
    notes?: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        const docRef = doc(db, QUERIES_COLLECTION, queryId)
        const updateData: Record<string, unknown> = { status }

        if (status === 'read') {
            updateData.readAt = serverTimestamp()
        } else if (status === 'replied') {
            updateData.repliedAt = serverTimestamp()
            if (adminUid) updateData.repliedBy = adminUid
        }

        if (notes !== undefined) {
            updateData.notes = notes
        }

        await updateDoc(docRef, updateData)
        return { success: true }
    } catch (error) {
        console.error('Error updating query status:', error)
        return { success: false, error: 'Failed to update status' }
    }
}

/**
 * Delete a contact query
 */
export const deleteQuery = async (queryId: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const docRef = doc(db, QUERIES_COLLECTION, queryId)
        await deleteDoc(docRef)
        return { success: true }
    } catch (error) {
        console.error('Error deleting query:', error)
        return { success: false, error: 'Failed to delete query' }
    }
}

/**
 * Get queries count by status
 */
export const getQueriesCountByStatus = async (): Promise<{
    unread: number
    read: number
    replied: number
    archived: number
    total: number
}> => {
    try {
        const queries = await getAllQueries()

        return {
            unread: queries.filter(q => q.status === 'unread').length,
            read: queries.filter(q => q.status === 'read').length,
            replied: queries.filter(q => q.status === 'replied').length,
            archived: queries.filter(q => q.status === 'archived').length,
            total: queries.length
        }
    } catch (error) {
        console.error('Error getting query counts:', error)
        return { unread: 0, read: 0, replied: 0, archived: 0, total: 0 }
    }
}
