import { useState } from 'react'
import QRCode from 'react-qr-code'
import FloatingLines from '../background/FloatingLines'
import './HolographicCard.css'

interface HolographicCardProps {
    user: {
        name: string
        synapseId: string
        avatar?: string
        email?: string
        gender?: string
        college?: string
    }
    qrData?: string  // Single unified QR data
    hasRegistrations: boolean  // Whether user has any registrations
}

export default function HolographicCard({ user, qrData, hasRegistrations }: HolographicCardProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [isCardVisible, setIsCardVisible] = useState(false)

    // Get user initials for avatar
    const getInitials = (name: string) => {
        return name.charAt(0).toUpperCase()
    }

    // Don't show anything if user has no registrations
    if (!hasRegistrations) {
        return null
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

                                    {/* QR Section (Right) - Single QR */}
                                    {qrData && (
                                        <div className="holo-qr-section">
                                            <div
                                                className="holo-qr-wrapper"
                                                onClick={() => setIsExpanded(true)}
                                            >
                                                <div className="holo-qr-code">
                                                    <QRCode
                                                        value={qrData}
                                                        size={80}
                                                        level="M"
                                                        fgColor="#FFFFFF"
                                                        bgColor="transparent"
                                                    />
                                                </div>
                                            </div>
                                            <div className="holo-qr-name">
                                                Synapse Pass
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
            {isExpanded && qrData && (
                <div className="holo-qr-modal-overlay" onClick={() => setIsExpanded(false)}>
                    <div className="holo-qr-modal-content" onClick={e => e.stopPropagation()}>
                        <div className="holo-qr-modal-label">Synapse Pass</div>
                        <QRCode
                            value={qrData}
                            size={300}
                            level="H"
                        />
                        <div className="holo-qr-modal-hint">Show this code at the entrance</div>
                        <div className="holo-qr-modal-id">{user.synapseId}</div>
                    </div>
                </div>
            )}
        </>
    )
}
