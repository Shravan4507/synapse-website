/**
 * Authentication Utility - Bridge between old local auth and Firebase
 * This provides compatibility for existing components while using Firebase Auth
 */

import { auth } from '../lib/firebase'
import { signInWithGoogle, logOut as firebaseLogout, onAuthChange } from '../lib/auth'
import type { User } from 'firebase/auth'

// Storage keys for profile data (keeping local storage for profile details)
const USER_PROFILE_KEY = 'userProfile'

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
 * Login with Google (for legacy component compatibility)
 */
export const login = async (): Promise<{ success: boolean; error?: string }> => {
    try {
        const result = await signInWithGoogle()
        const user = result.user

        // Create/update profile from Google data
        const profile = createProfileFromFirebaseUser(user)
        localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile))

        dispatchAuthEvent()
        return { success: true }
    } catch (error) {
        console.error('Login error:', error)
        return { success: false, error: 'Failed to sign in with Google' }
    }
}

/**
 * Logout the current user
 */
export const logout = async (): Promise<void> => {
    try {
        await firebaseLogout()
        localStorage.removeItem(USER_PROFILE_KEY)
        dispatchAuthEvent()
    } catch (error) {
        console.error('Logout error:', error)
        localStorage.removeItem(USER_PROFILE_KEY)
    }
}

/**
 * Check if a user is currently authenticated
 */
export const isAuthenticated = (): boolean => {
    return auth.currentUser !== null
}

/**
 * Get the current logged-in user's email
 */
export const getCurrentUser = (): string | null => {
    return auth.currentUser?.email || null
}

/**
 * Get Firebase user object
 */
export const getFirebaseUser = (): User | null => {
    return auth.currentUser
}

/**
 * Create profile from Firebase user
 */
const createProfileFromFirebaseUser = (user: User): UserProfile => {
    const email = user.email || ''
    const displayName = user.displayName || email.split('@')[0]

    return {
        email,
        fullName: displayName,
        profilePicture: user.photoURL || undefined,
        synapseId: 'SYN' + Math.floor(Math.random() * 100000).toString().padStart(5, '0')
    }
}

/**
 * Get the current user's complete profile
 */
export const getUserProfile = (): UserProfile | null => {
    try {
        const user = auth.currentUser
        if (!user) return null

        const profileData = localStorage.getItem(USER_PROFILE_KEY)

        if (profileData) {
            try {
                const profile = JSON.parse(profileData)
                // Validate that the profile belongs to the current user
                if (profile.email !== user.email) {
                    const newProfile = createProfileFromFirebaseUser(user)
                    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(newProfile))
                    return newProfile
                }
                return profile
            } catch (parseError) {
                console.error('Failed to parse user profile:', parseError)
                const newProfile = createProfileFromFirebaseUser(user)
                localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(newProfile))
                return newProfile
            }
        }

        // Create default profile from Firebase user
        const newProfile = createProfileFromFirebaseUser(user)
        localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(newProfile))
        return newProfile
    } catch (error) {
        console.error('Error getting user profile:', error)
        return null
    }
}

/**
 * Update the current user's profile
 */
export const updateUserProfile = (profileData: UserProfile): { success: boolean; error?: string } => {
    try {
        const user = auth.currentUser
        if (!user) {
            return { success: false, error: 'User not authenticated' }
        }

        // Ensure email matches the logged-in user
        profileData.email = user.email || ''

        localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profileData))
        dispatchAuthEvent()

        return { success: true }
    } catch (error) {
        console.error('Error updating user profile:', error)
        return { success: false, error: 'Failed to update profile. Please try again.' }
    }
}

/**
 * Subscribe to auth state changes
 */
export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
    return onAuthChange(callback)
}

/**
 * Check if remember me is enabled (always true with Firebase/Google)
 */
export const isRememberMeEnabled = (): boolean => {
    return true
}

/**
 * Refresh session (no-op with Firebase, handled automatically)
 */
export const refreshSession = (): void => {
    // Firebase handles session refresh automatically
}
