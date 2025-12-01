import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isAuthenticated } from '../../utils/auth'
import './UserDashboardButton.css'

export default function UserDashboardButton() {
    const navigate = useNavigate()
    const [isLoggedIn, setIsLoggedIn] = useState(isAuthenticated())
    const [isVisible, setIsVisible] = useState(isAuthenticated())
    const [isAnimatingOut, setIsAnimatingOut] = useState(false)

    useEffect(() => {
        const checkLoginStatus = () => {
            const loggedIn = isAuthenticated()

            if (loggedIn && !isLoggedIn) {
                // User just logged in - show button with slide-in animation
                setIsLoggedIn(true)
                setIsVisible(true)
                setIsAnimatingOut(false)
            } else if (!loggedIn && isLoggedIn) {
                // User just logged out - trigger slide-out animation
                setIsAnimatingOut(true)
                // Wait for animation to complete before hiding
                setTimeout(() => {
                    setIsLoggedIn(false)
                    setIsVisible(false)
                    setIsAnimatingOut(false)
                }, 600) // Match the slideOutToRight animation duration
            }
        }

        // Listen for storage changes (when user logs in/out in another tab)
        window.addEventListener('storage', checkLoginStatus)

        // Listen for userAuthChanged event (same-tab changes)
        window.addEventListener('userAuthChanged', checkLoginStatus)

        return () => {
            window.removeEventListener('storage', checkLoginStatus)
            window.removeEventListener('userAuthChanged', checkLoginStatus)
        }
    }, [isLoggedIn])

    // Don't render if not visible
    if (!isVisible) {
        return null
    }

    const handleClick = () => {
        navigate('/user-dashboard')
    }

    return (
        <button
            className={`user-dashboard-button ${isAnimatingOut ? 'slide-out' : ''}`}
            onClick={handleClick}
            aria-label="Go to dashboard"
        >
            <span>DASHBOARD</span>
        </button>
    )
}
