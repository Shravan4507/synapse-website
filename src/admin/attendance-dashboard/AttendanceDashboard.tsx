import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    collection,
    query,
    getDocs,
    orderBy
} from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { onAuthChange } from '../../lib/auth'
import { isUserAdmin } from '../../lib/userService'
import type { Attendance } from '../../lib/qrVerificationService'
import {
    applyFilters,
    quickFilters,
    exportToCSV,
    getFilterSummary,
    type FilterCriteria
} from '../../lib/filterService'
import InsightsPanel from './InsightsPanel'
import './AttendanceDashboard.css'

interface DashboardStats {
    totalToday: number
    totalThisWeek: number
    totalThisMonth: number
    uniqueUsers: number
    offlineScans: number
    pendingPayments: number
}

export default function AttendanceDashboard() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [authorized, setAuthorized] = useState(false)

    // Data
    const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([])
    const [filteredRecords, setFilteredRecords] = useState<Attendance[]>([])
    const [stats, setStats] = useState<DashboardStats>({
        totalToday: 0,
        totalThisWeek: 0,
        totalThisMonth: 0,
        uniqueUsers: 0,
        offlineScans: 0,
        pendingPayments: 0
    })

    // Filters
    const [searchQuery, setSearchQuery] = useState('')
    const [activeFilter, setActiveFilter] = useState<FilterCriteria>({})
    const [showFilters, setShowFilters] = useState(false)

    // Bulk Selection
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [selectAll, setSelectAll] = useState(false)

    // ========================================
    // AUTHENTICATION
    // ========================================

    useEffect(() => {
        const unsubscribe = onAuthChange(async (user) => {
            if (!user) {
                navigate('/admin/login')
                return
            }

            const isAdmin = await isUserAdmin(user.uid)
            if (!isAdmin) {
                navigate('/admin/login')
                return
            }

            setAuthorized(true)
            setLoading(false)
        })

        return () => unsubscribe()
    }, [navigate])

    // ========================================
    // DATA FETCHING
    // ========================================

    useEffect(() => {
        if (!authorized) return

        fetchAttendanceData()
    }, [authorized])

    const fetchAttendanceData = async () => {
        try {
            const q = query(
                collection(db, 'attendances'),
                orderBy('scannedAt', 'desc')
            )
            const snapshot = await getDocs(q)

            const records: Attendance[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Attendance))

            setAttendanceRecords(records)
            setFilteredRecords(records)
            calculateStats(records)
        } catch (error) {
            console.error('Error fetching attendance:', error)
        }
    }

    const calculateStats = (records: Attendance[]) => {
        const now = new Date()
        const todayStart = new Date(now.setHours(0, 0, 0, 0))
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()))
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

        const uniqueUserIds = new Set(records.map(r => r.userId))

        setStats({
            totalToday: records.filter(r =>
                r.scannedAt?.toDate?.() >= todayStart
            ).length,
            totalThisWeek: records.filter(r =>
                r.scannedAt?.toDate?.() >= weekStart
            ).length,
            totalThisMonth: records.filter(r =>
                r.scannedAt?.toDate?.() >= monthStart
            ).length,
            uniqueUsers: uniqueUserIds.size,
            offlineScans: records.filter(r => r.offlineScanned).length,
            pendingPayments: records.filter(r =>
                r.paymentStatus === 'pending'
            ).length
        })
    }

    // ========================================
    // FILTERING
    // ========================================

    useEffect(() => {
        const criteria: FilterCriteria = {
            ...activeFilter,
            searchQuery,
            searchFields: ['synapseId', 'displayName', 'email', 'college']
        }

        const filtered = applyFilters(attendanceRecords, criteria)
        setFilteredRecords(filtered)
    }, [searchQuery, activeFilter, attendanceRecords])

    const applyQuickFilter = (filterName: keyof typeof quickFilters) => {
        setActiveFilter(quickFilters[filterName]())
        setShowFilters(false)
    }

    const clearFilters = () => {
        setActiveFilter({})
        setSearchQuery('')
    }

    // ========================================
    // BULK SELECTION
    // ========================================

    const toggleSelectAll = () => {
        if (selectAll) {
            setSelectedIds(new Set())
        } else {
            const allIds = filteredRecords.map(r => r.id).filter((id): id is string => id !== undefined)
            setSelectedIds(new Set(allIds))
        }
        setSelectAll(!selectAll)
    }

    const toggleSelectItem = (id: string) => {
        const newSelected = new Set(selectedIds)
        if (newSelected.has(id)) {
            newSelected.delete(id)
        } else {
            newSelected.add(id)
        }
        setSelectedIds(newSelected)
        setSelectAll(newSelected.size === filteredRecords.length)
    }

    // ========================================
    // EXPORT
    // ========================================

    const handleExport = () => {
        const recordsToExport = selectedIds.size > 0
            ? filteredRecords.filter(r => r.id && selectedIds.has(r.id))
            : filteredRecords

        const filename = `attendance_${new Date().toISOString().split('T')[0]}.csv`
        exportToCSV(recordsToExport, filename)
    }

    // ========================================
    // RENDER
    // ========================================

    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="loading-spinner"></div>
                <p>Loading dashboard...</p>
            </div>
        )
    }

    return (
        <div className="attendance-dashboard">
            <div className="dashboard-container">
                {/* Header */}
                <div className="dashboard-header">
                    <div>
                        <h1 className="dashboard-title">📊 Attendance Dashboard</h1>
                        <p className="dashboard-subtitle">
                            Manage and analyze attendance records
                        </p>
                    </div>
                    <button className="refresh-btn" onClick={fetchAttendanceData}>
                        🔄 Refresh
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="stats-grid">
                    <div className="stat-card primary">
                        <div className="stat-icon">📅</div>
                        <div className="stat-content">
                            <div className="stat-value">{stats.totalToday}</div>
                            <div className="stat-label">Scans Today</div>
                        </div>
                    </div>

                    <div className="stat-card success">
                        <div className="stat-icon">📈</div>
                        <div className="stat-content">
                            <div className="stat-value">{stats.totalThisWeek}</div>
                            <div className="stat-label">This Week</div>
                        </div>
                    </div>

                    <div className="stat-card info">
                        <div className="stat-icon">👥</div>
                        <div className="stat-content">
                            <div className="stat-value">{stats.uniqueUsers}</div>
                            <div className="stat-label">Unique Users</div>
                        </div>
                    </div>

                    <div className="stat-card warning">
                        <div className="stat-icon">📴</div>
                        <div className="stat-content">
                            <div className="stat-value">{stats.offlineScans}</div>
                            <div className="stat-label">Offline Scans</div>
                        </div>
                    </div>
                </div>

                {/* Filters & Search */}
                <div className="filters-section">
                    <div className="search-bar">
                        <input
                            type="text"
                            placeholder="Search by name, ID, email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="search-input"
                        />
                        <button
                            className="filter-toggle-btn"
                            onClick={() => setShowFilters(!showFilters)}
                        >
                            🔍 Filters
                        </button>
                    </div>

                    {/* Quick Filters */}
                    <div className="quick-filters">
                        <button onClick={() => applyQuickFilter('today')}>
                            Today
                        </button>
                        <button onClick={() => applyQuickFilter('thisWeek')}>
                            This Week
                        </button>
                        <button onClick={() => applyQuickFilter('thisMonth')}>
                            This Month
                        </button>
                        <button onClick={() => applyQuickFilter('offlineScans')}>
                            Offline Only
                        </button>
                        <button onClick={() => applyQuickFilter('unpaidRegistrations')}>
                            Unpaid
                        </button>
                        <button onClick={clearFilters} className="clear-btn">
                            Clear All
                        </button>
                    </div>

                    {/* Active Filter Summary */}
                    {(searchQuery || Object.keys(activeFilter).length > 0) && (
                        <div className="filter-summary">
                            <span className="filter-summary-text">
                                {getFilterSummary({ ...activeFilter, searchQuery })}
                            </span>
                            <span className="filter-count">
                                {filteredRecords.length} results
                            </span>
                        </div>
                    )}
                </div>

                {/* Bulk Actions */}
                {selectedIds.size > 0 && (
                    <div className="bulk-actions-bar">
                        <span className="bulk-count">
                            {selectedIds.size} selected
                        </span>
                        <div className="bulk-buttons">
                            <button onClick={handleExport} className="export-btn">
                                📥 Export Selected
                            </button>
                            <button
                                onClick={() => setSelectedIds(new Set())}
                                className="deselect-btn"
                            >
                                Clear Selection
                            </button>
                        </div>
                    </div>
                )}

                {/* Export Button */}
                <div className="table-actions">
                    <button onClick={handleExport} className="export-all-btn">
                        📥 Export {selectedIds.size > 0 ? 'Selected' : 'All'} ({selectedIds.size || filteredRecords.length})
                    </button>
                </div>

                {/* Attendance Table */}
                <div className="attendance-table-container">
                    <table className="attendance-table">
                        <thead>
                            <tr>
                                <th>
                                    <input
                                        type="checkbox"
                                        checked={selectAll}
                                        onChange={toggleSelectAll}
                                    />
                                </th>
                                <th>Date & Time</th>
                                <th>Synapse ID</th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Scanned By</th>
                                <th>Payment</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRecords.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="empty-state">
                                        No attendance records found
                                    </td>
                                </tr>
                            ) : (
                                filteredRecords.map(record => record.id && (
                                    <tr key={record.id}>
                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(record.id)}
                                                onChange={() => toggleSelectItem(record.id!)}
                                            />
                                        </td>
                                        <td className="date-cell">
                                            <div className="date">
                                                {record.date}
                                            </div>
                                            <div className="time">
                                                {record.scannedAt?.toDate?.()?.toLocaleTimeString()}
                                            </div>
                                        </td>
                                        <td className="id-cell">
                                            {record.synapseId}
                                        </td>
                                        <td className="name-cell">
                                            {record.displayName}
                                        </td>
                                        <td className="email-cell">
                                            {record.email || 'N/A'}
                                        </td>
                                        <td className="scanned-cell">
                                            {record.scannedByName}
                                        </td>
                                        <td className="payment-cell">
                                            <span className={`payment-badge ${record.paymentStatus || 'free'}`}>
                                                {record.paymentStatus || 'free'}
                                            </span>
                                        </td>
                                        <td className="status-cell">
                                            {record.offlineScanned && (
                                                <span className="offline-badge">📴</span>
                                            )}
                                            {record.attended ? (
                                                <span className="present-badge">✓</span>
                                            ) : (
                                                <span className="absent-badge">✗</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* ✨ PHASE 3: Smart Insights */}
                <InsightsPanel records={filteredRecords} />
            </div>
        </div>
    )
}
