import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { onAuthChange, logOut } from '../lib/auth'
import { checkUserExists, checkAdminExists } from '../lib/userService'
import {
    isSessionValid,
    updateActivity,
    clearSession,
    setupActivityListeners,
    setReturnUrl
} from '../lib/sessionService'
import type { User } from 'firebase/auth'

interface AuthContextType {
    user: User | null
    isAuthenticated: boolean
    isLoading: boolean
    hasProfile: boolean
    logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    hasProfile: false,
    logout: async () => { }
})

export const useAuth = () => useContext(AuthContext)

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/', '/join', '/events', '/competitions', '/sponsors', '/contact', '/user-login', '/signup', '/signup-admin', '/admin-signup-form', '/ccp']

interface AuthProviderProps {
    children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
    const navigate = useNavigate()
    const location = useLocation()
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [hasProfile, setHasProfile] = useState(false)

    // Setup activity listeners for session tracking
    useEffect(() => {
        const cleanup = setupActivityListeners()
        return cleanup
    }, [])

    // Check session validity periodically
    useEffect(() => {
        const checkSession = () => {
            if (user && !isSessionValid()) {
                // Session expired - logout
                console.log('Session expired, logging out...')
                handleLogout()
            }
        }

        // Check every minute
        const interval = setInterval(checkSession, 60000)

        // Also check on visibility change (when user returns to tab)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkSession()
                if (user) updateActivity()
            }
        }
        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            clearInterval(interval)
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [user])

    // Listen to auth state changes
    useEffect(() => {
        const unsubscribe = onAuthChange(async (firebaseUser) => {
            if (firebaseUser) {
                // Check if session is still valid
                if (!isSessionValid()) {
                    console.log('Session invalid, logging out...')
                    await logOut()
                    clearSession()
                    setUser(null)
                    setHasProfile(false)
                    setIsLoading(false)
                    return
                }

                setUser(firebaseUser)

                // Check if user has profile
                const userExists = await checkUserExists(firebaseUser.uid)
                const adminExists = await checkAdminExists(firebaseUser.uid)
                setHasProfile(userExists || adminExists)

                updateActivity()
            } else {
                setUser(null)
                setHasProfile(false)
            }
            setIsLoading(false)
        })

        return () => unsubscribe()
    }, [])

    // Handle protected route access
    useEffect(() => {
        if (isLoading) return

        const currentPath = location.pathname
        const isPublicRoute = PUBLIC_ROUTES.some(route =>
            currentPath === route || currentPath.startsWith(route + '/')
        )

        // If trying to access protected route without auth
        if (!isPublicRoute && !user) {
            setReturnUrl(currentPath)
            navigate('/user-login')
        }
    }, [isLoading, user, location.pathname, navigate])

    const handleLogout = async () => {
        await logOut()
        clearSession()
        setUser(null)
        setHasProfile(false)
        navigate('/user-login')
    }

    return (
        <AuthContext.Provider value={{
            user,
            isAuthenticated: !!user,
            isLoading,
            hasProfile,
            logout: handleLogout
        }}>
            {children}
        </AuthContext.Provider>
    )
}
