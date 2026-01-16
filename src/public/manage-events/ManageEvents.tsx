import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { onAuthChange } from '../../lib/auth'
import { getAdminDocument } from '../../lib/userService'
import {
    type Event,
    getEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    EVENT_ICONS,
    EVENT_COLORS
} from '../../lib/eventService'
import {
    type EventRegistration,
    getAllEventRegistrations,
    deleteEventRegistration,
    exportEventRegistrationsToCSV,
    downloadEventCSV,
    getEventRegistrationStats
} from '../../lib/eventRegistrationService'
import { uploadImages } from '../../lib/imageStorage'
import './ManageEvents.css'

type OverlayType = 'none' | 'event' | 'registration'
type TabType = 'events' | 'registrations'

export default function ManageEvents() {
    const navigate = useNavigate()

    // Auth state
    const [loading, setLoading] = useState(true)

    // Tab state
    const [activeTab, setActiveTab] = useState<TabType>('events')

    // Data state
    const [events, setEvents] = useState<Event[]>([])
    const [registrations, setRegistrations] = useState<EventRegistration[]>([])

    // UI state
    const [activeOverlay, setActiveOverlay] = useState<OverlayType>('none')
    const [selectedEventFilter, setSelectedEventFilter] = useState<string>('all')
    const [viewingRegistration, setViewingRegistration] = useState<EventRegistration | null>(null)

    // Event form state
    const [editingEventId, setEditingEventId] = useState<string | null>(null)
    const [eventForm, setEventForm] = useState({
        name: '',
        description: '',
        date: '',
        time: '',
        venue: '',
        price: 0,
        capacity: 0,
        icon: '🎉',
        color: '#00d4ff',
        images: [] as string[],
        imageDisplayMode: 'fill' as 'fill' | 'fit' | 'stretch' | 'tile' | 'centre',
        highlights: '',
        rules: '',
        isActive: true
    })
    const [eventFormError, setEventFormError] = useState('')
    const [eventSubmitting, setEventSubmitting] = useState(false)
    const [imageUploading, setImageUploading] = useState(false)
    const imageInputRef = useRef<HTMLInputElement>(null)

    // ========================================
    // DATA FETCHING
    // ========================================

    const fetchData = async () => {
        const [eventsData, registrationsData] = await Promise.all([
            getEvents(),
            getAllEventRegistrations()
        ])
        setEvents(eventsData)
        setRegistrations(registrationsData)
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
    // EVENT HANDLERS
    // ========================================

    const handleEventSubmit = async () => {
        setEventFormError('')

        if (!eventForm.name.trim()) {
            setEventFormError('Name is required')
            return
        }
        if (!eventForm.description.trim()) {
            setEventFormError('Description is required')
            return
        }

        setEventSubmitting(true)

        // Parse highlights from newline-separated string
        const highlightsArray = eventForm.highlights
            .split('\n')
            .map(h => h.trim())
            .filter(h => h.length > 0)

        let result
        if (editingEventId) {
            result = await updateEvent(editingEventId, {
                name: eventForm.name.trim(),
                description: eventForm.description.trim(),
                date: eventForm.date.trim(),
                time: eventForm.time.trim(),
                venue: eventForm.venue.trim(),
                price: eventForm.price,
                capacity: eventForm.capacity || undefined,
                icon: eventForm.icon,
                color: eventForm.color,
                images: eventForm.images,
                imageDisplayMode: eventForm.imageDisplayMode,
                highlights: highlightsArray,
                rules: eventForm.rules?.trim() || '',
                isActive: eventForm.isActive
            })
        } else {
            result = await createEvent({
                name: eventForm.name.trim(),
                description: eventForm.description.trim(),
                date: eventForm.date.trim(),
                time: eventForm.time.trim(),
                venue: eventForm.venue.trim(),
                price: eventForm.price,
                capacity: eventForm.capacity || undefined,
                icon: eventForm.icon,
                color: eventForm.color,
                images: eventForm.images,
                imageDisplayMode: eventForm.imageDisplayMode,
                highlights: highlightsArray,
                rules: eventForm.rules?.trim() || '',
                isActive: eventForm.isActive
            })
        }

        setEventSubmitting(false)

        if (result.success) {
            resetEventForm()
            setActiveOverlay('none')
            await fetchData()
        } else {
            setEventFormError(result.error || 'Failed to save event')
        }
    }

    const resetEventForm = () => {
        setEditingEventId(null)
        setEventForm({
            name: '',
            description: '',
            date: '',
            time: '',
            venue: '',
            price: 0,
            capacity: 0,
            icon: '🎉',
            color: '#00d4ff',
            images: [],
            imageDisplayMode: 'fill',
            highlights: '',
            rules: '',
            isActive: true
        })
        setEventFormError('')
    }

    const handleEditEvent = (event: Event) => {
        setEditingEventId(event.id || null)
        setEventForm({
            name: event.name,
            description: event.description,
            date: event.date || '',
            time: event.time || '',
            venue: event.venue || '',
            price: event.price,
            capacity: event.capacity || 0,
            icon: event.icon,
            color: event.color,
            images: event.images || [],
            imageDisplayMode: event.imageDisplayMode || 'fill',
            highlights: event.highlights?.join('\n') || '',
            rules: event.rules || '',
            isActive: event.isActive
        })
        setActiveOverlay('event')
    }

    const handleDeleteEvent = async (id: string) => {
        if (!confirm('Delete this event?')) return
        await deleteEvent(id)
        await fetchData()
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return

        setImageUploading(true)
        const result = await uploadImages(Array.from(files), 'events')
        setImageUploading(false)

        if (result.urls.length > 0) {
            setEventForm(prev => ({
                ...prev,
                images: [...prev.images, ...result.urls]
            }))
        }

        if (imageInputRef.current) {
            imageInputRef.current.value = ''
        }
    }

    const handleRemoveImage = (index: number) => {
        setEventForm(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index)
        }))
    }

    // ========================================
    // REGISTRATION HANDLERS
    // ========================================

    const filteredRegistrations = selectedEventFilter === 'all'
        ? registrations
        : registrations.filter(r => r.eventId === selectedEventFilter)

    const handleExportCSV = () => {
        const csv = exportEventRegistrationsToCSV(filteredRegistrations)
        if (csv) {
            const eventName = selectedEventFilter === 'all'
                ? 'all_events'
                : events.find(e => e.id === selectedEventFilter)?.name || 'registrations'
            downloadEventCSV(csv, `${eventName.replace(/\s+/g, '_')}_registrations.csv`)
        }
    }

    const handleDeleteRegistration = async (id: string) => {
        if (!confirm('Delete this registration?')) return
        await deleteEventRegistration(id)
        await fetchData()
    }

    const stats = getEventRegistrationStats(filteredRegistrations)

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
                    <h1 className="manage-title">Manage Events</h1>
                    <p className="manage-subtitle">
                        {events.length} event{events.length !== 1 ? 's' : ''} • {registrations.length} registration{registrations.length !== 1 ? 's' : ''}
                    </p>
                </div>

                {/* Tabs */}
                <div className="tab-buttons">
                    <button
                        className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`}
                        onClick={() => setActiveTab('events')}
                    >
                        Events
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'registrations' ? 'active' : ''}`}
                        onClick={() => setActiveTab('registrations')}
                    >
                        Registrations ({registrations.length})
                    </button>
                </div>

                {/* EVENTS TAB */}
                {activeTab === 'events' && (
                    <>
                        {/* Action Buttons */}
                        <div className="action-buttons">
                            <button
                                className="action-btn primary"
                                onClick={() => {
                                    resetEventForm()
                                    setActiveOverlay('event')
                                }}
                            >
                                Add Event
                            </button>
                        </div>

                        {/* Existing Events List */}
                        <div className="events-list">
                            <h2>Existing Events</h2>
                            {events.length === 0 ? (
                                <p className="empty-state">No events yet. Click "Add Event" to create one.</p>
                            ) : (
                                <div className="events-grid">
                                    {events.map(event => (
                                        <div
                                            key={event.id}
                                            className={`event-list-card clickable-card ${!event.isActive ? 'inactive' : ''}`}
                                            onClick={() => handleEditEvent(event)}
                                            style={{ '--accent-color': event.color } as React.CSSProperties}
                                        >
                                            <div className="event-list-header">
                                                <span className="event-list-icon">{event.icon}</span>
                                                <span
                                                    className="event-list-price"
                                                    style={{ background: `${event.color}20`, color: event.color }}
                                                >
                                                    ₹{event.price}
                                                </span>
                                            </div>
                                            <h3 className="event-list-name">{event.name}</h3>
                                            <p className="event-list-desc">{event.description}</p>
                                            <div className="event-list-details">
                                                <span>📅 {event.date || 'TBA'}</span>
                                                <span>📍 {event.venue || 'TBA'}</span>
                                            </div>
                                            <div className="event-registrations-count">
                                                {registrations.filter(r => r.eventId === event.id).length} registrations
                                            </div>
                                            {!event.isActive && (
                                                <span className="inactive-badge">Inactive</span>
                                            )}
                                            <button
                                                className="delete-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleDeleteEvent(event.id!)
                                                }}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* REGISTRATIONS TAB */}
                {activeTab === 'registrations' && (
                    <div className="registrations-dashboard">
                        {/* Filter & Export */}
                        <div className="registrations-toolbar">
                            <div className="filter-section">
                                <label>Filter by Event:</label>
                                <select
                                    value={selectedEventFilter}
                                    onChange={e => setSelectedEventFilter(e.target.value)}
                                >
                                    <option value="all">All Events</option>
                                    {events.map(event => (
                                        <option key={event.id} value={event.id}>
                                            {event.icon} {event.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <button
                                className="export-btn"
                                onClick={handleExportCSV}
                                disabled={filteredRegistrations.length === 0}
                            >
                                📥 Export CSV
                            </button>
                        </div>

                        {/* Stats */}
                        <div className="stats-grid">
                            <div className="stat-card">
                                <span className="stat-value">{stats.total}</span>
                                <span className="stat-label">Total</span>
                            </div>
                            <div className="stat-card pending">
                                <span className="stat-value">{stats.pending}</span>
                                <span className="stat-label">Pending</span>
                            </div>
                            <div className="stat-card approved">
                                <span className="stat-value">{stats.approved}</span>
                                <span className="stat-label">Approved</span>
                            </div>
                            <div className="stat-card revenue">
                                <span className="stat-value">₹{stats.totalRevenue}</span>
                                <span className="stat-label">Revenue</span>
                            </div>
                        </div>

                        {/* Registrations List */}
                        <div className="registrations-list">
                            {filteredRegistrations.length === 0 ? (
                                <p className="empty-state">No registrations yet.</p>
                            ) : (
                                <div className="registrations-table">
                                    <div className="table-header">
                                        <span>Name</span>
                                        <span>Event</span>
                                        <span>College</span>
                                        <span>Amount</span>
                                        <span>Status</span>
                                        <span>Actions</span>
                                    </div>
                                    {filteredRegistrations.map(reg => (
                                        <div
                                            key={reg.id}
                                            className="table-row"
                                            onClick={() => setViewingRegistration(reg)}
                                        >
                                            <span className="reg-name">{reg.name}</span>
                                            <span className="event-name">{reg.eventName}</span>
                                            <span className="college">{reg.collegeName}</span>
                                            <span className="amount">₹{reg.amountPaid}</span>
                                            <span className={`status ${reg.status}`}>{reg.status}</span>
                                            <span className="actions" onClick={e => e.stopPropagation()}>
                                                <button
                                                    className="delete-reg-btn"
                                                    onClick={() => handleDeleteRegistration(reg.id!)}
                                                >
                                                    🗑️
                                                </button>
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ================================================
                EVENT OVERLAY
               ================================================ */}
            {activeOverlay === 'event' && (
                <div className="overlay" onClick={() => setActiveOverlay('none')}>
                    <div className="overlay-content event-overlay" onClick={e => e.stopPropagation()}>
                        <button className="close-overlay" onClick={() => setActiveOverlay('none')}>×</button>

                        <div className="form-section">
                            <h2 className="form-title">{editingEventId ? 'Edit Event' : 'Add New Event'}</h2>

                            {/* Name */}
                            <div className="form-group">
                                <label>Event Name *</label>
                                <input
                                    type="text"
                                    value={eventForm.name}
                                    onChange={e => setEventForm(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="e.g., Opening Ceremony"
                                />
                            </div>

                            {/* Description */}
                            <div className="form-group">
                                <label>Description *</label>
                                <textarea
                                    value={eventForm.description}
                                    onChange={e => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Brief description of the event"
                                    rows={3}
                                />
                            </div>

                            {/* Date, Time, Venue */}
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Date</label>
                                    <input
                                        type="text"
                                        value={eventForm.date}
                                        onChange={e => setEventForm(prev => ({ ...prev, date: e.target.value }))}
                                        placeholder="e.g., 15 Feb 2025"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Time</label>
                                    <input
                                        type="text"
                                        value={eventForm.time}
                                        onChange={e => setEventForm(prev => ({ ...prev, time: e.target.value }))}
                                        placeholder="e.g., 10:00 AM"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Venue</label>
                                <input
                                    type="text"
                                    value={eventForm.venue}
                                    onChange={e => setEventForm(prev => ({ ...prev, venue: e.target.value }))}
                                    placeholder="e.g., Main Auditorium"
                                />
                            </div>

                            {/* Price & Capacity */}
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Entry Fee (₹)</label>
                                    <input
                                        type="number"
                                        value={eventForm.price}
                                        onChange={e => setEventForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                                        min="0"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Capacity (0 = unlimited)</label>
                                    <input
                                        type="number"
                                        value={eventForm.capacity}
                                        onChange={e => setEventForm(prev => ({ ...prev, capacity: Number(e.target.value) }))}
                                        min="0"
                                    />
                                </div>
                            </div>

                            {/* Icon Selection */}
                            <div className="form-group">
                                <label>Icon</label>
                                <div className="icon-grid">
                                    {EVENT_ICONS.map(icon => (
                                        <button
                                            key={icon}
                                            type="button"
                                            className={`icon-btn ${eventForm.icon === icon ? 'active' : ''}`}
                                            onClick={() => setEventForm(prev => ({ ...prev, icon }))}
                                        >
                                            {icon}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Color Selection */}
                            <div className="form-group">
                                <label>Accent Color</label>
                                <div className="color-grid">
                                    {EVENT_COLORS.map(color => (
                                        <button
                                            key={color}
                                            type="button"
                                            className={`color-btn ${eventForm.color === color ? 'active' : ''}`}
                                            style={{ background: color }}
                                            onClick={() => setEventForm(prev => ({ ...prev, color }))}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Images Upload */}
                            <div className="form-group">
                                <label>Images</label>
                                <div className="image-upload-section">
                                    <input
                                        type="file"
                                        ref={imageInputRef}
                                        accept="image/*"
                                        multiple
                                        onChange={handleImageUpload}
                                        style={{ display: 'none' }}
                                    />
                                    <button
                                        type="button"
                                        className="upload-btn"
                                        onClick={() => imageInputRef.current?.click()}
                                        disabled={imageUploading}
                                    >
                                        {imageUploading ? 'Uploading...' : '📷 Add Images'}
                                    </button>
                                    {eventForm.images.length > 0 && (
                                        <div className="image-previews">
                                            {eventForm.images.map((img, index) => (
                                                <div key={index} className="image-preview-item">
                                                    <img src={img} alt={`Preview ${index + 1}`} />
                                                    <button
                                                        type="button"
                                                        className="remove-image-btn"
                                                        onClick={() => handleRemoveImage(index)}
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Highlights */}
                            <div className="form-group">
                                <label>Highlights (one per line)</label>
                                <textarea
                                    value={eventForm.highlights}
                                    onChange={e => setEventForm(prev => ({ ...prev, highlights: e.target.value }))}
                                    placeholder="Opening Ceremony&#10;Tech Talks&#10;Networking Session"
                                    rows={4}
                                />
                            </div>

                            {/* Rules */}
                            <div className="form-group">
                                <label>Rules & Guidelines</label>
                                <textarea
                                    value={eventForm.rules}
                                    onChange={e => setEventForm(prev => ({ ...prev, rules: e.target.value }))}
                                    placeholder="Event rules, dress code, etc."
                                    rows={3}
                                />
                            </div>

                            {/* Active Toggle */}
                            <div className="form-group checkbox-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={eventForm.isActive}
                                        onChange={e => setEventForm(prev => ({ ...prev, isActive: e.target.checked }))}
                                    />
                                    Active (visible on public page)
                                </label>
                            </div>

                            {eventFormError && (
                                <p className="form-error">{eventFormError}</p>
                            )}

                            <button
                                className="submit-btn"
                                onClick={handleEventSubmit}
                                disabled={eventSubmitting || imageUploading}
                            >
                                {eventSubmitting
                                    ? (editingEventId ? 'Saving...' : 'Adding...')
                                    : (editingEventId ? 'Save Changes' : 'Add Event')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ================================================
                REGISTRATION DETAIL OVERLAY
               ================================================ */}
            {viewingRegistration && (
                <div className="overlay" onClick={() => setViewingRegistration(null)}>
                    <div className="overlay-content registration-detail-overlay" onClick={e => e.stopPropagation()}>
                        <button className="close-overlay" onClick={() => setViewingRegistration(null)}>×</button>

                        <h2>Registration Details</h2>

                        <div className="reg-detail-section">
                            <div className="detail-row">
                                <label>Event</label>
                                <span>{viewingRegistration.eventName}</span>
                            </div>
                            <div className="detail-row">
                                <label>Name</label>
                                <span>{viewingRegistration.name}</span>
                            </div>
                            <div className="detail-row">
                                <label>Email</label>
                                <span>{viewingRegistration.email}</span>
                            </div>
                            <div className="detail-row">
                                <label>Phone</label>
                                <span>{viewingRegistration.phone}</span>
                            </div>
                            <div className="detail-row">
                                <label>College</label>
                                <span>{viewingRegistration.collegeName}</span>
                            </div>
                            {viewingRegistration.synapseId && (
                                <div className="detail-row">
                                    <label>Synapse ID</label>
                                    <span>{viewingRegistration.synapseId}</span>
                                </div>
                            )}
                            <div className="detail-row">
                                <label>Amount Paid</label>
                                <span>₹{viewingRegistration.amountPaid}</span>
                            </div>
                            <div className="detail-row">
                                <label>Transaction ID</label>
                                <span>{viewingRegistration.transactionId || '-'}</span>
                            </div>
                            <div className="detail-row">
                                <label>Status</label>
                                <span className={`status-badge ${viewingRegistration.status}`}>
                                    {viewingRegistration.status}
                                </span>
                            </div>
                            <div className="detail-row">
                                <label>Registered At</label>
                                <span>{viewingRegistration.createdAt?.toDate().toLocaleString() || '-'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
