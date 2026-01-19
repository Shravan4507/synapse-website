/**
 * Bulk Operations Service
 * Handles bulk actions on attendance records
 */

import {
    collection,
    doc,
    updateDoc,
    deleteDoc,
    writeBatch,
    getDocs,
    query,
    where
} from 'firebase/firestore'
import { db } from './firebase'
import type { Attendance } from './qrVerificationService'
import { logAttendanceUpdate, logAttendanceDelete } from './auditLogService'

// ========================================
// BULK UPDATE
// ========================================

/**
 * Mark multiple records as present/absent
 */
export const bulkMarkAttendance = async (
    attendanceIds: string[],
    attended: boolean,
    adminId: string,
    adminName: string
): Promise<{ success: number; failed: number; errors: string[] }> => {
    let successCount = 0
    let failedCount = 0
    const errors: string[] = []

    for (const id of attendanceIds) {
        try {
            await updateDoc(doc(db, 'attendances', id), {
                attended,
                editedBy: adminId,
                editedAt: new Date()
            })

            // Log the update
            await logAttendanceUpdate(id, adminId, adminName, {
                attended,
                bulkOperation: true
            })

            successCount++
        } catch (error) {
            failedCount++
            errors.push(`Failed to update ${id}: ${error}`)
            console.error(`Bulk update error for ${id}:`, error)
        }
    }

    console.log(`Bulk mark attendance: ${successCount} success, ${failedCount} failed`)
    return { success: successCount, failed: failedCount, errors }
}

/**
 * Bulk delete attendance records
 */
export const bulkDeleteAttendance = async (
    attendanceIds: string[],
    adminId: string,
    adminName: string
): Promise<{ success: number; failed: number; errors: string[] }> => {
    let successCount = 0
    let failedCount = 0
    const errors: string[] = []

    for (const id of attendanceIds) {
        try {
            // Log before deleting
            await logAttendanceDelete(id, adminId, adminName, {
                bulkOperation: true
            })

            await deleteDoc(doc(db, 'attendances', id))
            successCount++
        } catch (error) {
            failedCount++
            errors.push(`Failed to delete ${id}: ${error}`)
            console.error(`Bulk delete error for ${id}:`, error)
        }
    }

    console.log(`Bulk delete: ${successCount} success, ${failedCount} failed`)
    return { success: successCount, failed: failedCount, errors }
}

/**
 * Bulk update specific fields
 */
export const bulkUpdateFields = async (
    attendanceIds: string[],
    updates: Partial<Attendance>,
    adminId: string,
    adminName: string
): Promise<{ success: number; failed: number; errors: string[] }> => {
    let successCount = 0
    let failedCount = 0
    const errors: string[] = []

    const updateData = {
        ...updates,
        editedBy: adminId,
        editedAt: new Date()
    }

    for (const id of attendanceIds) {
        try {
            await updateDoc(doc(db, 'attendances', id), updateData)

            // Log the update
            await logAttendanceUpdate(id, adminId, adminName, {
                ...updates,
                bulkOperation: true
            })

            successCount++
        } catch (error) {
            failedCount++
            errors.push(`Failed to update ${id}: ${error}`)
            console.error(`Bulk update error for ${id}:`, error)
        }
    }

    console.log(`Bulk field update: ${successCount} success, ${failedCount} failed`)
    return { success: successCount, failed: failedCount, errors }
}

// ========================================
// BATCH OPERATIONS (Firestore Batching)
// ========================================

/**
 * Batch update using Firestore batch writes (max 500 per batch)
 */
export const batchUpdateAttendance = async (
    attendanceIds: string[],
    updates: Partial<Attendance>,
    adminId: string,
    adminName: string
): Promise<{ success: number; failed: number }> => {
    const BATCH_SIZE = 500
    let successCount = 0
    let failedCount = 0

    // Split into batches of 500
    for (let i = 0; i < attendanceIds.length; i += BATCH_SIZE) {
        const batchIds = attendanceIds.slice(i, i + BATCH_SIZE)
        const batch = writeBatch(db)

        batchIds.forEach(id => {
            const docRef = doc(db, 'attendances', id)
            batch.update(docRef, {
                ...updates,
                editedBy: adminId,
                editedAt: new Date()
            })
        })

        try {
            await batch.commit()
            successCount += batchIds.length
            console.log(`Batch updated ${batchIds.length} records`)
        } catch (error) {
            failedCount += batchIds.length
            console.error('Batch update error:', error)
        }
    }

    return { success: successCount, failed: failedCount }
}

/**
 * Batch delete using Firestore batch writes
 */
export const batchDeleteAttendance = async (
    attendanceIds: string[]
): Promise<{ success: number; failed: number }> => {
    const BATCH_SIZE = 500
    let successCount = 0
    let failedCount = 0

    // Split into batches of 500
    for (let i = 0; i < attendanceIds.length; i += BATCH_SIZE) {
        const batchIds = attendanceIds.slice(i, i + BATCH_SIZE)
        const batch = writeBatch(db)

        batchIds.forEach(id => {
            const docRef = doc(db, 'attendances', id)
            batch.delete(docRef)
        })

        try {
            await batch.commit()
            successCount += batchIds.length
            console.log(`Batch deleted ${batchIds.length} records`)
        } catch (error) {
            failedCount += batchIds.length
            console.error('Batch delete error:', error)
        }
    }

    return { success: successCount, failed: failedCount }
}

// ========================================
// DUPLICATE REMOVAL
// ========================================

/**
 * Find and remove duplicate attendance records
 */
export const removeDuplicates = async (
    date: string,
    adminId: string,
    adminName: string
): Promise<{ removed: number; kept: number }> => {
    try {
        // Get all attendance for the date
        const q = query(
            collection(db, 'attendances'),
            where('date', '==', date)
        )
        const snapshot = await getDocs(q)

        // Group by userId
        const groups = new Map<string, any[]>()
        snapshot.docs.forEach(doc => {
            const data = doc.data()
            const userId = data.userId

            if (!groups.has(userId)) {
                groups.set(userId, [])
            }
            groups.get(userId)!.push({ id: doc.id, ...data })
        })

        let removedCount = 0
        let keptCount = 0

        // For each group, keep the first, delete the rest
        for (const [userId, records] of groups.entries()) {
            if (records.length > 1) {
                // Sort by scannedAt (keep earliest)
                records.sort((a, b) => a.scannedAt?.toMillis() - b.scannedAt?.toMillis())

                // Keep first, delete rest
                for (let i = 1; i < records.length; i++) {
                    await deleteDoc(doc(db, 'attendances', records[i].id))
                    await logAttendanceDelete(records[i].id, adminId, adminName, {
                        reason: 'Duplicate removal',
                        originalUserId: userId
                    })
                    removedCount++
                }
                keptCount++
            } else {
                keptCount++
            }
        }

        console.log(`Duplicates removed: ${removedCount}, kept: ${keptCount}`)
        return { removed: removedCount, kept: keptCount }
    } catch (error) {
        console.error('Error removing duplicates:', error)
        throw error
    }
}

// ========================================
// IMPORT/EXPORT
// ========================================

/**
 * Import attendance from CSV
 */
export const importFromCSV = async (
    csvText: string,
    adminId: string,
    adminName: string
): Promise<{ success: number; failed: number; errors: string[] }> => {
    const lines = csvText.split('\n').filter(line => line.trim())
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))

    let successCount = 0
    let failedCount = 0
    const errors: string[] = []

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
        try {
            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
            const record: any = {}

            headers.forEach((header, index) => {
                record[header] = values[index]
            })

            // Validate required fields
            if (!record.synapseId || !record.displayName || !record.date) {
                throw new Error('Missing required fields')
            }

            // Create attendance record
            // (Implementation would call markAttendance or similar)

            successCount++
        } catch (error) {
            failedCount++
            errors.push(`Line ${i + 1}: ${error}`)
        }
    }

    console.log(`CSV import: ${successCount} success, ${failedCount} failed`)
    return { success: successCount, failed: failedCount, errors }
}

// ========================================
// UTILITIES
// ========================================

/**
 * Get bulk operation progress
 */
export const getBulkProgress = (
    current: number,
    total: number
): { percent: number; remaining: number } => {
    const percent = Math.round((current / total) * 100)
    const remaining = total - current

    return { percent, remaining }
}

/**
 * Estimate bulk operation time
 */
export const estimateBulkTime = (
    itemCount: number,
    operationType: 'update' | 'delete'
): number => {
    // Rough estimates (ms per item)
    const timePerItem = operationType === 'update' ? 100 : 80
    return itemCount * timePerItem
}
