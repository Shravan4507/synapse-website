/**
 * Advanced Filter & Search Service
 * Handles complex filtering, multi-field search, and saved presets
 */

import type { Attendance } from './qrVerificationService'

// ========================================
// TYPES
// ========================================

export interface FilterCriteria {
    // Search
    searchQuery?: string
    searchFields?: ('synapseId' | 'displayName' | 'email' | 'college')[]

    // Filters
    dateFrom?: string  // YYYY-MM-DD
    dateTo?: string    // YYYY-MM-DD
    eventId?: string
    eventType?: string
    scannedBy?: string // Volunteer Synapse ID
    paymentStatus?: 'pending' | 'paid' | 'free'
    offlineOnly?: boolean

    // Sorting
    sortBy?: 'date' | 'displayName' | 'scannedAt'
    sortOrder?: 'asc' | 'desc'
}

export interface FilterPreset {
    id: string
    name: string
    description?: string
    criteria: FilterCriteria
    createdAt: number
}

const FILTER_PRESETS_KEY = 'filter_presets'

// ========================================
// FILTERING
// ========================================

/**
 * Apply filters to attendance records
 */
export const applyFilters = (
    records: Attendance[],
    criteria: FilterCriteria
): Attendance[] => {
    let filtered = [...records]

    // Search query (multi-field)
    if (criteria.searchQuery && criteria.searchQuery.trim()) {
        const query = criteria.searchQuery.toLowerCase()
        const fields = criteria.searchFields || ['synapseId', 'displayName', 'email', 'college']

        filtered = filtered.filter(record => {
            return fields.some(field => {
                const value = record[field]
                return value && String(value).toLowerCase().includes(query)
            })
        })
    }

    // Date range filter
    if (criteria.dateFrom) {
        filtered = filtered.filter(r => r.date >= criteria.dateFrom!)
    }
    if (criteria.dateTo) {
        filtered = filtered.filter(r => r.date <= criteria.dateTo!)
    }

    // Event filters
    if (criteria.eventId) {
        filtered = filtered.filter(r => r.eventId === criteria.eventId)
    }
    if (criteria.eventType) {
        filtered = filtered.filter(r => r.eventType === criteria.eventType)
    }

    // Volunteer filter
    if (criteria.scannedBy) {
        filtered = filtered.filter(r => r.scannedBy === criteria.scannedBy)
    }

    // Payment status filter
    if (criteria.paymentStatus) {
        filtered = filtered.filter(r => r.paymentStatus === criteria.paymentStatus)
    }

    // Offline scans only
    if (criteria.offlineOnly) {
        filtered = filtered.filter(r => r.offlineScanned)
    }

    // Sorting
    if (criteria.sortBy) {
        filtered.sort((a, b) => {
            let aVal: any
            let bVal: any

            switch (criteria.sortBy) {
                case 'date':
                    aVal = a.date
                    bVal = b.date
                    break
                case 'displayName':
                    aVal = a.displayName.toLowerCase()
                    bVal = b.displayName.toLowerCase()
                    break
                case 'scannedAt':
                    aVal = a.scannedAt?.toMillis?.() || 0
                    bVal = b.scannedAt?.toMillis?.() || 0
                    break
                default:
                    return 0
            }

            const order = criteria.sortOrder === 'desc' ? -1 : 1
            return aVal > bVal ? order : aVal < bVal ? -order : 0
        })
    }

    return filtered
}

/**
 * Quick filters (common presets)
 */
export const quickFilters = {
    today: (): FilterCriteria => ({
        dateFrom: new Date().toISOString().split('T')[0],
        dateTo: new Date().toISOString().split('T')[0]
    }),

    thisWeek: (): FilterCriteria => {
        const now = new Date()
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()))
        return {
            dateFrom: weekStart.toISOString().split('T')[0],
            dateTo: new Date().toISOString().split('T')[0]
        }
    },

    thisMonth: (): FilterCriteria => {
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        return {
            dateFrom: monthStart.toISOString().split('T')[0],
            dateTo: new Date().toISOString().split('T')[0]
        }
    },

    offlineScans: (): FilterCriteria => ({
        offlineOnly: true
    }),

    unpaidRegistrations: (): FilterCriteria => ({
        paymentStatus: 'pending'
    })
}

// ========================================
// SAVED PRESETS
// ========================================

/**
 * Get saved filter presets
 */
export const getFilterPresets = (): FilterPreset[] => {
    try {
        const presets = localStorage.getItem(FILTER_PRESETS_KEY)
        return presets ? JSON.parse(presets) : []
    } catch (error) {
        console.error('Error reading filter presets:', error)
        return []
    }
}

/**
 * Save a filter preset
 */
export const saveFilterPreset = (
    name: string,
    criteria: FilterCriteria,
    description?: string
): FilterPreset => {
    try {
        const presets = getFilterPresets()

        const newPreset: FilterPreset = {
            id: `preset_${Date.now()}`,
            name,
            description,
            criteria,
            createdAt: Date.now()
        }

        presets.push(newPreset)
        localStorage.setItem(FILTER_PRESETS_KEY, JSON.stringify(presets))

        console.log('Filter preset saved:', newPreset.id)
        return newPreset
    } catch (error) {
        console.error('Error saving filter preset:', error)
        throw error
    }
}

/**
 * Delete a filter preset
 */
export const deleteFilterPreset = (presetId: string): void => {
    try {
        const presets = getFilterPresets()
        const filtered = presets.filter(p => p.id !== presetId)
        localStorage.setItem(FILTER_PRESETS_KEY, JSON.stringify(filtered))
        console.log('Filter preset deleted:', presetId)
    } catch (error) {
        console.error('Error deleting filter preset:', error)
    }
}

/**
 * Apply a saved preset
 */
export const applyPreset = (presetId: string): FilterCriteria | null => {
    const presets = getFilterPresets()
    const preset = presets.find(p => p.id === presetId)
    return preset ? preset.criteria : null
}

// ========================================
// SEARCH UTILITIES
// ========================================

/**
 * Highlight search matches in text
 */
export const highlightMatches = (text: string, query: string): string => {
    if (!query.trim()) return text

    const regex = new RegExp(`(${query})`, 'gi')
    return text.replace(regex, '<mark>$1</mark>')
}

/**
 * Get search suggestions based on existing data
 */
export const getSearchSuggestions = (
    records: Attendance[],
    field: keyof Attendance,
    query: string
): string[] => {
    if (!query.trim()) return []

    const uniqueValues = new Set<string>()
    const queryLower = query.toLowerCase()

    records.forEach(record => {
        const value = record[field]
        if (value && String(value).toLowerCase().includes(queryLower)) {
            uniqueValues.add(String(value))
        }
    })

    return Array.from(uniqueValues).slice(0, 10) // Top 10 suggestions
}

// ========================================
// EXPORT UTILITIES
// ========================================

/**
 * Export filtered results to CSV
 */
export const exportToCSV = (records: Attendance[], filename = 'attendance_export.csv'): void => {
    if (records.length === 0) {
        console.warn('No records to export')
        return
    }

    // CSV Headers
    const headers = [
        'Date',
        'Synapse ID',
        'Display Name',
        'Email',
        'College',
        'Scanned By',
        'Scanned At',
        'Payment Status',
        'Offline Scan'
    ]

    // CSV Rows
    const rows = records.map(record => [
        record.date,
        record.synapseId,
        record.displayName,
        record.email || '',
        record.college || '',
        record.scannedByName,
        record.scannedAt?.toDate?.()?.toLocaleString() || '',
        record.paymentStatus || 'N/A',
        record.offlineScanned ? 'Yes' : 'No'
    ])

    // Create CSV content
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    console.log(`Exported ${records.length} records to ${filename}`)
}

/**
 * Get filter summary text
 */
export const getFilterSummary = (criteria: FilterCriteria): string => {
    const parts: string[] = []

    if (criteria.searchQuery) parts.push(`Search: "${criteria.searchQuery}"`)
    if (criteria.dateFrom) parts.push(`From: ${criteria.dateFrom}`)
    if (criteria.dateTo) parts.push(`To: ${criteria.dateTo}`)
    if (criteria.eventType) parts.push(`Event Type: ${criteria.eventType}`)
    if (criteria.scannedBy) parts.push(`Scanned By: ${criteria.scannedBy}`)
    if (criteria.paymentStatus) parts.push(`Payment: ${criteria.paymentStatus}`)
    if (criteria.offlineOnly) parts.push('Offline scans only')

    return parts.length > 0 ? parts.join(' • ') : 'No filters applied'
}
