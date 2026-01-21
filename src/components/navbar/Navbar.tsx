import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { usePageVisibility } from '../../context/PageVisibilityContext'
import { onAuthChange } from '../../lib/auth'
import { logout } from '../../utils/auth'
import { getUserOrAdminDocument, type UserDocument, type AdminDocument } from '../../lib/userService'
import './Navbar.css'
import logoImage from '../../assets/logos/Logo1.png'
import zcoerLogo from '../../assets/logos/ZCOER-Logo-White.png'

type NavItem = {
    label: string
    href: string
    icon: string
    visibilityKey?: 'recruitments' | 'events' | 'competitions' | 'sponsors'
}

const navItems: NavItem[] = [
    { label: 'Home', href: '/', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { label: 'Events', href: '/events', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', visibilityKey: 'events' },
    { label: 'Competitions', href: '/competitions', icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z', visibilityKey: 'competitions' },
    { label: 'Join', href: '/join', icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z', visibilityKey: 'recruitments' },
    { label: 'Contact', href: '/contact', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' }
]

export default function Navbar() {
    const navigate = useNavigate()
    const location = useLocation()
    const { settings: pageVisibility } = usePageVisibility()
    const [scrolled, setScrolled] = useState(false)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    // Auth state
    const [userData, setUserData] = useState<UserDocument | AdminDocument | null>(null)
    const [isAnimatingOut, setIsAnimatingOut] = useState(false)
    const [isLoggedIn, setIsLoggedIn] = useState(() => {
        const lastActivity = localStorage.getItem('synapse_last_activity')
        return lastActivity !== null
    })
    const [shouldShowDashboard, setShouldShowDashboard] = useState(() => {
        const lastActivity = localStorage.getItem('synapse_last_activity')
        return lastActivity !== null
    })
    const [isDashboardVisible, setIsDashboardVisible] = useState(() => {
        const lastActivity = localStorage.getItem('synapse_last_activity')
        return lastActivity !== null
    })
    const prevPathRef = useRef(location.pathname)

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50)
        }
        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [mobileMenuOpen])

    // Auth state listener
    useEffect(() => {
        const unsubscribe = onAuthChange(async (user) => {
            setIsLoggedIn(user !== null)

            if (user) {
                const { data } = await getUserOrAdminDocument(user.uid)

                if (data) {
                    setUserData(data)
                    setShouldShowDashboard(true)
                } else {
                    setUserData(null)
                    setShouldShowDashboard(false)
                }
            } else {
                if (isDashboardVisible) {
                    setIsAnimatingOut(true)
                    setTimeout(() => {
                        setUserData(null)
                        setShouldShowDashboard(false)
                        setIsDashboardVisible(false)
                        setIsAnimatingOut(false)
                    }, 600)
                } else {
                    setUserData(null)
                    setShouldShowDashboard(false)
                }
            }
        })

        return () => unsubscribe()
    }, [isDashboardVisible])

    // Handle dashboard visibility based on route
    useEffect(() => {
        const isDashboardPage = location.pathname === '/user-dashboard'
        const wasDashboardPage = prevPathRef.current === '/user-dashboard'

        if (shouldShowDashboard && userData) {
            if (isDashboardPage && !wasDashboardPage) {
                setIsAnimatingOut(true)
                setTimeout(() => {
                    setIsDashboardVisible(false)
                    setIsAnimatingOut(false)
                }, 600)
            } else if (!isDashboardPage && wasDashboardPage) {
                setIsDashboardVisible(true)
                setIsAnimatingOut(false)
            } else if (!isDashboardPage && !isDashboardVisible) {
                setIsDashboardVisible(true)
            }
        }

        prevPathRef.current = location.pathname
    }, [location.pathname, shouldShowDashboard, userData, isDashboardVisible])

    const closeMobileMenu = () => {
        setMobileMenuOpen(false)
    }

    // Check if nav item is disabled
    const isItemDisabled = (item: NavItem): boolean => {
        if (!item.visibilityKey) return false
        return !pageVisibility[item.visibilityKey]
    }

    const handleNavClick = (item: NavItem) => {
        if (isItemDisabled(item)) return
        closeMobileMenu()

        const href = item.href
        if (href.startsWith('#')) {
            const element = document.querySelector(href)
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' })
            }
        } else if (href.startsWith('/')) {
            navigate(href)
        } else {
            window.location.href = href
        }
    }

    // Auth handlers
    const handleAuthClick = async () => {
        if (isLoggedIn) {
            await logout()
            navigate('/user-login')
        } else {
            navigate('/user-login')
        }
    }

    const handleDashboardClick = () => {
        setIsAnimatingOut(true)
        setTimeout(() => {
            navigate('/user-dashboard')
        }, 400)
    }

    // Get user's initial for fallback
    const userInitial = userData?.displayName?.charAt(0).toUpperCase() || 'U'

    return (
        <>
            <nav className={`navbar-container ${scrolled ? 'scrolled' : ''}`}>
                <div className={`navbar-inner ${scrolled ? 'scrolled' : ''}`}>
                    {/* Mobile: ZCOER Logo Left */}
                    <div className="navbar-zcoer-logo mobile-only" onClick={() => window.open('https://zcoer.in/', '_blank')}>
                        <img src={zcoerLogo} alt="ZCOER Logo" className="zcoer-logo-img" />
                    </div>

                    {/* Desktop: Combined Logo Section */}
                    <div className="navbar-logos desktop-only">
                        <div className="navbar-zcoer-logo" onClick={() => window.open('https://zcoer.in/', '_blank')}>
                            <img src={zcoerLogo} alt="ZCOER Logo" className="zcoer-logo-img" />
                        </div>
                        <div className="navbar-logo" onClick={() => navigate('/')}>
                            <div className="navbar-logo-image">
                                <img src={logoImage} alt="Synapse Logo" className="logo-img" />
                            </div>
                        </div>
                    </div>

                    {/* Mobile: Synapse Logo Center */}
                    <div className="navbar-logo mobile-synapse-logo" onClick={() => navigate('/')}>
                        <div className="navbar-logo-image">
                            <img src={logoImage} alt="Synapse Logo" className="logo-img" />
                        </div>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="navbar-links desktop-only">
                        {navItems.map((item, index) => (
                            <button
                                key={index}
                                onClick={() => handleNavClick(item)}
                                className={`navbar-link ${isItemDisabled(item) ? 'disabled' : ''}`}
                                disabled={isItemDisabled(item)}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>

                    {/* Desktop Auth Section */}
                    <div className="navbar-auth desktop-only">
                        <button
                            className={`navbar-auth-btn ${isLoggedIn ? 'logout' : ''}`}
                            onClick={handleAuthClick}
                        >
                            {isLoggedIn ? 'Logout' : 'Login'}
                        </button>

                        {isDashboardVisible && userData && (
                            <button
                                className={`navbar-dashboard-btn ${isAnimatingOut ? 'slide-out' : ''}`}
                                onClick={handleDashboardClick}
                                aria-label="Go to dashboard"
                            >
                                {userData.photoURL ? (
                                    <img
                                        src={userData.photoURL}
                                        alt="Profile"
                                        className="navbar-dashboard-avatar"
                                        referrerPolicy="no-referrer"
                                    />
                                ) : (
                                    <span className="navbar-dashboard-initial">{userInitial}</span>
                                )}
                            </button>
                        )}
                    </div>

                    {/* Mobile Hamburger */}
                    <button
                        className="mobile-menu-toggle"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        aria-label="Toggle menu"
                    >
                        <span className={`hamburger-line ${mobileMenuOpen ? 'open' : ''}`}></span>
                        <span className={`hamburger-line ${mobileMenuOpen ? 'open' : ''}`}></span>
                        <span className={`hamburger-line ${mobileMenuOpen ? 'open' : ''}`}></span>
                    </button>
                </div>
            </nav>

            {/* Mobile Menu Overlay - Outside nav to avoid clipping */}
            {mobileMenuOpen && (
                <div className="mobile-menu-overlay" onClick={closeMobileMenu}>
                    <div className="mobile-menu-content" onClick={(e) => e.stopPropagation()}>
                        {/* Close Button */}
                        <button className="mobile-menu-close" onClick={closeMobileMenu}>
                            ×
                        </button>

                        <div className="mobile-menu-links">
                            {navItems.map((item, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleNavClick(item)}
                                    className={`mobile-menu-link ${isItemDisabled(item) ? 'disabled' : ''}`}
                                    disabled={isItemDisabled(item)}
                                >
                                    {item.label}
                                </button>
                            ))}

                            {/* Auth Button */}
                            <button
                                className={`mobile-menu-link cta ${isLoggedIn ? 'logout' : ''}`}
                                onClick={() => {
                                    closeMobileMenu()
                                    handleAuthClick()
                                }}
                            >
                                {isLoggedIn ? 'Logout' : 'Login'}
                            </button>

                            {/* Dashboard Button */}
                            {isLoggedIn && userData && (
                                <button
                                    className="mobile-menu-link cta"
                                    onClick={() => {
                                        closeMobileMenu()
                                        handleDashboardClick()
                                    }}
                                >
                                    Dashboard
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile Bottom Navigation Bar - Outside nav to avoid position conflict */}
            <div className="mobile-bottom-nav">
                {navItems.map((item, index) => (
                    <button
                        key={index}
                        onClick={() => handleNavClick(item)}
                        className={`bottom-nav-item ${location.pathname === item.href ? 'active' : ''} ${isItemDisabled(item) ? 'disabled' : ''}`}
                        disabled={isItemDisabled(item)}
                    >
                        <svg
                            className="bottom-nav-icon"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.5}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                        </svg>
                    </button>
                ))}

                {/* Profile/Login Button */}
                {isLoggedIn && userData ? (
                    <button
                        className={`bottom-nav-item profile ${location.pathname === '/user-dashboard' ? 'active' : ''}`}
                        onClick={handleDashboardClick}
                    >
                        {userData.photoURL ? (
                            <img
                                src={userData.photoURL}
                                alt="Profile"
                                className="bottom-nav-avatar"
                                referrerPolicy="no-referrer"
                            />
                        ) : (
                            <span className="bottom-nav-initial">{userInitial}</span>
                        )}
                    </button>
                ) : (
                    <button
                        className="bottom-nav-item login"
                        onClick={handleAuthClick}
                    >
                        <svg
                            className="bottom-nav-icon"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.5}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                    </button>
                )}
            </div>
        </>
    )
}
