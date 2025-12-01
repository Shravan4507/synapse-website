import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { logout, getCurrentUser, getUserProfile } from '../../utils/auth'
import ProfileOverlay from '../../components/profile-overlay/ProfileOverlay'
import TextType from '../../components/text-type/TextType'
import './UserDashboard.css'

export default function UserDashboard() {
    const navigate = useNavigate()
    const [menuOpen, setMenuOpen] = useState(false)
    const [isProfileOpen, setIsProfileOpen] = useState(false)
    const [activeView, setActiveView] = useState<'competitions' | 'events' | null>(null)

    const userEmail = getCurrentUser() || 'user@synapse.org'
    // Extract user's name from email (before @) and capitalize it
    const userName = userEmail.split('@')[0].split('.').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')

    // Get user profile and display name
    const userProfile = getUserProfile()
    const displayName = userProfile?.fullName || userName

    // Get time-based greeting
    const getTimeBasedGreeting = () => {
        const hour = new Date().getHours()
        if (hour < 12) return 'Good Morning'
        if (hour < 17) return 'Good Afternoon'
        return 'Good Evening'
    }

    const handleLogout = () => {
        logout()
        navigate('/user-login')
    }

    return (
        <div className="dashboard-page">
            {/* Left Sidebar */}
            <div className="dashboard-sidebar">
                {/* Sidebar Container wrapping all sidebar elements */}
                <div className="dashboard-sidebar-container">
                    {/* Advertisement Area Card */}
                    <div className="advertisement-card">
                        <div className="advertisement-rotated-text">Advertisement Area</div>
                    </div>

                    {/* Navigation Buttons */}
                    <button
                        className={`sidebar-nav-btn ${activeView === 'competitions' ? 'active' : ''}`}
                        onClick={() => setActiveView(activeView === 'competitions' ? null : 'competitions')}
                    >
                        Competitions
                    </button>

                    <button
                        className={`sidebar-nav-btn ${activeView === 'events' ? 'active' : ''}`}
                        onClick={() => setActiveView(activeView === 'events' ? null : 'events')}
                    >
                        Events
                    </button>

                    {/* Synapse ID Display */}
                    <div className="synapse-id-display">
                        <span className="synapse-id-value">SYN00000</span>
                    </div>

                    {/* User Profile Section */}
                    <div className="user-profile-section">
                        <div className="user-avatar">
                            <span className="avatar-placeholder">DASH IMAGE</span>
                        </div>
                        <div className="user-info">
                            <span className="user-name">{userName}</span>
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
                                <button onClick={handleLogout}>Logout</button>
                            </div>
                        )}
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
                    </div>
                )}
            </div>

            {/* Profile Overlay */}
            <ProfileOverlay isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
        </div>
    )
}
