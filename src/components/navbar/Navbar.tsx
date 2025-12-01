import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { logout, isAuthenticated } from '../../utils/auth'
import './Navbar.css'
import logoImage from '../../assets/logos/logo.png'

type NavItem = {
    label: string
    href: string
}

const navItems: NavItem[] = [
    { label: 'Home', href: '/' },
    { label: 'Events', href: '/events' },
    { label: 'Competitions', href: '/competitions' },
    { label: 'CCP', href: '/ccp' },
    { label: 'Join', href: '/join' },
    { label: 'Contact', href: '/contact' }
]

export default function Navbar() {
    const navigate = useNavigate()
    const [scrolled, setScrolled] = useState(false)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [isLoggedIn, setIsLoggedIn] = useState(false)

    // Check if user is logged in
    useEffect(() => {
        const checkLoginStatus = () => {
            setIsLoggedIn(isAuthenticated())
        }

        checkLoginStatus()
        // Listen for storage changes (when user logs in/out in another tab)
        window.addEventListener('storage', checkLoginStatus)
        // Listen for userAuthChanged event (same-tab changes)
        window.addEventListener('userAuthChanged', checkLoginStatus)

        return () => {
            window.removeEventListener('storage', checkLoginStatus)
            window.removeEventListener('userAuthChanged', checkLoginStatus)
        }
    }, [])

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20)
        }

        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    useEffect(() => {
        // Prevent body scroll when mobile menu is open
        if (mobileMenuOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }

        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [mobileMenuOpen])

    const closeMobileMenu = () => {
        setMobileMenuOpen(false)
    }

    const handleNavClick = (href: string) => {
        closeMobileMenu()
        if (href.startsWith('#')) {
            // Scroll to element on current page
            const element = document.querySelector(href)
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' })
            }
        } else if (href.startsWith('/')) {
            // Navigate to route
            navigate(href)
        } else {
            window.location.href = href
        }
    }

    const handleAuthClick = () => {
        if (isLoggedIn) {
            // Logout using centralized utility
            logout()
            navigate('/user-login')
        } else {
            // Navigate to login
            navigate('/user-login')
        }
    }

    return (
        <nav className="navbar-container">
            <div className={`navbar-inner ${scrolled ? 'scrolled' : ''}`}>
                {/* Logo */}
                <div className="navbar-logo" onClick={() => window.location.reload()}>
                    <div className="navbar-logo-image">
                        <img src={logoImage} alt="Synapse Logo" className="logo-img" />
                    </div>
                </div>

                {/* Desktop Navigation */}
                <div className="navbar-links desktop-only">
                    {navItems.map((item, index) => (
                        <button
                            key={index}
                            onClick={() => handleNavClick(item.href)}
                            className="navbar-link"
                        >
                            {item.label}
                        </button>
                    ))}
                </div>

                {/* Desktop Auth Button */}
                <button
                    className={`navbar-cta desktop-only ${isLoggedIn ? 'logout' : ''}`}
                    onClick={handleAuthClick}
                >
                    {isLoggedIn ? 'Logout' : 'Login'}
                </button>

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
                                    onClick={() => handleNavClick(item.href)}
                                    className="mobile-menu-link"
                                >
                                    {item.label}
                                </button>
                            ))}
                            <button
                                onClick={handleAuthClick}
                                className={`mobile-menu-link cta ${isLoggedIn ? 'logout' : ''}`}
                            >
                                {isLoggedIn ? 'Logout' : 'Login'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    )
}
