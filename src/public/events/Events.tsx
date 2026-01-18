import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './Events.css'
import { type DayPass, getActiveDayPasses } from '../../lib/dayPassService'
import { onAuthChange } from '../../lib/auth'
import { getUserDocument, type UserDocument } from '../../lib/userService'
import {
    createDayPassRegistration,
    getDayPassRegistrationByUser,
    getRegistrationCountsPerDay,
    addDaysToRegistration,
    type DayPassRegistration
} from '../../lib/dayPassRegistrationService'

interface DisplayDayPass extends DayPass {
    isSelected: boolean
    isDisabled: boolean
    isAlreadyRegistered: boolean
    isSoldOut: boolean
    isFewSpotsLeft: boolean
    registeredCount: number
    remainingSeats: number | null  // null = unlimited
}

export default function Events() {
    const navigate = useNavigate()
    const [selectedDays, setSelectedDays] = useState<number[]>([])
    const [dayPassesData, setDayPassesData] = useState<DayPass[]>([])
    const [loading, setLoading] = useState(true)
    const [registrationCounts, setRegistrationCounts] = useState<{ [day: number]: number }>({ 1: 0, 2: 0, 3: 0 })
    const [alreadyRegisteredDays, setAlreadyRegisteredDays] = useState<number[]>([])
    const [existingRegData, setExistingRegData] = useState<DayPassRegistration | null>(null)

    // Image carousel state
    const [carouselIndices, setCarouselIndices] = useState<{ [day: number]: number }>({ 1: 0, 2: 0, 3: 0 })

    // Checkout modal state
    const [showCheckout, setShowCheckout] = useState(false)
    const [userData, setUserData] = useState<UserDocument | null>(null)
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)
    const [govIdLast4, setGovIdLast4] = useState('')
    const [agreeTerms, setAgreeTerms] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState('')
    const [existingRegistration, setExistingRegistration] = useState(false)

    useEffect(() => {
        const fetchData = async () => {
            const [passes, counts] = await Promise.all([
                getActiveDayPasses(),
                getRegistrationCountsPerDay()
            ])
            setDayPassesData(passes)
            setRegistrationCounts(counts)
            setLoading(false)
        }
        fetchData()

        // Listen for auth changes to get user data
        const unsubscribe = onAuthChange(async (user) => {
            if (user) {
                setCurrentUserId(user.uid)
                const userDoc = await getUserDocument(user.uid)
                setUserData(userDoc)

                // Check if user already has a day pass registration
                const existing = await getDayPassRegistrationByUser(user.uid)
                if (existing) {
                    setExistingRegistration(true)
                    setExistingRegData(existing)
                    setAlreadyRegisteredDays(existing.selectedDays || [])
                }
            } else {
                setCurrentUserId(null)
                setUserData(null)
                setExistingRegistration(false)
                setExistingRegData(null)
                setAlreadyRegisteredDays([])
            }
        })

        return () => unsubscribe()
    }, [])

    // Auto-scroll carousel images
    useEffect(() => {
        const interval = setInterval(() => {
            setCarouselIndices(prev => {
                const newIndices = { ...prev }
                dayPassesData.forEach(pass => {
                    const images = pass.images?.length > 0
                        ? pass.images
                        : (pass.image ? [pass.image] : [])
                    if (images.length > 1) {
                        newIndices[pass.day] = (prev[pass.day] + 1) % images.length
                    }
                })
                return newIndices
            })
        }, 4000) // Rotate every 4 seconds

        return () => clearInterval(interval)
    }, [dayPassesData])

    // Compute display passes with selection state and seat status
    const dayPasses: DisplayDayPass[] = [1, 2, 3].map(day => {
        const passData = dayPassesData.find(p => p.day === day)
        const capacity = passData?.capacity || 0
        const registeredCount = registrationCounts[day] || 0
        const hasCapacity = capacity > 0
        const remainingSeats = hasCapacity ? capacity - registeredCount : null
        const isSoldOut = hasCapacity && remainingSeats !== null && remainingSeats <= 0
        const isFewSpotsLeft = hasCapacity && remainingSeats !== null && remainingSeats > 0 && remainingSeats <= Math.ceil(capacity * 0.1)  // 10% or less
        const isAlreadyRegistered = alreadyRegisteredDays.includes(day)

        // Handle both legacy single image and new images array
        const images = (passData?.images && passData.images.length > 0)
            ? passData.images
            : (passData?.image ? [passData.image] : [])

        return {
            day,
            image: passData?.image || '',
            images,
            price: passData?.price || 0,
            events: passData?.events || [],
            capacity: capacity,
            isActive: passData?.isActive ?? true,
            isSelected: selectedDays.includes(day),
            isDisabled: isSoldOut || isAlreadyRegistered,
            isAlreadyRegistered,
            isSoldOut,
            isFewSpotsLeft,
            registeredCount,
            remainingSeats
        }
    })

    const handleDaySelect = (day: number) => {
        const dayPass = dayPasses.find(p => p.day === day)
        if (dayPass?.isDisabled) return  // Don't allow selecting disabled days

        setSelectedDays(prev => {
            if (prev.includes(day)) {
                return prev.filter(d => d !== day)
            } else {
                return [...prev, day].sort((a, b) => a - b)
            }
        })
    }

    const totalPrice = selectedDays.reduce((sum, day) => {
        const pass = dayPasses.find(p => p.day === day)
        return sum + (pass?.price || 0)
    }, 0)

    // Check if user is adding new days (has existing registration but selecting unregistered days)
    const isAddingMoreDays = existingRegistration && selectedDays.some(d => !alreadyRegisteredDays.includes(d))
    const newDaysToAdd = selectedDays.filter(d => !alreadyRegisteredDays.includes(d))

    const handleProceedToCheckout = () => {
        // Check if user is logged in
        if (!currentUserId) {
            navigate('/user-login?returnTo=/events')
            return
        }

        // Must have at least one day selected
        if (selectedDays.length === 0) {
            setSubmitError('Please select at least one day')
            return
        }

        // If user has existing registration, they can only add NEW days
        if (existingRegistration && newDaysToAdd.length === 0) {
            setSubmitError('You have already registered for all selected days')
            return
        }

        setShowCheckout(true)
        // Reset form - for adding days, we already have govIdLast4, so use existing
        if (!existingRegData?.governmentIdLast4) {
            setGovIdLast4('')
        } else {
            setGovIdLast4(existingRegData.governmentIdLast4)
        }
        setAgreeTerms(false)
        setSubmitError('')
    }

    const handleCloseCheckout = () => {
        setShowCheckout(false)
        setSubmitError('')
    }

    const handleRegister = async () => {
        if (!userData || !currentUserId) return

        setIsSubmitting(true)
        setSubmitError('')

        let result

        if (isAddingMoreDays && existingRegData?.id) {
            // Add more days to existing registration
            const newTotalAmount = (existingRegData.totalAmount || 0) + totalPrice
            result = await addDaysToRegistration(
                existingRegData.id,
                newDaysToAdd,
                newTotalAmount,
                alreadyRegisteredDays
            )
        } else {
            // Create new registration
            result = await createDayPassRegistration({
                userId: currentUserId,
                synapseId: userData.synapseId,
                userName: `${userData.firstName} ${userData.lastName}`,
                email: userData.email,
                phone: userData.mobileNumber,
                college: userData.college,
                governmentIdLast4: govIdLast4,
                selectedDays: selectedDays,
                totalAmount: totalPrice
            })
        }

        setIsSubmitting(false)

        if (result.success) {
            setShowCheckout(false)
            setExistingRegistration(true)
            setAlreadyRegisteredDays(prev => [...new Set([...prev, ...newDaysToAdd])])
            // Redirect to dashboard to see the virtual ID
            navigate('/user-dashboard')
        } else {
            setSubmitError(result.error || 'Registration failed')
        }
    }

    if (loading) {
        return (
            <div className="events-page">
                <div className="events-content">
                    <div className="loading-state">Loading...</div>
                </div>
            </div>
        )
    }

    return (
        <div className="events-page">
            <div className="events-content">
                <h1 className="events-title">Synapse '26</h1>
                <p className="events-subtitle">Choose Your Experience</p>
                <p className="events-info">
                    Select the days you want to attend. Mix and match any combination!
                </p>

                <div className="day-passes-container">
                    {dayPasses.map((pass, index) => (
                        <div
                            key={pass.day}
                            className={`day-pass-card ${pass.isSelected ? 'selected' : ''} ${pass.isDisabled ? 'disabled' : ''}`}
                            style={{ animationDelay: `${index * 0.1}s` }}
                        >
                            {/* Status Badges */}
                            {pass.isSoldOut && (
                                <div className="pass-status-badge sold-out">SOLD OUT</div>
                            )}
                            {pass.isFewSpotsLeft && !pass.isSoldOut && (
                                <div className="pass-status-badge few-spots">FEW SPOTS LEFT</div>
                            )}
                            {pass.isAlreadyRegistered && (
                                <div className="pass-status-badge registered">✓ REGISTERED</div>
                            )}

                            {/* Image Carousel */}
                            <div className="pass-image-area">
                                {pass.images && pass.images.length > 0 ? (
                                    <div className="image-carousel">
                                        {pass.images.map((img, idx) => (
                                            <img
                                                key={idx}
                                                src={img}
                                                alt={`Day ${pass.day} image ${idx + 1}`}
                                                className={`carousel-image ${idx === carouselIndices[pass.day] ? 'active' : ''}`}
                                            />
                                        ))}
                                        {/* Carousel Dots */}
                                        {pass.images.length > 1 && (
                                            <div className="carousel-dots">
                                                {pass.images.map((_, idx) => (
                                                    <button
                                                        key={idx}
                                                        className={`carousel-dot ${idx === carouselIndices[pass.day] ? 'active' : ''}`}
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setCarouselIndices(prev => ({ ...prev, [pass.day]: idx }))
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="pass-image-placeholder">
                                        <span>Day {pass.day}</span>
                                    </div>
                                )}
                            </div>

                            {/* Day Title with Underline */}
                            <div className="pass-day-section">
                                <h3 className="pass-day-title">DAY {pass.day}</h3>
                                <div className="pass-title-underline"></div>
                            </div>

                            {/* Events List */}
                            <div className="pass-events-list">
                                {pass.events.map((event, idx) => (
                                    <p key={idx} className="pass-event-item">{event}</p>
                                ))}
                            </div>

                            {/* Divider */}
                            <div className="pass-divider"></div>

                            {/* Price */}
                            <div className="pass-price-row">
                                <span className="pass-price-label">PRICE:</span>
                                <span className="pass-price-value">₹{pass.price}</span>
                            </div>


                            {/* Select Button */}
                            <button
                                className={`pass-select-button ${pass.isSelected ? 'selected' : ''} ${pass.isDisabled ? 'disabled' : ''}`}
                                onClick={() => handleDaySelect(pass.day)}
                                disabled={pass.isDisabled}
                            >
                                {pass.isAlreadyRegistered
                                    ? 'ALREADY REGISTERED'
                                    : pass.isSoldOut
                                        ? 'SOLD OUT'
                                        : pass.isSelected
                                            ? 'SELECTED'
                                            : 'SELECT'}
                            </button>
                        </div>
                    ))}
                </div>

                {/* Total & Checkout */}
                {selectedDays.length > 0 && (
                    <div className="checkout-section">
                        <div className="checkout-summary">
                            <span className="checkout-label">
                                {isAddingMoreDays
                                    ? `Adding ${newDaysToAdd.length} Day${newDaysToAdd.length > 1 ? 's' : ''}`
                                    : `${selectedDays.length} Day${selectedDays.length > 1 ? 's' : ''} Selected`}
                            </span>
                            <span className="checkout-total">
                                Total: <strong>₹{totalPrice}</strong>
                            </span>
                        </div>
                        <button className="checkout-btn" onClick={handleProceedToCheckout}>
                            {isAddingMoreDays ? 'Add to Existing Pass' : 'Proceed to Checkout'}
                        </button>
                    </div>
                )}
            </div>

            {/* ================================================
                CHECKOUT MODAL
               ================================================ */}
            {showCheckout && (
                <div className="registration-modal__overlay" onClick={handleCloseCheckout}>
                    <div className="registration-modal__content" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="registration-modal__header">
                            <h2>{isAddingMoreDays ? 'Add Days to Pass' : 'Event Registration'}</h2>
                            <button className="registration-modal__close" onClick={handleCloseCheckout}>×</button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="registration-modal__body">
                            {/* Event Info Card */}
                            <div className="registration-modal__event-card">
                                <div className="event-card__info">
                                    <span className="event-card__name">
                                        {isAddingMoreDays
                                            ? `Adding: ${newDaysToAdd.map(d => `Day ${d}`).join(', ')}`
                                            : `Day Pass${selectedDays.length > 1 ? 'es' : ''}: ${selectedDays.map(d => `Day ${d}`).join(', ')}`}
                                    </span>
                                    <span className="event-card__date">Synapse '26</span>
                                </div>
                                <span className="event-card__price">₹{totalPrice}</span>
                            </div>

                            {/* Your Details Section */}
                            <div className="registration-modal__section">
                                <h4 className="section-title">YOUR DETAILS</h4>

                                <div className="form-group">
                                    <label>Synapse ID</label>
                                    <input
                                        type="text"
                                        value={userData?.synapseId || 'Not logged in'}
                                        readOnly
                                        className="readonly"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Full Name</label>
                                    <input
                                        type="text"
                                        value={userData ? `${userData.firstName} ${userData.lastName}` : 'Not logged in'}
                                        readOnly
                                        className="readonly"
                                    />
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Email Address</label>
                                        <input
                                            type="text"
                                            value={userData?.email || 'Not logged in'}
                                            readOnly
                                            className="readonly"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Mobile Number</label>
                                        <input
                                            type="text"
                                            value={userData?.mobileNumber || 'Not logged in'}
                                            readOnly
                                            className="readonly"
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>College Name</label>
                                    <input
                                        type="text"
                                        value={userData?.college || 'Not logged in'}
                                        readOnly
                                        className="readonly"
                                    />
                                </div>
                            </div>

                            {/* Identity Verification Section */}
                            <div className="registration-modal__section">
                                <h4 className="section-title">IDENTITY VERIFICATION</h4>

                                <div className="form-group">
                                    <label>Government ID (Last 4 characters) *</label>
                                    <input
                                        type="text"
                                        value={govIdLast4}
                                        onChange={e => setGovIdLast4(e.target.value.toUpperCase().slice(0, 4))}
                                        placeholder="e.g., 1234 for Aadhar or 123A for PAN"
                                        maxLength={4}
                                    />
                                    <span className="form-hint">
                                        Enter last 4 digits of Aadhar (e.g., 1234) or last 4 characters of PAN (e.g., 123A)
                                    </span>
                                </div>
                            </div>

                            {/* Terms Checkbox */}
                            <div className="registration-modal__terms">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={agreeTerms}
                                        onChange={e => setAgreeTerms(e.target.checked)}
                                    />
                                    <span>I agree to the <a href="/terms" target="_blank">Terms and Conditions</a> and confirm that the information provided is accurate.</span>
                                </label>
                            </div>
                        </div>

                        {/* Footer with Submit Button */}
                        <div className="registration-modal__footer">
                            {submitError && (
                                <div className="registration-modal__error">
                                    {submitError}
                                </div>
                            )}
                            <button
                                className="registration-modal__submit"
                                disabled={!userData || !govIdLast4 || govIdLast4.length < 4 || !agreeTerms || isSubmitting}
                                onClick={handleRegister}
                            >
                                {isSubmitting ? 'Processing...' : totalPrice > 0 ? `Pay ₹${totalPrice}` : 'Register Now'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
