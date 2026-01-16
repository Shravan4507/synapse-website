import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { onAuthChange } from '../../lib/auth'
import { getAdminDocument } from '../../lib/userService'
import {
    getAllCategories,
    getAllSponsors,
    createCategory,
    createSponsor,
    updateSponsor,
    deleteSponsor,
    deleteCategory,
    bulkUpdateCategoryOrders,
    getAllPromotions,
    createPromotion,
    updatePromotion,
    deletePromotion,
    type Sponsor,
    type SponsorCategory,
    type Promotion
} from '../../lib/sponsorService'
import { compressImage } from '../../lib/imageStorage'
import './ManageSponsors.css'

type OverlayType = 'none' | 'sponsor' | 'categories' | 'promo'

export default function ManageSponsors() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [authorized, setAuthorized] = useState(false)
    const [adminUid, setAdminUid] = useState('')

    // Data
    const [categories, setCategories] = useState<SponsorCategory[]>([])
    const [sponsors, setSponsors] = useState<Sponsor[]>([])
    const [promotions, setPromotions] = useState<Promotion[]>([])

    // Overlay state
    const [activeOverlay, setActiveOverlay] = useState<OverlayType>('none')

    // Sponsor form state
    const [sponsorForm, setSponsorForm] = useState({
        title: '',
        link: '',
        categoryId: '',
        images: [] as string[]
    })
    const [sponsorFormError, setSponsorFormError] = useState('')
    const [sponsorSubmitting, setSponsSubmitting] = useState(false)

    // Category form state
    const [newCategoryName, setNewCategoryName] = useState('')
    const [categoryDragId, setCategoryDragId] = useState<string | null>(null)

    // Display mode options for promotional images
    type DisplayMode = 'fill' | 'fit' | 'stretch' | 'tile' | 'centre'

    // Promo form state
    const [promoForm, setPromoForm] = useState({
        title: '',
        link: '',
        images: [] as string[],
        displayMode: 'fill' as DisplayMode
    })
    const [promoFormError, setPromoFormError] = useState('')
    const [promoSubmitting, setPromoSubmitting] = useState(false)

    // Editing state - which item is being edited (null = creating new)
    const [editingSponsorId, setEditingSponsorId] = useState<string | null>(null)
    const [editingPromoId, setEditingPromoId] = useState<string | null>(null)

    // Preview auto-rotation
    const [previewIndex, setPreviewIndex] = useState(0)
    const [promoPreviewIndex, setPromoPreviewIndex] = useState(0)

    // File input refs
    const sponsorFileInput = useRef<HTMLInputElement>(null)
    const promoFileInput = useRef<HTMLInputElement>(null)

    // Auto-rotate preview images
    useEffect(() => {
        if (sponsorForm.images.length <= 1) {
            setPreviewIndex(0)
            return
        }

        const interval = setInterval(() => {
            setPreviewIndex(prev => (prev + 1) % sponsorForm.images.length)
        }, 2000) // Rotate every 2 seconds

        return () => clearInterval(interval)
    }, [sponsorForm.images.length])

    // Auto-rotate promo preview images
    useEffect(() => {
        if (promoForm.images.length <= 1) {
            setPromoPreviewIndex(0)
            return
        }

        const interval = setInterval(() => {
            setPromoPreviewIndex(prev => (prev + 1) % promoForm.images.length)
        }, 2000)

        return () => clearInterval(interval)
    }, [promoForm.images.length])

    // Check authorization
    useEffect(() => {
        const unsubscribe = onAuthChange(async (user) => {
            if (!user) {
                navigate('/user-login?returnTo=/manage-sponsors')
                return
            }

            const admin = await getAdminDocument(user.uid)

            if (!admin || !admin.permissions?.includes('manage_sponsors')) {
                navigate('/user-dashboard')
                return
            }

            setAdminUid(user.uid)
            setAuthorized(true)
            await fetchData()
            setLoading(false)
        })

        return () => unsubscribe()
    }, [navigate])

    const fetchData = async () => {
        const [cats, sponss, promos] = await Promise.all([
            getAllCategories(),
            getAllSponsors(),
            getAllPromotions()
        ])
        setCategories(cats)
        setSponsors(sponss)
        setPromotions(promos)
    }

    // ========================================
    // SPONSOR FORM HANDLERS
    // ========================================

    const handleSponsorImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files) return

        for (const file of Array.from(files)) {
            // Allow larger files since we'll compress them (max 2MB original)
            if (file.size > 2 * 1024 * 1024) {
                setSponsorFormError(`File ${file.name} exceeds 2MB limit`)
                continue
            }

            try {
                const compressedDataUrl = await compressImage(file)
                setSponsorForm(prev => ({
                    ...prev,
                    images: [...prev.images, compressedDataUrl]
                }))
            } catch (error) {
                setSponsorFormError(`Failed to process ${file.name}`)
            }
        }
    }

    const removeSponsorImage = (index: number) => {
        setSponsorForm(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index)
        }))
    }

    const handleSponsorSubmit = async () => {
        setSponsorFormError('')

        if (!sponsorForm.title.trim()) {
            setSponsorFormError('Title is required')
            return
        }
        if (!sponsorForm.categoryId) {
            setSponsorFormError('Please select a category')
            return
        }
        if (sponsorForm.images.length === 0) {
            setSponsorFormError('Please upload at least one image')
            return
        }

        setSponsSubmitting(true)

        let result
        if (editingSponsorId) {
            // Update existing sponsor
            result = await updateSponsor(editingSponsorId, {
                title: sponsorForm.title.trim(),
                link: sponsorForm.link.trim() || undefined,
                categoryId: sponsorForm.categoryId,
                images: sponsorForm.images
            })
        } else {
            // Create new sponsor
            result = await createSponsor({
                title: sponsorForm.title.trim(),
                link: sponsorForm.link.trim() || undefined,
                categoryId: sponsorForm.categoryId,
                images: sponsorForm.images
            })
        }

        setSponsSubmitting(false)

        if (result.success) {
            // Reset form and close
            setSponsorForm({ title: '', link: '', categoryId: '', images: [] })
            setEditingSponsorId(null)
            setActiveOverlay('none')
            await fetchData()
        } else {
            setSponsorFormError(result.error || (editingSponsorId ? 'Failed to update sponsor' : 'Failed to create sponsor'))
        }
    }

    // ========================================
    // CATEGORY HANDLERS
    // ========================================

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return

        await createCategory(newCategoryName.trim())
        setNewCategoryName('')
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
        const dropIndex = categories.findIndex(c => c.id === targetId)

        // Reorder locally
        const newCategories = [...categories]
        const [removed] = newCategories.splice(dragIndex, 1)
        newCategories.splice(dropIndex, 0, removed)

        // Update orders
        const orders = newCategories.map((cat, index) => ({
            id: cat.id!,
            order: index
        }))

        setCategories(newCategories)
        setCategoryDragId(null)

        await bulkUpdateCategoryOrders(orders)
    }

    const handleDeleteCategory = async (categoryId: string) => {
        const categorySponsors = sponsors.filter(s => s.categoryId === categoryId)
        if (categorySponsors.length > 0) {
            alert('Cannot delete category with sponsors. Remove sponsors first.')
            return
        }

        if (!confirm('Delete this category?')) return

        await deleteCategory(categoryId)
        await fetchData()
    }

    // ========================================
    // PROMO HANDLERS
    // ========================================

    const handlePromoImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files) return

        for (const file of Array.from(files)) {
            if (file.size > 2 * 1024 * 1024) {
                alert(`File ${file.name} exceeds 2MB limit`)
                continue
            }

            try {
                const compressedDataUrl = await compressImage(file)
                setPromoForm(prev => ({
                    ...prev,
                    images: [...prev.images, compressedDataUrl]
                }))
            } catch (error) {
                alert(`Failed to process ${file.name}`)
            }
        }
    }

    const removePromoImage = (index: number) => {
        setPromoForm(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index)
        }))
    }

    const handlePromoSubmit = async () => {
        setPromoFormError('')

        if (promoForm.images.length === 0) {
            setPromoFormError('Please upload at least one image')
            return
        }

        setPromoSubmitting(true)

        let result
        if (editingPromoId) {
            // Update existing promotion
            result = await updatePromotion(editingPromoId, {
                title: promoForm.title.trim() || undefined,
                link: promoForm.link.trim() || undefined,
                images: promoForm.images,
                displayMode: promoForm.displayMode
            })
        } else {
            // Create new promotion
            result = await createPromotion({
                title: promoForm.title.trim() || undefined,
                link: promoForm.link.trim() || undefined,
                images: promoForm.images,
                displayMode: promoForm.displayMode
            }, adminUid)
        }

        setPromoSubmitting(false)

        if (result.success) {
            // Reset form and close
            setPromoForm({
                title: '',
                link: '',
                images: [],
                displayMode: 'fill'
            })
            setEditingPromoId(null)
            setActiveOverlay('none')
            await fetchData()
        } else {
            setPromoFormError(result.error || (editingPromoId ? 'Failed to update promotion' : 'Failed to create promotion'))
        }
    }

    // ========================================
    // DELETE SPONSOR
    // ========================================

    const handleDeleteSponsor = async (sponsorId: string) => {
        if (!confirm('Delete this sponsor?')) return

        await deleteSponsor(sponsorId)
        await fetchData()
    }

    // ========================================
    // DELETE PROMOTION
    // ========================================

    const handleDeletePromotion = async (promotionId: string) => {
        if (!confirm('Delete this promotion?')) return

        await deletePromotion(promotionId)
        await fetchData()
    }

    // ========================================
    // EDIT SPONSOR - populate form and open overlay
    // ========================================

    const handleEditSponsor = (sponsor: Sponsor) => {
        setEditingSponsorId(sponsor.id || null)
        setSponsorForm({
            title: sponsor.title,
            link: sponsor.link || '',
            categoryId: sponsor.categoryId,
            images: sponsor.images
        })
        setActiveOverlay('sponsor')
    }

    // ========================================
    // EDIT PROMOTION - populate form and open overlay
    // ========================================

    const handleEditPromotion = (promo: Promotion) => {
        setEditingPromoId(promo.id || null)
        setPromoForm({
            title: promo.title || '',
            link: promo.link || '',
            images: promo.images,
            displayMode: promo.displayMode || 'fill'
        })
        setActiveOverlay('promo')
    }

    // ========================================
    // RENDER
    // ========================================

    if (loading) {
        return (
            <div className="manage-sponsors-page">
                <div className="loading-state">Loading...</div>
            </div>
        )
    }

    if (!authorized) {
        return (
            <div className="manage-sponsors-page">
                <div className="loading-state">Unauthorized</div>
            </div>
        )
    }

    return (
        <div className="manage-sponsors-page">
            <div className="manage-sponsors-container">
                {/* Header */}
                <div className="sponsors-header">
                    <button className="back-btn" onClick={() => navigate('/user-dashboard')}>
                        ← Back
                    </button>
                    <h1 className="manage-title">Manage Sponsors</h1>
                    <p className="manage-subtitle">
                        {sponsors.length} sponsor{sponsors.length !== 1 ? 's' : ''} • {categories.length} categor{categories.length !== 1 ? 'ies' : 'y'}
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="action-buttons">
                    <button
                        className="action-btn primary"
                        onClick={() => {
                            setEditingSponsorId(null)
                            setSponsorForm({ title: '', link: '', categoryId: '', images: [] })
                            setActiveOverlay('sponsor')
                        }}
                    >
                        Display Sponsor
                    </button>
                    <button
                        className="action-btn secondary"
                        onClick={() => setActiveOverlay('categories')}
                    >
                        Create and Manage Categories
                    </button>
                    <button
                        className="action-btn secondary"
                        onClick={() => {
                            setEditingPromoId(null)
                            setPromoForm({ title: '', link: '', images: [], displayMode: 'fill' })
                            setActiveOverlay('promo')
                        }}
                    >
                        Manage Promotional Space
                    </button>
                </div>

                {/* Existing Sponsors List */}
                <div className="sponsors-list">
                    <h2>Existing Sponsors</h2>
                    {sponsors.length === 0 ? (
                        <p className="empty-state">No sponsors yet. Click "Display Sponsor" to add one.</p>
                    ) : (
                        <div className="sponsors-grid">
                            {sponsors.map(sponsor => (
                                <div
                                    key={sponsor.id}
                                    className="sponsor-list-card clickable-card"
                                    onClick={() => handleEditSponsor(sponsor)}
                                >
                                    <div className="sponsor-list-image">
                                        {sponsor.images[0] && (
                                            <img src={sponsor.images[0]} alt={sponsor.title} />
                                        )}
                                    </div>
                                    <div className="sponsor-list-info">
                                        <h3>{sponsor.title}</h3>
                                        <p>{categories.find(c => c.id === sponsor.categoryId)?.name || 'Unknown'}</p>
                                    </div>
                                    <button
                                        className="delete-btn"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleDeleteSponsor(sponsor.id!)
                                        }}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Existing Promotions */}
                <div className="promotions-list">
                    <h2>Current Promotions</h2>
                    {promotions.length === 0 ? (
                        <p className="empty-state">No promotions yet. Click "Manage Promotional Space" to add one.</p>
                    ) : (
                        <div className="promotions-grid">
                            {promotions.map(promo => (
                                <div
                                    key={promo.id}
                                    className="promo-list-card clickable-card"
                                    onClick={() => handleEditPromotion(promo)}
                                >
                                    <div className="promo-list-image">
                                        {promo.images[0] && (
                                            <img src={promo.images[0]} alt={promo.title || 'Promotion'} />
                                        )}
                                    </div>
                                    <div className="promo-list-info">
                                        <h3>{promo.title || 'Untitled Promotion'}</h3>
                                        <p className="promo-display-mode">{promo.displayMode || 'fill'}</p>
                                        {promo.link && <p className="promo-link-small">{promo.link}</p>}
                                    </div>
                                    <button
                                        className="delete-btn"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleDeletePromotion(promo.id!)
                                        }}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ================================================
                SPONSOR OVERLAY
               ================================================ */}
            {activeOverlay === 'sponsor' && (
                <div className="overlay" onClick={() => setActiveOverlay('none')}>
                    <div className="overlay-content sponsor-overlay" onClick={e => e.stopPropagation()}>
                        <button className="close-overlay" onClick={() => setActiveOverlay('none')}>×</button>
                        <h2>{editingSponsorId ? 'Edit Sponsor' : 'Add New Sponsor'}</h2>

                        <div className="overlay-grid">
                            {/* Left: Form */}
                            <div className="form-section">
                                <div className="form-group">
                                    <label>Title (Sponsor Name) *</label>
                                    <input
                                        type="text"
                                        value={sponsorForm.title}
                                        onChange={e => setSponsorForm(prev => ({ ...prev, title: e.target.value }))}
                                        placeholder="e.g., Acme Corp"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Link (optional)</label>
                                    <input
                                        type="url"
                                        value={sponsorForm.link}
                                        onChange={e => setSponsorForm(prev => ({ ...prev, link: e.target.value }))}
                                        placeholder="https://sponsor-website.com"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Category *</label>
                                    <select
                                        value={sponsorForm.categoryId}
                                        onChange={e => setSponsorForm(prev => ({ ...prev, categoryId: e.target.value }))}
                                    >
                                        <option value="">Select Category</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Images/GIFs (max 256KB each) *</label>
                                    <div
                                        className="upload-zone"
                                        onClick={() => sponsorFileInput.current?.click()}
                                        onDragOver={e => e.preventDefault()}
                                        onDrop={e => {
                                            e.preventDefault()
                                            const files = e.dataTransfer.files
                                            if (files.length > 0) {
                                                // Trigger file processing
                                                const input = sponsorFileInput.current
                                                if (input) {
                                                    const dt = new DataTransfer()
                                                    Array.from(files).forEach(f => dt.items.add(f))
                                                    input.files = dt.files
                                                    input.dispatchEvent(new Event('change', { bubbles: true }))
                                                }
                                            }
                                        }}
                                    >
                                        <p>Click to upload or drag & drop</p>
                                        <span>PNG, JPG, GIF (max 256KB)</span>
                                    </div>
                                    <input
                                        ref={sponsorFileInput}
                                        type="file"
                                        accept="image/*,.gif"
                                        multiple
                                        style={{ display: 'none' }}
                                        onChange={handleSponsorImageUpload}
                                    />

                                    {sponsorForm.images.length > 0 && (
                                        <div className="uploaded-images">
                                            {sponsorForm.images.map((img, i) => (
                                                <div key={i} className="uploaded-image">
                                                    <img src={img} alt={`Upload ${i + 1}`} />
                                                    <button onClick={() => removeSponsorImage(i)}>×</button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {sponsorFormError && (
                                    <p className="form-error">{sponsorFormError}</p>
                                )}

                                <button
                                    className="submit-btn"
                                    onClick={handleSponsorSubmit}
                                    disabled={sponsorSubmitting}
                                >
                                    {sponsorSubmitting
                                        ? (editingSponsorId ? 'Saving...' : 'Adding...')
                                        : (editingSponsorId ? 'Save Changes' : 'Add Sponsor')}
                                </button>
                            </div>

                            {/* Right: Preview */}
                            <div className="preview-section">
                                <h3>Preview {sponsorForm.images.length > 1 && `(${previewIndex + 1}/${sponsorForm.images.length})`}</h3>
                                <div className="sponsor-preview-card">
                                    <div className="preview-image">
                                        {sponsorForm.images.length > 0 ? (
                                            <img
                                                src={sponsorForm.images[previewIndex] || sponsorForm.images[0]}
                                                alt="Preview"
                                                key={previewIndex}
                                            />
                                        ) : (
                                            <div className="preview-placeholder">No image</div>
                                        )}
                                    </div>
                                    <p className="preview-name">{sponsorForm.title || 'Sponsor Name'}</p>
                                </div>
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

                        <div className="categories-grid">
                            {/* Left: Add New */}
                            <div className="add-category-section">
                                <h3>Add New Category</h3>
                                <div className="add-category-form">
                                    <input
                                        type="text"
                                        value={newCategoryName}
                                        onChange={e => setNewCategoryName(e.target.value)}
                                        placeholder="e.g., Title Sponsor"
                                        onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                                    />
                                    <button onClick={handleAddCategory}>Add Category</button>
                                </div>
                                <p className="hint">Categories appear in the order shown on the right</p>
                            </div>

                            {/* Right: Existing Categories (Draggable) */}
                            <div className="existing-categories">
                                <h3>Existing Categories</h3>
                                <p className="hint">Drag to reorder</p>

                                {categories.length === 0 ? (
                                    <p className="empty-state">No categories yet</p>
                                ) : (
                                    <div className="category-list">
                                        {categories.map((cat) => (
                                            <div
                                                key={cat.id}
                                                className={`category-item ${categoryDragId === cat.id ? 'dragging' : ''}`}
                                                draggable
                                                onDragStart={e => handleCategoryDragStart(e, cat.id!)}
                                                onDragOver={handleCategoryDragOver}
                                                onDrop={e => handleCategoryDrop(e, cat.id!)}
                                                onDragEnd={() => setCategoryDragId(null)}
                                            >
                                                <span className="drag-handle">⋮⋮</span>
                                                <span className="category-name">{cat.name}</span>
                                                <span className="category-count">
                                                    {sponsors.filter(s => s.categoryId === cat.id).length} sponsors
                                                </span>
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
                PROMOTIONAL SPACE OVERLAY
               ================================================ */}
            {activeOverlay === 'promo' && (
                <div className="overlay" onClick={() => setActiveOverlay('none')}>
                    <div className="overlay-content promo-overlay" onClick={e => e.stopPropagation()}>
                        <button className="close-overlay" onClick={() => setActiveOverlay('none')}>×</button>
                        <h2>{editingPromoId ? 'Edit Promotion' : 'Add New Promotion'}</h2>
                        <p className="overlay-subtitle">Promotions appear in the sidebar promotional card area</p>

                        <div className="overlay-grid">
                            {/* Left: Form */}
                            <div className="form-section">
                                <div className="form-group">
                                    <label>Title (optional)</label>
                                    <input
                                        type="text"
                                        value={promoForm.title}
                                        onChange={e => setPromoForm(prev => ({ ...prev, title: e.target.value }))}
                                        placeholder="e.g., Holiday Sale"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Link (optional)</label>
                                    <input
                                        type="url"
                                        value={promoForm.link}
                                        onChange={e => setPromoForm(prev => ({ ...prev, link: e.target.value }))}
                                        placeholder="https://promo-link.com"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Images/GIFs *</label>
                                    <div
                                        className="upload-zone"
                                        onClick={() => promoFileInput.current?.click()}
                                        onDragOver={e => e.preventDefault()}
                                        onDrop={e => {
                                            e.preventDefault()
                                            const files = e.dataTransfer.files
                                            if (files.length > 0) {
                                                const input = promoFileInput.current
                                                if (input) {
                                                    const dt = new DataTransfer()
                                                    Array.from(files).forEach(f => dt.items.add(f))
                                                    input.files = dt.files
                                                    input.dispatchEvent(new Event('change', { bubbles: true }))
                                                }
                                            }
                                        }}
                                    >
                                        <p>Click to upload or drag & drop</p>
                                        <span>PNG, JPG, GIF (max 2MB, will be compressed)</span>
                                    </div>
                                    <input
                                        ref={promoFileInput}
                                        type="file"
                                        accept="image/*,.gif"
                                        multiple
                                        style={{ display: 'none' }}
                                        onChange={handlePromoImageUpload}
                                    />

                                    {promoForm.images.length > 0 && (
                                        <div className="uploaded-images">
                                            {promoForm.images.map((img, i) => (
                                                <div key={i} className="uploaded-image">
                                                    <img src={img} alt={`Upload ${i + 1}`} />
                                                    <button onClick={() => removePromoImage(i)}>×</button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Display Mode Selector */}
                                <div className="form-group">
                                    <label>Display Mode</label>
                                    <div className="display-mode-options">
                                        {(['fill', 'fit', 'stretch', 'tile', 'centre'] as const).map(mode => (
                                            <button
                                                key={mode}
                                                type="button"
                                                className={`display-mode-btn ${promoForm.displayMode === mode ? 'active' : ''}`}
                                                onClick={() => setPromoForm(prev => ({ ...prev, displayMode: mode }))}
                                            >
                                                {mode.charAt(0).toUpperCase() + mode.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                    <span className="display-mode-hint">
                                        {promoForm.displayMode === 'fill' && 'Image fills the area, cropping if needed'}
                                        {promoForm.displayMode === 'fit' && 'Image fits entirely, may have gaps'}
                                        {promoForm.displayMode === 'stretch' && 'Image stretches to fill, may distort'}
                                        {promoForm.displayMode === 'tile' && 'Image repeats to fill the area'}
                                        {promoForm.displayMode === 'centre' && 'Image centered at original size'}
                                    </span>
                                </div>

                                {promoFormError && (
                                    <p className="form-error">{promoFormError}</p>
                                )}

                                <button
                                    className="submit-btn"
                                    onClick={handlePromoSubmit}
                                    disabled={promoSubmitting}
                                >
                                    {promoSubmitting
                                        ? (editingPromoId ? 'Saving...' : 'Adding...')
                                        : (editingPromoId ? 'Save Changes' : 'Add Promotion')}
                                </button>
                            </div>

                            {/* Right: Preview */}
                            <div className="preview-section">
                                <h3>
                                    Preview
                                    {promoForm.images.length > 1 && ` (${promoPreviewIndex + 1}/${promoForm.images.length})`}
                                </h3>

                                {/* Fixed preview container matching sidebar promo card size */}
                                <div className={`promo-preview-card display-mode-${promoForm.displayMode}`}>
                                    {promoForm.images.length > 0 ? (
                                        promoForm.displayMode === 'tile' ? (
                                            <div
                                                className="promo-preview-tile"
                                                style={{ backgroundImage: `url(${promoForm.images[promoPreviewIndex] || promoForm.images[0]})` }}
                                            />
                                        ) : (
                                            <img
                                                src={promoForm.images[promoPreviewIndex] || promoForm.images[0]}
                                                alt="Preview"
                                                key={promoPreviewIndex}
                                                className={`promo-preview-img display-${promoForm.displayMode}`}
                                            />
                                        )
                                    ) : (
                                        <div className="preview-placeholder">
                                            Upload an image to preview
                                        </div>
                                    )}
                                </div>

                                <p className="preview-name">{promoForm.title || 'Promotion Preview'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
