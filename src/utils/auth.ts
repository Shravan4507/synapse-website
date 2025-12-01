/**
 * Centralized Authentication Utility with Enhanced Security
 * Manages user authentication state with session expiration and security checks
 */

// Storage keys
const USER_EMAIL_KEY = 'userEmail'
const REMEMBER_ME_KEY = 'rememberMe'
const USER_PROFILE_KEY = 'userProfile'
const SESSION_TIMESTAMP_KEY = 'sessionTimestamp'
const LOGIN_ATTEMPTS_KEY = 'loginAttempts'

// Session duration constants (in milliseconds)
const SESSION_DURATION_REGULAR = 24 * 60 * 60 * 1000 // 24 hours
const SESSION_DURATION_REMEMBER_ME = 7 * 24 * 60 * 60 * 1000 // 7 days
const MAX_LOGIN_ATTEMPTS = 5
const LOGIN_ATTEMPT_RESET_TIME = 15 * 60 * 1000 // 15 minutes

/**
 * User Profile Interface
 */
export interface UserProfile {
    // Personal Details
    profilePicture?: string
    fullName: string
    gender?: string
    dateOfBirth?: string
    mobileNumber?: string
    city?: string
    state?: string

    // Academic Details
    college?: string
    branch?: string
    currentYear?: string
    expectedGraduation?: string

    // Account Details
    email: string
    synapseId?: string
}

/**
 * Sanitize user input to prevent XSS attacks
 */
const sanitizeInput = (input: string): string => {
    if (!input) return ''

    // Remove HTML tags and potentially dangerous characters
    return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;')
        .trim()
}

/**
 * Validate email format
 */
const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
}

/**
 * Dispatches custom events to notify all components of auth state changes
 */
const dispatchAuthEvent = (): void => {
    try {
        window.dispatchEvent(new Event('storage'))
        window.dispatchEvent(new CustomEvent('userAuthChanged'))
    } catch (error) {
        console.error('Error dispatching auth event:', error)
    }
}

/**
 * Check if session has expired
 */
const isSessionExpired = (): boolean => {
    try {
        const timestamp = localStorage.getItem(SESSION_TIMESTAMP_KEY)
        if (!timestamp) return true

        const sessionStart = parseInt(timestamp, 10)
        if (isNaN(sessionStart)) return true

        const now = Date.now()
        const rememberMe = localStorage.getItem(REMEMBER_ME_KEY) === 'true'
        const maxDuration = rememberMe ? SESSION_DURATION_REMEMBER_ME : SESSION_DURATION_REGULAR

        return (now - sessionStart) > maxDuration
    } catch (error) {
        console.error('Error checking session expiration:', error)
        return true
    }
}

/**
 * Clear all session data
 */
const clearSession = (): void => {
    try {
        localStorage.removeItem(USER_EMAIL_KEY)
        localStorage.removeItem(REMEMBER_ME_KEY)
        localStorage.removeItem(USER_PROFILE_KEY)
        localStorage.removeItem(SESSION_TIMESTAMP_KEY)
    } catch (error) {
        console.error('Error clearing session:', error)
    }
}

/**
 * Check and increment login attempts for rate limiting
 */
const checkLoginAttempts = (): { allowed: boolean; remainingAttempts: number } => {
    try {
        const attemptsData = localStorage.getItem(LOGIN_ATTEMPTS_KEY)

        if (!attemptsData) {
            return { allowed: true, remainingAttempts: MAX_LOGIN_ATTEMPTS }
        }

        const { count, timestamp } = JSON.parse(attemptsData)
        const now = Date.now()

        // Reset if enough time has passed
        if (now - timestamp > LOGIN_ATTEMPT_RESET_TIME) {
            localStorage.removeItem(LOGIN_ATTEMPTS_KEY)
            return { allowed: true, remainingAttempts: MAX_LOGIN_ATTEMPTS }
        }

        const remaining = MAX_LOGIN_ATTEMPTS - count
        return {
            allowed: count < MAX_LOGIN_ATTEMPTS,
            remainingAttempts: Math.max(0, remaining)
        }
    } catch (error) {
        console.error('Error checking login attempts:', error)
        return { allowed: true, remainingAttempts: MAX_LOGIN_ATTEMPTS }
    }
}

/**
 * Record a failed login attempt
 */
const recordLoginAttempt = (): void => {
    try {
        const attemptsData = localStorage.getItem(LOGIN_ATTEMPTS_KEY)
        const now = Date.now()

        if (!attemptsData) {
            localStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify({
                count: 1,
                timestamp: now
            }))
            return
        }

        const { count, timestamp } = JSON.parse(attemptsData)

        // Reset if enough time has passed
        if (now - timestamp > LOGIN_ATTEMPT_RESET_TIME) {
            localStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify({
                count: 1,
                timestamp: now
            }))
        } else {
            localStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify({
                count: count + 1,
                timestamp
            }))
        }
    } catch (error) {
        console.error('Error recording login attempt:', error)
    }
}

/**
 * Reset login attempts after successful login
 */
const resetLoginAttempts = (): void => {
    try {
        localStorage.removeItem(LOGIN_ATTEMPTS_KEY)
    } catch (error) {
        console.error('Error resetting login attempts:', error)
    }
}

/**
 * Login a user and persist their session
 * @param email - User's email address
 * @param rememberMe - If true, persists session for 7 days, otherwise 24 hours
 * @returns Object with success status and optional error message
 */
export const login = (email: string, rememberMe: boolean = false): { success: boolean; error?: string } => {
    try {
        // Validate email format
        if (!email || typeof email !== 'string') {
            return { success: false, error: 'Email is required' }
        }

        if (!isValidEmail(email)) {
            recordLoginAttempt()
            return { success: false, error: 'Invalid email format' }
        }

        // Check login attempts
        const { allowed } = checkLoginAttempts()
        if (!allowed) {
            return {
                success: false,
                error: 'Too many login attempts. Please try again in 15 minutes.'
            }
        }

        // Sanitize email
        const sanitizedEmail = sanitizeInput(email.toLowerCase())

        // Set session data
        localStorage.setItem(USER_EMAIL_KEY, sanitizedEmail)
        localStorage.setItem(REMEMBER_ME_KEY, rememberMe.toString())
        localStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString())

        // Initialize profile if not exists
        const existingProfile = localStorage.getItem(USER_PROFILE_KEY)
        if (!existingProfile) {
            const userName = sanitizedEmail.split('@')[0].split('.').map(word =>
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ')

            const initialProfile: UserProfile = {
                email: sanitizedEmail,
                fullName: sanitizeInput(userName),
                synapseId: 'SYN' + Math.floor(Math.random() * 100000).toString().padStart(5, '0')
            }
            localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(initialProfile))
        }

        // Reset login attempts on successful login
        resetLoginAttempts()

        dispatchAuthEvent()
        return { success: true }
    } catch (error) {
        console.error('Login error:', error)
        return { success: false, error: 'An error occurred during login. Please try again.' }
    }
}

/**
 * Logout the current user and clear all session data
 */
export const logout = (): void => {
    try {
        clearSession()
        dispatchAuthEvent()
    } catch (error) {
        console.error('Logout error:', error)
        // Even if there's an error, try to clear what we can
        clearSession()
    }
}

/**
 * Check if a user is currently authenticated with valid session
 * @returns true if user is logged in with valid session, false otherwise
 */
export const isAuthenticated = (): boolean => {
    try {
        const email = localStorage.getItem(USER_EMAIL_KEY)

        // No email means not authenticated
        if (!email) return false

        // Check if session has expired
        if (isSessionExpired()) {
            clearSession()
            dispatchAuthEvent()
            return false
        }

        return true
    } catch (error) {
        console.error('Error checking authentication:', error)
        return false
    }
}

/**
 * Get the current logged-in user's email safely
 * @returns User's email or null if not logged in or session expired
 */
export const getCurrentUser = (): string | null => {
    try {
        if (!isAuthenticated()) {
            return null
        }
        return localStorage.getItem(USER_EMAIL_KEY)
    } catch (error) {
        console.error('Error getting current user:', error)
        return null
    }
}

/**
 * Check if the current session should be remembered
 * @returns true if remember me was enabled, false otherwise
 */
export const isRememberMeEnabled = (): boolean => {
    try {
        return localStorage.getItem(REMEMBER_ME_KEY) === 'true'
    } catch (error) {
        console.error('Error checking remember me:', error)
        return false
    }
}

/**
 * Get the current user's complete profile with validation
 * @returns UserProfile object with all user data or null if not authenticated
 */
export const getUserProfile = (): UserProfile | null => {
    try {
        // Check authentication first
        if (!isAuthenticated()) {
            return null
        }

        const email = getCurrentUser()
        if (!email) return null

        const profileData = localStorage.getItem(USER_PROFILE_KEY)

        if (profileData) {
            try {
                const profile = JSON.parse(profileData)

                // Validate that the profile belongs to the current user
                if (profile.email !== email) {
                    console.warn('Profile email mismatch, clearing profile')
                    localStorage.removeItem(USER_PROFILE_KEY)
                    return createDefaultProfile(email)
                }

                return profile
            } catch (parseError) {
                console.error('Failed to parse user profile:', parseError)
                localStorage.removeItem(USER_PROFILE_KEY)
                return createDefaultProfile(email)
            }
        }

        // Return default profile if none exists
        return createDefaultProfile(email)
    } catch (error) {
        console.error('Error getting user profile:', error)
        return null
    }
}

/**
 * Create default profile for a user
 */
const createDefaultProfile = (email: string): UserProfile => {
    const userName = email.split('@')[0].split('.').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')

    return {
        email,
        fullName: sanitizeInput(userName),
        synapseId: 'SYN' + Math.floor(Math.random() * 100000).toString().padStart(5, '0')
    }
}

/**
 * Update the current user's profile with validation and sanitization
 * @param profileData - Updated profile data
 * @returns Object with success status and optional error message
 */
export const updateUserProfile = (profileData: UserProfile): { success: boolean; error?: string } => {
    try {
        // Check authentication
        if (!isAuthenticated()) {
            return { success: false, error: 'User not authenticated' }
        }

        const currentEmail = getCurrentUser()
        if (!currentEmail) {
            return { success: false, error: 'No user session found' }
        }

        // Ensure email matches the logged-in user (prevent profile hijacking)
        profileData.email = currentEmail

        // Sanitize all string fields
        const sanitizedProfile: UserProfile = {
            ...profileData,
            fullName: sanitizeInput(profileData.fullName),
            gender: profileData.gender ? sanitizeInput(profileData.gender) : undefined,
            dateOfBirth: profileData.dateOfBirth ? sanitizeInput(profileData.dateOfBirth) : undefined,
            mobileNumber: profileData.mobileNumber ? sanitizeInput(profileData.mobileNumber) : undefined,
            city: profileData.city ? sanitizeInput(profileData.city) : undefined,
            state: profileData.state ? sanitizeInput(profileData.state) : undefined,
            college: profileData.college ? sanitizeInput(profileData.college) : undefined,
            branch: profileData.branch ? sanitizeInput(profileData.branch) : undefined,
            currentYear: profileData.currentYear ? sanitizeInput(profileData.currentYear) : undefined,
            expectedGraduation: profileData.expectedGraduation ? sanitizeInput(profileData.expectedGraduation) : undefined,
        }

        localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(sanitizedProfile))
        dispatchAuthEvent()

        return { success: true }
    } catch (error) {
        console.error('Error updating user profile:', error)
        return { success: false, error: 'Failed to update profile. Please try again.' }
    }
}

/**
 * Refresh session timestamp (call this on user activity to extend session)
 */
export const refreshSession = (): void => {
    try {
        if (isAuthenticated()) {
            localStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString())
        }
    } catch (error) {
        console.error('Error refreshing session:', error)
    }
}
