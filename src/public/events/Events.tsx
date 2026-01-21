import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './Events.css'
import { useAuth } from '../../context/AuthContext'
import { getUserOrAdminDocument } from '../../lib/userService'
import { createDayPassRegistration, getDayPassRegistrationByUser, addDaysToRegistration } from '../../lib/dayPassRegistrationService'

// Import event images
import event1 from '../../assets/event/images.jpeg'
import event2 from '../../assets/event/istockphoto-814423752-612x612.jpg'
import event3 from '../../assets/event/tiger-2535888_640.jpg'

// Day pass data
const dayPasses = [
    {
        id: 1,
        title: 'DAY 1',
        image: event1,
        price: '₹0',
        features: [
            'Access to all Technical Events',
            'Morning Refreshments',
            'Entry to Coding Hackathon',
            'Networking Lunch',
            'Evening Cultural Showcase'
        ],
        extendedInfo: {
            date: 'March 15, 2026',
            timing: '9:00 AM - 9:00 PM',
            highlights: [
                'Opening Ceremony',
                'Tech Talks by Industry Experts',
                'Coding Marathon Begins',
                'Team Formation Sessions',
                'Welcome Dinner'
            ]
        }
    },
    {
        id: 2,
        title: 'DAY 2',
        image: event2,
        price: '₹0',
        features: [
            'Robotics Workshop Access',
            'Industrial Expert Talk',
            'Gaming Tournament Entry',
            'Delegate Kit & Goodies',
            'Celebrity Night Pass'
        ],
        extendedInfo: {
            date: 'March 16, 2026',
            timing: '9:00 AM - 11:00 PM',
            highlights: [
                'Workshops & Tutorials',
                'Gaming Finals',
                'Robotics Showcase',
                'Celebrity Performance',
                'DJ Night'
            ]
        }
    },
    {
        id: 3,
        title: 'DAY 3',
        image: event3,
        price: '₹10',
        features: [
            'Grand Finale Competitions',
            'Award Ceremony Entry',
            'Gala Dinner & Social',
            'Participation Certificate',
            'Access to Career Fair'
        ],
        extendedInfo: {
            date: 'March 17, 2026',
            timing: '10:00 AM - 8:00 PM',
            highlights: [
                'Final Presentations',
                'Award Ceremony',
                'Career Fair',
                'Networking Session',
                'Closing Ceremony'
            ]
        }
    }
]

type DayPass = typeof dayPasses[0]

// Detect Government ID type from last 4 digits
const detectIdType = (last4: string): string => {
    if (!last4 || last4.length !== 4) return ''

    // Check if all digits (likely Aadhaar)
    if (/^\d{4}$/.test(last4)) {
        return 'Aadhaar Card'
    }
    // Check if alphanumeric ending (likely PAN - format XXXXX0000X)
    if (/^\d{3}[A-Za-z]$/.test(last4)) {
        return 'PAN Card'
    }
    // Check if has letters (could be Passport, Voter ID, etc.)
    if (/^[A-Za-z0-9]{4}$/.test(last4)) {
        return 'Government ID'
    }
    return 'Government ID'
}

interface UserData {
    name: string
    email: string
    phone: string
    gender: string
    college: string
    synapseId: string
}

export default function Events() {
    const { user } = useAuth()
    const [selectedDay, setSelectedDay] = useState<DayPass | null>(null)
    const [selectedDays, setSelectedDays] = useState<number[]>([])
    const [showRegistration, setShowRegistration] = useState(false)

    // User data from profile
    const [userData, setUserData] = useState<UserData>({
        name: '',
        email: '',
        phone: '',
        gender: '',
        college: '',
        synapseId: ''
    })

    // Form fields
    const [govIdLast4, setGovIdLast4] = useState('')
    const [agreedToTerms, setAgreedToTerms] = useState(false)

    // Submission state
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [registrationSuccess, setRegistrationSuccess] = useState(false)
    const [registrationError, setRegistrationError] = useState('')

    // Payment state
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [paymentMethod, setPaymentMethod] = useState<'upi-qr' | 'upi-id' | 'by-app' | null>(null)
    const [userUpiId, setUserUpiId] = useState('')
    const [transactionId, setTransactionId] = useState('')
    const [showTransactionInput, setShowTransactionInput] = useState(false)
    const [transactionError, setTransactionError] = useState('')
    const [qrEnlarged, setQrEnlarged] = useState(false)
    const [requestSent, setRequestSent] = useState(false)

    // Receiver UPI ID
    const RECEIVER_UPI_ID = 'shravan45x@pingpay'
    const RECEIVER_NAME = 'Synapse'

    // Already registered days (from previous registrations)
    const [registeredDays, setRegisteredDays] = useState<number[]>([])
    const [existingRegistrationId, setExistingRegistrationId] = useState<string | null>(null)

    const navigate = useNavigate()

    // Fetch already registered days on mount
    useEffect(() => {
        const fetchRegisteredDays = async () => {
            if (user) {
                const existing = await getDayPassRegistrationByUser(user.uid)
                if (existing) {
                    if (existing.selectedDays) {
                        setRegisteredDays(existing.selectedDays)
                    }
                    if (existing.id) {
                        setExistingRegistrationId(existing.id)
                    }
                    // Pre-fill government ID from existing registration
                    if (existing.governmentIdLast4) {
                        setGovIdLast4(existing.governmentIdLast4)
                    }
                }
            }
        }
        fetchRegisteredDays()
    }, [user])

    // Fetch user data when modal opens
    useEffect(() => {
        const fetchUserData = async () => {
            if (user && showRegistration) {
                const result = await getUserOrAdminDocument(user.uid)
                if (result.data) {
                    setUserData({
                        name: result.data.displayName || `${result.data.firstName} ${result.data.lastName}`,
                        email: result.data.email || '',
                        phone: result.data.mobileNumber || '',
                        gender: result.data.gender || '',
                        college: result.data.college || '',
                        synapseId: result.data.synapseId || ''
                    })
                }
            }
        }
        fetchUserData()
    }, [user, showRegistration])

    const openModal = (day: DayPass) => {
        setSelectedDay(day)
    }

    const closeModal = () => {
        setSelectedDay(null)
    }

    const toggleDaySelection = (dayId: number) => {
        setSelectedDays(prev =>
            prev.includes(dayId)
                ? prev.filter(id => id !== dayId)
                : [...prev, dayId]
        )
    }

    const isDaySelected = (dayId: number) => selectedDays.includes(dayId)

    // Check if day is already registered (from previous registration)
    const isDayRegistered = (dayId: number) => registeredDays.includes(dayId)

    // Calculate total price
    const totalPrice = selectedDays.reduce((sum, dayId) => {
        const day = dayPasses.find(d => d.id === dayId)
        if (day) {
            const price = parseInt(day.price.replace('₹', ''))
            return sum + price
        }
        return sum
    }, 0)

    const openRegistration = () => {
        setShowRegistration(true)
    }

    const closeRegistration = () => {
        setShowRegistration(false)
    }

    // Get selected day names for display
    const selectedDayNames = selectedDays
        .map(id => dayPasses.find(d => d.id === id)?.title)
        .filter(Boolean)
        .join(', ')

    // Generate UPI payment URL
    const generateUpiUrl = (amount: number) => {
        return `upi://pay?pa=${RECEIVER_UPI_ID}&pn=${encodeURIComponent(RECEIVER_NAME)}&am=${amount}&cu=INR&tn=${encodeURIComponent('Synapse Day Pass')}`
    }

    // Open payment modal (when Pay button is clicked)
    const openPaymentModal = () => {
        if (!agreedToTerms) {
            setRegistrationError('Please agree to the Terms & Conditions')
            return
        }
        if (govIdLast4.length !== 4) {
            setRegistrationError('Please enter valid last 4 digits of Government ID')
            return
        }
        setRegistrationError('')
        setShowPaymentModal(true)
    }

    // Close payment modal
    const closePaymentModal = () => {
        setShowPaymentModal(false)
        setPaymentMethod(null)
        setShowTransactionInput(false)
        setTransactionError('')
        setQrEnlarged(false)
        setRequestSent(false)
        setUserUpiId('')
    }

    // Check if device is mobile
    const isMobileDevice = () => {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    }

    // Handle "By App" payment - opens device payment app
    const handlePayByApp = () => {
        const upiUrl = generateUpiUrl(totalPrice)
        window.location.href = upiUrl
    }

    // Validate UPI ID format
    const validateUpiId = (upiId: string): boolean => {
        return /^[a-zA-Z0-9._-]+@[a-zA-Z]{2,}$/.test(upiId)
    }

    // Handle Send Request (for UPI ID option)
    const handleSendRequest = () => {
        if (!validateUpiId(userUpiId)) {
            setTransactionError('Please enter a valid UPI ID')
            return
        }
        setTransactionError('')
        // In a real implementation, this would call a payment gateway API
        // For now, we'll just simulate the request being sent
        setRequestSent(true)
    }

    // Validate UPI Transaction ID (12 digits typically)
    const validateTransactionId = (id: string): boolean => {
        // UPI transaction IDs are typically 12-35 alphanumeric characters
        return /^[A-Za-z0-9]{12,35}$/.test(id)
    }

    // Handle transaction ID submission
    const handleTransactionSubmit = () => {
        if (!transactionId.trim()) {
            setTransactionError('Please enter the transaction ID')
            return
        }
        if (!validateTransactionId(transactionId)) {
            setTransactionError('Invalid transaction ID format')
            return
        }
        setTransactionError('')
        // Transaction ID is valid, now user can complete registration
    }

    // Handle registration submission
    const handleSubmitRegistration = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!user || !userData.synapseId) {
            setRegistrationError('Please log in to register')
            return
        }

        if (govIdLast4.length !== 4) {
            setRegistrationError('Please enter valid last 4 digits of Government ID')
            return
        }

        if (!agreedToTerms) {
            setRegistrationError('Please agree to the Terms & Conditions')
            return
        }

        setIsSubmitting(true)
        setRegistrationError('')

        try {
            let result: { success: boolean; id?: string; error?: string }

            if (existingRegistrationId && registeredDays.length > 0) {
                // Add days to existing registration
                result = await addDaysToRegistration(
                    existingRegistrationId,
                    selectedDays,
                    totalPrice,
                    registeredDays
                )
            } else {
                // Create new registration
                result = await createDayPassRegistration({
                    userId: user.uid,
                    synapseId: userData.synapseId,
                    userName: userData.name,
                    email: userData.email,
                    phone: userData.phone,
                    college: userData.college,
                    governmentIdLast4: govIdLast4,
                    selectedDays: selectedDays,
                    totalAmount: totalPrice,
                    transactionId: transactionId || undefined
                })
            }

            if (result.success) {
                setRegistrationSuccess(true)
                // Navigate to dashboard after short delay
                setTimeout(() => {
                    closeRegistration()
                    navigate('/user-dashboard')
                }, 1500)
            } else {
                setRegistrationError(result.error || 'Registration failed. Please try again.')
            }
        } catch (error) {
            console.error('Registration error:', error)
            setRegistrationError('An unexpected error occurred. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="events-page">
            <div className="events-content">
                <h1 className="events-title">Events</h1>

                {/* 3 Column Grid */}
                <div className="events-grid">
                    {dayPasses.map((day) => (
                        <div
                            key={day.id}
                            className={`event-column ${isDaySelected(day.id) ? 'selected' : ''} ${isDayRegistered(day.id) ? 'registered' : ''}`}
                        >
                            <div className="event-image-container">
                                <img src={day.image} alt={day.title} className="event-image" />
                                <div className="event-image-overlay" />
                            </div>
                            <h2 className="day-pass-title">{day.title}</h2>
                            <ul className="day-pass-features">
                                {day.features.map((feature, idx) => (
                                    <li key={idx}>{feature}</li>
                                ))}
                            </ul>
                            <div className="day-pass-price">{day.price}</div>
                            <div className="day-pass-actions">
                                <button className="btn-explore" onClick={() => openModal(day)}>
                                    Explore
                                </button>
                                {isDayRegistered(day.id) ? (
                                    <button className="btn-select registered" disabled>
                                        Registered ✓
                                    </button>
                                ) : (
                                    <button
                                        className={`btn-select ${isDaySelected(day.id) ? 'selected' : ''}`}
                                        onClick={() => toggleDaySelection(day.id)}
                                    >
                                        {isDaySelected(day.id) ? 'Selected' : 'Select'}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Checkout Bar - shows when days are selected */}
                {selectedDays.length > 0 && (
                    <div className="checkout-bar">
                        <div className="checkout-info">
                            <span className="checkout-count">{selectedDays.length} Day{selectedDays.length > 1 ? 's' : ''} Selected</span>
                            <span className="checkout-total">Total: ₹{totalPrice}</span>
                        </div>
                        <button className="btn-checkout" onClick={openRegistration}>Proceed to Register</button>
                    </div>
                )}
            </div>

            {/* Registration Form Modal */}
            {showRegistration && (

                <div className="modal-overlay" onClick={closeRegistration}>
                    <div className="registration-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close" onClick={closeRegistration}>×</button>

                        <div className="registration-left">
                            <h2>Register for Event</h2>
                            <p className="registration-subtitle">You're registering for: <strong>{selectedDayNames}</strong></p>
                            <div className="registration-summary">
                                <span>Total Amount</span>
                                <span className="registration-price">₹{totalPrice}</span>
                            </div>
                        </div>

                        <div className="registration-right">
                            <form className="registration-form" onSubmit={(e) => e.preventDefault()}>
                                {/* Row 1: Name & Email (Read-only) */}
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Full Name</label>
                                        <input
                                            type="text"
                                            value={userData.name}
                                            readOnly
                                            className="readonly-field"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Email</label>
                                        <input
                                            type="email"
                                            value={userData.email}
                                            readOnly
                                            className="readonly-field"
                                        />
                                    </div>
                                </div>

                                {/* Row 2: Phone & Gender (Read-only) */}
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Phone</label>
                                        <input
                                            type="tel"
                                            value={userData.phone}
                                            readOnly
                                            className="readonly-field"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Gender</label>
                                        <input
                                            type="text"
                                            value={userData.gender}
                                            readOnly
                                            className="readonly-field"
                                        />
                                    </div>
                                </div>

                                {/* Row 3: College & Synapse ID (Read-only) */}
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>College Name</label>
                                        <input
                                            type="text"
                                            value={userData.college}
                                            readOnly
                                            className="readonly-field"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Synapse ID</label>
                                        <input
                                            type="text"
                                            value={userData.synapseId}
                                            readOnly
                                            className="readonly-field synapse-id"
                                        />
                                    </div>
                                </div>

                                {/* Row 4: Government ID */}
                                <div className="form-row">
                                    <div className="form-group gov-id-group">
                                        <label>Government ID (Last 4 digits)</label>
                                        <div className="gov-id-input-wrapper">
                                            <input
                                                type="text"
                                                placeholder="Enter last 4 digits (e.g., 1234)"
                                                value={govIdLast4}
                                                onChange={(e) => setGovIdLast4(e.target.value.slice(0, 4).toUpperCase())}
                                                maxLength={4}
                                                readOnly={!!existingRegistrationId}
                                                className={existingRegistrationId ? 'readonly-field' : ''}
                                            />
                                            {govIdLast4.length === 4 && (
                                                <span className="id-type-badge">{detectIdType(govIdLast4)}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Terms Checkbox */}
                                <div className="terms-checkbox">
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={agreedToTerms}
                                            onChange={(e) => setAgreedToTerms(e.target.checked)}
                                        />
                                        <span>I agree to the <a href="/terms" target="_blank">Terms & Conditions</a></span>
                                    </label>
                                </div>

                                {/* Error Message */}
                                {registrationError && (
                                    <div className="registration-error">
                                        {registrationError}
                                    </div>
                                )}

                                {/* Success Message */}
                                {registrationSuccess && (
                                    <div className="registration-success">
                                        ✓ Registration successful! Redirecting to dashboard...
                                    </div>
                                )}

                                {/* Submit Button */}
                                {totalPrice > 0 ? (
                                    <button
                                        type="button"
                                        className="btn-submit"
                                        disabled={!agreedToTerms || govIdLast4.length !== 4 || registrationSuccess}
                                        onClick={openPaymentModal}
                                    >
                                        Pay ₹{totalPrice}
                                    </button>
                                ) : (
                                    <button
                                        type="submit"
                                        className="btn-submit"
                                        disabled={!agreedToTerms || govIdLast4.length !== 4 || isSubmitting || registrationSuccess}
                                        onClick={handleSubmitRegistration}
                                    >
                                        {isSubmitting ? 'Submitting...' : 'Complete Registration'}
                                    </button>
                                )}
                            </form>
                        </div>
                    </div>

                    {/* Payment Modal - Overlay on top of registration modal */}
                    {showPaymentModal && (
                        <div className="payment-modal-overlay" onClick={closePaymentModal}>
                            <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
                                <button className="modal-close" onClick={closePaymentModal}>×</button>

                                <h3 className="payment-title">Payment</h3>
                                <p className="payment-amount">Amount: <strong>₹{totalPrice}</strong></p>

                                {/* Payment Method Selection */}
                                <div className="payment-methods">
                                    <label>Select Payment Method</label>
                                    <div className="payment-method-options">
                                        <button
                                            className={`payment-option ${paymentMethod === 'upi-qr' ? 'active' : ''}`}
                                            onClick={() => setPaymentMethod('upi-qr')}
                                        >
                                            UPI QR
                                        </button>
                                        <button
                                            className={`payment-option ${paymentMethod === 'upi-id' ? 'active' : ''}`}
                                            onClick={() => setPaymentMethod('upi-id')}
                                        >
                                            UPI ID
                                        </button>
                                        {isMobileDevice() && (
                                            <button
                                                className={`payment-option ${paymentMethod === 'by-app' ? 'active' : ''}`}
                                                onClick={() => setPaymentMethod('by-app')}
                                            >
                                                By App
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* UPI QR Option */}
                                {paymentMethod === 'upi-qr' && (
                                    <div className="payment-content">
                                        <div
                                            className={`upi-qr-container ${qrEnlarged ? 'enlarged' : ''}`}
                                            onClick={() => setQrEnlarged(!qrEnlarged)}
                                        >
                                            <img
                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=${qrEnlarged ? '300x300' : '200x200'}&data=${encodeURIComponent(generateUpiUrl(totalPrice))}`}
                                                alt="UPI QR Code"
                                                className="upi-qr-image"
                                            />
                                            <p className="upi-scan-text">
                                                {qrEnlarged ? 'Click to minimize' : 'Click to enlarge • Scan with any UPI app'}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* UPI ID Option */}
                                {paymentMethod === 'upi-id' && (
                                    <div className="payment-content">
                                        {!requestSent ? (
                                            <>
                                                <div className="form-group">
                                                    <label>Enter Your UPI ID</label>
                                                    <input
                                                        type="text"
                                                        placeholder="yourname@upi"
                                                        value={userUpiId}
                                                        onChange={(e) => setUserUpiId(e.target.value)}
                                                    />
                                                </div>
                                                <button
                                                    className="btn-send-request"
                                                    onClick={handleSendRequest}
                                                    disabled={!userUpiId.trim()}
                                                >
                                                    Send Request
                                                </button>
                                                <p className="upi-note">A payment request of ₹{totalPrice} will be sent to this UPI ID</p>
                                            </>
                                        ) : (
                                            <div className="request-sent-message">
                                                <span className="check-icon">✓</span>
                                                <p>Payment request sent to <strong>{userUpiId}</strong></p>
                                                <p className="upi-note">Please check your UPI app and complete the payment</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* By App Option */}
                                {paymentMethod === 'by-app' && (
                                    <div className="payment-content">
                                        <button className="btn-open-app" onClick={handlePayByApp}>
                                            Open Payment App
                                        </button>
                                        <p className="upi-note">This will open your default UPI app</p>
                                    </div>
                                )}

                                {/* Already Paid Section */}
                                {paymentMethod && (
                                    <div className="already-paid-section">
                                        <p className="already-paid-text">Already Paid?</p>
                                        {!showTransactionInput ? (
                                            <button
                                                className="btn-enter-txn"
                                                onClick={() => setShowTransactionInput(true)}
                                            >
                                                Enter Your UPI Transaction ID
                                            </button>
                                        ) : (
                                            <div className="transaction-input-section">
                                                <div className="form-group">
                                                    <input
                                                        type="text"
                                                        placeholder="Enter 12-35 character Transaction ID"
                                                        value={transactionId}
                                                        onChange={(e) => setTransactionId(e.target.value.toUpperCase())}
                                                    />
                                                </div>
                                                {transactionError && (
                                                    <p className="transaction-error">{transactionError}</p>
                                                )}
                                                {!validateTransactionId(transactionId) && transactionId.length > 0 && (
                                                    <p className="transaction-hint">Transaction ID should be 12-35 alphanumeric characters</p>
                                                )}
                                                {validateTransactionId(transactionId) && (
                                                    <button
                                                        className="btn-submit"
                                                        onClick={async (e) => {
                                                            handleTransactionSubmit()
                                                            if (validateTransactionId(transactionId)) {
                                                                closePaymentModal()
                                                                await handleSubmitRegistration(e)
                                                            }
                                                        }}
                                                    >
                                                        Complete Registration
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Modal Overlay */}
            {selectedDay && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close" onClick={closeModal}>×</button>

                        <div className="modal-image">
                            <img src={selectedDay.image} alt={selectedDay.title} />
                        </div>

                        <div className="modal-body">
                            <h2 className="modal-title">{selectedDay.title}</h2>
                            <div className="modal-meta">
                                <div className="modal-meta-left">
                                    <span>{selectedDay.extendedInfo.date}</span>
                                    <span>{selectedDay.extendedInfo.timing}</span>
                                </div>
                                <a
                                    href="https://maps.app.goo.gl/zr4Yg3uhrYabnjH49"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="modal-location"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                        <circle cx="12" cy="10" r="3" />
                                    </svg>
                                    ZCOER, Pune
                                </a>
                            </div>

                            <div className="modal-sections-grid">
                                <div className="modal-section">
                                    <h3>Day Highlights</h3>
                                    <ul>
                                        {selectedDay.extendedInfo.highlights.map((highlight, idx) => (
                                            <li key={idx}>{highlight}</li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="modal-section">
                                    <h3>Included Benefits</h3>
                                    <ul>
                                        {selectedDay.features.map((feature, idx) => (
                                            <li key={idx}>{feature}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            <div className="modal-footer">
                                <div className="modal-price">{selectedDay.price}</div>
                                {isDayRegistered(selectedDay.id) ? (
                                    <button className="btn-select registered" disabled>
                                        Registered ✓
                                    </button>
                                ) : (
                                    <button
                                        className={`btn-select ${isDaySelected(selectedDay.id) ? 'selected' : ''}`}
                                        onClick={() => {
                                            toggleDaySelection(selectedDay.id)
                                            closeModal()
                                        }}
                                    >
                                        {isDaySelected(selectedDay.id) ? 'Selected ✓' : 'Select This Pass'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
