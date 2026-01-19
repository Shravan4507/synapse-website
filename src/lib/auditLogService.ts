/**
 * Audit Log Service
 * Tracks all CRUD operations for compliance and debugging
 */

import {
    collection,
    addDoc,
    query,
    where,
    orderBy,
    limit as firestoreLimit,
    getDocs,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore'
import { db } from './firebase'
import type { AuditLog } from './qrVerificationService'

// ========================================
// LOGGING
// ========================================

/**
 * Create an audit log entry
 */
export const logAuditEvent = async (log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<{ success: boolean; id?: string }> => {
    try {
        const docRef = await addDoc(collection(db, 'audit_logs'), {
            ...log,
            timestamp: serverTimestamp(),
            userAgent: navigator.userAgent
        })

        console.log('Audit log created:', docRef.id)
        return { success: true, id: docRef.id }
    } catch (error) {
        console.error('Error creating audit log:', error)
        return { success: false }
    }
}

/**
 * Log an attendance scan
 */
export const logAttendanceScan = async (
    attendanceId: string,
    scannedUserId: string,
    scannedUserName: string,
    volunteerId: string,
    volunteerName: string,
    details: Record<string, any> = {}
) => {
    return logAuditEvent({
        action: 'scan',
        entityType: 'attendance',
        entityId: attendanceId,
        performedBy: volunteerId,
        performedByName: volunteerName,
        details: {
            scannedUser: scannedUserName,
            scannedUserId,
            ...details
        }
    })
}

/**
 * Log attendance creation (manual)
 */
export const logAttendanceCreate = async (
    attendanceId: string,
    adminId: string,
    adminName: string,
    details: Record<string, any> = {}
) => {
    return logAuditEvent({
        action: 'create',
        entityType: 'attendance',
        entityId: attendanceId,
        performedBy: adminId,
        performedByName: adminName,
        details
    })
}

/**
 * Log attendance update
 */
export const logAttendanceUpdate = async (
    attendanceId: string,
    adminId: string,
    adminName: string,
    changes: Record<string, any>
) => {
    return logAuditEvent({
        action: 'update',
        entityType: 'attendance',
        entityId: attendanceId,
        performedBy: adminId,
        performedByName: adminName,
        details: { changes }
    })
}

/**
 * Log attendance deletion
 */
export const logAttendanceDelete = async (
    attendanceId: string,
    adminId: string,
    adminName: string,
    details: Record<string, any> = {}
) => {
    return logAuditEvent({
        action: 'delete',
        entityType: 'attendance',
        entityId: attendanceId,
        performedBy: adminId,
        performedByName: adminName,
        details
    })
}

/**
 * Log volunteer management actions
 */
export const logVolunteerAction = async (
    action: 'create' | 'update' | 'delete',
    volunteerId: string,
    adminId: string,
    adminName: string,
    details: Record<string, any> = {}
) => {
    return logAuditEvent({
        action,
        entityType: 'volunteer',
        entityId: volunteerId,
        performedBy: adminId,
        performedByName: adminName,
        details
    })
}

// ========================================
// QUERYING
// ========================================

/**
 * Get audit logs for a specific entity
 */
export const getAuditLogsForEntity = async (
    entityType: 'attendance' | 'volunteer' | 'settings',
    entityId: string,
    limitCount = 50
): Promise<AuditLog[]> => {
    try {
        const q = query(
            collection(db, 'audit_logs'),
            where('entityType', '==', entityType),
            where('entityId', '==', entityId),
            orderBy('timestamp', 'desc'),
            firestoreLimit(limitCount)
        )

        const snapshot = await getDocs(q)
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as AuditLog))
    } catch (error) {
        console.error('Error fetching audit logs:', error)
        return []
    }
}

/**
 * Get audit logs by user
 */
export const getAuditLogsByUser = async (
    userId: string,
    limitCount = 100
): Promise<AuditLog[]> => {
    try {
        const q = query(
            collection(db, 'audit_logs'),
            where('performedBy', '==', userId),
            orderBy('timestamp', 'desc'),
            firestoreLimit(limitCount)
        )

        const snapshot = await getDocs(q)
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as AuditLog))
    } catch (error) {
        console.error('Error fetching user audit logs:', error)
        return []
    }
}

/**
 * Get recent audit logs
 */
export const getRecentAuditLogs = async (limitCount = 100): Promise<AuditLog[]> => {
    try {
        const q = query(
            collection(db, 'audit_logs'),
            orderBy('timestamp', 'desc'),
            firestoreLimit(limitCount)
        )

        const snapshot = await getDocs(q)
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as AuditLog))
    } catch (error) {
        console.error('Error fetching recent audit logs:', error)
        return []
    }
}

/**
 * Get audit logs by action type
 */
export const getAuditLogsByAction = async (
    action: 'create' | 'update' | 'delete' | 'scan',
    limitCount = 100
): Promise<AuditLog[]> => {
    try {
        const q = query(
            collection(db, 'audit_logs'),
            where('action', '==', action),
            orderBy('timestamp', 'desc'),
            firestoreLimit(limitCount)
        )

        const snapshot = await getDocs(q)
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as AuditLog))
    } catch (error) {
        console.error('Error fetching audit logs by action:', error)
        return []
    }
}

// ========================================
// EXPORTS
// ========================================

/**
 * Export audit logs to CSV
 */
export const exportAuditLogsToCSV = (logs: AuditLog[]): string => {
    if (logs.length === 0) return ''

    const headers = ['Timestamp', 'Action', 'Entity Type', 'Entity ID', 'Performed By', 'Details']
    const rows = logs.map(log => [
        log.timestamp?.toDate?.()?.toLocaleString() || '-',
        log.action,
        log.entityType,
        log.entityId,
        log.performedByName,
        JSON.stringify(log.details)
    ])

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    return csvContent
}

/**
 * Download audit logs as CSV file
 */
export const downloadAuditLogsCSV = (logs: AuditLog[], filename = 'audit_logs.csv'): void => {
    const csv = exportAuditLogsToCSV(logs)
    if (!csv) return

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}

// ========================================
// STATISTICS
// ========================================

/**
 * Get audit statistics
 */
export const getAuditStats = (logs: AuditLog[]) => {
    const total = logs.length
    const byAction = logs.reduce((acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    const byEntity = logs.reduce((acc, log) => {
        acc[log.entityType] = (acc[log.entityType] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    const uniqueUsers = new Set(logs.map(l => l.performedBy)).size

    return {
        total,
        byAction,
        byEntity,
        uniqueUsers
    }
}
