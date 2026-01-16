/**
 * Session Management Service
 * Handles session timeout, return URLs, and activity tracking
 */

const SESSION_KEYS = {
    LAST_ACTIVITY: 'synapse_last_activity',
    REMEMBER_ME: 'synapse_remember_me',
    RETURN_URL: 'synapse_return_url',
    SESSION_START: 'synapse_session_start'
}

// Session timeouts (in milliseconds)
const TIMEOUTS = {
    DEFAULT: 30 * 60 * 1000,        // 30 minutes for regular session
    REMEMBER_ME: 7 * 24 * 60 * 60 * 1000,  // 7 days with "Remember Me"
    ACTIVITY_CHECK: 60 * 1000       // Check activity every minute
}

/**
 * Start a new session
 */
export const startSession = (rememberMe: boolean = false): void => {
    const now = Date.now()
    localStorage.setItem(SESSION_KEYS.SESSION_START, now.toString())
    localStorage.setItem(SESSION_KEYS.LAST_ACTIVITY, now.toString())
    localStorage.setItem(SESSION_KEYS.REMEMBER_ME, rememberMe.toString())
}

/**
 * Update last activity timestamp
 */
export const updateActivity = (): void => {
    localStorage.setItem(SESSION_KEYS.LAST_ACTIVITY, Date.now().toString())
}

/**
 * Check if session is still valid
 * Returns true if session is valid, false if expired
 */
export const isSessionValid = (): boolean => {
    const lastActivity = localStorage.getItem(SESSION_KEYS.LAST_ACTIVITY)
    const rememberMe = localStorage.getItem(SESSION_KEYS.REMEMBER_ME) === 'true'

    if (!lastActivity) return false

    const lastActivityTime = parseInt(lastActivity, 10)
    const now = Date.now()
    const timeout = rememberMe ? TIMEOUTS.REMEMBER_ME : TIMEOUTS.DEFAULT

    return (now - lastActivityTime) < timeout
}

/**
 * Get time remaining in session (in milliseconds)
 */
export const getSessionTimeRemaining = (): number => {
    const lastActivity = localStorage.getItem(SESSION_KEYS.LAST_ACTIVITY)
    const rememberMe = localStorage.getItem(SESSION_KEYS.REMEMBER_ME) === 'true'

    if (!lastActivity) return 0

    const lastActivityTime = parseInt(lastActivity, 10)
    const now = Date.now()
    const timeout = rememberMe ? TIMEOUTS.REMEMBER_ME : TIMEOUTS.DEFAULT

    return Math.max(0, timeout - (now - lastActivityTime))
}

/**
 * Clear session data
 */
export const clearSession = (): void => {
    localStorage.removeItem(SESSION_KEYS.LAST_ACTIVITY)
    localStorage.removeItem(SESSION_KEYS.REMEMBER_ME)
    localStorage.removeItem(SESSION_KEYS.SESSION_START)
    // Don't clear return URL - might be needed after re-login
}

/**
 * Set return URL (where to go after login)
 */
export const setReturnUrl = (url: string): void => {
    // Don't set login page as return URL
    if (url.includes('/user-login') || url.includes('/signup')) {
        return
    }
    localStorage.setItem(SESSION_KEYS.RETURN_URL, url)
}

/**
 * Get and clear return URL
 */
export const getReturnUrl = (): string | null => {
    const url = localStorage.getItem(SESSION_KEYS.RETURN_URL)
    localStorage.removeItem(SESSION_KEYS.RETURN_URL)
    return url
}

/**
 * Check if "Remember Me" is enabled
 */
export const isRememberMeEnabled = (): boolean => {
    return localStorage.getItem(SESSION_KEYS.REMEMBER_ME) === 'true'
}

/**
 * Setup activity listeners (call once on app mount)
 */
export const setupActivityListeners = (): (() => void) => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']

    const handleActivity = () => {
        updateActivity()
    }

    events.forEach(event => {
        window.addEventListener(event, handleActivity, { passive: true })
    })

    // Return cleanup function
    return () => {
        events.forEach(event => {
            window.removeEventListener(event, handleActivity)
        })
    }
}

/**
 * Format remaining time for display
 */
export const formatTimeRemaining = (ms: number): string => {
    const minutes = Math.floor(ms / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`
    return `${minutes} minute${minutes > 1 ? 's' : ''}`
}
