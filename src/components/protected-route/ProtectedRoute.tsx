import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { onAuthChange } from '../../lib/auth'
import type { User } from 'firebase/auth'

interface ProtectedRouteProps {
    children: React.ReactNode
}

/**
 * ProtectedRoute Component
 * Wraps routes that require authentication
 * Redirects to login page if user is not authenticated
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const unsubscribe = onAuthChange((firebaseUser) => {
            setUser(firebaseUser)
            setLoading(false)
        })

        return () => unsubscribe()
    }, [])

    // Show loading state while checking auth
    if (loading) {
        return (
            <div className="auth-loading">
                <div className="loading-spinner"></div>
            </div>
        )
    }

    // Redirect to login if not authenticated
    if (!user) {
        return <Navigate to="/user-login" replace />
    }

    // Render the protected component if authenticated
    return <>{children}</>
}
