import {
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    onAuthStateChanged,
    updateProfile
} from 'firebase/auth'
import type { User, UserCredential } from 'firebase/auth'
import { auth } from './firebase'

// Google Auth Provider
const googleProvider = new GoogleAuthProvider()

// Sign in with Google
export const signInWithGoogle = async (): Promise<UserCredential> => {
    return signInWithPopup(auth, googleProvider)
}

// Sign out
export const logOut = async (): Promise<void> => {
    return signOut(auth)
}

// Auth state observer
export const onAuthChange = (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, callback)
}

// Get current user
export const getCurrentUser = (): User | null => {
    return auth.currentUser
}

// Update user profile
export const updateUserProfile = async (displayName?: string, photoURL?: string): Promise<void> => {
    const user = auth.currentUser
    if (user) {
        await updateProfile(user, { displayName, photoURL })
    }
}

// Export User type for convenience
export type { User, UserCredential }
