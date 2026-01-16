import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { logout } from '../../utils/auth'
import { getCurrentUser } from '../../lib/auth'
import { getUserOrAdminDocument, type UserDocument, type AdminDocument } from '../../lib/userService'
import { getAllPromotions, type Promotion } from '../../lib/sponsorService'
import ProfileOverlay from '../../components/profile-overlay/ProfileOverlay'
import SettingsOverlay from '../../components/settings-overlay/SettingsOverlay'
import AdminPanel from '../../components/admin-panel/AdminPanel'
import TextType from '../../components/text-type/TextType'
import HolographicCard from '../../components/holographic-card/HolographicCard'
import './UserDashboard.css'

export default function UserDashboard() {
    const navigate = useNavigate()
    const [menuOpen, setMenuOpen] = useState(false)
    const [isProfileOpen, setIsProfileOpen] = useState(false)
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const [activeView, setActiveView] = useState<'competitions' | 'events' | 'admin-panel' | null>(null)
    const [userData, setUserData] = useState<UserDocument | AdminDocument | null>(null)
    const [isAdmin, setIsAdmin] = useState(false)
    const [loading, setLoading] = useState(true)
    const [promotions, setPromotions] = useState<Promotion[]>([])
    const [currentPromoIndex, setCurrentPromoIndex] = useState(0)
    const [promoImageIndex, setPromoImageIndex] = useState(0)

    // Fetch user data from Firestore
    useEffect(() => {
        const fetchUserData = async () => {
            const user = getCurrentUser()
            if (!user) {
                navigate('/user-login')
                return
            }

            const { data, isAdmin: adminStatus } = await getUserOrAdminDocument(user.uid)

            if (data) {
                setUserData(data)
                setIsAdmin(adminStatus)
            } else {
                // User doesn't have a profile, redirect to signup
                navigate('/signup')
            }
            setLoading(false)
        }

        fetchUserData()

        // Fetch promotions
        const fetchPromos = async () => {
            const promos = await getAllPromotions()
            setPromotions(promos)
        }
        fetchPromos()
    }, [navigate])

    // Auto-rotate through promotions (when multiple exist)
    useEffect(() => {
        if (promotions.length <= 1) return

        const interval = setInterval(() => {
            setCurrentPromoIndex(prev => (prev + 1) % promotions.length)
            setPromoImageIndex(0) // Reset image index when switching promo
        }, 5000)

        return () => clearInterval(interval)
    }, [promotions.length])

    // Auto-rotate images within current promotion
    useEffect(() => {
        const currentPromo = promotions[currentPromoIndex]
        if (!currentPromo?.images || currentPromo.images.length <= 1) return

        const interval = setInterval(() => {
            setPromoImageIndex(prev => (prev + 1) % currentPromo.images.length)
        }, 3000)

        return () => clearInterval(interval)
    }, [promotions, currentPromoIndex])

    // Get display name and other user info
    const displayName = userData?.displayName || 'User'
    const userEmail = userData?.email || ''
    const synapseId = userData?.synapseId || 'SYN-XXX-0000'

    // Get time-based greeting
    const getTimeBasedGreeting = () => {
        const hour = new Date().getHours()
        if (hour < 12) return 'Good Morning'
        if (hour < 17) return 'Good Afternoon'
        return 'Good Evening'
    }

    const handleLogout = async () => {
        await logout()
        navigate('/user-login')
    }

    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="loading-spinner"></div>
            </div>
        )
    }

    return (
        <div className="dashboard-page">
            {/* Left Sidebar */}
            <div className="dashboard-sidebar">
                {/* Sidebar Container wrapping all sidebar elements */}
                <div className="dashboard-sidebar-container">
                    {/* TOP SECTION - Promotional Space */}
                    <div className="sidebar-top">
                        {(() => {
                            const currentPromo = promotions[currentPromoIndex]
                            const displayMode = currentPromo?.displayMode || 'fill'
                            return (
                                <div
                                    className={`promotional-space-card ${currentPromo?.link ? 'clickable' : ''}`}
                                    onClick={() => {
                                        if (currentPromo?.link) {
                                            window.open(currentPromo.link, '_blank', 'noopener,noreferrer')
                                        }
                                    }}
                                >
                                    {currentPromo?.images && currentPromo.images.length > 0 ? (
                                        displayMode === 'tile' ? (
                                            <div
                                                className="promo-image-tile"
                                                style={{ backgroundImage: `url(${currentPromo.images[promoImageIndex] || currentPromo.images[0]})` }}
                                            />
                                        ) : (
                                            <img
                                                src={currentPromo.images[promoImageIndex] || currentPromo.images[0]}
                                                alt={currentPromo.title || 'Promotional'}
                                                className={`promo-image promo-display-${displayMode}`}
                                                key={`${currentPromoIndex}-${promoImageIndex}`}
                                            />
                                        )
                                    ) : (
                                        <div className="promotional-space-rotated-text">Promotional Space</div>
                                    )}
                                </div>
                            )
                        })()}
                    </div>

                    {/* MIDDLE SECTION - Navigation Buttons */}
                    <div className="sidebar-middle">
                        <button
                            className={`sidebar-nav-btn ${activeView === 'competitions' ? 'active' : ''}`}
                            onClick={() => setActiveView(activeView === 'competitions' ? null : 'competitions')}
                        >
                            My Competitions
                        </button>

                        <button
                            className={`sidebar-nav-btn ${activeView === 'events' ? 'active' : ''}`}
                            onClick={() => setActiveView(activeView === 'events' ? null : 'events')}
                        >
                            My Events
                        </button>

                        {/* Admin-only options */}
                        {isAdmin && (
                            <>
                                <div className="admin-section-divider">
                                    <span>Admin</span>
                                </div>
                                <button
                                    className={`sidebar-nav-btn admin-btn ${activeView === 'admin-panel' ? 'active' : ''}`}
                                    onClick={() => setActiveView(activeView === 'admin-panel' ? null : 'admin-panel')}
                                >
                                    Admin Panel
                                </button>
                            </>
                        )}
                    </div>

                    {/* BOTTOM SECTION - Synapse ID & User Profile */}
                    <div className="sidebar-bottom">
                        {/* Synapse ID Display */}
                        <div className={`synapse-id-display ${isAdmin ? 'admin' : ''}`}>
                            <span className="synapse-id-value">{synapseId}</span>
                        </div>

                        {/* User Profile Section */}
                        <div className="user-profile-section">
                            <div className="user-avatar">
                                {userData?.photoURL ? (
                                    <img
                                        src={userData.photoURL}
                                        alt="Profile"
                                        className="avatar-image"
                                        referrerPolicy="no-referrer"
                                    />
                                ) : (
                                    <span className="avatar-placeholder">
                                        {displayName.charAt(0).toUpperCase()}
                                    </span>
                                )}
                            </div>
                            <div className="user-info">
                                <span className="user-name">
                                    {displayName}
                                    {isAdmin && <span className="admin-tag">ADMIN</span>}
                                </span>
                            </div>
                            <button
                                className="user-menu-btn"
                                onClick={() => setMenuOpen(!menuOpen)}
                                aria-label="User menu"
                            >
                                ⋮
                            </button>
                            {menuOpen && (
                                <div className="user-dropdown-menu">
                                    <button onClick={() => { setIsProfileOpen(true); setMenuOpen(false) }}>Profile</button>
                                    <button onClick={() => { setIsSettingsOpen(true); setMenuOpen(false) }}>Settings</button>
                                    <button onClick={handleLogout}>Logout</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="dashboard-main-content">
                {activeView === 'competitions' && (
                    <div className="content-container">
                        <h2 className="content-title">Competitions</h2>
                        {/* Competition content will go here */}
                        <p className="content-placeholder">Competition content coming soon...</p>
                    </div>
                )}

                {activeView === 'events' && (
                    <div className="content-container">
                        <h2 className="content-title">Events</h2>
                        {/* Events content will go here */}
                        <p className="content-placeholder">Events content coming soon...</p>
                    </div>
                )}

                {/* Admin Panel - only for admins */}
                {activeView === 'admin-panel' && isAdmin && (
                    <div className="content-container admin-panel">
                        <h2 className="content-title">Admin Panel</h2>
                        <AdminPanel
                            permissions={(userData as AdminDocument)?.permissions || []}
                        />
                    </div>
                )}

                {/* Welcome Section - shown when no view is active */}
                {!activeView && (
                    <div className="dashboard-welcome-section">
                        <div className="welcome-message">
                            <TextType
                                text={[`${getTimeBasedGreeting()}, ${displayName}...`]}
                                as="h1"
                                typingSpeed={75}
                                pauseDuration={1500}
                                showCursor={true}
                                cursorCharacter="|"
                                loop={false}
                                className="welcome-heading"
                                hideCursorOnComplete={true}
                            />
                        </div>

                        <p className="welcome-tagline">
                            Synapse '26 is gearing up—don't blink, the future's already loading.
                        </p>

                        <div className="dashboard-holo-card-section">
                            <HolographicCard
                                user={{
                                    name: displayName,
                                    synapseId: synapseId,
                                    avatar: userData?.photoURL,
                                    email: userEmail,
                                    gender: userData?.gender,
                                    college: userData?.college
                                }}
                                registrations={[
                                    {
                                        id: '1',
                                        eventName: 'Hackathon 2026',
                                        type: 'competition',
                                        qrData: 'SYN-HACK-001'
                                    },
                                    {
                                        id: '2',
                                        eventName: 'Tech Summit',
                                        type: 'event',
                                        qrData: 'SYN-EVENT-002'
                                    },
                                    {
                                        id: '3',
                                        eventName: 'Gaming Cup',
                                        type: 'competition',
                                        qrData: 'SYN-GAME-003'
                                    }
                                ]}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Profile Overlay */}
            <ProfileOverlay isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

            {/* Settings Overlay */}
            <SettingsOverlay
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                synapseId={synapseId}
                isAdmin={isAdmin}
            />
        </div>
    )
}
