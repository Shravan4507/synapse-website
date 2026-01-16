import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePageVisibility } from '../../context/PageVisibilityContext'
import { onAuthChange } from '../../lib/auth'
import { getUserOrAdminDocument } from '../../lib/userService'
import { getApplicationBySynapseId, deleteOwnApplication, type RecruitmentApplication } from '../../lib/applicationService'
import './Join.css'
import ApplicationForm from './ApplicationForm'

// Check if college name is Zeal College
const isZealCollege = (college: string): boolean => {
    if (!college) return false
    const c = college.toLowerCase()
    return c.includes('zeal') && (c.includes('engineering') || c.includes('college') || c.includes('pune') || c.includes('zcoer'))
}

interface UserData {
    synapseId: string
    fullName: string
    email: string
    mobileNumber: string
    college: string
}

export default function Join() {
    const navigate = useNavigate()
    const { settings: pageVisibility, loading: visibilityLoading } = usePageVisibility()

    // States
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [userData, setUserData] = useState<UserData | null>(null)
    const [application, setApplication] = useState<RecruitmentApplication | null>(null)
    const [isZealStudent, setIsZealStudent] = useState(true)
    const [actionLoading, setActionLoading] = useState(false)

    // Load user data and check for existing application
    useEffect(() => {
        const unsubscribe = onAuthChange(async (user) => {
            if (!user) {
                setUserData(null)
                setApplication(null)
                setLoading(false)
                return
            }

            const { data: doc } = await getUserOrAdminDocument(user.uid)
            if (doc) {
                // Set user data
                setUserData({
                    synapseId: doc.synapseId,
                    fullName: `${doc.firstName} ${doc.lastName}`,
                    email: doc.email,
                    mobileNumber: doc.mobileNumber,
                    college: doc.college
                })

                // Check if Zeal student
                setIsZealStudent(isZealCollege(doc.college))

                // Check for existing application
                const app = await getApplicationBySynapseId(doc.synapseId)
                setApplication(app)
            }
            setLoading(false)
        })

        return () => unsubscribe()
    }, [])

    // Refetch application after form closes
    const refetchApplication = async () => {
        if (userData) {
            const app = await getApplicationBySynapseId(userData.synapseId)
            setApplication(app)
        }
    }

    // Handle form close
    const handleFormClose = async () => {
        setShowForm(false)
        await refetchApplication()
    }

    // Handle apply click
    const handleApply = () => {
        if (!userData) {
            navigate('/user-login')
            return
        }
        setShowForm(true)
    }

    // Handle withdraw
    const handleWithdraw = async () => {
        if (!application || !userData) return
        if (!confirm('Withdraw your application?')) return

        setActionLoading(true)
        await deleteOwnApplication(application.id!, userData.synapseId)
        setApplication(null)
        setActionLoading(false)
    }

    // Handle re-apply (delete rejected app and open form)
    const handleReapply = async () => {
        if (!application || !userData) return

        setActionLoading(true)
        await deleteOwnApplication(application.id!, userData.synapseId)
        setApplication(null)
        setActionLoading(false)
        setShowForm(true)
    }

    // Status color helper
    const statusColor = (status: string) => {
        const colors: Record<string, string> = {
            pending: '#ffa500',
            reviewed: '#3b82f6',
            accepted: '#22c55e',
            rejected: '#ef4444'
        }
        return colors[status] || '#888'
    }

    // Loading state
    if (loading || visibilityLoading) {
        return (
            <div className="join-page">
                <div className="join-content">
                    <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>Loading...</p>
                </div>
            </div>
        )
    }

    // Recruitments closed
    if (!pageVisibility.recruitments) {
        return (
            <div className="join-page">
                <div className="join-content">
                    <div className="page-unavailable">
                        <h1 className="unavailable-title">Recruitments Closed</h1>
                        <p className="unavailable-message">We're not accepting new applications at this time.</p>
                        <p className="unavailable-hint">Check back later or follow us on social media for updates.</p>
                    </div>
                </div>
            </div>
        )
    }

    // Not a Zeal student
    if (userData && !isZealStudent) {
        return (
            <div className="join-page">
                <div className="join-content">
                    <div className="page-unavailable">
                        <h1 className="unavailable-title">College Restricted</h1>
                        <p className="unavailable-message">Applications are only open for students of Zeal College of Engineering and Research, Pune.</p>
                        <p className="unavailable-hint">If you believe this is an error, please contact us.</p>
                    </div>
                </div>
            </div>
        )
    }

    // Main view
    const hasApplication = application !== null

    return (
        <div className="join-page">
            <div className="join-content">
                <h1 className="join-heading">Wanna be Part of Team?</h1>

                {/* Apply Button */}
                <button
                    className={`apply-now-btn ${hasApplication ? 'disabled' : ''}`}
                    onClick={hasApplication ? undefined : handleApply}
                    disabled={hasApplication}
                >
                    {hasApplication ? 'Already Applied' : 'Apply Now'}
                </button>

                {/* Application Status Table */}
                {hasApplication && (
                    <div className="application-status-container">
                        <h3 className="status-table-title">Your Application Status</h3>
                        <div className="status-table">
                            <div className="status-table-header">
                                <div className="status-col">Application ID</div>
                                <div className="status-col">Status</div>
                                <div className="status-col">Remark</div>
                                <div className="status-col">Action</div>
                            </div>
                            <div className="status-table-row">
                                <div className="status-col">
                                    <span className="app-id">{application.synapseId}</span>
                                </div>
                                <div className="status-col">
                                    <span className="status-badge" style={{ backgroundColor: statusColor(application.status) }}>
                                        {application.status.toUpperCase()}
                                    </span>
                                </div>
                                <div className="status-col">
                                    <span className="remark-text">
                                        {application.remark ||
                                            (application.status === 'pending' ? 'Under review' :
                                                application.status === 'accepted' ? 'Our Team will Contact Soon' : '-')}
                                    </span>
                                </div>
                                <div className="status-col">
                                    {application.status === 'rejected' && (
                                        <button className="action-btn reapply" onClick={handleReapply} disabled={actionLoading}>
                                            {actionLoading ? '...' : 'Re-Apply'}
                                        </button>
                                    )}
                                    {application.status === 'pending' && (
                                        <button className="action-btn delete" onClick={handleWithdraw} disabled={actionLoading}>
                                            {actionLoading ? '...' : 'Withdraw'}
                                        </button>
                                    )}
                                    {application.status === 'accepted' && (
                                        <span className="no-action">-</span>
                                    )}
                                    {application.status === 'reviewed' && (
                                        <span className="no-action">-</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Application Form Modal */}
            {showForm && userData && (
                <ApplicationForm
                    onClose={handleFormClose}
                    synapseId={userData.synapseId}
                    userName={userData.fullName}
                    userEmail={userData.email}
                    userContact={userData.mobileNumber}
                    userCollege={userData.college}
                />
            )}
        </div>
    )
}
