/**
 * Site Settings Service - Manages site-wide settings like page visibility
 */

import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from './firebase'

const SITE_SETTINGS_COLLECTION = 'site_settings'
const SITE_SETTINGS_DOC = 'page_visibility'

/**
 * Page visibility settings interface
 */
export interface PageVisibilitySettings {
    recruitments: boolean    // /join page
    events: boolean          // /events page
    competitions: boolean    // /competitions page
    sponsors: boolean        // /sponsors page
}

/**
 * Default page visibility settings
 */
const DEFAULT_SETTINGS: PageVisibilitySettings = {
    recruitments: true,
    events: true,
    competitions: true,
    sponsors: true
}

/**
 * Get current page visibility settings
 */
export const getPageVisibilitySettings = async (): Promise<PageVisibilitySettings> => {
    try {
        const settingsRef = doc(db, SITE_SETTINGS_COLLECTION, SITE_SETTINGS_DOC)
        const settingsSnap = await getDoc(settingsRef)

        if (settingsSnap.exists()) {
            return { ...DEFAULT_SETTINGS, ...settingsSnap.data() } as PageVisibilitySettings
        }

        // Create default settings if they don't exist
        await setDoc(settingsRef, DEFAULT_SETTINGS)
        return DEFAULT_SETTINGS
    } catch (error) {
        console.error('Error fetching page visibility settings:', error)
        return DEFAULT_SETTINGS
    }
}

/**
 * Update a specific page visibility setting
 */
export const updatePageVisibility = async (
    page: keyof PageVisibilitySettings,
    isVisible: boolean
): Promise<{ success: boolean; error?: string }> => {
    try {
        const settingsRef = doc(db, SITE_SETTINGS_COLLECTION, SITE_SETTINGS_DOC)
        await setDoc(settingsRef, { [page]: isVisible }, { merge: true })
        return { success: true }
    } catch (error) {
        console.error('Error updating page visibility:', error)
        return { success: false, error: 'Failed to update setting' }
    }
}

/**
 * Check if a specific page is visible
 */
export const isPageVisible = async (page: keyof PageVisibilitySettings): Promise<boolean> => {
    const settings = await getPageVisibilitySettings()
    return settings[page] ?? true
}
