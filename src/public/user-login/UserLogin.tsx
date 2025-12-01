import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../../utils/auth'
import './UserLogin.css'

export default function UserLogin() {
    const navigate = useNavigate()
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    })
    const [rememberMe, setRememberMe] = useState(false)
    const [isSignUp, setIsSignUp] = useState(false)
    const [error, setError] = useState('')

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        setError('') // Clear error on input change
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setError('') // Clear previous errors

        if (isSignUp) {
            // Sign up logic (for now just show success)
            alert('Account created successfully! Please login.')
            setIsSignUp(false)
            setFormData({ email: '', password: '' })
        } else {
            // Login logic - check credentials
            // Note: In production, password verification would be done on the server
            if (formData.email === 'user@synapse.org' && formData.password === 'user123') {
                try {
                    // Use centralized auth utility with enhanced security
                    const result = login(formData.email, rememberMe)

                    if (result.success) {
                        // Redirect to dashboard - ProtectedRoute will handle authorization
                        navigate('/user-dashboard')
                    } else {
                        // Display error from login function (e.g., rate limiting, invalid format)
                        setError(result.error || 'Login failed. Please try again.')
                    }
                } catch (error) {
                    console.error('Login error:', error)
                    setError('An unexpected error occurred. Please try again.')
                }
            } else {
                setError('Invalid email or password')
            }
        }
    }

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-card">
                    <h1 className="login-title">
                        {isSignUp ? 'Create Account' : 'Welcome Back'}
                    </h1>
                    <p className="login-subtitle">
                        {isSignUp ? 'Join Synapse today' : 'Sign in to your account'}
                    </p>

                    {error && <div className="error-message">{error}</div>}

                    <form className="login-form" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="email">Email Address</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                placeholder="your.email@example.com"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleInputChange}
                                placeholder="Enter your password"
                                required
                            />
                        </div>

                        {!isSignUp && (
                            <div className="form-options">
                                <label className="remember-me">
                                    <input
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                    />
                                    <span>Remember me</span>
                                </label>
                                <a href="#forgot" className="forgot-password">
                                    Forgot password?
                                </a>
                            </div>
                        )}

                        <button type="submit" className="login-btn">
                            {isSignUp ? 'Sign Up' : 'Login'}
                        </button>
                    </form>

                    <div className="login-divider">
                        <span>OR</span>
                    </div>

                    <button
                        type="button"
                        className="toggle-mode-btn"
                        onClick={() => setIsSignUp(!isSignUp)}
                    >
                        {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
                    </button>
                </div>
            </div>
        </div>
    )
}
