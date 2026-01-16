/**
 * Sponsors Service - Manages sponsors, categories, and promotional space in Firestore
 */

import { collection, doc, addDoc, getDocs, getDoc, updateDoc, deleteDoc, setDoc, query, Timestamp, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

const SPONSORS_COLLECTION = 'sponsors'
const CATEGORIES_COLLECTION = 'sponsor_categories'
const PROMO_COLLECTION = 'promotional_space'

// ========================================
// TYPES
// ========================================

export interface SponsorCategory {
    id?: string
    name: string
    order: number
    createdAt?: Timestamp
}

export interface Sponsor {
    id?: string
    title: string
    link?: string
    categoryId: string
    categoryName?: string
    images: string[] // URLs to images/gifs
    order: number
    createdAt?: Timestamp
    updatedAt?: Timestamp
}

export type DisplayMode = 'fill' | 'fit' | 'stretch' | 'tile' | 'centre'

export interface Promotion {
    id?: string
    title?: string
    link?: string
    images: string[]
    displayMode: DisplayMode
    order: number
    createdAt?: Timestamp
    updatedAt?: Timestamp
    createdBy?: string
}

// Keep for backwards compatibility
export interface PromotionalSpace {
    id?: string
    link?: string
    images: string[]
    updatedAt?: Timestamp
    updatedBy?: string
}

// ========================================
// CATEGORY OPERATIONS
// ========================================

/**
 * Get all sponsor categories ordered by their order field
 */
export const getAllCategories = async (): Promise<SponsorCategory[]> => {
    try {
        const q = query(collection(db, CATEGORIES_COLLECTION))
        const querySnapshot = await getDocs(q)

        const categories = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as SponsorCategory[]

        // Sort by order
        return categories.sort((a, b) => a.order - b.order)
    } catch (error) {
        console.error('Error fetching categories:', error)
        return []
    }
}

/**
 * Create a new category
 */
export const createCategory = async (name: string): Promise<{ success: boolean; id?: string; error?: string }> => {
    try {
        // Get current max order
        const categories = await getAllCategories()
        const maxOrder = categories.length > 0 ? Math.max(...categories.map(c => c.order)) : -1

        const docRef = await addDoc(collection(db, CATEGORIES_COLLECTION), {
            name,
            order: maxOrder + 1,
            createdAt: serverTimestamp()
        })

        return { success: true, id: docRef.id }
    } catch (error) {
        console.error('Error creating category:', error)
        return { success: false, error: 'Failed to create category' }
    }
}

/**
 * Update category order (for drag-drop reordering)
 */
export const updateCategoryOrder = async (categoryId: string, newOrder: number): Promise<{ success: boolean; error?: string }> => {
    try {
        const docRef = doc(db, CATEGORIES_COLLECTION, categoryId)
        await updateDoc(docRef, { order: newOrder })
        return { success: true }
    } catch (error) {
        console.error('Error updating category order:', error)
        return { success: false, error: 'Failed to update order' }
    }
}

/**
 * Bulk update category orders
 */
export const bulkUpdateCategoryOrders = async (orders: { id: string; order: number }[]): Promise<{ success: boolean; error?: string }> => {
    try {
        await Promise.all(orders.map(({ id, order }) =>
            updateDoc(doc(db, CATEGORIES_COLLECTION, id), { order })
        ))
        return { success: true }
    } catch (error) {
        console.error('Error bulk updating category orders:', error)
        return { success: false, error: 'Failed to update orders' }
    }
}

/**
 * Delete a category
 */
export const deleteCategory = async (categoryId: string): Promise<{ success: boolean; error?: string }> => {
    try {
        // Check if category has sponsors
        const sponsors = await getSponsorsByCategory(categoryId)
        if (sponsors.length > 0) {
            return { success: false, error: 'Cannot delete category with sponsors. Remove sponsors first.' }
        }

        await deleteDoc(doc(db, CATEGORIES_COLLECTION, categoryId))
        return { success: true }
    } catch (error) {
        console.error('Error deleting category:', error)
        return { success: false, error: 'Failed to delete category' }
    }
}

/**
 * Update category name
 */
export const updateCategoryName = async (categoryId: string, name: string): Promise<{ success: boolean; error?: string }> => {
    try {
        await updateDoc(doc(db, CATEGORIES_COLLECTION, categoryId), { name })
        return { success: true }
    } catch (error) {
        console.error('Error updating category name:', error)
        return { success: false, error: 'Failed to update name' }
    }
}

// ========================================
// SPONSOR OPERATIONS
// ========================================

/**
 * Get all sponsors
 */
export const getAllSponsors = async (): Promise<Sponsor[]> => {
    try {
        const q = query(collection(db, SPONSORS_COLLECTION))
        const querySnapshot = await getDocs(q)

        const sponsors = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Sponsor[]

        // Sort by order
        return sponsors.sort((a, b) => a.order - b.order)
    } catch (error) {
        console.error('Error fetching sponsors:', error)
        return []
    }
}

/**
 * Get sponsors by category
 */
export const getSponsorsByCategory = async (categoryId: string): Promise<Sponsor[]> => {
    const sponsors = await getAllSponsors()
    return sponsors.filter(s => s.categoryId === categoryId)
}

/**
 * Get sponsors grouped by category (for display)
 */
export const getSponsorsGroupedByCategory = async (): Promise<{ category: SponsorCategory; sponsors: Sponsor[] }[]> => {
    try {
        const [categories, sponsors] = await Promise.all([
            getAllCategories(),
            getAllSponsors()
        ])

        return categories.map(category => ({
            category,
            sponsors: sponsors.filter(s => s.categoryId === category.id).sort((a, b) => a.order - b.order)
        })).filter(group => group.sponsors.length > 0) // Only return categories with sponsors
    } catch (error) {
        console.error('Error fetching grouped sponsors:', error)
        return []
    }
}

/**
 * Create a new sponsor
 */
export const createSponsor = async (
    sponsor: Omit<Sponsor, 'id' | 'createdAt' | 'updatedAt' | 'order'>
): Promise<{ success: boolean; id?: string; error?: string }> => {
    try {
        // Get current max order for this category
        const categorySponsors = await getSponsorsByCategory(sponsor.categoryId)
        const maxOrder = categorySponsors.length > 0 ? Math.max(...categorySponsors.map(s => s.order)) : -1

        const docRef = await addDoc(collection(db, SPONSORS_COLLECTION), {
            ...sponsor,
            order: maxOrder + 1,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        })

        return { success: true, id: docRef.id }
    } catch (error) {
        console.error('Error creating sponsor:', error)
        return { success: false, error: 'Failed to create sponsor' }
    }
}

/**
 * Update a sponsor
 */
export const updateSponsor = async (
    sponsorId: string,
    updates: Partial<Omit<Sponsor, 'id' | 'createdAt'>>
): Promise<{ success: boolean; error?: string }> => {
    try {
        await updateDoc(doc(db, SPONSORS_COLLECTION, sponsorId), {
            ...updates,
            updatedAt: serverTimestamp()
        })
        return { success: true }
    } catch (error) {
        console.error('Error updating sponsor:', error)
        return { success: false, error: 'Failed to update sponsor' }
    }
}

/**
 * Delete a sponsor
 */
export const deleteSponsor = async (sponsorId: string): Promise<{ success: boolean; error?: string }> => {
    try {
        await deleteDoc(doc(db, SPONSORS_COLLECTION, sponsorId))
        return { success: true }
    } catch (error) {
        console.error('Error deleting sponsor:', error)
        return { success: false, error: 'Failed to delete sponsor' }
    }
}

// ========================================
// PROMOTIONAL SPACE OPERATIONS
// ========================================

const PROMO_DOC_ID = 'sidebar_promo' // Single document for promotional space

/**
 * Get promotional space settings
 */
export const getPromotionalSpace = async (): Promise<PromotionalSpace | null> => {
    try {
        const docRef = doc(db, PROMO_COLLECTION, PROMO_DOC_ID)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
            return {
                id: docSnap.id,
                ...docSnap.data()
            } as PromotionalSpace
        }
        return null
    } catch (error) {
        console.error('Error fetching promotional space:', error)
        return null
    }
}

/**
 * Update promotional space
 */
export const updatePromotionalSpace = async (
    data: { link?: string; images: string[] },
    adminUid: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        const docRef = doc(db, PROMO_COLLECTION, PROMO_DOC_ID)

        const updateData = {
            link: data.link || '', // Use empty string instead of undefined
            images: data.images,
            updatedAt: serverTimestamp(),
            updatedBy: adminUid
        }

        // Use setDoc with merge to create or update
        await setDoc(docRef, updateData, { merge: true })

        return { success: true }
    } catch (error) {
        console.error('Error updating promotional space:', error)
        return { success: false, error: 'Failed to update promotional space' }
    }
}

// ========================================
// MULTIPLE PROMOTIONS OPERATIONS
// ========================================

const PROMOTIONS_COLLECTION = 'promotions'

/**
 * Get all promotions
 */
export const getAllPromotions = async (): Promise<Promotion[]> => {
    try {
        const q = query(collection(db, PROMOTIONS_COLLECTION))
        const querySnapshot = await getDocs(q)

        const promotions = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Promotion[]

        return promotions.sort((a, b) => a.order - b.order)
    } catch (error) {
        console.error('Error fetching promotions:', error)
        return []
    }
}

/**
 * Create a new promotion
 */
export const createPromotion = async (
    promotion: Omit<Promotion, 'id' | 'createdAt' | 'updatedAt' | 'order'>,
    adminUid: string
): Promise<{ success: boolean; id?: string; error?: string }> => {
    try {
        // Get current max order
        const existing = await getAllPromotions()
        const maxOrder = existing.length > 0 ? Math.max(...existing.map(p => p.order)) : -1

        const docRef = await addDoc(collection(db, PROMOTIONS_COLLECTION), {
            ...promotion,
            link: promotion.link || '',
            title: promotion.title || '',
            order: maxOrder + 1,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: adminUid
        })

        return { success: true, id: docRef.id }
    } catch (error) {
        console.error('Error creating promotion:', error)
        return { success: false, error: 'Failed to create promotion' }
    }
}

/**
 * Update a promotion
 */
export const updatePromotion = async (
    promotionId: string,
    updates: Partial<Omit<Promotion, 'id' | 'createdAt'>>
): Promise<{ success: boolean; error?: string }> => {
    try {
        const updateData = {
            ...updates,
            link: updates.link ?? '',
            title: updates.title ?? '',
            updatedAt: serverTimestamp()
        }
        await updateDoc(doc(db, PROMOTIONS_COLLECTION, promotionId), updateData)
        return { success: true }
    } catch (error) {
        console.error('Error updating promotion:', error)
        return { success: false, error: 'Failed to update promotion' }
    }
}

/**
 * Delete a promotion
 */
export const deletePromotion = async (promotionId: string): Promise<{ success: boolean; error?: string }> => {
    try {
        await deleteDoc(doc(db, PROMOTIONS_COLLECTION, promotionId))
        return { success: true }
    } catch (error) {
        console.error('Error deleting promotion:', error)
        return { success: false, error: 'Failed to delete promotion' }
    }
}
