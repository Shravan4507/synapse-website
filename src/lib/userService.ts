/**
 * User Service - Handles user and admin document operations in Firestore
 */

import {
    doc,
    getDoc,
    setDoc,
    getDocs,
    deleteDoc,
    collection,
    query,
    orderBy,
    serverTimestamp
} from 'firebase/firestore'
import { db } from './firebase'

// Collection names
const USERS_COLLECTION = 'users'
const ADMINS_COLLECTION = 'admins'
const SYNAPSE_IDS_COLLECTION = 'synapse_ids'
const ADMIN_SYNAPSE_IDS_COLLECTION = 'admin_synapse_ids'

/**
 * User document interface
 */
export interface UserDocument {
    uid: string
    email: string
    firstName: string
    lastName: string
    displayName: string
    mobileNumber: string
    dateOfBirth: string
    gender: string
    college: string
    department: string
    yearOfStudy: string
    courseCompletionYear: string
    synapseId: string
    photoURL?: string
    createdAt: Date
    updatedAt: Date
}

/**
 * Admin document interface
 */
export interface AdminDocument {
    uid: string
    email: string
    firstName: string
    lastName: string
    displayName: string
    mobileNumber: string
    dateOfBirth: string
    gender: string
    college: string
    department: string
    yearOfStudy: string
    courseCompletionYear: string
    synapseId: string
    photoURL?: string
    permissions: string[]
    createdAt: Date
    updatedAt: Date
}

/**
 * Check if a user document exists in Firestore
 */
export const checkUserExists = async (uid: string): Promise<boolean> => {
    try {
        const userRef = doc(db, USERS_COLLECTION, uid)
        const userSnap = await getDoc(userRef)
        return userSnap.exists()
    } catch (error) {
        console.error('Error checking user existence:', error)
        return false
    }
}

/**
 * Check if an admin document exists in Firestore
 */
export const checkAdminExists = async (uid: string): Promise<boolean> => {
    try {
        const adminRef = doc(db, ADMINS_COLLECTION, uid)
        const adminSnap = await getDoc(adminRef)
        return adminSnap.exists()
    } catch (error) {
        console.error('Error checking admin existence:', error)
        return false
    }
}

/**
 * Check if the current user is an admin
 */
export const isUserAdmin = async (uid: string): Promise<boolean> => {
    return checkAdminExists(uid)
}

/**
 * Get user document from Firestore
 */
export const getUserDocument = async (uid: string): Promise<UserDocument | null> => {
    try {
        const userRef = doc(db, USERS_COLLECTION, uid)
        const userSnap = await getDoc(userRef)

        if (userSnap.exists()) {
            return userSnap.data() as UserDocument
        }
        return null
    } catch (error) {
        console.error('Error getting user document:', error)
        return null
    }
}

/**
 * Get admin document from Firestore
 */
export const getAdminDocument = async (uid: string): Promise<AdminDocument | null> => {
    try {
        const adminRef = doc(db, ADMINS_COLLECTION, uid)
        const adminSnap = await getDoc(adminRef)

        if (adminSnap.exists()) {
            return adminSnap.data() as AdminDocument
        }
        return null
    } catch (error) {
        console.error('Error getting admin document:', error)
        return null
    }
}

/**
 * Get user or admin document (checks both collections)
 */
export const getUserOrAdminDocument = async (uid: string): Promise<{ data: UserDocument | AdminDocument | null; isAdmin: boolean }> => {
    // Check admin first
    const adminDoc = await getAdminDocument(uid)
    if (adminDoc) {
        return { data: adminDoc, isAdmin: true }
    }

    // Then check regular user
    const userDoc = await getUserDocument(uid)
    if (userDoc) {
        return { data: userDoc, isAdmin: false }
    }

    return { data: null, isAdmin: false }
}

/**
 * Generate Synapse ID with gap-filling logic
 * Format: SYN-XXX-0000
 * XXX = first 3 letters of name (pad with X if < 3)
 * 0000 = auto-incrementing number, fills gaps
 */
export const generateSynapseId = async (firstName: string): Promise<string> => {
    try {
        // Get first 3 letters of name, uppercase, pad with X if needed
        const namePrefix = firstName
            .toUpperCase()
            .replace(/[^A-Z]/g, '') // Remove non-letters
            .padEnd(3, 'X')
            .slice(0, 3)

        // Get all used synapse ID numbers
        const idsRef = collection(db, SYNAPSE_IDS_COLLECTION)
        const idsQuery = query(idsRef, orderBy('number', 'asc'))
        const idsSnap = await getDocs(idsQuery)

        // Find the first available number (gap-filling)
        const usedNumbers = new Set<number>()
        idsSnap.docs.forEach(docSnap => {
            usedNumbers.add(docSnap.data().number)
        })

        // Find first gap or next number
        let nextNumber = 1
        while (usedNumbers.has(nextNumber)) {
            nextNumber++
        }

        // Reserve this number
        const paddedNumber = nextNumber.toString().padStart(4, '0')
        const synapseId = `SYN-${namePrefix}-${paddedNumber}`

        // Save the used number to Firestore
        await setDoc(doc(db, SYNAPSE_IDS_COLLECTION, synapseId), {
            number: nextNumber,
            synapseId: synapseId,
            type: 'user',
            createdAt: serverTimestamp()
        })

        return synapseId
    } catch (error) {
        console.error('Error generating Synapse ID:', error)
        // Fallback to random ID if error
        const randomNum = Math.floor(Math.random() * 9999) + 1
        const namePrefix = firstName.toUpperCase().padEnd(3, 'X').slice(0, 3)
        return `SYN-${namePrefix}-${randomNum.toString().padStart(4, '0')}`
    }
}

/**
 * Generate Admin Synapse ID with gap-filling logic
 * Format: SYN-ADMIN-XXX-0000
 * XXX = first 3 letters of name (pad with X if < 3)
 * 0000 = auto-incrementing number, fills gaps
 */
export const generateAdminSynapseId = async (firstName: string): Promise<string> => {
    try {
        // Get first 3 letters of name, uppercase, pad with X if needed
        const namePrefix = firstName
            .toUpperCase()
            .replace(/[^A-Z]/g, '') // Remove non-letters
            .padEnd(3, 'X')
            .slice(0, 3)

        // Get all used admin synapse ID numbers
        const idsRef = collection(db, ADMIN_SYNAPSE_IDS_COLLECTION)
        const idsQuery = query(idsRef, orderBy('number', 'asc'))
        const idsSnap = await getDocs(idsQuery)

        // Find the first available number (gap-filling)
        const usedNumbers = new Set<number>()
        idsSnap.docs.forEach(docSnap => {
            usedNumbers.add(docSnap.data().number)
        })

        // Find first gap or next number
        let nextNumber = 1
        while (usedNumbers.has(nextNumber)) {
            nextNumber++
        }

        // Reserve this number
        const paddedNumber = nextNumber.toString().padStart(4, '0')
        const synapseId = `SYN-ADMIN-${namePrefix}-${paddedNumber}`

        // Save the used number to Firestore
        await setDoc(doc(db, ADMIN_SYNAPSE_IDS_COLLECTION, synapseId), {
            number: nextNumber,
            synapseId: synapseId,
            type: 'admin',
            createdAt: serverTimestamp()
        })

        return synapseId
    } catch (error) {
        console.error('Error generating Admin Synapse ID:', error)
        // Fallback to random ID if error
        const randomNum = Math.floor(Math.random() * 9999) + 1
        const namePrefix = firstName.toUpperCase().padEnd(3, 'X').slice(0, 3)
        return `SYN-ADMIN-${namePrefix}-${randomNum.toString().padStart(4, '0')}`
    }
}

/**
 * Create new user document in Firestore
 */
export const createUserDocument = async (
    uid: string,
    userData: Omit<UserDocument, 'uid' | 'synapseId' | 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; synapseId?: string; error?: string }> => {
    try {
        // Generate unique Synapse ID
        const synapseId = await generateSynapseId(userData.firstName)

        // Create user document
        const userDoc: UserDocument = {
            ...userData,
            uid,
            synapseId,
            createdAt: new Date(),
            updatedAt: new Date()
        }

        await setDoc(doc(db, USERS_COLLECTION, uid), {
            ...userDoc,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        })

        return { success: true, synapseId }
    } catch (error) {
        console.error('Error creating user document:', error)
        return { success: false, error: 'Failed to create account. Please try again.' }
    }
}

/**
 * Create new admin document in Firestore
 */
export const createAdminDocument = async (
    uid: string,
    adminData: Omit<AdminDocument, 'uid' | 'synapseId' | 'permissions' | 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; synapseId?: string; error?: string }> => {
    try {
        // Generate unique Admin Synapse ID
        const synapseId = await generateAdminSynapseId(adminData.firstName)

        // Create admin document with empty permissions array
        const adminDoc: AdminDocument = {
            ...adminData,
            uid,
            synapseId,
            permissions: [], // Empty permissions array
            createdAt: new Date(),
            updatedAt: new Date()
        }

        await setDoc(doc(db, ADMINS_COLLECTION, uid), {
            ...adminDoc,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        })

        return { success: true, synapseId }
    } catch (error) {
        console.error('Error creating admin document:', error)
        return { success: false, error: 'Failed to create admin account. Please try again.' }
    }
}

/**
 * Update user document in Firestore
 */
export const updateUserDocument = async (
    uid: string,
    updates: Partial<UserDocument>
): Promise<{ success: boolean; error?: string }> => {
    try {
        const userRef = doc(db, USERS_COLLECTION, uid)
        await setDoc(userRef, {
            ...updates,
            updatedAt: serverTimestamp()
        }, { merge: true })

        return { success: true }
    } catch (error) {
        console.error('Error updating user document:', error)
        return { success: false, error: 'Failed to update profile.' }
    }
}

/**
 * Update admin document in Firestore
 */
export const updateAdminDocument = async (
    uid: string,
    updates: Partial<AdminDocument>
): Promise<{ success: boolean; error?: string }> => {
    try {
        const adminRef = doc(db, ADMINS_COLLECTION, uid)
        await setDoc(adminRef, {
            ...updates,
            updatedAt: serverTimestamp()
        }, { merge: true })

        return { success: true }
    } catch (error) {
        console.error('Error updating admin document:', error)
        return { success: false, error: 'Failed to update admin profile.' }
    }
}

/**
 * Delete user account from Firestore
 * This frees up the Synapse ID number for reuse
 */
export const deleteUserAccount = async (
    uid: string,
    synapseId: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        // Delete user document
        const userRef = doc(db, USERS_COLLECTION, uid)
        await deleteDoc(userRef)

        // Delete the Synapse ID to free up the number
        const synapseIdRef = doc(db, SYNAPSE_IDS_COLLECTION, synapseId)
        await deleteDoc(synapseIdRef)

        return { success: true }
    } catch (error) {
        console.error('Error deleting user account:', error)
        return { success: false, error: 'Failed to delete account. Please try again.' }
    }
}

/**
 * Delete admin account from Firestore
 * This frees up the Admin Synapse ID number for reuse
 */
export const deleteAdminAccount = async (
    uid: string,
    synapseId: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        // Delete admin document
        const adminRef = doc(db, ADMINS_COLLECTION, uid)
        await deleteDoc(adminRef)

        // Delete the Admin Synapse ID to free up the number
        const synapseIdRef = doc(db, ADMIN_SYNAPSE_IDS_COLLECTION, synapseId)
        await deleteDoc(synapseIdRef)

        return { success: true }
    } catch (error) {
        console.error('Error deleting admin account:', error)
        return { success: false, error: 'Failed to delete admin account. Please try again.' }
    }
}
