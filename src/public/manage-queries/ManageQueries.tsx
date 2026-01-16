import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { onAuthChange } from '../../lib/auth'
import { getAdminDocument } from '../../lib/userService'
import {
    getAllQueries,
    updateQueryStatus,
    deleteQuery,
    type ContactQuery,
    type QueryStatus
} from '../../lib/queryService'
import './ManageQueries.css'

export default function ManageQueries() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [authorized, setAuthorized] = useState(false)
    const [queries, setQueries] = useState<ContactQuery[]>([])
    const [selectedQuery, setSelectedQuery] = useState<ContactQuery | null>(null)
    const [filter, setFilter] = useState<QueryStatus | 'all'>('all')
    const [updating, setUpdating] = useState<string | null>(null)
    const [adminUid, setAdminUid] = useState('')

    // Check authorization using auth state observer
    useEffect(() => {
        const unsubscribe = onAuthChange(async (user) => {
            if (!user) {
                navigate('/user-login?returnTo=/manage-queries')
                return
            }

            const admin = await getAdminDocument(user.uid)

            if (!admin || !admin.permissions?.includes('manage_queries')) {
                navigate('/user-dashboard')
                return
            }

            setAdminUid(user.uid)
            setAuthorized(true)
            await fetchQueries()
            setLoading(false)
        })

        return () => unsubscribe()
    }, [navigate])

    const fetchQueries = async () => {
        const data = await getAllQueries()
        setQueries(data)
    }

    const handleStatusChange = async (queryId: string, newStatus: QueryStatus) => {
        setUpdating(queryId)
        const result = await updateQueryStatus(queryId, newStatus, adminUid)

        if (result.success) {
            setQueries(prev =>
                prev.map(q =>
                    q.id === queryId
                        ? { ...q, status: newStatus }
                        : q
                )
            )
            if (selectedQuery?.id === queryId) {
                setSelectedQuery(prev => prev ? { ...prev, status: newStatus } : null)
            }
        }
        setUpdating(null)
    }

    const handleDelete = async (queryId: string) => {
        if (!confirm('Permanently delete this query?')) return

        setUpdating(queryId)
        const result = await deleteQuery(queryId)

        if (result.success) {
            setQueries(prev => prev.filter(q => q.id !== queryId))
            if (selectedQuery?.id === queryId) {
                setSelectedQuery(null)
            }
        }
        setUpdating(null)
    }

    const filteredQueries = filter === 'all'
        ? queries
        : queries.filter(q => q.status === filter)

    const getStatusColor = (status: QueryStatus) => {
        switch (status) {
            case 'unread': return '#ffa500'
            case 'read': return '#3b82f6'
            case 'replied': return '#22c55e'
            case 'archived': return '#888'
            default: return '#888'
        }
    }

    const formatDate = (timestamp: ContactQuery['submittedAt']) => {
        if (!timestamp) return 'N/A'
        return timestamp.toDate().toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    if (loading) {
        return (
            <div className="manage-queries-page">
                <div className="loading-state">Loading...</div>
            </div>
        )
    }

    if (!authorized) {
        return (
            <div className="manage-queries-page">
                <div className="loading-state">Unauthorized</div>
            </div>
        )
    }

    return (
        <div className="manage-queries-page">
            <div className="manage-queries-container">
                {/* Header */}
                <div className="queries-header">
                    <button className="back-btn" onClick={() => navigate('/user-dashboard')}>
                        ← Back
                    </button>
                    <div className="header-row">
                        <div>
                            <h1 className="manage-title">Manage Queries</h1>
                            <p className="manage-subtitle">
                                {queries.length} quer{queries.length !== 1 ? 'ies' : 'y'} received
                            </p>
                        </div>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="filter-tabs">
                    {(['all', 'unread', 'read', 'replied', 'archived'] as const).map(status => (
                        <button
                            key={status}
                            className={`filter-tab ${filter === status ? 'active' : ''}`}
                            onClick={() => setFilter(status)}
                        >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                            <span className="tab-count">
                                {status === 'all'
                                    ? queries.length
                                    : queries.filter(q => q.status === status).length
                                }
                            </span>
                        </button>
                    ))}
                </div>

                {/* Main Content */}
                <div className="queries-content">
                    {/* Queries List */}
                    <div className="queries-list">
                        {filteredQueries.length === 0 ? (
                            <div className="empty-state">No queries found</div>
                        ) : (
                            filteredQueries.map(query => (
                                <div
                                    key={query.id}
                                    className={`query-card ${selectedQuery?.id === query.id ? 'selected' : ''} ${query.status === 'unread' ? 'unread' : ''}`}
                                    onClick={() => {
                                        setSelectedQuery(query)
                                        // Auto-mark as read when opened
                                        if (query.status === 'unread') {
                                            handleStatusChange(query.id!, 'read')
                                        }
                                    }}
                                >
                                    <div className="query-card-header">
                                        <span className="query-name">{query.name || 'Anonymous'}</span>
                                        <span
                                            className="status-dot"
                                            style={{ backgroundColor: getStatusColor(query.status) }}
                                        />
                                    </div>
                                    <div className="query-email">{query.email}</div>
                                    <div className="query-subject">{query.subject}</div>
                                    <div className="query-date">{formatDate(query.submittedAt)}</div>
                                    {query.queryCount && query.queryCount > 1 && (
                                        <div className="query-count-badge">
                                            {query.queryCount} messages
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Query Details */}
                    <div className="query-details">
                        {selectedQuery ? (
                            <>
                                <div className="details-header">
                                    <h2>{selectedQuery.subject}</h2>
                                    <span
                                        className="status-badge"
                                        style={{ backgroundColor: getStatusColor(selectedQuery.status) }}
                                    >
                                        {selectedQuery.status.toUpperCase()}
                                    </span>
                                </div>

                                <div className="details-meta">
                                    <div className="meta-item">
                                        <span className="meta-label">From:</span>
                                        <span className="meta-value">{selectedQuery.name || 'Anonymous'}</span>
                                    </div>
                                    <div className="meta-item">
                                        <span className="meta-label">Email:</span>
                                        <a href={`mailto:${selectedQuery.email}`} className="meta-value email-link">
                                            {selectedQuery.email}
                                        </a>
                                    </div>
                                    <div className="meta-item">
                                        <span className="meta-label">Received:</span>
                                        <span className="meta-value">{formatDate(selectedQuery.submittedAt)}</span>
                                    </div>
                                </div>

                                <div className="details-message">
                                    <h3>Message</h3>
                                    <div className="message-content">
                                        {selectedQuery.message.split('\n').map((line, i) => (
                                            <p key={i}>{line || <br />}</p>
                                        ))}
                                    </div>
                                </div>

                                <div className="details-actions">
                                    <a
                                        href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(selectedQuery.email)}&su=${encodeURIComponent('Re: ' + selectedQuery.subject)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="action-btn reply"
                                        onClick={() => {
                                            if (selectedQuery.status !== 'replied') {
                                                handleStatusChange(selectedQuery.id!, 'replied')
                                            }
                                        }}
                                    >
                                        Reply via Gmail
                                    </a>
                                    <button
                                        className="action-btn archive"
                                        onClick={() => handleStatusChange(selectedQuery.id!, 'archived')}
                                        disabled={updating === selectedQuery.id || selectedQuery.status === 'archived'}
                                    >
                                        Archive
                                    </button>
                                    <button
                                        className="action-btn delete"
                                        onClick={() => handleDelete(selectedQuery.id!)}
                                        disabled={updating === selectedQuery.id}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="no-selection">
                                <p>Select a query to view details</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
