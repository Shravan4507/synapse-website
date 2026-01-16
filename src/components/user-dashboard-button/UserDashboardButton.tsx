import { useEffect, useState, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { onAuthChange } from '../../lib/auth'
import { logout } from '../../utils/auth'
import { getUserOrAdminDocument, type UserDocument, type AdminDocument } from '../../lib/userService'
import './UserDashboardButton.css'

export default function UserDashboardButton() {
    const navigate = useNavigate()
    const location = useLocation()
    const [userData, setUserData] = useState<UserDocument | AdminDocument | null>(null)
    const [isAnimatingOut, setIsAnimatingOut] = useState(false)
    const [isLoggedIn, setIsLoggedIn] = useState(() => {
        const lastActivity = localStorage.getItem('synapse_last_activity')
        return lastActivity !== null
    })
    const [shouldShow, setShouldShow] = useState(() => {
        const lastActivity = localStorage.getItem('synapse_last_activity')
        return lastActivity !== null
    })
    const [isVisible, setIsVisible] = useState(() => {
        const lastActivity = localStorage.getItem('synapse_last_activity')
        return lastActivity !== null
    })
    const prevPathRef = useRef(location.pathname)

    useEffect(() => {
        const unsubscribe = onAuthChange(async (user) => {
            setIsLoggedIn(user !== null)

            if (user) {
                const { data } = await getUserOrAdminDocument(user.uid)

                if (data) {
                    setUserData(data)
                    setShouldShow(true)
                } else {
                    setUserData(null)
                    setShouldShow(false)
                }
            } else {
                if (isVisible) {
                    setIsAnimatingOut(true)
                    setTimeout(() => {
                        setUserData(null)
                        setShouldShow(false)
                        setIsVisible(false)
                        setIsAnimatingOut(false)
                    }, 600)
                } else {
                    setUserData(null)
                    setShouldShow(false)
                }
            }
        })

        return () => unsubscribe()
    }, [isVisible])

    useEffect(() => {
        const isDashboardPage = location.pathname === '/user-dashboard'
        const wasDashboardPage = prevPathRef.current === '/user-dashboard'

        if (shouldShow && userData) {
            if (isDashboardPage && !wasDashboardPage) {
                setIsAnimatingOut(true)
                setTimeout(() => {
                    setIsVisible(false)
                    setIsAnimatingOut(false)
                }, 600)
            } else if (!isDashboardPage && wasDashboardPage) {
                setIsVisible(true)
                setIsAnimatingOut(false)
            } else if (!isDashboardPage && !isVisible) {
                setIsVisible(true)
            }
        }

        prevPathRef.current = location.pathname
    }, [location.pathname, shouldShow, userData, isVisible])

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
        <div className="user-controls">
            {/* Auth Button - always visible */}
            <button
                className={`auth-btn ${isLoggedIn ? 'logout' : ''}`}
                onClick={handleAuthClick}
            >
                {isLoggedIn ? 'Logout' : 'Login'}
            </button>

            {/* Dashboard Button - only when logged in */}
            {isVisible && userData && (
                <button
                    className={`user-dashboard-button ${isAnimatingOut ? 'slide-out' : ''}`}
                    onClick={handleDashboardClick}
                    aria-label="Go to dashboard"
                >
                    {userData.photoURL ? (
                        <img
                            src={userData.photoURL}
                            alt="Profile"
                            className="dashboard-btn-avatar"
                            referrerPolicy="no-referrer"
                        />
                    ) : (
                        <span className="dashboard-btn-initial">{userInitial}</span>
                    )}
                </button>
            )}
        </div>
    )
}
