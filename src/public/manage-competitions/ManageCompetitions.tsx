import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { onAuthChange } from '../../lib/auth'
import { getAdminDocument } from '../../lib/userService'
import {
    type Competition,
    type CompetitionCategory,
    getCompetitions,
    getCompetitionCategories,
    createCompetition,
    updateCompetition,
    deleteCompetition,
    createCompetitionCategory,
    deleteCompetitionCategory,
    reorderCompetitionCategories,
    COMPETITION_ICONS,
    COMPETITION_COLORS
} from '../../lib/competitionService'
import {
    type Registration,
    getAllRegistrations,
    deleteRegistration,
    exportRegistrationsToCSV,
    downloadCSV,
    getRegistrationStats
} from '../../lib/registrationService'
import { uploadImages } from '../../lib/imageStorage'
import './ManageCompetitions.css'

type OverlayType = 'none' | 'competition' | 'categories' | 'registrations'
type TabType = 'competitions' | 'registrations'

export default function ManageCompetitions() {
    const navigate = useNavigate()

    // Auth state
    const [loading, setLoading] = useState(true)

    // Tab state
    const [activeTab, setActiveTab] = useState<TabType>('competitions')

    // Data state
    const [competitions, setCompetitions] = useState<Competition[]>([])
    const [categories, setCategories] = useState<CompetitionCategory[]>([])
    const [registrations, setRegistrations] = useState<Registration[]>([])

    // UI state
    const [activeOverlay, setActiveOverlay] = useState<OverlayType>('none')
    const [selectedCompetitionFilter, setSelectedCompetitionFilter] = useState<string>('all')
    const [viewingRegistration, setViewingRegistration] = useState<Registration | null>(null)

    // Competition form state
    const [editingCompetitionId, setEditingCompetitionId] = useState<string | null>(null)
    const [competitionForm, setCompetitionForm] = useState({
        name: '',
        category: '',
        description: '',
        teamSize: '',
        entryFee: 0,
        prizePool: '',
        icon: '💻',
        color: '#00d4ff',
        images: [] as string[],
        imageDisplayMode: 'fill' as 'fill' | 'fit' | 'stretch' | 'tile' | 'centre',
        rules: '',
        venue: '',
        date: '',
        time: '',
        registrationLink: '',
        isActive: true
    })
    const [competitionFormError, setCompetitionFormError] = useState('')
    const [competitionSubmitting, setCompetitionSubmitting] = useState(false)
    const [imageUploading, setImageUploading] = useState(false)
    const imageInputRef = useRef<HTMLInputElement>(null)

    // Category form state
    const [newCategoryName, setNewCategoryName] = useState('')
    const [categoryDragId, setCategoryDragId] = useState<string | null>(null)

    // ========================================
    // DATA FETCHING
    // ========================================

    const fetchData = async () => {
        const [competitionsData, categoriesData, registrationsData] = await Promise.all([
            getCompetitions(),
            getCompetitionCategories(),
            getAllRegistrations()
        ])
        setCompetitions(competitionsData)
        setCategories(categoriesData)
        setRegistrations(registrationsData)
    }

    // Check authorization
    useEffect(() => {
        const unsubscribe = onAuthChange(async (user) => {
            if (!user) {
                navigate('/user-login?returnTo=/manage-competitions')
                return
            }

            const admin = await getAdminDocument(user.uid)

            if (!admin || !admin.permissions?.includes('manage_competitions')) {
                navigate('/user-dashboard')
                return
            }

            await fetchData()
            setLoading(false)
        })

        return () => unsubscribe()
    }, [navigate])

    // ========================================
    // COMPETITION HANDLERS
    // ========================================

    const handleCompetitionSubmit = async () => {
        setCompetitionFormError('')

        if (!competitionForm.name.trim()) {
            setCompetitionFormError('Name is required')
            return
        }
        if (!competitionForm.category) {
            setCompetitionFormError('Please select a category')
            return
        }
        if (!competitionForm.description.trim()) {
            setCompetitionFormError('Description is required')
            return
        }

        setCompetitionSubmitting(true)

        let result
        if (editingCompetitionId) {
            result = await updateCompetition(editingCompetitionId, {
                name: competitionForm.name.trim(),
                category: competitionForm.category,
                description: competitionForm.description.trim(),
                teamSize: competitionForm.teamSize.trim(),
                entryFee: competitionForm.entryFee,
                prizePool: competitionForm.prizePool.trim(),
                icon: competitionForm.icon,
                color: competitionForm.color,
                images: competitionForm.images,
                imageDisplayMode: competitionForm.imageDisplayMode,
                rules: competitionForm.rules?.trim() || '',
                venue: competitionForm.venue?.trim() || '',
                date: competitionForm.date?.trim() || '',
                time: competitionForm.time?.trim() || '',
                registrationLink: competitionForm.registrationLink?.trim() || '',
                isActive: competitionForm.isActive
            })
        } else {
            result = await createCompetition({
                name: competitionForm.name.trim(),
                category: competitionForm.category,
                description: competitionForm.description.trim(),
                teamSize: competitionForm.teamSize.trim(),
                entryFee: competitionForm.entryFee,
                prizePool: competitionForm.prizePool.trim(),
                icon: competitionForm.icon,
                color: competitionForm.color,
                images: competitionForm.images,
                imageDisplayMode: competitionForm.imageDisplayMode,
                rules: competitionForm.rules?.trim() || '',
                venue: competitionForm.venue?.trim() || '',
                date: competitionForm.date?.trim() || '',
                time: competitionForm.time?.trim() || '',
                registrationLink: competitionForm.registrationLink?.trim() || '',
                isActive: competitionForm.isActive
            })
        }

        setCompetitionSubmitting(false)

        if (result.success) {
            resetCompetitionForm()
            setActiveOverlay('none')
            await fetchData()
        } else {
            setCompetitionFormError(result.error || 'Failed to save competition')
        }
    }

    const resetCompetitionForm = () => {
        setEditingCompetitionId(null)
        setCompetitionForm({
            name: '',
            category: '',
            description: '',
            teamSize: '',
            entryFee: 0,
            prizePool: '',
            icon: '💻',
            color: '#00d4ff',
            images: [],
            imageDisplayMode: 'fill',
            rules: '',
            venue: '',
            date: '',
            time: '',
            registrationLink: '',
            isActive: true
        })
        setCompetitionFormError('')
    }

    const handleEditCompetition = (competition: Competition) => {
        setEditingCompetitionId(competition.id || null)
        setCompetitionForm({
            name: competition.name,
            category: competition.category,
            description: competition.description,
            teamSize: competition.teamSize,
            entryFee: competition.entryFee,
            prizePool: competition.prizePool,
            icon: competition.icon,
            color: competition.color,
            images: competition.images || [],
            imageDisplayMode: competition.imageDisplayMode || 'fill',
            rules: competition.rules || '',
            venue: competition.venue || '',
            date: competition.date || '',
            time: competition.time || '',
            registrationLink: competition.registrationLink || '',
            isActive: competition.isActive
        })
        setActiveOverlay('competition')
    }

    const handleDeleteCompetition = async (id: string) => {
        if (!confirm('Delete this competition?')) return
        await deleteCompetition(id)
        await fetchData()
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return

        setImageUploading(true)
        const result = await uploadImages(Array.from(files), 'competitions')
        setImageUploading(false)

        if (result.urls.length > 0) {
            setCompetitionForm(prev => ({
                ...prev,
                images: [...prev.images, ...result.urls]
            }))
        }

        // Reset input
        if (imageInputRef.current) {
            imageInputRef.current.value = ''
        }
    }

    const handleRemoveImage = (index: number) => {
        setCompetitionForm(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index)
        }))
    }

    // ========================================
    // CATEGORY HANDLERS
    // ========================================

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return
        await createCompetitionCategory(newCategoryName.trim())
        setNewCategoryName('')
        await fetchData()
    }

    const handleDeleteCategory = async (id: string) => {
        if (!confirm('Delete this category?')) return
        await deleteCompetitionCategory(id)
        await fetchData()
    }

    const handleCategoryDragStart = (e: React.DragEvent, categoryId: string) => {
        setCategoryDragId(categoryId)
        e.dataTransfer.effectAllowed = 'move'
    }

    const handleCategoryDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
    }

    const handleCategoryDrop = async (e: React.DragEvent, targetId: string) => {
        e.preventDefault()
        if (!categoryDragId || categoryDragId === targetId) return

        const dragIndex = categories.findIndex(c => c.id === categoryDragId)
        const targetIndex = categories.findIndex(c => c.id === targetId)

        const newOrder = [...categories]
        const [removed] = newOrder.splice(dragIndex, 1)
        newOrder.splice(targetIndex, 0, removed)

        setCategories(newOrder)
        await reorderCompetitionCategories(newOrder.map(c => c.id!))
        setCategoryDragId(null)
    }

    // ========================================
    // REGISTRATION HANDLERS
    // ========================================

    const filteredRegistrations = selectedCompetitionFilter === 'all'
        ? registrations
        : registrations.filter(r => r.competitionId === selectedCompetitionFilter)

    const handleExportCSV = () => {
        const csv = exportRegistrationsToCSV(filteredRegistrations)
        if (csv) {
            const competitionName = selectedCompetitionFilter === 'all'
                ? 'all_competitions'
                : competitions.find(c => c.id === selectedCompetitionFilter)?.name || 'registrations'
            downloadCSV(csv, `${competitionName.replace(/\s+/g, '_')}_registrations.csv`)
        }
    }

    const handleDeleteRegistration = async (id: string) => {
        if (!confirm('Delete this registration?')) return
        await deleteRegistration(id)
        await fetchData()
    }

    const stats = getRegistrationStats(filteredRegistrations)

    // ========================================
    // RENDER
    // ========================================

    if (loading) {
        return (
            <div className="manage-competitions-page">
                <div className="loading-state">Loading...</div>
            </div>
        )
    }

    return (
        <div className="manage-competitions-page">
            <div className="manage-competitions-content">
                {/* Header */}
                <div className="competitions-header">
                    <button className="back-btn" onClick={() => navigate('/user-dashboard')}>
                        ← Back
                    </button>
                    <h1 className="manage-title">Manage Competitions</h1>
                    <p className="manage-subtitle">
                        {competitions.length} competition{competitions.length !== 1 ? 's' : ''} • {registrations.length} registration{registrations.length !== 1 ? 's' : ''}
                    </p>
                </div>

                {/* Tabs */}
                <div className="tab-buttons">
                    <button
                        className={`tab-btn ${activeTab === 'competitions' ? 'active' : ''}`}
                        onClick={() => setActiveTab('competitions')}
                    >
                        Competitions
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'registrations' ? 'active' : ''}`}
                        onClick={() => setActiveTab('registrations')}
                    >
                        Registrations ({registrations.length})
                    </button>
                </div>

                {/* COMPETITIONS TAB */}
                {activeTab === 'competitions' && (
                    <>
                        {/* Action Buttons */}
                        <div className="action-buttons">
                            <button
                                className="action-btn primary"
                                onClick={() => {
                                    resetCompetitionForm()
                                    setActiveOverlay('competition')
                                }}
                            >
                                Add Competition
                            </button>
                            <button
                                className="action-btn secondary"
                                onClick={() => setActiveOverlay('categories')}
                            >
                                Manage Categories
                            </button>
                        </div>

                        {/* Existing Competitions List */}
                        <div className="competitions-list">
                            <h2>Existing Competitions</h2>
                            {competitions.length === 0 ? (
                                <p className="empty-state">No competitions yet. Click "Add Competition" to create one.</p>
                            ) : (
                                <div className="competitions-grid">
                                    {competitions.map(competition => (
                                        <div
                                            key={competition.id}
                                            className={`competition-list-card clickable-card ${!competition.isActive ? 'inactive' : ''}`}
                                            onClick={() => handleEditCompetition(competition)}
                                            style={{ '--accent-color': competition.color } as React.CSSProperties}
                                        >
                                            <div className="competition-list-header">
                                                <span className="competition-list-icon">{competition.icon}</span>
                                                <span
                                                    className="competition-list-category"
                                                    style={{ background: `${competition.color}20`, color: competition.color }}
                                                >
                                                    {competition.category}
                                                </span>
                                            </div>
                                            <h3 className="competition-list-name">{competition.name}</h3>
                                            <p className="competition-list-desc">{competition.description}</p>
                                            <div className="competition-list-details">
                                                <span>Team: {competition.teamSize}</span>
                                                <span>Fee: ₹{competition.entryFee}</span>
                                                <span style={{ color: competition.color }}>{competition.prizePool}</span>
                                            </div>
                                            <div className="competition-registrations-count">
                                                {registrations.filter(r => r.competitionId === competition.id).length} registrations
                                            </div>
                                            {!competition.isActive && (
                                                <span className="inactive-badge">Inactive</span>
                                            )}
                                            <button
                                                className="delete-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleDeleteCompetition(competition.id!)
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
                                <label>Filter by Competition:</label>
                                <select
                                    value={selectedCompetitionFilter}
                                    onChange={e => setSelectedCompetitionFilter(e.target.value)}
                                >
                                    <option value="all">All Competitions</option>
                                    {competitions.map(comp => (
                                        <option key={comp.id} value={comp.id}>
                                            {comp.icon} {comp.name}
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
                                <span className="stat-label">Total Teams</span>
                            </div>
                            <div className="stat-card">
                                <span className="stat-value">{stats.totalMembers}</span>
                                <span className="stat-label">Total Members</span>
                            </div>
                            <div className="stat-card pending">
                                <span className="stat-value">{stats.pending}</span>
                                <span className="stat-label">Pending</span>
                            </div>
                            <div className="stat-card approved">
                                <span className="stat-value">{stats.approved}</span>
                                <span className="stat-label">Approved</span>
                            </div>
                        </div>

                        {/* Registrations List */}
                        <div className="registrations-list">
                            {filteredRegistrations.length === 0 ? (
                                <p className="empty-state">No registrations yet.</p>
                            ) : (
                                <div className="registrations-table">
                                    <div className="table-header">
                                        <span>Team</span>
                                        <span>Competition</span>
                                        <span>College</span>
                                        <span>Members</span>
                                        <span>Transaction</span>
                                        <span>Actions</span>
                                    </div>
                                    {filteredRegistrations.map(reg => (
                                        <div
                                            key={reg.id}
                                            className="table-row"
                                            onClick={() => setViewingRegistration(reg)}
                                        >
                                            <span className="team-name">{reg.teamName}</span>
                                            <span className="competition-name">{reg.competitionName}</span>
                                            <span className="college">{reg.collegeName}</span>
                                            <span className="members-count">{reg.teamMembers?.length || 0}</span>
                                            <span className="transaction">{reg.transactionId || '-'}</span>
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
                COMPETITION OVERLAY
               ================================================ */}
            {activeOverlay === 'competition' && (
                <div className="overlay" onClick={() => setActiveOverlay('none')}>
                    <div className="overlay-content competition-overlay" onClick={e => e.stopPropagation()}>
                        <button className="close-overlay" onClick={() => setActiveOverlay('none')}>×</button>

                        <div className="form-section">
                            <h2 className="form-title">{editingCompetitionId ? 'Edit Competition' : 'Add New Competition'}</h2>

                            {/* Name */}
                            <div className="form-group">
                                <label>Competition Name *</label>
                                <input
                                    type="text"
                                    value={competitionForm.name}
                                    onChange={e => setCompetitionForm(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="e.g., Hackathon"
                                />
                            </div>

                            {/* Category */}
                            <div className="form-group">
                                <label>Category *</label>
                                <select
                                    value={competitionForm.category}
                                    onChange={e => setCompetitionForm(prev => ({ ...prev, category: e.target.value }))}
                                >
                                    <option value="">Select category</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Description */}
                            <div className="form-group">
                                <label>Description *</label>
                                <textarea
                                    value={competitionForm.description}
                                    onChange={e => setCompetitionForm(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Brief description of the competition"
                                    rows={3}
                                />
                            </div>

                            {/* Team Size & Entry Fee */}
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Team Size</label>
                                    <input
                                        type="text"
                                        value={competitionForm.teamSize}
                                        onChange={e => setCompetitionForm(prev => ({ ...prev, teamSize: e.target.value }))}
                                        placeholder="e.g., 2-4 members"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Entry Fee (₹)</label>
                                    <input
                                        type="number"
                                        value={competitionForm.entryFee}
                                        onChange={e => setCompetitionForm(prev => ({ ...prev, entryFee: Number(e.target.value) }))}
                                        min="0"
                                    />
                                </div>
                            </div>

                            {/* Prize Pool */}
                            <div className="form-group">
                                <label>Prize Pool</label>
                                <input
                                    type="text"
                                    value={competitionForm.prizePool}
                                    onChange={e => setCompetitionForm(prev => ({ ...prev, prizePool: e.target.value }))}
                                    placeholder="e.g., ₹25,000"
                                />
                            </div>

                            {/* Icon Selection */}
                            <div className="form-group">
                                <label>Icon</label>
                                <div className="icon-grid">
                                    {COMPETITION_ICONS.map(icon => (
                                        <button
                                            key={icon}
                                            type="button"
                                            className={`icon-btn ${competitionForm.icon === icon ? 'active' : ''}`}
                                            onClick={() => setCompetitionForm(prev => ({ ...prev, icon }))}
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
                                    {COMPETITION_COLORS.map(color => (
                                        <button
                                            key={color}
                                            type="button"
                                            className={`color-btn ${competitionForm.color === color ? 'active' : ''}`}
                                            style={{ background: color }}
                                            onClick={() => setCompetitionForm(prev => ({ ...prev, color }))}
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
                                    {competitionForm.images.length > 0 && (
                                        <div className="image-previews">
                                            {competitionForm.images.map((img, index) => (
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

                            {/* Display Mode - only show if images exist */}
                            {competitionForm.images.length > 0 && (
                                <div className="form-group">
                                    <label>Display Mode</label>
                                    <div className="display-mode-selector">
                                        {(['fill', 'fit', 'stretch', 'tile', 'centre'] as const).map(mode => (
                                            <button
                                                key={mode}
                                                type="button"
                                                className={`display-mode-btn ${competitionForm.imageDisplayMode === mode ? 'active' : ''}`}
                                                onClick={() => setCompetitionForm(prev => ({ ...prev, imageDisplayMode: mode }))}
                                            >
                                                {mode.charAt(0).toUpperCase() + mode.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                    <span className="display-mode-hint">
                                        {competitionForm.imageDisplayMode === 'fill' && 'Image fills the area, cropping if needed'}
                                        {competitionForm.imageDisplayMode === 'fit' && 'Image fits inside, may show background'}
                                        {competitionForm.imageDisplayMode === 'stretch' && 'Image stretches to fill area'}
                                        {competitionForm.imageDisplayMode === 'tile' && 'Image repeats as tiles'}
                                        {competitionForm.imageDisplayMode === 'centre' && 'Image centered at original size'}
                                    </span>
                                </div>
                            )}

                            {/* Rules */}
                            <div className="form-group">
                                <label>Rules & Guidelines</label>
                                <textarea
                                    value={competitionForm.rules}
                                    onChange={e => setCompetitionForm(prev => ({ ...prev, rules: e.target.value }))}
                                    placeholder="Competition rules, eligibility, judging criteria..."
                                    rows={4}
                                />
                            </div>

                            {/* Venue, Date, Time */}
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Venue</label>
                                    <input
                                        type="text"
                                        value={competitionForm.venue}
                                        onChange={e => setCompetitionForm(prev => ({ ...prev, venue: e.target.value }))}
                                        placeholder="e.g., Main Auditorium"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Date</label>
                                    <input
                                        type="text"
                                        value={competitionForm.date}
                                        onChange={e => setCompetitionForm(prev => ({ ...prev, date: e.target.value }))}
                                        placeholder="e.g., 15 Feb 2025"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Time</label>
                                    <input
                                        type="text"
                                        value={competitionForm.time}
                                        onChange={e => setCompetitionForm(prev => ({ ...prev, time: e.target.value }))}
                                        placeholder="e.g., 10:00 AM"
                                    />
                                </div>
                            </div>

                            {/* Active Toggle */}
                            <div className="form-group checkbox-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={competitionForm.isActive}
                                        onChange={e => setCompetitionForm(prev => ({ ...prev, isActive: e.target.checked }))}
                                    />
                                    Active (visible on public page)
                                </label>
                            </div>

                            {competitionFormError && (
                                <p className="form-error">{competitionFormError}</p>
                            )}

                            <button
                                className="submit-btn"
                                onClick={handleCompetitionSubmit}
                                disabled={competitionSubmitting || imageUploading}
                            >
                                {competitionSubmitting
                                    ? (editingCompetitionId ? 'Saving...' : 'Adding...')
                                    : (editingCompetitionId ? 'Save Changes' : 'Add Competition')}
                            </button>
                        </div>

                        {/* Live Preview */}
                        <div className="live-preview-section">
                            <h3>Live Preview</h3>
                            <div
                                className="preview-card"
                                style={{ '--accent-color': competitionForm.color } as React.CSSProperties}
                            >
                                <div className="preview-header">
                                    <span className="preview-icon">{competitionForm.icon}</span>
                                    <span
                                        className="preview-category"
                                        style={{ background: `${competitionForm.color}20`, color: competitionForm.color }}
                                    >
                                        {competitionForm.category || 'Category'}
                                    </span>
                                </div>
                                <h4 className="preview-name">{competitionForm.name || 'Competition Name'}</h4>
                                <p className="preview-description">
                                    {competitionForm.description || 'Description will appear here...'}
                                </p>
                                <div className="preview-details">
                                    <div className="preview-detail">
                                        <span className="preview-label">Team Size</span>
                                        <span className="preview-value">{competitionForm.teamSize || '-'}</span>
                                    </div>
                                    <div className="preview-detail">
                                        <span className="preview-label">Entry Fee</span>
                                        <span className="preview-value">
                                            {competitionForm.entryFee === 0 ? 'Free' : `₹${competitionForm.entryFee}`}
                                        </span>
                                    </div>
                                    <div className="preview-detail">
                                        <span className="preview-label">Prize Pool</span>
                                        <span className="preview-value">{competitionForm.prizePool || '-'}</span>
                                    </div>
                                </div>
                                {competitionForm.images.length > 0 && (
                                    <div className={`preview-images display-${competitionForm.imageDisplayMode}`}>
                                        <img src={competitionForm.images[0]} alt="Preview" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ================================================
                CATEGORIES OVERLAY
               ================================================ */}
            {activeOverlay === 'categories' && (
                <div className="overlay" onClick={() => setActiveOverlay('none')}>
                    <div className="overlay-content categories-overlay" onClick={e => e.stopPropagation()}>
                        <button className="close-overlay" onClick={() => setActiveOverlay('none')}>×</button>
                        <h2>Manage Categories</h2>

                        <div className="categories-layout">
                            {/* Add Category */}
                            <div className="add-category-section">
                                <h3>Add New Category</h3>
                                <div className="add-category-form">
                                    <input
                                        type="text"
                                        value={newCategoryName}
                                        onChange={e => setNewCategoryName(e.target.value)}
                                        placeholder="e.g., Tech"
                                        onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                                    />
                                    <button onClick={handleAddCategory}>Add</button>
                                </div>
                            </div>

                            {/* Existing Categories */}
                            <div className="existing-categories">
                                <h3>Existing Categories</h3>
                                <p className="hint">Drag to reorder</p>

                                {categories.length === 0 ? (
                                    <p className="empty-state">No categories yet</p>
                                ) : (
                                    <div className="categories-list">
                                        {categories.map(cat => (
                                            <div
                                                key={cat.id}
                                                className="category-item"
                                                draggable
                                                onDragStart={e => handleCategoryDragStart(e, cat.id!)}
                                                onDragOver={handleCategoryDragOver}
                                                onDrop={e => handleCategoryDrop(e, cat.id!)}
                                            >
                                                <span className="drag-handle">⋮⋮</span>
                                                <span className="category-name">{cat.name}</span>
                                                <button
                                                    className="delete-cat-btn"
                                                    onClick={() => handleDeleteCategory(cat.id!)}
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ================================================
                REGISTRATION DETAILS OVERLAY
               ================================================ */}
            {viewingRegistration && (
                <div className="overlay" onClick={() => setViewingRegistration(null)}>
                    <div className="overlay-content registration-detail-overlay" onClick={e => e.stopPropagation()}>
                        <button className="close-overlay" onClick={() => setViewingRegistration(null)}>×</button>
                        <h2>Registration Details</h2>

                        <div className="reg-detail-section">
                            <div className="detail-row">
                                <label>Team Name</label>
                                <span>{viewingRegistration.teamName}</span>
                            </div>
                            <div className="detail-row">
                                <label>Competition</label>
                                <span>{viewingRegistration.competitionName}</span>
                            </div>
                            <div className="detail-row">
                                <label>College</label>
                                <span>{viewingRegistration.collegeName}</span>
                            </div>
                            {viewingRegistration.transactionId && (
                                <div className="detail-row">
                                    <label>Transaction ID</label>
                                    <span>{viewingRegistration.transactionId}</span>
                                </div>
                            )}
                            <div className="detail-row">
                                <label>Registered</label>
                                <span>{viewingRegistration.createdAt?.toDate().toLocaleString() || '-'}</span>
                            </div>
                        </div>

                        <h3>Team Members ({viewingRegistration.teamMembers?.length || 0})</h3>
                        <div className="members-detail-list">
                            {viewingRegistration.teamMembers?.map((member, i) => (
                                <div key={i} className="member-detail-card">
                                    <span className="member-role-badge">{member.role || (i === 0 ? 'Team Leader' : 'Member')}</span>
                                    <p className="member-name">{member.name}</p>
                                    <p className="member-contact">{member.email}</p>
                                    <p className="member-contact">{member.phone}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
