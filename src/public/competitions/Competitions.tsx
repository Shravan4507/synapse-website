import { useState, useEffect } from 'react'
import { getActiveCompetitions, type Competition } from '../../lib/competitionService'
import { createRegistration, type TeamMember } from '../../lib/registrationService'
import './Competitions.css'

// Parse team size string to get min/max
const parseTeamSize = (teamSize: string): { min: number, max: number } => {
    if (teamSize.toLowerCase() === 'solo') return { min: 1, max: 1 }
    const match = teamSize.match(/(\d+)(?:-(\d+))?/)
    if (match) {
        const min = parseInt(match[1])
        const max = match[2] ? parseInt(match[2]) : min
        return { min, max }
    }
    return { min: 1, max: 5 }
}

export default function Competitions() {
    const [competitions, setCompetitions] = useState<Competition[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedCategory, setSelectedCategory] = useState<string>('All')

    // Registration modal state
    const [showModal, setShowModal] = useState(false)
    const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null)
    const [teamName, setTeamName] = useState('')
    const [collegeName, setCollegeName] = useState('')
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([{ name: '', email: '', phone: '', role: 'Team Leader' }])
    const [transactionId, setTransactionId] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState('')
    const [submitSuccess, setSubmitSuccess] = useState(false)

    // Detail view modal state
    const [showDetailModal, setShowDetailModal] = useState(false)
    const [detailCompetition, setDetailCompetition] = useState<Competition | null>(null)
    const [currentImageIndex, setCurrentImageIndex] = useState(0)

    // Fetch competitions from Firestore
    useEffect(() => {
        const fetchCompetitions = async () => {
            const data = await getActiveCompetitions()
            setCompetitions(data)
            setLoading(false)
        }
        fetchCompetitions()
    }, [])

    // Get unique categories
    const categories = ['All', ...new Set(competitions.map(c => c.category))]

    // Filter competitions
    const filteredCompetitions = selectedCategory === 'All'
        ? competitions
        : competitions.filter(c => c.category === selectedCategory)

    // Open registration modal
    const handleRegister = (competition: Competition) => {
        setSelectedCompetition(competition)
        setTeamName('')
        setCollegeName('')
        setTransactionId('')
        setSubmitError('')
        setSubmitSuccess(false)

        // Initialize team members based on min team size
        const { min } = parseTeamSize(competition.teamSize)
        const initialMembers: TeamMember[] = Array(min).fill(null).map((_, i) => ({
            name: '',
            email: '',
            phone: '',
            role: i === 0 ? 'Team Leader' : 'Member'
        }))
        setTeamMembers(initialMembers)
        setShowModal(true)
    }

    // Close modal
    const closeModal = () => {
        setShowModal(false)
        setSelectedCompetition(null)
    }

    // Open detail modal
    const handleCardClick = (competition: Competition) => {
        setDetailCompetition(competition)
        setCurrentImageIndex(0)
        setShowDetailModal(true)
    }

    // Close detail modal
    const closeDetailModal = () => {
        setShowDetailModal(false)
        setDetailCompetition(null)
    }

    // Navigate images
    const nextImage = () => {
        if (detailCompetition?.images) {
            setCurrentImageIndex(prev =>
                prev < detailCompetition.images!.length - 1 ? prev + 1 : 0
            )
        }
    }

    const prevImage = () => {
        if (detailCompetition?.images) {
            setCurrentImageIndex(prev =>
                prev > 0 ? prev - 1 : detailCompetition.images!.length - 1
            )
        }
    }

    // Add team member
    const addTeamMember = () => {
        if (!selectedCompetition) return
        const { max } = parseTeamSize(selectedCompetition.teamSize)
        if (teamMembers.length < max) {
            setTeamMembers([...teamMembers, { name: '', email: '', phone: '', role: 'Member' }])
        }
    }

    // Remove team member
    const removeTeamMember = (index: number) => {
        if (!selectedCompetition) return
        const { min } = parseTeamSize(selectedCompetition.teamSize)
        if (teamMembers.length > min) {
            setTeamMembers(teamMembers.filter((_, i) => i !== index))
        }
    }

    // Update team member
    const updateTeamMember = (index: number, field: keyof TeamMember, value: string) => {
        const updated = [...teamMembers]
        updated[index] = { ...updated[index], [field]: value }
        setTeamMembers(updated)
    }

    // Submit registration
    const handleSubmit = async () => {
        setSubmitError('')

        // Validation
        if (!teamName.trim()) {
            setSubmitError('Team name is required')
            return
        }
        if (!collegeName.trim()) {
            setSubmitError('College name is required')
            return
        }
        for (let i = 0; i < teamMembers.length; i++) {
            const member = teamMembers[i]
            if (!member.name.trim() || !member.email.trim() || !member.phone.trim()) {
                setSubmitError(`Please fill all details for Member ${i + 1}`)
                return
            }
            if (!member.email.includes('@')) {
                setSubmitError(`Invalid email for Member ${i + 1}`)
                return
            }
            if (member.phone.length < 10) {
                setSubmitError(`Invalid phone number for Member ${i + 1}`)
                return
            }
        }
        if (selectedCompetition?.entryFee && selectedCompetition.entryFee > 0 && !transactionId.trim()) {
            setSubmitError('Transaction ID is required for paid competitions')
            return
        }

        setSubmitting(true)

        const result = await createRegistration({
            competitionId: selectedCompetition!.id!,
            competitionName: selectedCompetition!.name,
            teamName: teamName.trim(),
            teamMembers: teamMembers.map(m => ({
                name: m.name.trim(),
                email: m.email.trim(),
                phone: m.phone.trim(),
                role: m.role
            })),
            collegeName: collegeName.trim(),
            transactionId: transactionId.trim() || undefined
        })

        setSubmitting(false)

        if (result.success) {
            setSubmitSuccess(true)
        } else {
            setSubmitError(result.error || 'Failed to submit registration')
        }
    }

    if (loading) {
        return (
            <div className="competitions-page">
                <div className="competitions-content">
                    <h1 className="competitions-title">Competitions</h1>
                    <p className="competitions-subtitle">Loading competitions...</p>
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                        <div className="loading-spinner" />
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="competitions-page">
            <div className="competitions-content">
                <h1 className="competitions-title">Competitions</h1>
                <p className="competitions-subtitle">
                    Showcase your skills and win amazing prizes
                </p>

                {/* Category Filter */}
                <div className="category-filter">
                    {categories.map(category => (
                        <button
                            key={category}
                            className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
                            onClick={() => setSelectedCategory(category)}
                        >
                            {category}
                        </button>
                    ))}
                </div>

                {/* Competition Cards Grid */}
                <div className="competitions-grid">
                    {filteredCompetitions.map((competition, index) => (
                        <div
                            key={competition.id}
                            className="competition-card"
                            style={{
                                animationDelay: `${index * 0.1}s`,
                                '--accent-color': competition.color
                            } as React.CSSProperties}
                            onClick={() => handleCardClick(competition)}
                        >
                            {/* Card Glow Effect */}
                            <div
                                className="card-glow"
                                style={{ background: `radial-gradient(circle at center, ${competition.color}20, transparent 70%)` }}
                            />

                            {/* Card Header */}
                            <div className="competition-header">
                                <span className="competition-icon">{competition.icon}</span>
                                <span
                                    className="competition-category"
                                    style={{ background: `${competition.color}20`, color: competition.color }}
                                >
                                    {competition.category}
                                </span>
                            </div>

                            {/* Card Body */}
                            <h3 className="competition-name">{competition.name}</h3>
                            <p className="competition-description">{competition.description}</p>

                            {/* Details */}
                            <div className="competition-details">
                                <div className="detail-item">
                                    <span className="detail-label">Team Size</span>
                                    <span className="detail-value">{competition.teamSize}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Entry Fee</span>
                                    <span className="detail-value">
                                        {competition.entryFee === 0 ? 'Free' : `₹${competition.entryFee}`}
                                    </span>
                                </div>
                            </div>

                            {/* Prize Pool */}
                            <div className="competition-prize">
                                <span className="prize-label">Prize Pool</span>
                                <span className="prize-value" style={{ color: competition.color }}>
                                    {competition.prizePool}
                                </span>
                            </div>

                            {/* Register Button */}
                            <button
                                className="register-btn"
                                style={{ background: `${competition.color}20` }}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handleRegister(competition)
                                }}
                            >
                                Register Now
                            </button>
                        </div>
                    ))}
                </div>

                {filteredCompetitions.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1.1rem' }}>
                            {competitions.length === 0
                                ? 'Competitions coming soon! Stay tuned.'
                                : 'No competitions found in this category.'}
                        </p>
                    </div>
                )}
            </div>

            {/* Registration Modal */}
            {showModal && selectedCompetition && (
                <div className="registration-overlay" onClick={closeModal}>
                    <div className="registration-modal" onClick={e => e.stopPropagation()}>
                        <button className="close-modal" onClick={closeModal}>×</button>

                        {submitSuccess ? (
                            <div className="success-message">
                                <span className="success-icon">✓</span>
                                <h2>Registration Successful!</h2>
                                <p>Your team has been registered for <strong>{selectedCompetition.name}</strong>.</p>
                                <p>You will receive a confirmation email shortly.</p>
                                <button className="close-success-btn" onClick={closeModal}>Close</button>
                            </div>
                        ) : (
                            <>
                                <div className="modal-header">
                                    <span className="modal-icon">{selectedCompetition.icon}</span>
                                    <h2>Register for {selectedCompetition.name}</h2>
                                    <p className="modal-subtitle">
                                        Entry Fee: {selectedCompetition.entryFee === 0 ? 'Free' : `₹${selectedCompetition.entryFee}`}
                                        {' '} • Team Size: {selectedCompetition.teamSize}
                                    </p>
                                </div>

                                <div className="form-section">
                                    {/* Team Name */}
                                    <div className="form-group">
                                        <label>Team Name *</label>
                                        <input
                                            type="text"
                                            value={teamName}
                                            onChange={e => setTeamName(e.target.value)}
                                            placeholder="Enter your team name"
                                        />
                                    </div>

                                    {/* College Name */}
                                    <div className="form-group">
                                        <label>College / Institution Name *</label>
                                        <input
                                            type="text"
                                            value={collegeName}
                                            onChange={e => setCollegeName(e.target.value)}
                                            placeholder="Enter your college name"
                                        />
                                    </div>

                                    {/* Team Members */}
                                    <div className="team-members-section">
                                        <div className="section-header">
                                            <h3>Team Members</h3>
                                            {(() => {
                                                const { max } = parseTeamSize(selectedCompetition.teamSize)
                                                return teamMembers.length < max && (
                                                    <button
                                                        type="button"
                                                        className="add-member-btn"
                                                        onClick={addTeamMember}
                                                    >
                                                        + Add Member
                                                    </button>
                                                )
                                            })()}
                                        </div>

                                        {teamMembers.map((member, index) => (
                                            <div key={index} className="member-card">
                                                <div className="member-header">
                                                    <span className="member-role">
                                                        {index === 0 ? '👑 Team Leader' : `Member ${index + 1}`}
                                                    </span>
                                                    {(() => {
                                                        const { min } = parseTeamSize(selectedCompetition.teamSize)
                                                        return index > 0 && teamMembers.length > min && (
                                                            <button
                                                                type="button"
                                                                className="remove-member-btn"
                                                                onClick={() => removeTeamMember(index)}
                                                            >
                                                                Remove
                                                            </button>
                                                        )
                                                    })()}
                                                </div>
                                                <div className="member-fields">
                                                    <input
                                                        type="text"
                                                        placeholder="Full Name *"
                                                        value={member.name}
                                                        onChange={e => updateTeamMember(index, 'name', e.target.value)}
                                                    />
                                                    <input
                                                        type="email"
                                                        placeholder="Email *"
                                                        value={member.email}
                                                        onChange={e => updateTeamMember(index, 'email', e.target.value)}
                                                    />
                                                    <input
                                                        type="tel"
                                                        placeholder="Phone Number *"
                                                        value={member.phone}
                                                        onChange={e => updateTeamMember(index, 'phone', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Payment Section (if entry fee > 0) */}
                                    {selectedCompetition.entryFee > 0 && (
                                        <div className="payment-section">
                                            <h3>Payment Details</h3>
                                            <p className="payment-info">
                                                Pay ₹{selectedCompetition.entryFee} via UPI and enter the transaction ID below.
                                            </p>
                                            <div className="form-group">
                                                <label>Transaction ID / UPI Reference *</label>
                                                <input
                                                    type="text"
                                                    value={transactionId}
                                                    onChange={e => setTransactionId(e.target.value)}
                                                    placeholder="Enter transaction ID"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {submitError && (
                                        <p className="form-error">{submitError}</p>
                                    )}

                                    <button
                                        className="submit-registration-btn"
                                        onClick={handleSubmit}
                                        disabled={submitting}
                                        style={{ background: selectedCompetition.color }}
                                    >
                                        {submitting ? 'Submitting...' : 'Submit Registration'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Competition Detail Modal */}
            {showDetailModal && detailCompetition && (
                <div className="detail-overlay" onClick={closeDetailModal}>
                    <div className="detail-modal" onClick={e => e.stopPropagation()}>
                        <button className="close-modal" onClick={closeDetailModal}>×</button>

                        <div className="detail-content">
                            {/* Image Gallery */}
                            {detailCompetition.images && detailCompetition.images.length > 0 && (
                                <div className={`detail-gallery display-${detailCompetition.imageDisplayMode || 'fill'}`}>
                                    <img
                                        src={detailCompetition.images[currentImageIndex]}
                                        alt={detailCompetition.name}
                                        className="gallery-image"
                                    />
                                    {detailCompetition.images.length > 1 && (
                                        <>
                                            <button className="gallery-nav prev" onClick={(e) => { e.stopPropagation(); prevImage() }}>❮</button>
                                            <button className="gallery-nav next" onClick={(e) => { e.stopPropagation(); nextImage() }}>❯</button>
                                            <div className="gallery-dots">
                                                {detailCompetition.images.map((_, idx) => (
                                                    <span
                                                        key={idx}
                                                        className={`gallery-dot ${idx === currentImageIndex ? 'active' : ''}`}
                                                        onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(idx) }}
                                                    />
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Competition Info */}
                            <div className="detail-info">
                                <div className="detail-header">
                                    <span className="detail-icon">{detailCompetition.icon}</span>
                                    <span
                                        className="detail-category-badge"
                                        style={{ background: `${detailCompetition.color}20`, color: detailCompetition.color }}
                                    >
                                        {detailCompetition.category}
                                    </span>
                                </div>

                                <h2 className="detail-name">{detailCompetition.name}</h2>
                                <p className="detail-description">{detailCompetition.description}</p>

                                {/* Key Details */}
                                <div className="detail-grid">
                                    <div className="detail-grid-item">
                                        <span className="grid-label">Team Size</span>
                                        <span className="grid-value">{detailCompetition.teamSize}</span>
                                    </div>
                                    <div className="detail-grid-item">
                                        <span className="grid-label">Entry Fee</span>
                                        <span className="grid-value">
                                            {detailCompetition.entryFee === 0 ? 'Free' : `₹${detailCompetition.entryFee}`}
                                        </span>
                                    </div>
                                    <div className="detail-grid-item">
                                        <span className="grid-label">Prize Pool</span>
                                        <span className="grid-value" style={{ color: detailCompetition.color }}>
                                            {detailCompetition.prizePool}
                                        </span>
                                    </div>
                                </div>

                                {/* Event Details */}
                                {(detailCompetition.venue || detailCompetition.date || detailCompetition.time) && (
                                    <div className="detail-event-info">
                                        {detailCompetition.venue && (
                                            <div className="event-info-item">
                                                <span className="event-icon">📍</span>
                                                <span>{detailCompetition.venue}</span>
                                            </div>
                                        )}
                                        {detailCompetition.date && (
                                            <div className="event-info-item">
                                                <span className="event-icon">📅</span>
                                                <span>{detailCompetition.date}</span>
                                            </div>
                                        )}
                                        {detailCompetition.time && (
                                            <div className="event-info-item">
                                                <span className="event-icon">🕐</span>
                                                <span>{detailCompetition.time}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Rules */}
                                {detailCompetition.rules && (
                                    <div className="detail-rules">
                                        <h3>Rules & Guidelines</h3>
                                        <p>{detailCompetition.rules}</p>
                                    </div>
                                )}

                                {/* Register Button */}
                                <button
                                    className="detail-register-btn"
                                    style={{ background: detailCompetition.color }}
                                    onClick={() => {
                                        closeDetailModal()
                                        handleRegister(detailCompetition)
                                    }}
                                >
                                    Register Now
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
