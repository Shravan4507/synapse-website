import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { usePageVisibility } from '../../context/PageVisibilityContext'
import { onAuthChange } from '../../lib/auth'
import { logout } from '../../utils/auth'
import { getUserOrAdminDocument, type UserDocument, type AdminDocument } from '../../lib/userService'
import './Navbar.css'
import logoImage from '../../assets/logos/logo.png'

type NavItem = {
    label: string
    href: string
    visibilityKey?: 'recruitments' | 'events' | 'competitions' | 'sponsors'
}

const navItems: NavItem[] = [
    { label: 'Home', href: '/' },
    { label: 'Events', href: '/events', visibilityKey: 'events' },
    { label: 'Competitions', href: '/competitions', visibilityKey: 'competitions' },
    { label: 'Sponsors', href: '/sponsors', visibilityKey: 'sponsors' },
    { label: 'Join', href: '/join', visibilityKey: 'recruitments' },
    { label: 'Contact', href: '/contact' }
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
            setScrolled(window.scrollY > 20)
        }
        window.addEventListener('scroll', handleScroll)
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
        <nav className="navbar-container">
            <div className={`navbar-inner ${scrolled ? 'scrolled' : ''}`}>
                {/* Logo */}
                <div className="navbar-logo" onClick={() => navigate('/')}>
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

            {/* Mobile Menu Overlay */}
            {mobileMenuOpen && (
                <div className="mobile-menu-overlay" onClick={closeMobileMenu}>
                    <div className="mobile-menu-content" onClick={(e) => e.stopPropagation()}>
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
                        </div>
                    </div>
                </div>
            )}
        </nav>
    )
}
