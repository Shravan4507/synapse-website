/**
 * Competition Service
 * CRUD operations for competitions in Firestore
 */

import {
    collection,
    doc,
    getDocs,
    addDoc,
    updateDoc,
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

export interface Competition {
    id?: string
    name: string
    category: string
    description: string
    teamSize: string
    entryFee: number
    prizePool: string
    icon: string
    color: string
    images?: string[]
    imageDisplayMode?: 'fill' | 'fit' | 'stretch' | 'tile' | 'centre'
    imagePosition?: string // CSS object-position value (e.g., "center", "top", "bottom", "50% 30%")
    rules?: string
    venue?: string
    date?: string
    time?: string
    registrationLink?: string
    order: number
    isActive: boolean
    createdAt?: Timestamp
    updatedAt?: Timestamp
}

export interface CompetitionCategory {
    id?: string
    name: string
    order: number
}

// ========================================
// COMPETITION CRUD
// ========================================

/**
 * Get all competitions
 */
export const getCompetitions = async (): Promise<Competition[]> => {
    try {
        const q = query(collection(db, 'competitions'), orderBy('order', 'asc'))
        const snapshot = await getDocs(q)
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Competition))
    } catch (error) {
        console.error('Error fetching competitions:', error)
        return []
    }
}

/**
 * Get active competitions only (for public page)
 */
export const getActiveCompetitions = async (): Promise<Competition[]> => {
    try {
        const competitions = await getCompetitions()
        return competitions.filter(c => c.isActive)
    } catch (error) {
        console.error('Error fetching active competitions:', error)
        return []
    }
}

/**
 * Create a new competition
 */
export const createCompetition = async (
    competition: Omit<Competition, 'id' | 'order' | 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; id?: string; error?: string }> => {
    try {
        // Get highest order
        const competitions = await getCompetitions()
        const maxOrder = competitions.length > 0
            ? Math.max(...competitions.map(c => c.order))
            : 0

        const docRef = await addDoc(collection(db, 'competitions'), {
            ...competition,
            order: maxOrder + 1,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        })

        return { success: true, id: docRef.id }
    } catch (error) {
        console.error('Error creating competition:', error)
        return { success: false, error: 'Failed to create competition' }
    }
}

/**
 * Update a competition
 */
export const updateCompetition = async (
    id: string,
    updates: Partial<Competition>
): Promise<{ success: boolean; error?: string }> => {
    try {
        const docRef = doc(db, 'competitions', id)
        await updateDoc(docRef, {
            ...updates,
            updatedAt: serverTimestamp()
        })
        return { success: true }
    } catch (error) {
        console.error('Error updating competition:', error)
        return { success: false, error: 'Failed to update competition' }
    }
}

/**
 * Delete a competition
 */
export const deleteCompetition = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
        await deleteDoc(doc(db, 'competitions', id))
        return { success: true }
    } catch (error) {
        console.error('Error deleting competition:', error)
        return { success: false, error: 'Failed to delete competition' }
    }
}

/**
 * Reorder competitions
 */
export const reorderCompetitions = async (orderedIds: string[]): Promise<{ success: boolean }> => {
    try {
        const updates = orderedIds.map((id, index) =>
            updateDoc(doc(db, 'competitions', id), { order: index + 1 })
        )
        await Promise.all(updates)
        return { success: true }
    } catch (error) {
        console.error('Error reordering competitions:', error)
        return { success: false }
    }
}

// ========================================
// CATEGORY CRUD
// ========================================

/**
 * Get all competition categories
 */
export const getCompetitionCategories = async (): Promise<CompetitionCategory[]> => {
    try {
        const q = query(collection(db, 'competition_categories'), orderBy('order', 'asc'))
        const snapshot = await getDocs(q)
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as CompetitionCategory))
    } catch (error) {
        console.error('Error fetching categories:', error)
        return []
    }
}

/**
 * Create a new category
 */
export const createCompetitionCategory = async (name: string): Promise<{ success: boolean; id?: string }> => {
    try {
        const categories = await getCompetitionCategories()
        const maxOrder = categories.length > 0
            ? Math.max(...categories.map(c => c.order))
            : 0

        const docRef = await addDoc(collection(db, 'competition_categories'), {
            name,
            order: maxOrder + 1
        })
        return { success: true, id: docRef.id }
    } catch (error) {
        console.error('Error creating category:', error)
        return { success: false }
    }
}

/**
 * Delete a category
 */
export const deleteCompetitionCategory = async (id: string): Promise<{ success: boolean }> => {
    try {
        await deleteDoc(doc(db, 'competition_categories', id))
        return { success: true }
    } catch (error) {
        console.error('Error deleting category:', error)
        return { success: false }
    }
}

/**
 * Reorder categories
 */
export const reorderCompetitionCategories = async (orderedIds: string[]): Promise<{ success: boolean }> => {
    try {
        const updates = orderedIds.map((id, index) =>
            updateDoc(doc(db, 'competition_categories', id), { order: index + 1 })
        )
        await Promise.all(updates)
        return { success: true }
    } catch (error) {
        console.error('Error reordering categories:', error)
        return { success: false }
    }
}

// ========================================
// PREDEFINED OPTIONS
// ========================================

export const COMPETITION_ICONS = [
    '💻', '🤖', '⚔️', '🎨', '🎮', '🧠', '📸', '🧩',
    '🚀', '💡', '🔧', '📱', '🌐', '🎯', '🏆', '⚡',
    '🎵', '📊', '🔬', '🎬', '✍️', '🎭', '🔥', '💎'
]

export const COMPETITION_COLORS = [
    '#00d4ff', // Cyan
    '#ff6b6b', // Red
    '#ffd93d', // Yellow
    '#ff00ff', // Magenta
    '#00ff88', // Green
    '#8a2be2', // Purple
    '#ff8c00', // Orange
    '#20b2aa', // Teal
    '#ff1493', // Pink
    '#32cd32', // Lime
]
