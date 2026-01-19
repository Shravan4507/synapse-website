/**
 * Enhanced Duplicate Prevention Service
 * Implements time-based cooldown and advanced duplicate detection
 */

const COOLDOWN_DURATION = 5000 // 5 seconds cooldown between scans
const SCAN_COOLDOWN_KEY = 'scan_cooldowns'

interface ScanCooldown {
    synapseId: string
    lastScannedAt: number
    scannedBy: string
}

// ========================================
// COOLDOWN MANAGEMENT
// ========================================

/**
 * Get all active cooldowns
 */
const getCooldowns = (): ScanCooldown[] => {
    try {
        const data = localStorage.getItem(SCAN_COOLDOWN_KEY)
        return data ? JSON.parse(data) : []
    } catch (error) {
        console.error('Error reading cooldowns:', error)
        return []
    }
}

/**
 * Save cooldowns to localStorage
 */
const saveCooldowns = (cooldowns: ScanCooldown[]): void => {
    try {
        localStorage.setItem(SCAN_COOLDOWN_KEY, JSON.stringify(cooldowns))
    } catch (error) {
        console.error('Error saving cooldowns:', error)
    }
}

/**
 * Check if a user is in cooldown period
 */
export const isInCooldown = (synapseId: string, scannedBy: string): boolean => {
    const cooldowns = getCooldowns()
    const now = Date.now()

    // Find cooldown for this user and volunteer
    const cooldown = cooldowns.find(
        c => c.synapseId === synapseId && c.scannedBy === scannedBy
    )

    if (!cooldown) return false

    const timeSinceLastScan = now - cooldown.lastScannedAt
    return timeSinceLastScan < COOLDOWN_DURATION
}

/**
 * Get remaining cooldown time in milliseconds
 */
export const getRemainingCooldown = (synapseId: string, scannedBy: string): number => {
    const cooldowns = getCooldowns()
    const now = Date.now()

    const cooldown = cooldowns.find(
        c => c.synapseId === synapseId && c.scannedBy === scannedBy
    )

    if (!cooldown) return 0

    const timeSinceLastScan = now - cooldown.lastScannedAt
    const remaining = COOLDOWN_DURATION - timeSinceLastScan

    return remaining > 0 ? remaining : 0
}

/**
 * Add a user to cooldown
 */
export const addCooldown = (synapseId: string, scannedBy: string): void => {
    let cooldowns = getCooldowns()
    const now = Date.now()

    // Remove expired cooldowns (older than cooldown duration)
    cooldowns = cooldowns.filter(c => now - c.lastScannedAt < COOLDOWN_DURATION)

    // Remove existing cooldown for this user/volunteer combo
    cooldowns = cooldowns.filter(
        c => !(c.synapseId === synapseId && c.scannedBy === scannedBy)
    )

    // Add new cooldown
    cooldowns.push({
        synapseId,
        scannedBy,
        lastScannedAt: now
    })

    saveCooldowns(cooldowns)
}

/**
 * Clear all expired cooldowns
 */
export const clearExpiredCooldowns = (): void => {
    const cooldowns = getCooldowns()
    const now = Date.now()

    const active = cooldowns.filter(c => now - c.lastScannedAt < COOLDOWN_DURATION)
    saveCooldowns(active)
}

/**
 * Get all active cooldowns (for debugging)
 */
export const getActiveCooldowns = (): ScanCooldown[] => {
    clearExpiredCooldowns()
    return getCooldowns()
}

/**
 * Clear all cooldowns
 */
export const clearAllCooldowns = (): void => {
    localStorage.removeItem(SCAN_COOLDOWN_KEY)
}

/**
 * Format remaining time for display
 */
export const formatCooldownTime = (milliseconds: number): string => {
    const seconds = Math.ceil(milliseconds / 1000)
    return `${seconds}s`
}

// ========================================
// DUPLICATE DETECTION PATTERNS
// ========================================

/**
 * Detect if rapid scanning pattern exists
 */
export const detectRapidScanning = (
    synapseId: string,
    scannedBy: string,
    timeWindowMs: number = 60000 // Last 1 minute
): { isRapid: boolean; count: number } => {
    const cooldowns = getCooldowns()
    const now = Date.now()

    const recentScans = cooldowns.filter(
        c => c.synapseId === synapseId &&
            c.scannedBy === scannedBy &&
            now - c.lastScannedAt < timeWindowMs
    )

    return {
        isRapid: recentScans.length > 3, // More than 3 attempts in window
        count: recentScans.length
    }
}

/**
 * Get statistics about duplicate prevention
 */
export const getDuplicatePreventionStats = () => {
    const cooldowns = getActiveCooldowns()

    return {
        activeCooldowns: cooldowns.length,
        uniqueUsers: new Set(cooldowns.map(c => c.synapseId)).size,
        uniqueVolunteers: new Set(cooldowns.map(c => c.scannedBy)).size
    }
}
