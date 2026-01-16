import React, { useState, useRef, useCallback } from 'react'
import QRCode from 'react-qr-code'
import FloatingLines from '../background/FloatingLines'
import './HolographicCard.css'

interface Registration {
    id: string
    eventName: string
    type: 'event' | 'competition'
    qrData: string
}

interface HolographicCardProps {
    user: {
        name: string
        synapseId: string
        avatar?: string
        email?: string
        gender?: string
        college?: string
    }
    registrations?: Registration[]
}

export default function HolographicCard({ user, registrations = [] }: HolographicCardProps) {
    const [activeQRIndex, setActiveQRIndex] = useState(0)
    const [isExpanded, setIsExpanded] = useState(false)
    const [qrNameOpacity, setQrNameOpacity] = useState(1)
    const [isCardVisible, setIsCardVisible] = useState(false)

    // Swipe handling state
    const touchStartX = useRef<number | null>(null)
    const touchEndX = useRef<number | null>(null)

    const hasRegistrations = registrations.length > 0
    const activeRegistration = hasRegistrations ? registrations[activeQRIndex] : null

    // Navigation Handlers with fade transition
    const handlePrev = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation()
        setQrNameOpacity(0)
        setTimeout(() => {
            setActiveQRIndex(prev => (prev - 1 + registrations.length) % registrations.length)
            setQrNameOpacity(1)
        }, 150)
    }, [registrations.length])

    const handleNext = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation()
        setQrNameOpacity(0)
        setTimeout(() => {
            setActiveQRIndex(prev => (prev + 1) % registrations.length)
            setQrNameOpacity(1)
        }, 150)
    }, [registrations.length])

    // Swipe Handlers
    const onTouchStart = useCallback((e: React.TouchEvent) => {
        touchEndX.current = null
        touchStartX.current = e.targetTouches[0].clientX
    }, [])

    const onTouchMove = useCallback((e: React.TouchEvent) => {
        touchEndX.current = e.targetTouches[0].clientX
    }, [])

    const onTouchEnd = useCallback(() => {
        if (!touchStartX.current || !touchEndX.current) return

        const distance = touchStartX.current - touchEndX.current
        const isLeftSwipe = distance > 30
        const isRightSwipe = distance < -30

        if (isLeftSwipe) handleNext()
        if (isRightSwipe) handlePrev()
    }, [handleNext, handlePrev])

    // Get user initials for avatar
    const getInitials = (name: string) => {
        return name.charAt(0).toUpperCase()
    }

    return (
        <>
            <div className="holo-card-wrapper">
                {/* View ID Button - shown when card is hidden */}
                {!isCardVisible && (
                    <button
                        className="holo-view-button"
                        onClick={() => setIsCardVisible(true)}
                    >
                        View ID
                    </button>
                )}

                {/* Card Container - shown when revealed */}
                {isCardVisible && (
                    <>
                        <div className="holo-card-container">
                            <div className="holo-card">
                                {/* FloatingLines Background */}
                                <div className="holo-background">
                                    <FloatingLines
                                        linesGradient={['#00ffff', '#8a2be2', '#0096ff', '#ff69b4']}
                                        enabledWaves={['middle', 'bottom']}
                                        lineCount={[4, 3]}
                                        lineDistance={[8, 6]}
                                        animationSpeed={0.6}
                                        interactive={false}
                                        parallax={false}
                                        mixBlendMode="screen"
                                    />
                                </div>

                                {/* Card Content */}
                                <div className="holo-content">
                                    {/* Profile Section (Left) */}
                                    <div className="holo-profile-section">
                                        <div className="holo-profile-picture">
                                            {user.avatar ? (
                                                <img
                                                    src={user.avatar}
                                                    alt="Profile"
                                                    referrerPolicy="no-referrer"
                                                />
                                            ) : (
                                                getInitials(user.name)
                                            )}
                                        </div>
                                        <div className="holo-profile-name">{user.name}</div>
                                        <div className="holo-synapse-id">
                                            <span>{user.synapseId}</span>
                                        </div>
                                    </div>

                                    {/* Details Section (Middle) */}
                                    <div className="holo-details-section">
                                        {user.gender && (
                                            <div className="holo-info-row">
                                                <span className="holo-info-label">Gender:</span>
                                                <span className="holo-info-value">{user.gender}</span>
                                            </div>
                                        )}
                                        {user.email && (
                                            <div className="holo-info-row">
                                                <span className="holo-info-label">Email:</span>
                                                <span className="holo-info-value">{user.email}</span>
                                            </div>
                                        )}
                                        {user.college && (
                                            <div className="holo-info-row">
                                                <span className="holo-info-label">College:</span>
                                                <span className="holo-info-value college">{user.college}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* QR Section (Right) */}
                                    {hasRegistrations && activeRegistration && (
                                        <div className="holo-qr-section">
                                            <div className="holo-qr-wrapper">
                                                {/* Left Arrow */}
                                                {registrations.length > 1 && (
                                                    <button
                                                        className="holo-qr-nav holo-qr-nav-left"
                                                        onClick={handlePrev}
                                                        aria-label="Previous QR"
                                                    >
                                                        ‹
                                                    </button>
                                                )}

                                                {/* QR Stack */}
                                                <div
                                                    className="holo-qr-stack"
                                                    onClick={() => setIsExpanded(true)}
                                                    onTouchStart={onTouchStart}
                                                    onTouchMove={onTouchMove}
                                                    onTouchEnd={onTouchEnd}
                                                >
                                                    {registrations.map((reg, idx) => (
                                                        <div
                                                            key={reg.id}
                                                            className={`holo-qr-slide ${idx === activeQRIndex ? 'active' : ''}`}
                                                        >
                                                            <QRCode
                                                                value={reg.qrData}
                                                                size={80}
                                                                level="M"
                                                                fgColor="#FFFFFF"
                                                                bgColor="transparent"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Right Arrow */}
                                                {registrations.length > 1 && (
                                                    <button
                                                        className="holo-qr-nav holo-qr-nav-right"
                                                        onClick={handleNext}
                                                        aria-label="Next QR"
                                                    >
                                                        ›
                                                    </button>
                                                )}
                                            </div>

                                            {/* QR Name Label */}
                                            <div
                                                className="holo-qr-name"
                                                style={{ opacity: qrNameOpacity }}
                                            >
                                                {activeRegistration.eventName}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Collapse Button - shown below card */}
                        <button
                            className="holo-collapse-button"
                            onClick={() => setIsCardVisible(false)}
                        >
                            Collapse
                        </button>
                    </>
                )}
            </div>

            {/* Expanded QR Modal */}
            {isExpanded && activeRegistration && (
                <div className="holo-qr-modal-overlay" onClick={() => setIsExpanded(false)}>
                    <div className="holo-qr-modal-content" onClick={e => e.stopPropagation()}>
                        <div className="holo-qr-modal-label">{activeRegistration.eventName}</div>
                        <QRCode
                            value={activeRegistration.qrData}
                            size={300}
                            level="H"
                        />
                        <div className="holo-qr-modal-hint">Show this code at the entrance</div>
                    </div>
                </div>
            )}
        </>
    )
}
