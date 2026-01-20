import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { onAuthChange } from '../../lib/auth'
import { getAdminDocument } from '../../lib/userService'
import {
    getAllEventRegistrations,
    deleteEventRegistration,
    exportEventRegistrationsToCSV,
    downloadEventCSV,
    getEventRegistrationStats,
    type EventRegistration
} from '../../lib/eventRegistrationService'
import './ManageEvents.css'

export default function ManageEvents() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [registrations, setRegistrations] = useState<EventRegistration[]>([])
    const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 })

    // Auth check
    useEffect(() => {
        const unsubscribe = onAuthChange(async (user) => {
            if (!user) {
                navigate('/admin-login')
                return
            }

            const adminDoc = await getAdminDocument(user.uid)
            if (!adminDoc) {
                alert('Access denied')
                navigate('/')
                return
            }

            fetchData()
        })

        return () => unsubscribe()
    }, [navigate])

    const fetchData = async () => {
        const regs = await getAllEventRegistrations()
        const regStats = getEventRegistrationStats(regs)
        setRegistrations(regs)
        setStats(regStats)
        setLoading(false)
    }

    const handleExportCSV = async () => {
        const csv = exportEventRegistrationsToCSV(registrations)
        downloadEventCSV(csv, `event-registrations-${new Date().toISOString().split('T')[0]}.csv`)
    }

    const handleDeleteRegistration = async (id: string) => {
        if (!confirm('Delete this registration?')) return
        await deleteEventRegistration(id)
        fetchData()
    }

    if (loading) {
        return (
            <div className="manage-page">
                <div className="manage-content">
                    <h1>Loading...</h1>
                </div>
            </div>
        )
    }

    return (
        <div className="manage-page">
            <div className="manage-content">
                {/* Header */}
                <div className="manage-header">
                    <div>
                        <h1>Event Registrations</h1>
                        <p className="subtitle">Manage all event registrations</p>
                    </div>
                    <button className="back-btn" onClick={() => navigate('/admin-dashboard')}>
                        ← Back to Dashboard
                    </button>
                </div>

                {/* Stats */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <span className="stat-label">Total Registrations</span>
                        <span className="stat-value">{stats.total}</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-label">Pending</span>
                        <span className="stat-value">{stats.pending}</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-label">Approved</span>
                        <span className="stat-value">{stats.approved}</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-label">Rejected</span>
                        <span className="stat-value">{stats.rejected}</span>
                    </div>
                </div>

                {/* Export Button */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <button className="export-btn" onClick={handleExportCSV}>
                        📥 Export to CSV
                    </button>
                </div>

                {/* Registrations Table */}
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Phone</th>
                                <th>College</th>
                                <th>Event</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {registrations.length === 0 ? (
                                <tr>
                                    <td colSpan={9} style={{ textAlign: 'center', padding: '2rem' }}>
                                        No registrations yet
                                    </td>
                                </tr>
                            ) : (
                                registrations.map(reg => (
                                    <tr key={reg.id}>
                                        <td>{reg.name}</td>
                                        <td>{reg.email}</td>
                                        <td>{reg.phone}</td>
                                        <td>{reg.collegeName}</td>
                                        <td>{reg.eventName}</td>
                                        <td>₹{reg.amountPaid}</td>
                                        <td>
                                            <span className={`status-badge status-${reg.status}`}>
                                                {reg.status}
                                            </span>
                                        </td>
                                        <td>
                                            {reg.createdAt ? new Date(reg.createdAt.toDate()).toLocaleDateString() : '-'}
                                        </td>
                                        <td>
                                            <button
                                                className="delete-btn"
                                                onClick={() => handleDeleteRegistration(reg.id!)}
                                            >
                                                🗑️
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
