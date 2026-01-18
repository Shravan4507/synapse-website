/**
 * Day Pass Service
 * CRUD operations for day passes in Firestore
 */

import {
    collection,
    doc,
    getDocs,
    setDoc,
    deleteDoc,
    query,
    orderBy,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore'
import { db } from './firebase'

// ========================================
// TYPES
// ========================================

export interface DayPass {
    id?: string
    day: number           // 1, 2, 3
    image?: string        // Legacy single image URL (deprecated)
    images: string[]      // Array of image URLs for carousel
    price: number         // Price in INR
    events: string[]      // List of events for this day
    capacity: number      // Max seats (0 = unlimited)
    isActive: boolean
    createdAt?: Timestamp
    updatedAt?: Timestamp
}

// ========================================
// DAY PASS CRUD
// ========================================

/**
 * Get all day passes
 */
export const getDayPasses = async (): Promise<DayPass[]> => {
    try {
        const q = query(collection(db, 'day_passes'), orderBy('day', 'asc'))
        const snapshot = await getDocs(q)
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as DayPass))
    } catch (error) {
        console.error('Error fetching day passes:', error)
        return []
    }
}

/**
 * Get active day passes only (for public page)
 */
export const getActiveDayPasses = async (): Promise<DayPass[]> => {
    try {
        const passes = await getDayPasses()
        return passes.filter(p => p.isActive)
    } catch (error) {
        console.error('Error fetching active day passes:', error)
        return []
    }
}

/**
 * Create or update a day pass
 * Uses day number as document ID for simplicity
 */
export const saveDayPass = async (
    dayPass: Omit<DayPass, 'id' | 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; error?: string }> => {
    try {
        const docId = `day_${dayPass.day}`
        await setDoc(doc(db, 'day_passes', docId), {
            ...dayPass,
            updatedAt: serverTimestamp()
        }, { merge: true })
        return { success: true }
    } catch (error) {
        console.error('Error saving day pass:', error)
        return { success: false, error: 'Failed to save day pass' }
    }
}

/**
 * Delete a day pass
 */
export const deleteDayPass = async (day: number): Promise<{ success: boolean; error?: string }> => {
    try {
        await deleteDoc(doc(db, 'day_passes', `day_${day}`))
        return { success: true }
    } catch (error) {
        console.error('Error deleting day pass:', error)
        return { success: false, error: 'Failed to delete day pass' }
    }
}

/**
 * Initialize default day passes if none exist
 */
export const initializeDefaultDayPasses = async (): Promise<void> => {
    try {
        const existing = await getDayPasses()
        if (existing.length > 0) return

        const defaults: Omit<DayPass, 'id' | 'createdAt' | 'updatedAt'>[] = [
            {
                day: 1,
                images: [],
                price: 150,
                events: ['Opening Ceremony', 'Tech Talks & Workshops', 'Gaming Zone Access'],
                capacity: 0,
                isActive: true
            },
            {
                day: 2,
                images: [],
                price: 100,
                events: ['Hackathon Continues', 'Cultural Events', 'DJ Night Prelims'],
                capacity: 0,
                isActive: true
            },
            {
                day: 3,
                images: [],
                price: 50,
                events: ['Grand Finale', 'Prize Distribution', 'DJ Night'],
                capacity: 0,
                isActive: true
            }
        ]

        for (const pass of defaults) {
            await saveDayPass(pass)
        }
    } catch (error) {
        console.error('Error initializing default day passes:', error)
    }
}
