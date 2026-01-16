import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { signInWithGoogle, onAuthChange } from '../../lib/auth'
import { checkUserExists, checkAdminExists } from '../../lib/userService'
import { startSession, getReturnUrl, setReturnUrl } from '../../lib/sessionService'
import './UserLogin.css'

export default function UserLogin() {
    const navigate = useNavigate()
    const location = useLocation()
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [checkingAuth, setCheckingAuth] = useState(true)
    const [rememberMe, setRememberMe] = useState(false)

    // Save return URL from query params or referrer
    useEffect(() => {
        const params = new URLSearchParams(location.search)
        const returnTo = params.get('returnTo')
        if (returnTo) {
            setReturnUrl(returnTo)
        }
    }, [location.search])

    // Check if user is already logged in using Firebase auth state observer
    useEffect(() => {
        const unsubscribe = onAuthChange(async (user) => {
            if (user) {
                // User is already logged in, check if they have a profile
                const userExists = await checkUserExists(user.uid)
                const adminExists = await checkAdminExists(user.uid)

                if (userExists || adminExists) {
                    // Check for return URL first
                    const returnUrl = getReturnUrl()
                    navigate(returnUrl || '/user-dashboard')
                } else {
                    navigate('/signup')
                }
            }
            setCheckingAuth(false)
        })

        return () => unsubscribe()
    }, [navigate])

    const handleGoogleSignIn = async () => {
        setError('')
        setIsLoading(true)

        try {
            const result = await signInWithGoogle()
            const user = result.user

            // Start session with remember me preference
            startSession(rememberMe)

            // Check if user exists in users OR admins collection
            const userExists = await checkUserExists(user.uid)
            const adminExists = await checkAdminExists(user.uid)

            if (userExists || adminExists) {
                // Check for return URL
                const returnUrl = getReturnUrl()
                navigate(returnUrl || '/user-dashboard')
            } else {
                // New user - go to signup to complete profile
                navigate('/signup')
            }
        } catch (err) {
            console.error('Google Sign-In error:', err)
            setError('Failed to sign in with Google. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    // Show loading while checking auth
    if (checkingAuth) {
        return (
            <div className="login-page">
                <div className="login-container">
                    <div className="login-card">
                        <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
                            Checking authentication...
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-card">
                    <h1 className="login-title">Welcome to Synapse</h1>
                    <p className="login-subtitle">
                        Sign in to access your dashboard
                    </p>

                    {error && <div className="error-message">{error}</div>}

                    <button
                        type="button"
                        className="google-signin-btn"
                        onClick={handleGoogleSignIn}
                        disabled={isLoading}
                    >
                        <svg className="google-icon" viewBox="0 0 24 24">
                            <path
                                fill="#4285F4"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                                fill="#34A853"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                                fill="#FBBC05"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                                fill="#EA4335"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                        </svg>
                        <span>{isLoading ? 'Signing in...' : 'Continue with Google'}</span>
                    </button>

                    <label className="remember-me-label">
                        <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                        />
                        <span>Remember me for 7 days</span>
                    </label>

                    <p className="login-footer-text">
                        By continuing, you agree to our Terms of Service and Privacy Policy
                    </p>
                </div>
            </div>
        </div>
    )
}
