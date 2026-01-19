/**
 * Offline Queue Service
 * Handles offline scan queueing and synchronization
 */

import { v4 as uuidv4 } from 'uuid'
import type { OfflineQueueItem, Attendance } from './qrVerificationService'
import { markAttendance } from './qrVerificationService'

const QUEUE_STORAGE_KEY = 'offline_attendance_queue'
const SYNC_STATUS_KEY = 'offline_sync_status'

// ========================================
// QUEUE MANAGEMENT
// ========================================

/**
 * Get all items in the offline queue
 */
export const getOfflineQueue = (): OfflineQueueItem[] => {
    try {
        const queueData = localStorage.getItem(QUEUE_STORAGE_KEY)
        return queueData ? JSON.parse(queueData) : []
    } catch (error) {
        console.error('Error reading offline queue:', error)
        return []
    }
}

/**
 * Add an attendance record to the offline queue
 */
export const addToOfflineQueue = (attendance: Omit<Attendance, 'id' | 'syncedAt'>): string => {
    try {
        const queue = getOfflineQueue()
        const queueItem: OfflineQueueItem = {
            id: uuidv4(),
            attendance,
            timestamp: Date.now(),
            retryCount: 0
        }

        queue.push(queueItem)
        localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue))

        console.log('Added to offline queue:', queueItem.id)
        return queueItem.id
    } catch (error) {
        console.error('Error adding to offline queue:', error)
        throw error
    }
}

/**
 * Remove an item from the offline queue
 */
export const removeFromOfflineQueue = (itemId: string): void => {
    try {
        const queue = getOfflineQueue()
        const filtered = queue.filter(item => item.id !== itemId)
        localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(filtered))
        console.log('Removed from offline queue:', itemId)
    } catch (error) {
        console.error('Error removing from offline queue:', error)
    }
}

/**
 * Update retry count for a queue item
 */
export const updateQueueItemRetry = (itemId: string, error?: string): void => {
    try {
        const queue = getOfflineQueue()
        const item = queue.find(i => i.id === itemId)

        if (item) {
            item.retryCount++
            item.lastError = error
            localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue))
        }
    } catch (err) {
        console.error('Error updating queue item:', err)
    }
}

/**
 * Clear the entire offline queue
 */
export const clearOfflineQueue = (): void => {
    try {
        localStorage.removeItem(QUEUE_STORAGE_KEY)
        console.log('Offline queue cleared')
    } catch (error) {
        console.error('Error clearing offline queue:', error)
    }
}

// ========================================
// SYNC STATUS
// ========================================

export interface SyncStatus {
    isSyncing: boolean
    lastSyncTime: number | null
    lastSyncSuccess: boolean
    pendingCount: number
    failedCount: number
}

/**
 * Get current sync status
 */
export const getSyncStatus = (): SyncStatus => {
    try {
        const statusData = localStorage.getItem(SYNC_STATUS_KEY)
        return statusData ? JSON.parse(statusData) : {
            isSyncing: false,
            lastSyncTime: null,
            lastSyncSuccess: true,
            pendingCount: 0,
            failedCount: 0
        }
    } catch (error) {
        console.error('Error reading sync status:', error)
        return {
            isSyncing: false,
            lastSyncTime: null,
            lastSyncSuccess: true,
            pendingCount: 0,
            failedCount: 0
        }
    }
}

/**
 * Update sync status
 */
export const updateSyncStatus = (updates: Partial<SyncStatus>): void => {
    try {
        const current = getSyncStatus()
        const updated = { ...current, ...updates }
        localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(updated))
    } catch (error) {
        console.error('Error updating sync status:', error)
    }
}

// ========================================
// SYNCHRONIZATION
// ========================================

/**
 * Sync all pending offline scans to Firestore
 */
export const syncOfflineQueue = async (): Promise<{
    success: number
    failed: number
    errors: string[]
}> => {
    const queue = getOfflineQueue()

    if (queue.length === 0) {
        console.log('No items to sync')
        return { success: 0, failed: 0, errors: [] }
    }

    console.log(`Starting sync of ${queue.length} items...`)
    updateSyncStatus({ isSyncing: true, pendingCount: queue.length })

    let successCount = 0
    let failedCount = 0
    const errors: string[] = []

    for (const item of queue) {
        try {
            // Attempt to mark attendance in Firestore
            const result = await markAttendance(item.attendance)

            if (result.success) {
                removeFromOfflineQueue(item.id)
                successCount++
                console.log(`Synced item ${item.id}`)
            } else {
                // Mark as failed but keep in queue for retry
                updateQueueItemRetry(item.id, result.error)
                failedCount++
                errors.push(result.error || 'Unknown error')
                console.error(`Failed to sync item ${item.id}:`, result.error)
            }
        } catch (error) {
            // Network or other error
            updateQueueItemRetry(item.id, String(error))
            failedCount++
            errors.push(String(error))
            console.error(`Error syncing item ${item.id}:`, error)
        }

        // Small delay between syncs to avoid overwhelming Firestore
        await new Promise(resolve => setTimeout(resolve, 100))
    }

    const finalQueue = getOfflineQueue()
    updateSyncStatus({
        isSyncing: false,
        lastSyncTime: Date.now(),
        lastSyncSuccess: failedCount === 0,
        pendingCount: finalQueue.length,
        failedCount
    })

    console.log(`Sync complete: ${successCount} success, ${failedCount} failed`)
    return { success: successCount, failed: failedCount, errors }
}

// ========================================
// NETWORK STATUS
// ========================================

/**
 * Check if device is online
 */
export const isOnline = (): boolean => {
    return navigator.onLine
}

/**
 * Setup online/offline event listeners and auto-sync
 */
export const setupAutoSync = (onSyncComplete?: (result: any) => void): (() => void) => {
    const handleOnline = async () => {
        console.log('Device came online, starting auto-sync...')
        const result = await syncOfflineQueue()
        onSyncComplete?.(result)
    }

    const handleOffline = () => {
        console.log('Device went offline')
        updateSyncStatus({ pendingCount: getOfflineQueue().length })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Cleanup function
    return () => {
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
    }
}

// ========================================
// UTILITIES
// ========================================

/**
 * Get queue statistics
 */
export const getQueueStats = () => {
    const queue = getOfflineQueue()
    const now = Date.now()

    return {
        total: queue.length,
        recent: queue.filter(i => now - i.timestamp < 3600000).length, // Last hour
        failed: queue.filter(i => i.retryCount > 0).length,
        oldestTimestamp: queue.length > 0 ? Math.min(...queue.map(i => i.timestamp)) : null
    }
}

/**
 * Export queue to JSON (for backup/debugging)
 */
export const exportQueue = (): string => {
    const queue = getOfflineQueue()
    return JSON.stringify(queue, null, 2)
}

/**
 * Import queue from JSON (for restore)
 */
export const importQueue = (jsonData: string): boolean => {
    try {
        const queue = JSON.parse(jsonData)
        localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue))
        console.log('Queue imported successfully')
        return true
    } catch (error) {
        console.error('Error importing queue:', error)
        return false
    }
}
