import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { onAuthChange } from '../../lib/auth'
import { getAdminDocument } from '../../lib/userService'
import {
    getAllApplications,
    updateApplicationStatus,
    deleteApplication,
    exportApplicationsToCSV,
    type RecruitmentApplication,
    type ApplicationStatus
} from '../../lib/applicationService'
import './ManageRecruitments.css'

export default function ManageRecruitments() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [authorized, setAuthorized] = useState(false)
    const [applications, setApplications] = useState<RecruitmentApplication[]>([])
    const [selectedApplication, setSelectedApplication] = useState<RecruitmentApplication | null>(null)
    const [filter, setFilter] = useState<ApplicationStatus | 'all'>('all')
    const [updating, setUpdating] = useState<string | null>(null)
    const [adminUid, setAdminUid] = useState('')
    const [showRemarkModal, setShowRemarkModal] = useState(false)
    const [rejectRemark, setRejectRemark] = useState('')
    const [pendingReject, setPendingReject] = useState<string | null>(null)

    // Check authorization using auth state observer
    useEffect(() => {
        const unsubscribe = onAuthChange(async (user) => {
            if (!user) {
                navigate('/user-login?returnTo=/manage-recruitment-applications')
                return
            }

            const admin = await getAdminDocument(user.uid)

            if (!admin || !admin.permissions?.includes('manage_recruitments')) {
                navigate('/user-dashboard')
                return
            }

            setAdminUid(user.uid)
            setAuthorized(true)
            await fetchApplications()
            setLoading(false)
        })

        return () => unsubscribe()
    }, [navigate])

    const fetchApplications = async () => {
        const apps = await getAllApplications()
        setApplications(apps)
    }

    const handleStatusChange = async (applicationId: string, newStatus: ApplicationStatus, remark?: string) => {
        setUpdating(applicationId)

        // When accepting, clear any previous remark so default accepted message shows
        const finalRemark = newStatus === 'accepted' ? '' : remark
        const result = await updateApplicationStatus(applicationId, newStatus, adminUid, finalRemark)

        if (result.success) {
            setApplications(prev =>
                prev.map(app =>
                    app.id === applicationId
                        ? { ...app, status: newStatus, remark: finalRemark ?? '' }
                        : app
                )
            )
            if (selectedApplication?.id === applicationId) {
                setSelectedApplication(prev => prev ? { ...prev, status: newStatus, remark: finalRemark ?? '' } : null)
            }
        }
        setUpdating(null)
    }

    const handleRejectClick = (applicationId: string) => {
        setPendingReject(applicationId)
        setRejectRemark('')
        setShowRemarkModal(true)
    }

    const confirmReject = async () => {
        if (!pendingReject) return
        await handleStatusChange(pendingReject, 'rejected', rejectRemark || undefined)
        setShowRemarkModal(false)
        setPendingReject(null)
        setRejectRemark('')
    }

    const handleDelete = async (applicationId: string) => {
        if (!confirm('Are you sure you want to permanently delete this application?')) return

        setUpdating(applicationId)
        const result = await deleteApplication(applicationId)

        if (result.success) {
            setApplications(prev => prev.filter(app => app.id !== applicationId))
            if (selectedApplication?.id === applicationId) {
                setSelectedApplication(null)
            }
        }
        setUpdating(null)
    }

    const handleExport = () => {
        const csvContent = exportApplicationsToCSV(applications)
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `synapse_applications_${new Date().toISOString().split('T')[0]}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const filteredApplications = filter === 'all'
        ? applications
        : applications.filter(app => app.status === filter)

    const getStatusColor = (status: ApplicationStatus) => {
        switch (status) {
            case 'pending': return '#ffa500'
            case 'reviewed': return '#3b82f6'
            case 'accepted': return '#22c55e'
            case 'rejected': return '#ef4444'
            default: return '#888'
        }
    }

    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'N/A'
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    if (loading) {
        return (
            <div className="manage-recruitments-page">
                <div className="manage-recruitments-loading">
                    <div className="loading-spinner" />
                    <span>Verifying access...</span>
                </div>
            </div>
        )
    }

    if (!authorized) {
        return null
    }

    return (
        <div className="manage-recruitments-page">
            <div className="manage-recruitments-content">
                <div className="manage-header">
                    <button
                        className="back-btn"
                        onClick={() => navigate('/user-dashboard')}
                    >
                        ← Back
                    </button>
                    <div className="header-row">
                        <div>
                            <h1 className="manage-title">Manage Recruitments</h1>
                            <p className="manage-subtitle">
                                {applications.length} application{applications.length !== 1 ? 's' : ''} received
                            </p>
                        </div>
                        <button className="export-btn" onClick={handleExport}>
                            Export to Excel
                        </button>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="filter-tabs">
                    {(['all', 'pending', 'reviewed', 'accepted', 'rejected'] as const).map(status => (
                        <button
                            key={status}
                            className={`filter-tab ${filter === status ? 'active' : ''}`}
                            onClick={() => setFilter(status)}
                        >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                            <span className="tab-count">
                                {status === 'all'
                                    ? applications.length
                                    : applications.filter(a => a.status === status).length
                                }
                            </span>
                        </button>
                    ))}
                </div>

                <div className="applications-layout">
                    {/* Applications List */}
                    <div className="applications-list">
                        {filteredApplications.length === 0 ? (
                            <div className="no-applications">
                                <p>No {filter !== 'all' ? filter : ''} applications found</p>
                            </div>
                        ) : (
                            filteredApplications.map(app => (
                                <div
                                    key={app.id}
                                    className={`application-card ${selectedApplication?.id === app.id ? 'selected' : ''}`}
                                    onClick={() => setSelectedApplication(app)}
                                >
                                    <div className="app-card-header">
                                        <span className="app-name">{app.name}</span>
                                        <span
                                            className="app-status"
                                            style={{ backgroundColor: getStatusColor(app.status) }}
                                        >
                                            {app.status}
                                        </span>
                                    </div>
                                    <div className="app-synapse-id">{app.synapseId}</div>
                                    <div className="app-card-info">
                                        <span>{app.department}</span>
                                        <span>•</span>
                                        <span>{app.class} - {app.division}</span>
                                    </div>
                                    <div className="app-card-teams">
                                        {app.selectedTeams.slice(0, 2).map((team, i) => (
                                            <span key={i} className="team-tag">{team}</span>
                                        ))}
                                        {app.selectedTeams.length > 2 && (
                                            <span className="team-more">+{app.selectedTeams.length - 2}</span>
                                        )}
                                    </div>
                                    <div className="app-card-date">
                                        {formatDate(app.submittedAt)}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Application Details */}
                    <div className="application-details">
                        {selectedApplication ? (
                            <>
                                <div className="details-header">
                                    <div>
                                        <h2>{selectedApplication.name}</h2>
                                        <span className="details-synapse-id">{selectedApplication.synapseId}</span>
                                    </div>
                                    <span
                                        className="details-status"
                                        style={{ backgroundColor: getStatusColor(selectedApplication.status) }}
                                    >
                                        {selectedApplication.status}
                                    </span>
                                </div>

                                <div className="details-section">
                                    <h4>Contact Information</h4>
                                    <div className="details-grid">
                                        <div className="detail-item">
                                            <label>Email</label>
                                            <span>{selectedApplication.email}</span>
                                        </div>
                                        <div className="detail-item">
                                            <label>Contact</label>
                                            <span>{selectedApplication.contact}</span>
                                        </div>
                                        <div className="detail-item">
                                            <label>WhatsApp</label>
                                            <span>{selectedApplication.whatsapp}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="details-section">
                                    <h4>Academic Details</h4>
                                    <div className="details-grid">
                                        <div className="detail-item">
                                            <label>ZPRN</label>
                                            <span>{selectedApplication.zprnNumber}</span>
                                        </div>
                                        <div className="detail-item">
                                            <label>Department</label>
                                            <span>{selectedApplication.department}</span>
                                        </div>
                                        <div className="detail-item">
                                            <label>Class</label>
                                            <span>{selectedApplication.class} - {selectedApplication.division}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="details-section">
                                    <h4>Team Preferences (Priority Order)</h4>
                                    <div className="team-preferences">
                                        {selectedApplication.selectedTeams.map((team, i) => (
                                            <div key={i} className="team-pref">
                                                <span className="pref-number">#{i + 1}</span>
                                                <span>{team}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="details-section">
                                    <h4>Role Applied</h4>
                                    <p className="role-text">{selectedApplication.role}</p>
                                </div>

                                <div className="details-section">
                                    <h4>Skills</h4>
                                    <p className="skills-text">{selectedApplication.skills}</p>
                                </div>

                                <div className="details-section">
                                    <h4>Why They Can Contribute</h4>
                                    <p className="contribution-text">{selectedApplication.contribution}</p>
                                </div>

                                {selectedApplication.remark && (
                                    <div className="details-section">
                                        <h4>Admin Remark</h4>
                                        <p className="remark-display">{selectedApplication.remark}</p>
                                    </div>
                                )}

                                <div className="details-section">
                                    <h4>Submitted</h4>
                                    <p>{formatDate(selectedApplication.submittedAt)}</p>
                                </div>

                                {/* Action Buttons */}
                                <div className="details-actions">
                                    <button
                                        className="action-btn accept"
                                        onClick={() => handleStatusChange(selectedApplication.id!, 'accepted')}
                                        disabled={updating === selectedApplication.id || selectedApplication.status === 'accepted'}
                                    >
                                        Accept
                                    </button>
                                    <button
                                        className="action-btn reject"
                                        onClick={() => handleRejectClick(selectedApplication.id!)}
                                        disabled={updating === selectedApplication.id || selectedApplication.status === 'rejected'}
                                    >
                                        Reject
                                    </button>
                                    <button
                                        className="action-btn review"
                                        onClick={() => handleStatusChange(selectedApplication.id!, 'reviewed')}
                                        disabled={updating === selectedApplication.id || selectedApplication.status === 'reviewed'}
                                    >
                                        Mark Reviewed
                                    </button>
                                    {selectedApplication.status !== 'accepted' && (
                                        <button
                                            className="action-btn delete"
                                            onClick={() => handleDelete(selectedApplication.id!)}
                                            disabled={updating === selectedApplication.id}
                                        >
                                            Delete
                                        </button>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="no-selection">
                                <p>Select an application to view details</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Reject Remark Modal */}
            {showRemarkModal && (
                <div className="modal-overlay" onClick={() => setShowRemarkModal(false)}>
                    <div className="remark-modal" onClick={e => e.stopPropagation()}>
                        <h3>Reject Application</h3>
                        <p>Add a remark for the applicant (optional):</p>
                        <textarea
                            value={rejectRemark}
                            onChange={e => setRejectRemark(e.target.value)}
                            placeholder="e.g., Please reapply next semester..."
                            rows={3}
                        />
                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={() => setShowRemarkModal(false)}>
                                Cancel
                            </button>
                            <button className="confirm-btn" onClick={confirmReject}>
                                Reject Application
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
