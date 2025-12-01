import { Navigate } from 'react-router-dom'
import { isAuthenticated } from '../../utils/auth'

interface ProtectedRouteProps {
    children: React.ReactNode
}

/**
 * ProtectedRoute Component
 * Wraps routes that require authentication
 * Redirects to login page if user is not authenticated or session has expired
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
    // Check if user is authenticated with valid session
    const authenticated = isAuthenticated()

    if (!authenticated) {
        // Redirect to login page if not authenticated
        // The user will be redirected back after login (future enhancement)
        return <Navigate to="/user-login" replace />
    }

    // Render the protected component if authenticated
    return <>{children}</>
}
