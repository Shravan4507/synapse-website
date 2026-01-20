import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { onAuthChange } from '../../lib/auth'
import { getAdminDocument } from '../../lib/userService'
import {
    getAllRegistrations,
    deleteRegistration,
    exportRegistrationsToCSV,
    downloadCSV,
    getRegistrationStats,
    type Registration
} from '../../lib/registrationService'
import './ManageCompetitions.css'

export default function ManageCompetitions() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [registrations, setRegistrations] = useState<Registration[]>([])
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
        const regs = await getAllRegistrations()
        const regStats = getRegistrationStats(regs)
        setRegistrations(regs)
        setStats(regStats)
        setLoading(false)
    }

    const handleExportCSV = async () => {
        const csv = exportRegistrationsToCSV(registrations)
        downloadCSV(csv, `competition-registrations-${new Date().toISOString().split('T')[0]}.csv`)
    }

    const handleDeleteRegistration = async (id: string) => {
        if (!confirm('Delete this registration?')) return
        await deleteRegistration(id)
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
                        <h1>Competition Registrations</h1>
                        <p className="subtitle">Manage all competition registrations</p>
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
                                <th>Team Name</th>
                                <th>Competition</th>
                                <th>College</th>
                                <th>Leader</th>
                                <th>Members</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {registrations.length === 0 ? (
                                <tr>
                                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>
                                        No registrations yet
                                    </td>
                                </tr>
                            ) : (
                                registrations.map(reg => (
                                    <tr key={reg.id}>
                                        <td>{reg.teamName}</td>
                                        <td>{reg.competitionName}</td>
                                        <td>{reg.collegeName}</td>
                                        <td>
                                            {reg.teamMembers[0]?.name}<br />
                                            <small style={{ color: 'rgba(255,255,255,0.5)' }}>
                                                {reg.teamMembers[0]?.email}
                                            </small>
                                        </td>
                                        <td>{reg.teamMembers.length}</td>
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
