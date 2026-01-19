/**
 * Scan History Service
 * Manages recent scans, undo functionality, and scan timeline
 */

import { Timestamp } from 'firebase/firestore'

const SCAN_HISTORY_KEY = 'scan_history'
const MAX_HISTORY_ITEMS = 50 // Store last 50 scans

export interface ScanHistoryItem {
    id: string
    synapseId: string
    displayName: string
    scannedAt: number // Timestamp in ms
    scannedBy: string
    scannedByName: string
    success: boolean
    offline: boolean
    attendanceId?: string // Firestore doc ID (if synced)
}

// ========================================
// HISTORY MANAGEMENT
// ========================================

/**
 * Get scan history from localStorage
 */
export const getScanHistory = (): ScanHistoryItem[] => {
    try {
        const history = localStorage.getItem(SCAN_HISTORY_KEY)
        return history ? JSON.parse(history) : []
    } catch (error) {
        console.error('Error reading scan history:', error)
        return []
    }
}

/**
 * Add scan to history
 */
export const addToScanHistory = (item: Omit<ScanHistoryItem, 'scannedAt'>): void => {
    try {
        const history = getScanHistory()

        const newItem: ScanHistoryItem = {
            ...item,
            scannedAt: Date.now()
        }

        // Add to beginning
        history.unshift(newItem)

        // Keep only last MAX_HISTORY_ITEMS
        const trimmed = history.slice(0, MAX_HISTORY_ITEMS)

        localStorage.setItem(SCAN_HISTORY_KEY, JSON.stringify(trimmed))
        console.log('Added to scan history:', newItem.id)
    } catch (error) {
        console.error('Error adding to scan history:', error)
    }
}

/**
 * Get recent scans (default: last 10)
 */
export const getRecentScans = (count = 10): ScanHistoryItem[] => {
    const history = getScanHistory()
    return history.slice(0, count)
}

/**
 * Get scans from today
 */
export const getTodayScans = (): ScanHistoryItem[] => {
    const history = getScanHistory()
    const todayStart = new Date().setHours(0, 0, 0, 0)

    return history.filter(item => item.scannedAt >= todayStart)
}

/**
 * Clear scan history
 */
export const clearScanHistory = (): void => {
    try {
        localStorage.removeItem(SCAN_HISTORY_KEY)
        console.log('Scan history cleared')
    } catch (error) {
        console.error('Error clearing scan history:', error)
    }
}

/**
 * Remove specific scan from history
 */
export const removeFromScanHistory = (scanId: string): void => {
    try {
        const history = getScanHistory()
        const filtered = history.filter(item => item.id !== scanId)
        localStorage.setItem(SCAN_HISTORY_KEY, JSON.stringify(filtered))
        console.log('Removed from scan history:', scanId)
    } catch (error) {
        console.error('Error removing from scan history:', error)
    }
}

// ========================================
// STATISTICS
// ========================================

/**
 * Get scan statistics
 */
export const getScanStats = () => {
    const history = getScanHistory()
    const todayScans = getTodayScans()

    return {
        total: history.length,
        today: todayScans.length,
        successful: history.filter(s => s.success).length,
        failed: history.filter(s => !s.success).length,
        offline: history.filter(s => s.offline).length,
        todaySuccessful: todayScans.filter(s => s.success).length
    }
}

/**
 * Get scans by time period
 */
export const getScansByPeriod = (hours: number): ScanHistoryItem[] => {
    const history = getScanHistory()
    const cutoff = Date.now() - (hours * 60 * 60 * 1000)

    return history.filter(item => item.scannedAt >= cutoff)
}

/**
 * Get hourly breakdown for today
 */
export const getHourlyBreakdown = (): Record<number, number> => {
    const todayScans = getTodayScans()
    const breakdown: Record<number, number> = {}

    // Initialize all hours
    for (let i = 0; i < 24; i++) {
        breakdown[i] = 0
    }

    // Count scans per hour
    todayScans.forEach(scan => {
        const hour = new Date(scan.scannedAt).getHours()
        breakdown[hour]++
    })

    return breakdown
}
