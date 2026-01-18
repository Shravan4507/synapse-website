import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { onAuthChange } from '../../lib/auth'
import { getAdminDocument } from '../../lib/userService'
import {
    type DayPass,
    getDayPasses,
    saveDayPass
} from '../../lib/dayPassService'
import {
    type DayPassRegistration,
    getAllDayPassRegistrations,
    deleteDayPassRegistration,
    updateDayPassStatus,
    updateDayPassPaymentStatus,
    exportDayPassRegistrationsToCSV,
    downloadDayPassCSV,
    getDayPassRegistrationStats
} from '../../lib/dayPassRegistrationService'
import { uploadImages } from '../../lib/imageStorage'
import './ManageEvents.css'

type OverlayType = 'none' | 'dayCards'
type TabType = 'events' | 'registrations'

export default function ManageEvents() {
    const navigate = useNavigate()

    // Auth state
    const [loading, setLoading] = useState(true)

    // Tab state
    const [activeTab, setActiveTab] = useState<TabType>('events')

    // Data state
    const [dayPasses, setDayPasses] = useState<DayPass[]>([])
    const [dayPassRegistrations, setDayPassRegistrations] = useState<DayPassRegistration[]>([])

    // UI state
    const [activeOverlay, setActiveOverlay] = useState<OverlayType>('none')
    const [viewingDayPassReg, setViewingDayPassReg] = useState<DayPassRegistration | null>(null)

    // Day Pass form state
    const [dayPassForms, setDayPassForms] = useState<{
        [key: number]: { images: string[]; price: number; events: string; capacity: number; isActive: boolean }
    }>({
        1: { images: [], price: 150, events: '', capacity: 0, isActive: true },
        2: { images: [], price: 100, events: '', capacity: 0, isActive: true },
        3: { images: [], price: 50, events: '', capacity: 0, isActive: true }
    })
    const [dayPassSaving, setDayPassSaving] = useState(false)
    const dayPassImageRefs = useRef<{ [key: number]: HTMLInputElement | null }>({})
    const [dayPassImageUploading, setDayPassImageUploading] = useState<number | null>(null)
    const [dragActive, setDragActive] = useState<number | null>(null)

    // ========================================
    // DATA FETCHING
    // ========================================

    const fetchData = async () => {
        const [dayPassesData, dayPassRegsData] = await Promise.all([
            getDayPasses(),
            getAllDayPassRegistrations()
        ])
        setDayPasses(dayPassesData)
        setDayPassRegistrations(dayPassRegsData)

        // Populate day pass forms with existing data
        const formData: { [key: number]: { images: string[]; price: number; events: string; capacity: number; isActive: boolean } } = {
            1: { images: [], price: 150, events: '', capacity: 0, isActive: true },
            2: { images: [], price: 100, events: '', capacity: 0, isActive: true },
            3: { images: [], price: 50, events: '', capacity: 0, isActive: true }
        }
        dayPassesData.forEach(pass => {
            // Handle both legacy single image and new images array
            const images = pass.images?.length > 0
                ? pass.images
                : (pass.image ? [pass.image] : [])

            formData[pass.day] = {
                images,
                price: pass.price,
                events: pass.events.join('\n'),
                capacity: pass.capacity || 0,
                isActive: pass.isActive
            }
        })
        setDayPassForms(formData)
    }

    // Check authorization
    useEffect(() => {
        const unsubscribe = onAuthChange(async (user) => {
            if (!user) {
                navigate('/user-login?returnTo=/manage-events')
                return
            }

            const admin = await getAdminDocument(user.uid)

            if (!admin || !admin.permissions?.includes('manage_events')) {
                navigate('/user-dashboard')
                return
            }

            await fetchData()
            setLoading(false)
        })

        return () => unsubscribe()
    }, [navigate])

    // ========================================
    // DAY PASS HANDLERS
    // ========================================

    const handleDayPassImageUpload = async (day: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return

        setDayPassImageUploading(day)
        const result = await uploadImages(Array.from(files), 'day-passes')
        setDayPassImageUploading(null)

        if (result.urls.length > 0) {
            setDayPassForms(prev => ({
                ...prev,
                [day]: { ...prev[day], images: [...prev[day].images, ...result.urls] }
            }))
        }

        // Reset input
        if (dayPassImageRefs.current[day]) {
            dayPassImageRefs.current[day]!.value = ''
        }
    }

    const handleDayPassImageDrop = async (day: number, e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setDragActive(null)

        const files = e.dataTransfer.files
        if (!files || files.length === 0) return

        setDayPassImageUploading(day)
        const result = await uploadImages(Array.from(files), 'day-passes')
        setDayPassImageUploading(null)

        if (result.urls.length > 0) {
            setDayPassForms(prev => ({
                ...prev,
                [day]: { ...prev[day], images: [...prev[day].images, ...result.urls] }
            }))
        }
    }

    const handleRemoveDayPassImage = (day: number, index: number) => {
        setDayPassForms(prev => ({
            ...prev,
            [day]: { ...prev[day], images: prev[day].images.filter((_, i) => i !== index) }
        }))
    }

    const handleDayPassFormChange = (day: number, field: string, value: string | number | boolean | string[]) => {
        setDayPassForms(prev => ({
            ...prev,
            [day]: { ...prev[day], [field]: value }
        }))
    }

    const handleSaveDayPasses = async () => {
        setDayPassSaving(true)

        for (const day of [1, 2, 3]) {
            const form = dayPassForms[day]
            const eventsArray = form.events
                .split('\n')
                .map(e => e.trim())
                .filter(e => e.length > 0)

            await saveDayPass({
                day,
                images: form.images,
                price: form.price,
                events: eventsArray,
                capacity: form.capacity,
                isActive: form.isActive
            })
        }

        setDayPassSaving(false)
        setActiveOverlay('none')
        await fetchData()
    }

    // ========================================
    // RENDER
    // ========================================

    if (loading) {
        return (
            <div className="manage-events-page">
                <div className="loading-state">Loading...</div>
            </div>
        )
    }

    return (
        <div className="manage-events-page">
            <div className="manage-events-content">
                {/* Header */}
                <div className="events-header">
                    <button className="back-btn" onClick={() => navigate('/user-dashboard')}>
                        ← Back
                    </button>
                    <h1 className="manage-title">Manage Day Passes</h1>
                    <p className="manage-subtitle">
                        3 day passes • {dayPassRegistrations.length} registration{dayPassRegistrations.length !== 1 ? 's' : ''}
                    </p>
                </div>

                {/* Tabs */}
                <div className="tab-buttons">
                    <button
                        className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`}
                        onClick={() => setActiveTab('events')}
                    >
                        Days
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'registrations' ? 'active' : ''}`}
                        onClick={() => setActiveTab('registrations')}
                    >
                        Registrations ({dayPassRegistrations.length})
                    </button>
                </div>

                {/* EVENTS TAB */}
                {activeTab === 'events' && (
                    <>
                        {/* Action Buttons */}
                        <div className="action-buttons">
                            <button
                                className="action-btn primary"
                                onClick={() => setActiveOverlay('dayCards')}
                            >
                                🎫 Manage Day Cards
                            </button>
                        </div>

                        {/* Existing Days List */}
                        <div className="events-list">
                            <h2>Existing Days</h2>
                            <div className="events-grid">
                                {[1, 2, 3].map(dayNum => {
                                    const dayPass = dayPasses.find(dp => dp.day === dayNum)
                                    const form = dayPassForms[dayNum]
                                    const regCount = dayPassRegistrations.filter(r =>
                                        r.selectedDays?.includes(dayNum)
                                    ).length

                                    return (
                                        <div
                                            key={dayNum}
                                            className={`event-list-card clickable-card ${!form?.isActive ? 'inactive' : ''}`}
                                            onClick={() => setActiveOverlay('dayCards')}
                                            style={{ '--accent-color': dayNum === 1 ? '#FF6B35' : dayNum === 2 ? '#00D4FF' : '#7AFF32' } as React.CSSProperties}
                                        >
                                            <div className="event-list-header">
                                                <span className="event-list-icon">
                                                    {dayNum === 1 ? '🌅' : dayNum === 2 ? '☀️' : '🌙'}
                                                </span>
                                                <span
                                                    className="event-list-price"
                                                    style={{
                                                        background: dayNum === 1 ? '#FF6B3520' : dayNum === 2 ? '#00D4FF20' : '#7AFF3220',
                                                        color: dayNum === 1 ? '#FF6B35' : dayNum === 2 ? '#00D4FF' : '#7AFF32'
                                                    }}
                                                >
                                                    ₹{form?.price || (dayNum === 1 ? 150 : dayNum === 2 ? 100 : 50)}
                                                </span>
                                            </div>
                                            <h3 className="event-list-name">Day {dayNum}</h3>
                                            <p className="event-list-desc">
                                                {form?.events || dayPass?.events?.join(', ') || 'Events not specified yet'}
                                            </p>
                                            {form?.images && form.images.length > 0 && (
                                                <div className="day-pass-thumbnail">
                                                    <img src={form.images[0]} alt={`Day ${dayNum}`} />
                                                </div>
                                            )}
                                            <div className="event-registrations-count">
                                                {regCount} registration{regCount !== 1 ? 's' : ''}
                                            </div>
                                            {!form?.isActive && (
                                                <span className="inactive-badge">Inactive</span>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </>
                )}

                {/* REGISTRATIONS TAB */}
                {activeTab === 'registrations' && (
                    <div className="registrations-dashboard">
                        {/* ================================
                            DAY PASS REGISTRATIONS SECTION
                           ================================ */}
                        <div className="registrations-section">
                            <div className="section-header">
                                <h3>🎫 Day Pass Registrations</h3>
                                <button
                                    className="export-btn"
                                    onClick={() => {
                                        const csv = exportDayPassRegistrationsToCSV(dayPassRegistrations)
                                        downloadDayPassCSV(csv, 'day-pass-registrations.csv')
                                    }}
                                    disabled={dayPassRegistrations.length === 0}
                                >
                                    📥 Export CSV
                                </button>
                            </div>

                            {/* Day Pass Stats */}
                            {(() => {
                                const dpStats = getDayPassRegistrationStats(dayPassRegistrations)
                                return (
                                    <div className="stats-grid">
                                        <div className="stat-card">
                                            <span className="stat-value">{dpStats.total}</span>
                                            <span className="stat-label">Total</span>
                                        </div>
                                        <div className="stat-card pending">
                                            <span className="stat-value">{dpStats.pending}</span>
                                            <span className="stat-label">Pending</span>
                                        </div>
                                        <div className="stat-card approved">
                                            <span className="stat-value">{dpStats.approved}</span>
                                            <span className="stat-label">Approved</span>
                                        </div>
                                        <div className="stat-card revenue">
                                            <span className="stat-value">₹{dpStats.totalRevenue}</span>
                                            <span className="stat-label">Revenue</span>
                                        </div>
                                    </div>
                                )
                            })()}

                            {/* Day Pass List */}
                            <div className="registrations-list">
                                {dayPassRegistrations.length === 0 ? (
                                    <p className="empty-state">No day pass registrations yet.</p>
                                ) : (
                                    <div className="registrations-table">
                                        <div className="table-scroll">
                                            <table>
                                                <thead>
                                                    <tr>
                                                        <th>Synapse ID</th>
                                                        <th>Name</th>
                                                        <th>Email</th>
                                                        <th>Days</th>
                                                        <th>College</th>
                                                        <th>Amount</th>
                                                        <th>Status</th>
                                                        <th></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {dayPassRegistrations.map(reg => (
                                                        <tr
                                                            key={reg.id}
                                                            onClick={() => setViewingDayPassReg(reg)}
                                                        >
                                                            <td className="cell-id">{reg.synapseId}</td>
                                                            <td className="cell-name">{reg.userName}</td>
                                                            <td className="cell-muted">{reg.email}</td>
                                                            <td>
                                                                <span className="cell-days">
                                                                    {reg.selectedDays.map(d => (
                                                                        <span key={d} className="day-chip">D{d}</span>
                                                                    ))}
                                                                </span>
                                                            </td>
                                                            <td className="cell-muted">{reg.college}</td>
                                                            <td className="cell-amount">₹{reg.totalAmount}</td>
                                                            <td>
                                                                <span className={`status-pill ${reg.status}`}>{reg.status}</span>
                                                            </td>
                                                            <td onClick={e => e.stopPropagation()}>
                                                                <button
                                                                    className="delete-btn"
                                                                    onClick={async () => {
                                                                        if (confirm('Delete this registration?')) {
                                                                            await deleteDayPassRegistration(reg.id!)
                                                                            fetchData()
                                                                        }
                                                                    }}
                                                                >
                                                                    🗑️
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ================================================
                DAY CARDS OVERLAY
               ================================================ */}
            {activeOverlay === 'dayCards' && (
                <div className="overlay" onClick={() => setActiveOverlay('none')}>
                    <div className="overlay-content day-cards-overlay" onClick={e => e.stopPropagation()}>
                        <button className="close-overlay" onClick={() => setActiveOverlay('none')}>×</button>

                        <h2 className="form-title">Manage Day Pass Cards</h2>
                        <p className="form-subtitle">Configure the day passes shown on the Events page</p>

                        <div className="day-cards-grid">
                            {[1, 2, 3].map(day => (
                                <div key={day} className="day-card-form">
                                    <h3>Day {day}</h3>

                                    {/* Images */}
                                    <div className="form-group">
                                        <label>Images (drag & drop or click to upload)</label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            ref={el => { dayPassImageRefs.current[day] = el }}
                                            onChange={e => handleDayPassImageUpload(day, e)}
                                            style={{ display: 'none' }}
                                        />

                                        {/* Drag & Drop Zone */}
                                        <div
                                            className={`image-drop-zone ${dragActive === day ? 'drag-active' : ''}`}
                                            onClick={() => dayPassImageRefs.current[day]?.click()}
                                            onDragOver={e => { e.preventDefault(); setDragActive(day) }}
                                            onDragLeave={() => setDragActive(null)}
                                            onDrop={e => handleDayPassImageDrop(day, e)}
                                        >
                                            {dayPassImageUploading === day ? (
                                                <span className="uploading-text">⏳ Uploading...</span>
                                            ) : (
                                                <>
                                                    <span className="drop-icon">📷</span>
                                                    <span className="drop-text">Drop images here or click to upload</span>
                                                    <span className="drop-hint">Supports multiple images</span>
                                                </>
                                            )}
                                        </div>

                                        {/* Image Gallery */}
                                        {dayPassForms[day]?.images?.length > 0 && (
                                            <div className="image-gallery">
                                                {dayPassForms[day].images.map((img, idx) => (
                                                    <div key={idx} className="gallery-item">
                                                        <img src={img} alt={`Day ${day} image ${idx + 1}`} />
                                                        <button
                                                            type="button"
                                                            className="remove-image-btn"
                                                            onClick={() => handleRemoveDayPassImage(day, idx)}
                                                        >
                                                            ×
                                                        </button>
                                                        {idx === 0 && <span className="primary-badge">Primary</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Price */}
                                    <div className="form-group">
                                        <label>Price (₹)</label>
                                        <input
                                            type="number"
                                            value={dayPassForms[day]?.price || 0}
                                            onChange={e => handleDayPassFormChange(day, 'price', Number(e.target.value))}
                                            min="0"
                                        />
                                    </div>

                                    {/* Capacity */}
                                    <div className="form-group">
                                        <label>Capacity (0 = unlimited)</label>
                                        <input
                                            type="number"
                                            value={dayPassForms[day]?.capacity || 0}
                                            onChange={e => handleDayPassFormChange(day, 'capacity', Number(e.target.value))}
                                            min="0"
                                            placeholder="e.g., 500"
                                        />
                                        {dayPassForms[day]?.capacity > 0 && (
                                            <span className="capacity-hint">
                                                {dayPassRegistrations.filter(r => r.selectedDays?.includes(day)).length} / {dayPassForms[day].capacity} seats filled
                                            </span>
                                        )}
                                    </div>

                                    {/* Events */}
                                    <div className="form-group">
                                        <label>Events (one per line)</label>
                                        <textarea
                                            value={dayPassForms[day]?.events || ''}
                                            onChange={e => handleDayPassFormChange(day, 'events', e.target.value)}
                                            placeholder="Opening Ceremony&#10;Tech Talks&#10;Workshops"
                                            rows={4}
                                        />
                                    </div>

                                    {/* Active Toggle */}
                                    <div className="form-group checkbox-group">
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={dayPassForms[day]?.isActive ?? true}
                                                onChange={e => handleDayPassFormChange(day, 'isActive', e.target.checked)}
                                            />
                                            Active
                                        </label>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button
                            className="submit-btn"
                            onClick={handleSaveDayPasses}
                            disabled={dayPassSaving || dayPassImageUploading !== null}
                        >
                            {dayPassSaving ? 'Saving...' : 'Save All Day Passes'}
                        </button>
                    </div>
                </div>
            )}

            {/* ================================================
                VIEW DAY PASS REGISTRATION OVERLAY
               ================================================ */}
            {viewingDayPassReg && (
                <div className="overlay" onClick={() => setViewingDayPassReg(null)}>
                    <div className="overlay-content registration-details" onClick={e => e.stopPropagation()}>
                        <button className="close-overlay" onClick={() => setViewingDayPassReg(null)}>×</button>

                        <h2 className="form-title">🎫 Day Pass Details</h2>

                        <div className="details-grid">
                            <div className="detail-row">
                                <label>Synapse ID</label>
                                <span className="synapse-id-badge">{viewingDayPassReg.synapseId}</span>
                            </div>
                            <div className="detail-row">
                                <label>Name</label>
                                <span>{viewingDayPassReg.userName}</span>
                            </div>
                            <div className="detail-row">
                                <label>Email</label>
                                <span>{viewingDayPassReg.email}</span>
                            </div>
                            <div className="detail-row">
                                <label>Phone</label>
                                <span>{viewingDayPassReg.phone}</span>
                            </div>
                            <div className="detail-row">
                                <label>College</label>
                                <span>{viewingDayPassReg.college}</span>
                            </div>
                            <div className="detail-row">
                                <label>Selected Days</label>
                                <span className="days-badge">
                                    {viewingDayPassReg.selectedDays.map(d => `Day ${d}`).join(', ')}
                                </span>
                            </div>
                            <div className="detail-row">
                                <label>Total Amount</label>
                                <span>₹{viewingDayPassReg.totalAmount}</span>
                            </div>
                            <div className="detail-row">
                                <label>Gov ID (Last 4)</label>
                                <span>{viewingDayPassReg.governmentIdLast4}</span>
                            </div>
                            <div className="detail-row">
                                <label>Registered At</label>
                                <span>{viewingDayPassReg.createdAt?.toDate().toLocaleString() || '-'}</span>
                            </div>
                        </div>

                        {/* Status Controls */}
                        <div className="admin-controls">
                            <div className="control-group">
                                <label>Registration Status</label>
                                <div className="status-buttons">
                                    <button
                                        className={`status-btn pending ${viewingDayPassReg.status === 'pending' ? 'active' : ''}`}
                                        onClick={async () => {
                                            await updateDayPassStatus(viewingDayPassReg.id!, 'pending')
                                            setViewingDayPassReg({ ...viewingDayPassReg, status: 'pending' })
                                            fetchData()
                                        }}
                                    >
                                        Pending
                                    </button>
                                    <button
                                        className={`status-btn approved ${viewingDayPassReg.status === 'approved' ? 'active' : ''}`}
                                        onClick={async () => {
                                            await updateDayPassStatus(viewingDayPassReg.id!, 'approved')
                                            setViewingDayPassReg({ ...viewingDayPassReg, status: 'approved' })
                                            fetchData()
                                        }}
                                    >
                                        ✓ Approve
                                    </button>
                                    <button
                                        className={`status-btn rejected ${viewingDayPassReg.status === 'rejected' ? 'active' : ''}`}
                                        onClick={async () => {
                                            await updateDayPassStatus(viewingDayPassReg.id!, 'rejected')
                                            setViewingDayPassReg({ ...viewingDayPassReg, status: 'rejected' })
                                            fetchData()
                                        }}
                                    >
                                        ✗ Reject
                                    </button>
                                </div>
                            </div>

                            <div className="control-group">
                                <label>Payment Status</label>
                                <div className="status-buttons">
                                    <button
                                        className={`status-btn pending ${viewingDayPassReg.paymentStatus === 'pending' ? 'active' : ''}`}
                                        onClick={async () => {
                                            await updateDayPassPaymentStatus(viewingDayPassReg.id!, 'pending')
                                            setViewingDayPassReg({ ...viewingDayPassReg, paymentStatus: 'pending' })
                                            fetchData()
                                        }}
                                    >
                                        Pending
                                    </button>
                                    <button
                                        className={`status-btn approved ${viewingDayPassReg.paymentStatus === 'paid' ? 'active' : ''}`}
                                        onClick={async () => {
                                            await updateDayPassPaymentStatus(viewingDayPassReg.id!, 'paid')
                                            setViewingDayPassReg({ ...viewingDayPassReg, paymentStatus: 'paid' })
                                            fetchData()
                                        }}
                                    >
                                        ✓ Paid
                                    </button>
                                    <button
                                        className={`status-btn free ${viewingDayPassReg.paymentStatus === 'free' ? 'active' : ''}`}
                                        onClick={async () => {
                                            await updateDayPassPaymentStatus(viewingDayPassReg.id!, 'free')
                                            setViewingDayPassReg({ ...viewingDayPassReg, paymentStatus: 'free' })
                                            fetchData()
                                        }}
                                    >
                                        Free
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Danger Zone */}
                        <div className="danger-zone">
                            <button
                                className="delete-registration-btn"
                                onClick={async () => {
                                    if (confirm('Are you sure you want to delete this registration? This cannot be undone.')) {
                                        await deleteDayPassRegistration(viewingDayPassReg.id!)
                                        setViewingDayPassReg(null)
                                        fetchData()
                                    }
                                }}
                            >
                                🗑️ Delete Registration
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
