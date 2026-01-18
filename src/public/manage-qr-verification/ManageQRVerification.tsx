import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { onAuthChange } from '../../lib/auth'
import { getAdminDocument } from '../../lib/userService'
import {
    type QRVolunteer,
    type Attendance,
    getAllVolunteers,
    addVolunteer,
    updateVolunteerStatus,
    removeVolunteer,
    getAllAttendance,
    getAttendanceByDate,
    deleteAttendance,
    getAttendanceStats,
    exportAttendanceToCSV,
    downloadAttendanceCSV,
    lookupUserBySynapseId,
    getTodayDate
} from '../../lib/qrVerificationService'
import './ManageQRVerification.css'

type TabType = 'volunteers' | 'attendance' | 'live'

export default function ManageQRVerification() {
    const navigate = useNavigate()

    // Auth state
    const [loading, setLoading] = useState(true)
    const [currentAdminId, setCurrentAdminId] = useState('')

    // Tab state
    const [activeTab, setActiveTab] = useState<TabType>('volunteers')

    // Data state
    const [volunteers, setVolunteers] = useState<QRVolunteer[]>([])
    const [attendances, setAttendances] = useState<Attendance[]>([])
    const [todayAttendances, setTodayAttendances] = useState<Attendance[]>([])

    // Filter state
    const [selectedDate, setSelectedDate] = useState(getTodayDate())

    // Add volunteer state
    const [showAddVolunteer, setShowAddVolunteer] = useState(false)
    const [volunteerSearchId, setVolunteerSearchId] = useState('')
    const [volunteerSearchResult, setVolunteerSearchResult] = useState<{
        userId: string
        displayName: string
        email: string
        synapseId: string
    } | null>(null)
    const [searchError, setSearchError] = useState('')
    const [addingVolunteer, setAddingVolunteer] = useState(false)

    // ========================================
    // DATA FETCHING
    // ========================================

    const fetchData = async () => {
        const [volunteersData, allAttendances, todayData] = await Promise.all([
            getAllVolunteers(),
            getAllAttendance(),
            getAttendanceByDate(getTodayDate())
        ])
        setVolunteers(volunteersData)
        setAttendances(allAttendances)
        setTodayAttendances(todayData)
    }

    // Check authorization
    useEffect(() => {
        const unsubscribe = onAuthChange(async (user) => {
            if (!user) {
                navigate('/user-login?returnTo=/manage-qr-verification')
                return
            }

            const admin = await getAdminDocument(user.uid)

            if (!admin || !admin.permissions?.includes('manage_qr_verification')) {
                navigate('/user-dashboard')
                return
            }

            setCurrentAdminId(user.uid)
            await fetchData()
            setLoading(false)
        })

        return () => unsubscribe()
    }, [navigate])

    // Refresh today's attendance periodically
    useEffect(() => {
        if (activeTab === 'live') {
            const interval = setInterval(async () => {
                const todayData = await getAttendanceByDate(getTodayDate())
                setTodayAttendances(todayData)
            }, 10000) // Refresh every 10 seconds

            return () => clearInterval(interval)
        }
    }, [activeTab])

    // ========================================
    // VOLUNTEER HANDLERS
    // ========================================

    const handleSearchVolunteer = async () => {
        setSearchError('')
        setVolunteerSearchResult(null)

        if (!volunteerSearchId.trim()) {
            setSearchError('Please enter a Synapse ID')
            return
        }

        const result = await lookupUserBySynapseId(volunteerSearchId.trim().toUpperCase())
        if (result) {
            setVolunteerSearchResult(result)
        } else {
            setSearchError('No user found with this Synapse ID')
        }
    }

    const handleAddVolunteer = async () => {
        if (!volunteerSearchResult) return

        setAddingVolunteer(true)
        const result = await addVolunteer({
            userId: volunteerSearchResult.userId,
            synapseId: volunteerSearchResult.synapseId,
            displayName: volunteerSearchResult.displayName,
            email: volunteerSearchResult.email,
            isActive: true,
            createdBy: currentAdminId
        })

        setAddingVolunteer(false)

        if (result.success) {
            setShowAddVolunteer(false)
            setVolunteerSearchId('')
            setVolunteerSearchResult(null)
            await fetchData()
        } else {
            setSearchError(result.error || 'Failed to add volunteer')
        }
    }

    const handleToggleVolunteerStatus = async (volunteer: QRVolunteer) => {
        if (!volunteer.id) return
        await updateVolunteerStatus(volunteer.id, !volunteer.isActive)
        await fetchData()
    }

    const handleRemoveVolunteer = async (volunteerId: string) => {
        if (!confirm('Remove this volunteer?')) return
        await removeVolunteer(volunteerId)
        await fetchData()
    }

    // ========================================
    // ATTENDANCE HANDLERS
    // ========================================

    const filteredAttendances = selectedDate === 'all'
        ? attendances
        : attendances.filter(a => a.date === selectedDate)

    const handleExportAttendance = () => {
        const csv = exportAttendanceToCSV(filteredAttendances)
        if (csv) {
            downloadAttendanceCSV(csv, `attendance_${selectedDate}.csv`)
        }
    }

    const handleDeleteAttendance = async (id: string) => {
        if (!confirm('Delete this attendance record?')) return
        await deleteAttendance(id)
        await fetchData()
    }

    const stats = getAttendanceStats(filteredAttendances)
    const todayStats = getAttendanceStats(todayAttendances)

    // Get unique dates for filter
    const uniqueDates = [...new Set(attendances.map(a => a.date))].sort().reverse()

    // ========================================
    // RENDER
    // ========================================

    if (loading) {
        return (
            <div className="manage-qr-page">
                <div className="loading-state">Loading...</div>
            </div>
        )
    }

    return (
        <div className="manage-qr-page">
            <div className="manage-qr-content">
                {/* Header */}
                <div className="qr-header">
                    <button className="back-btn" onClick={() => navigate('/user-dashboard')}>
                        ← Back
                    </button>
                    <h1 className="manage-title">QR Verification</h1>
                    <p className="manage-subtitle">
                        {volunteers.filter(v => v.isActive).length} active volunteers • {todayAttendances.length} checked in today
                    </p>
                </div>

                {/* Tabs */}
                <div className="tab-buttons">
                    <button
                        className={`tab-btn ${activeTab === 'volunteers' ? 'active' : ''}`}
                        onClick={() => setActiveTab('volunteers')}
                    >
                        Volunteers ({volunteers.length})
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'attendance' ? 'active' : ''}`}
                        onClick={() => setActiveTab('attendance')}
                    >
                        Attendance Records
                    </button>
                    <button
                        className={`tab-btn live ${activeTab === 'live' ? 'active' : ''}`}
                        onClick={() => setActiveTab('live')}
                    >
                        🔴 Live Feed
                    </button>
                </div>

                {/* ================================================
                    VOLUNTEERS TAB
                   ================================================ */}
                {activeTab === 'volunteers' && (
                    <div className="volunteers-section">
                        {/* Add Volunteer Button */}
                        <div className="section-actions">
                            <button
                                className="action-btn primary"
                                onClick={() => setShowAddVolunteer(true)}
                            >
                                + Add Volunteer
                            </button>
                            <button
                                className="action-btn secondary"
                                onClick={() => navigate('/scan-qr')}
                            >
                                Open Scanner →
                            </button>
                        </div>

                        {/* Volunteers Grid */}
                        <div className="volunteers-grid">
                            {volunteers.length === 0 ? (
                                <p className="empty-state">No volunteers yet. Add someone to get started.</p>
                            ) : (
                                volunteers.map(volunteer => (
                                    <div
                                        key={volunteer.id}
                                        className={`volunteer-card ${volunteer.isActive ? 'active' : 'inactive'}`}
                                    >
                                        <div className="volunteer-info">
                                            <div className="volunteer-avatar">
                                                {volunteer.displayName.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="volunteer-details">
                                                <span className="volunteer-name">{volunteer.displayName}</span>
                                                <span className="volunteer-id">{volunteer.synapseId}</span>
                                                <span className="volunteer-email">{volunteer.email}</span>
                                            </div>
                                        </div>
                                        <div className="volunteer-actions">
                                            <button
                                                className={`status-toggle ${volunteer.isActive ? 'active' : ''}`}
                                                onClick={() => handleToggleVolunteerStatus(volunteer)}
                                            >
                                                {volunteer.isActive ? 'Active' : 'Inactive'}
                                            </button>
                                            <button
                                                className="remove-btn"
                                                onClick={() => handleRemoveVolunteer(volunteer.id!)}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Add Volunteer Modal */}
                        {showAddVolunteer && (
                            <div className="overlay" onClick={() => setShowAddVolunteer(false)}>
                                <div className="overlay-content" onClick={e => e.stopPropagation()}>
                                    <button className="close-overlay" onClick={() => setShowAddVolunteer(false)}>×</button>
                                    <h2>Add Volunteer</h2>

                                    <div className="search-section">
                                        <label>Search by Synapse ID</label>
                                        <div className="search-row">
                                            <input
                                                type="text"
                                                value={volunteerSearchId}
                                                onChange={e => setVolunteerSearchId(e.target.value.toUpperCase())}
                                                placeholder="e.g., SYN-ABC-1234"
                                            />
                                            <button onClick={handleSearchVolunteer}>Search</button>
                                        </div>
                                        {searchError && <p className="search-error">{searchError}</p>}
                                    </div>

                                    {volunteerSearchResult && (
                                        <div className="search-result">
                                            <div className="result-info">
                                                <span className="result-name">{volunteerSearchResult.displayName}</span>
                                                <span className="result-email">{volunteerSearchResult.email}</span>
                                                <span className="result-id">{volunteerSearchResult.synapseId}</span>
                                            </div>
                                            <button
                                                className="add-btn"
                                                onClick={handleAddVolunteer}
                                                disabled={addingVolunteer}
                                            >
                                                {addingVolunteer ? 'Adding...' : 'Add as Volunteer'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ================================================
                    ATTENDANCE TAB
                   ================================================ */}
                {activeTab === 'attendance' && (
                    <div className="attendance-section">
                        {/* Toolbar */}
                        <div className="attendance-toolbar">
                            <div className="filter-section">
                                <label>Filter by Date:</label>
                                <select
                                    value={selectedDate}
                                    onChange={e => setSelectedDate(e.target.value)}
                                >
                                    <option value="all">All Dates</option>
                                    {uniqueDates.map(date => (
                                        <option key={date} value={date}>{date}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                className="export-btn"
                                onClick={handleExportAttendance}
                                disabled={filteredAttendances.length === 0}
                            >
                                📥 Export CSV
                            </button>
                        </div>

                        {/* Stats */}
                        <div className="stats-grid">
                            <div className="stat-card">
                                <span className="stat-value">{stats.total}</span>
                                <span className="stat-label">Total Records</span>
                            </div>
                            <div className="stat-card">
                                <span className="stat-value">{stats.uniqueUsers}</span>
                                <span className="stat-label">Unique Users</span>
                            </div>
                            <div className="stat-card">
                                <span className="stat-value">{stats.uniqueVolunteers}</span>
                                <span className="stat-label">Volunteers Active</span>
                            </div>
                            <div className="stat-card offline">
                                <span className="stat-value">{stats.offlineCount}</span>
                                <span className="stat-label">Offline Scans</span>
                            </div>
                        </div>

                        {/* Attendance Table */}
                        <div className="attendance-table">
                            {filteredAttendances.length === 0 ? (
                                <p className="empty-state">No attendance records found.</p>
                            ) : (
                                <>
                                    <div className="table-header">
                                        <span>Date</span>
                                        <span>Synapse ID</span>
                                        <span>Name</span>
                                        <span>Scanned By</span>
                                        <span>Time</span>
                                        <span>Actions</span>
                                    </div>
                                    {filteredAttendances.map(record => (
                                        <div key={record.id} className="table-row">
                                            <span>{record.date}</span>
                                            <span className="synapse-id">{record.synapseId}</span>
                                            <span className="name">{record.displayName}</span>
                                            <span className="scanned-by">{record.scannedByName}</span>
                                            <span className="time">
                                                {record.scannedAt?.toDate?.()?.toLocaleTimeString('en-IN', {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                }) || '-'}
                                            </span>
                                            <span className="actions">
                                                <button
                                                    className="delete-btn"
                                                    onClick={() => handleDeleteAttendance(record.id!)}
                                                >
                                                    🗑️
                                                </button>
                                            </span>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* ================================================
                    LIVE FEED TAB
                   ================================================ */}
                {activeTab === 'live' && (
                    <div className="live-section">
                        <div className="live-header">
                            <div className="live-indicator">
                                <span className="pulse"></span>
                                Live - Auto-refreshing every 10s
                            </div>
                            <span className="live-count">{todayStats.total} checked in today</span>
                        </div>

                        <div className="live-feed">
                            {todayAttendances.length === 0 ? (
                                <div className="empty-state">
                                    <span className="empty-icon">📡</span>
                                    <p>No check-ins yet today. Waiting for scans...</p>
                                </div>
                            ) : (
                                todayAttendances.map(record => (
                                    <div key={record.id} className="live-card">
                                        <div className="live-card-avatar">
                                            {record.displayName.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="live-card-info">
                                            <span className="live-card-name">{record.displayName}</span>
                                            <span className="live-card-id">{record.synapseId}</span>
                                        </div>
                                        <div className="live-card-meta">
                                            <span className="live-card-time">
                                                {record.scannedAt?.toDate?.()?.toLocaleTimeString('en-IN', {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                }) || '-'}
                                            </span>
                                            <span className="live-card-scanner">by {record.scannedByName}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
