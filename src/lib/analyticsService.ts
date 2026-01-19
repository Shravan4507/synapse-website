/**
 * Smart Analytics & Insights Service
 * Provides intelligent analysis of attendance patterns and trends
 */

import type { Attendance } from './qrVerificationService'

// ========================================
// TIME-BASED ANALYTICS
// ========================================

/**
 * Get peak scanning hours
 */
export const getPeakHours = (records: Attendance[]): { hour: number; count: number }[] => {
    const hourCounts: Record<number, number> = {}

    records.forEach(record => {
        const hour = record.scannedAt?.toDate?.()?.getHours()
        if (hour !== undefined) {
            hourCounts[hour] = (hourCounts[hour] || 0) + 1
        }
    })

    return Object.entries(hourCounts)
        .map(([hour, count]) => ({ hour: parseInt(hour), count }))
        .sort((a, b) => b.count - a.count)
}

/**
 * Get busiest day of week
 */
export const getBusiestDays = (records: Attendance[]): { day: string; count: number }[] => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dayCounts: Record<string, number> = {}

    records.forEach(record => {
        const dayIndex = record.scannedAt?.toDate?.()?.getDay()
        if (dayIndex !== undefined) {
            const dayName = days[dayIndex]
            dayCounts[dayName] = (dayCounts[dayName] || 0) + 1
        }
    })

    return Object.entries(dayCounts)
        .map(([day, count]) => ({ day, count }))
        .sort((a, b) => b.count - a.count)
}

/**
 * Calculate average scans per day
 */
export const getAverageScansPerDay = (records: Attendance[]): number => {
    if (records.length === 0) return 0

    const dates = new Set(records.map(r => r.date))
    return Math.round(records.length / dates.size)
}

// ========================================
// VOLUNTEER PERFORMANCE
// ========================================

/**
 * Get top performing volunteers
 */
export const getTopVolunteers = (
    records: Attendance[],
    limit = 5
): { name: string; id: string; scans: number }[] => {
    const volunteerCounts: Record<string, { name: string; count: number }> = {}

    records.forEach(record => {
        const id = record.scannedBy
        if (id) {
            if (!volunteerCounts[id]) {
                volunteerCounts[id] = {
                    name: record.scannedByName || 'Unknown',
                    count: 0
                }
            }
            volunteerCounts[id].count++
        }
    })

    return Object.entries(volunteerCounts)
        .map(([id, data]) => ({ id, name: data.name, scans: data.count }))
        .sort((a, b) => b.scans - a.scans)
        .slice(0, limit)
}

/**
 * Calculate volunteer efficiency (scans per hour)
 */
export const getVolunteerEfficiency = (records: Attendance[], volunteerId: string): number => {
    const volunteerScans = records.filter(r => r.scannedBy === volunteerId)
    if (volunteerScans.length === 0) return 0

    const times = volunteerScans
        .map(r => r.scannedAt?.toDate?.()?.getTime())
        .filter((t): t is number => t !== undefined)
        .sort()

    if (times.length < 2) return 0

    const totalTime = times[times.length - 1] - times[0]
    const hours = totalTime / (1000 * 60 * 60)

    return hours > 0 ? Math.round(volunteerScans.length / hours) : 0
}

// ========================================
// ATTENDANCE PATTERNS
// ========================================

/**
 * Detect attendance trends (increasing/decreasing)
 */
export const getAttendanceTrend = (
    records: Attendance[]
): { trend: 'increasing' | 'decreasing' | 'stable'; change: number } => {
    // Group by date
    const dateGroups: Record<string, number> = {}
    records.forEach(r => {
        dateGroups[r.date] = (dateGroups[r.date] || 0) + 1
    })

    const dates = Object.keys(dateGroups).sort()
    if (dates.length < 2) return { trend: 'stable', change: 0 }

    // Compare recent days with earlier days
    const halfIndex = Math.floor(dates.length / 2)
    const earlierDates = dates.slice(0, halfIndex)
    const recentDates = dates.slice(halfIndex)

    const earlierAvg = earlierDates.reduce((sum, d) => sum + dateGroups[d], 0) / earlierDates.length
    const recentAvg = recentDates.reduce((sum, d) => sum + dateGroups[d], 0) / recentDates.length

    const change = ((recentAvg - earlierAvg) / earlierAvg) * 100

    if (Math.abs(change) < 5) return { trend: 'stable', change: 0 }
    return {
        trend: change > 0 ? 'increasing' : 'decreasing',
        change: Math.round(Math.abs(change))
    }
}

/**
 * Identify repeat attendees
 */
export const getRepeatAttendees = (records: Attendance[]): {
    userId: string
    displayName: string
    attendanceCount: number
}[] => {
    const userCounts: Record<string, { name: string; count: number }> = {}

    records.forEach(record => {
        const userId = record.userId
        if (!userCounts[userId]) {
            userCounts[userId] = {
                name: record.displayName,
                count: 0
            }
        }
        userCounts[userId].count++
    })

    return Object.entries(userCounts)
        .filter(([, data]) => data.count > 1)
        .map(([userId, data]) => ({
            userId,
            displayName: data.name,
            attendanceCount: data.count
        }))
        .sort((a, b) => b.attendanceCount - a.attendanceCount)
}

// ========================================
// PAYMENT INSIGHTS
// ========================================

/**
 * Get payment status breakdown
 */
export const getPaymentBreakdown = (records: Attendance[]): {
    paid: number
    pending: number
    free: number
    percentPaid: number
} => {
    const breakdown = {
        paid: 0,
        pending: 0,
        free: 0
    }

    records.forEach(record => {
        const status = record.paymentStatus || 'free'
        breakdown[status as keyof typeof breakdown]++
    })

    const total = records.length
    const percentPaid = total > 0 ? Math.round((breakdown.paid / total) * 100) : 0

    return { ...breakdown, percentPaid }
}

/**
 * Calculate revenue estimation (assuming payment amounts)
 */
export const estimateRevenue = (
    records: Attendance[],
    averageTicketPrice = 0
): { total: number; pending: number; collected: number } => {
    const payment = getPaymentBreakdown(records)

    return {
        total: (payment.paid + payment.pending) * averageTicketPrice,
        collected: payment.paid * averageTicketPrice,
        pending: payment.pending * averageTicketPrice
    }
}

// ========================================
// ANOMALY DETECTION
// ========================================

/**
 * Detect unusual scanning patterns
 */
export const detectAnomalies = (records: Attendance[]): {
    type: string
    description: string
    severity: 'low' | 'medium' | 'high'
}[] => {
    const anomalies: { type: string; description: string; severity: 'low' | 'medium' | 'high' }[] = []

    // Check for too many offline scans
    const offlineCount = records.filter(r => r.offlineScanned).length
    const offlinePercent = (offlineCount / records.length) * 100

    if (offlinePercent > 30) {
        anomalies.push({
            type: 'high_offline_rate',
            description: `${offlinePercent.toFixed(1)}% of scans were offline`,
            severity: offlinePercent > 50 ? 'high' : 'medium'
        })
    }

    // Check for too many pending payments
    const payment = getPaymentBreakdown(records)
    if (payment.percentPaid < 50) {
        anomalies.push({
            type: 'low_payment_rate',
            description: `Only ${payment.percentPaid}% of scans have confirmed payment`,
            severity: 'medium'
        })
    }

    // Check for rapid duplicate attempts
    const duplicates = records.filter((r, i, arr) =>
        arr.findIndex(x => x.userId === r.userId && x.date === r.date) !== i
    )

    if (duplicates.length > records.length * 0.1) {
        anomalies.push({
            type: 'high_duplicate_rate',
            description: `${duplicates.length} duplicate scan attempts detected`,
            severity: 'high'
        })
    }

    return anomalies
}

// ========================================
// PREDICTIVE INSIGHTS
// ========================================

/**
 * Predict attendance for next period based on trends
 */
export const predictNextPeriodAttendance = (records: Attendance[]): number => {
    const trend = getAttendanceTrend(records)
    const avgPerDay = getAverageScansPerDay(records)

    if (trend.trend === 'increasing') {
        return Math.round(avgPerDay * (1 + trend.change / 100))
    } else if (trend.trend === 'decreasing') {
        return Math.round(avgPerDay * (1 - trend.change / 100))
    }

    return avgPerDay
}

/**
 * Generate comprehensive insights summary
 */
export const generateInsightsSummary = (records: Attendance[]) => {
    const peakHours = getPeakHours(records)
    const busiestDays = getBusiestDays(records)
    const trend = getAttendanceTrend(records)
    const topVolunteers = getTopVolunteers(records, 3)
    const payment = getPaymentBreakdown(records)
    const anomalies = detectAnomalies(records)

    return {
        overview: {
            totalScans: records.length,
            averagePerDay: getAverageScansPerDay(records),
            uniqueAttendees: new Set(records.map(r => r.userId)).size,
            trend
        },
        time: {
            peakHour: peakHours[0]?.hour || 0,
            busiestDay: busiestDays[0]?.day || 'N/A'
        },
        volunteers: topVolunteers,
        payment,
        anomalies,
        prediction: predictNextPeriodAttendance(records)
    }
}
