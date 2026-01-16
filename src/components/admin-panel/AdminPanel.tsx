import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPageVisibilitySettings, updatePageVisibility, type PageVisibilitySettings } from '../../lib/siteSettings'
import './AdminPanel.css'

interface AdminPanelProps {
    permissions: string[]
}

// Permission to visibility toggle mapping
const VISIBILITY_CONTROLS: {
    permission: string
    key: keyof PageVisibilitySettings
    label: string
}[] = [
        {
            permission: 'manage_recruitments',
            key: 'recruitments',
            label: 'Recruitments'
        },
        {
            permission: 'manage_events',
            key: 'events',
            label: 'Events'
        },
        {
            permission: 'manage_competitions',
            key: 'competitions',
            label: 'Competitions'
        },
        {
            permission: 'manage_sponsors',
            key: 'sponsors',
            label: 'Sponsors'
        }
    ]

// Permission to management page mapping
const MANAGEMENT_PAGES: {
    permission: string
    label: string
    route: string
}[] = [
        {
            permission: 'manage_recruitments',
            label: 'Manage Recruitments',
            route: '/manage-recruitment-applications'
        },
        {
            permission: 'manage_queries',
            label: 'Manage Queries',
            route: '/manage-queries'
        },
        {
            permission: 'manage_sponsors',
            label: 'Manage Sponsors',
            route: '/manage-sponsors'
        },
        {
            permission: 'manage_competitions',
            label: 'Manage Competitions',
            route: '/manage-competitions'
        },
        {
            permission: 'manage_events',
            label: 'Manage Events',
            route: '/manage-events'
        },
        {
            permission: 'manage_qr_verification',
            label: 'Manage QR Verification',
            route: '/manage-qr-verification'
        }
    ]

export default function AdminPanel({ permissions }: AdminPanelProps) {
    const navigate = useNavigate()
    const [settings, setSettings] = useState<PageVisibilitySettings | null>(null)
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState<string | null>(null)

    // Fetch current settings
    useEffect(() => {
        const fetchSettings = async () => {
            const currentSettings = await getPageVisibilitySettings()
            setSettings(currentSettings)
            setLoading(false)
        }
        fetchSettings()
    }, [])

    // Handle toggle
    const handleToggle = async (key: keyof PageVisibilitySettings) => {
        if (!settings || updating) return

        setUpdating(key)
        const newValue = !settings[key]

        const result = await updatePageVisibility(key, newValue)

        if (result.success) {
            setSettings(prev => prev ? { ...prev, [key]: newValue } : null)
        }

        setUpdating(null)
    }

    // Filter controls based on permissions
    const availableVisibilityControls = VISIBILITY_CONTROLS.filter(
        control => permissions.includes(control.permission)
    )

    const availableManagementPages = MANAGEMENT_PAGES.filter(
        page => permissions.includes(page.permission)
    )

    const hasAnyPermissions = availableVisibilityControls.length > 0 || availableManagementPages.length > 0

    if (loading) {
        return (
            <div className="admin-panel-loading">
                <div className="loading-spinner" />
                <span>Loading admin controls...</span>
            </div>
        )
    }

    if (!hasAnyPermissions) {
        return (
            <div className="admin-panel-empty">
                <p>No admin permissions assigned</p>
                <span className="empty-hint">Contact a super admin to request access</span>
            </div>
        )
    }

    return (
        <div className="admin-panel">
            {/* Management Pages */}
            {availableManagementPages.length > 0 && (
                <div className="admin-section">
                    <div className="admin-management-grid">
                        {availableManagementPages.map(page => (
                            <button
                                key={page.route}
                                className="admin-management-btn"
                                onClick={() => navigate(page.route)}
                            >
                                <span className="management-label">{page.label}</span>
                                <span className="management-arrow">→</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Visibility Toggles */}
            {availableVisibilityControls.length > 0 && (
                <div className="admin-section">
                    <div className="admin-controls-grid">
                        {availableVisibilityControls.map(control => (
                            <div
                                key={control.key}
                                className={`admin-control-card ${settings?.[control.key] ? 'active' : 'inactive'}`}
                            >
                                <div className="control-info">
                                    <span className="control-label">{control.label}</span>
                                </div>
                                <button
                                    className={`control-toggle ${settings?.[control.key] ? 'on' : 'off'} ${updating === control.key ? 'updating' : ''}`}
                                    onClick={() => handleToggle(control.key)}
                                    disabled={updating !== null}
                                >
                                    <span className="toggle-slider" />
                                    <span className="toggle-label">
                                        {updating === control.key ? '...' : settings?.[control.key] ? 'ON' : 'OFF'}
                                    </span>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
