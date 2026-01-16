/**
 * Event Service
 * CRUD operations for events in Firestore
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

export interface Event {
    id?: string
    name: string
    description: string
    date: string          // e.g., "15 Feb 2025"
    time: string          // e.g., "10:00 AM"
    venue: string
    price: number         // Entry fee
    capacity?: number     // Max attendees (optional)
    icon: string
    color: string
    images?: string[]
    imageDisplayMode?: 'fill' | 'fit' | 'stretch' | 'tile' | 'centre'
    highlights?: string[] // Event highlights/features
    rules?: string        // Rules or guidelines
    order: number
    isActive: boolean
    createdAt?: Timestamp
    updatedAt?: Timestamp
}

export interface EventCategory {
    id?: string
    name: string
    order: number
}

// ========================================
// EVENT CRUD
// ========================================

/**
 * Get all events
 */
export const getEvents = async (): Promise<Event[]> => {
    try {
        const q = query(collection(db, 'events'), orderBy('order', 'asc'))
        const snapshot = await getDocs(q)
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Event))
    } catch (error) {
        console.error('Error fetching events:', error)
        return []
    }
}

/**
 * Get active events only (for public page)
 */
export const getActiveEvents = async (): Promise<Event[]> => {
    try {
        const events = await getEvents()
        return events.filter(e => e.isActive)
    } catch (error) {
        console.error('Error fetching active events:', error)
        return []
    }
}

/**
 * Create a new event
 */
export const createEvent = async (
    event: Omit<Event, 'id' | 'order' | 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; id?: string; error?: string }> => {
    try {
        // Get highest order
        const events = await getEvents()
        const maxOrder = events.length > 0
            ? Math.max(...events.map(e => e.order))
            : 0

        const docRef = await addDoc(collection(db, 'events'), {
            ...event,
            order: maxOrder + 1,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        })

        return { success: true, id: docRef.id }
    } catch (error) {
        console.error('Error creating event:', error)
        return { success: false, error: 'Failed to create event' }
    }
}

/**
 * Update an event
 */
export const updateEvent = async (
    id: string,
    updates: Partial<Event>
): Promise<{ success: boolean; error?: string }> => {
    try {
        const docRef = doc(db, 'events', id)
        await updateDoc(docRef, {
            ...updates,
            updatedAt: serverTimestamp()
        })
        return { success: true }
    } catch (error) {
        console.error('Error updating event:', error)
        return { success: false, error: 'Failed to update event' }
    }
}

/**
 * Delete an event
 */
export const deleteEvent = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
        await deleteDoc(doc(db, 'events', id))
        return { success: true }
    } catch (error) {
        console.error('Error deleting event:', error)
        return { success: false, error: 'Failed to delete event' }
    }
}

/**
 * Reorder events
 */
export const reorderEvents = async (orderedIds: string[]): Promise<{ success: boolean }> => {
    try {
        const updates = orderedIds.map((id, index) =>
            updateDoc(doc(db, 'events', id), { order: index + 1 })
        )
        await Promise.all(updates)
        return { success: true }
    } catch (error) {
        console.error('Error reordering events:', error)
        return { success: false }
    }
}

// ========================================
// CATEGORY CRUD
// ========================================

/**
 * Get all event categories
 */
export const getEventCategories = async (): Promise<EventCategory[]> => {
    try {
        const q = query(collection(db, 'event_categories'), orderBy('order', 'asc'))
        const snapshot = await getDocs(q)
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as EventCategory))
    } catch (error) {
        console.error('Error fetching event categories:', error)
        return []
    }
}

/**
 * Create a new category
 */
export const createEventCategory = async (name: string): Promise<{ success: boolean; id?: string }> => {
    try {
        const categories = await getEventCategories()
        const maxOrder = categories.length > 0
            ? Math.max(...categories.map(c => c.order))
            : 0

        const docRef = await addDoc(collection(db, 'event_categories'), {
            name,
            order: maxOrder + 1
        })
        return { success: true, id: docRef.id }
    } catch (error) {
        console.error('Error creating event category:', error)
        return { success: false }
    }
}

/**
 * Delete a category
 */
export const deleteEventCategory = async (id: string): Promise<{ success: boolean }> => {
    try {
        await deleteDoc(doc(db, 'event_categories', id))
        return { success: true }
    } catch (error) {
        console.error('Error deleting event category:', error)
        return { success: false }
    }
}

/**
 * Reorder categories
 */
export const reorderEventCategories = async (orderedIds: string[]): Promise<{ success: boolean }> => {
    try {
        const updates = orderedIds.map((id, index) =>
            updateDoc(doc(db, 'event_categories', id), { order: index + 1 })
        )
        await Promise.all(updates)
        return { success: true }
    } catch (error) {
        console.error('Error reordering event categories:', error)
        return { success: false }
    }
}

// ========================================
// PREDEFINED OPTIONS
// ========================================

export const EVENT_ICONS = [
    '🎉', '🎤', '🎸', '🎭', '🎨', '📸', '🎪', '🏆',
    '🎵', '💡', '🔥', '⚡', '🌟', '🎯', '🚀', '💎',
    '🍔', '☕', '🎬', '🎮', '🏃', '🧘', '📚', '🎓'
]

export const EVENT_COLORS = [
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
