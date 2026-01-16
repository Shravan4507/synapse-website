import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { getPageVisibilitySettings, type PageVisibilitySettings } from '../lib/siteSettings'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'

interface PageVisibilityContextType {
    settings: PageVisibilitySettings
    loading: boolean
}

const defaultSettings: PageVisibilitySettings = {
    recruitments: true,
    events: true,
    competitions: true,
    sponsors: true
}

const PageVisibilityContext = createContext<PageVisibilityContextType>({
    settings: defaultSettings,
    loading: true
})

export function PageVisibilityProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<PageVisibilitySettings>(defaultSettings)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Initial fetch
        getPageVisibilitySettings().then(s => {
            setSettings(s)
            setLoading(false)
        })

        // Real-time listener for changes
        const unsubscribe = onSnapshot(
            doc(db, 'site_settings', 'page_visibility'),
            (docSnap) => {
                if (docSnap.exists()) {
                    setSettings({ ...defaultSettings, ...docSnap.data() } as PageVisibilitySettings)
                }
            },
            (error) => {
                console.error('Error listening to page visibility:', error)
            }
        )

        return () => unsubscribe()
    }, [])

    return (
        <PageVisibilityContext.Provider value={{ settings, loading }}>
            {children}
        </PageVisibilityContext.Provider>
    )
}

export function usePageVisibility() {
    return useContext(PageVisibilityContext)
}
