import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { logout } from '../../utils/auth'
import { deleteUserAccount, deleteAdminAccount } from '../../lib/userService'
import { getCurrentUser } from '../../lib/auth'
import './SettingsOverlay.css'

interface SettingsOverlayProps {
    isOpen: boolean
    onClose: () => void
    synapseId: string
    isAdmin: boolean
}

// Available languages
const LANGUAGES = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
    { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
    { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
    { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
    { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
    { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
    { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' }
]

export default function SettingsOverlay({ isOpen, onClose, synapseId, isAdmin }: SettingsOverlayProps) {
    const navigate = useNavigate()
    const [currentLanguage, setCurrentLanguage] = useState(() => {
        return localStorage.getItem('synapse_language') || 'en'
    })
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [deleteInput, setDeleteInput] = useState('')
    const [deleteError, setDeleteError] = useState('')
    const [isDeleting, setIsDeleting] = useState(false)

    if (!isOpen) return null

    const handleLanguageChange = (langCode: string) => {
        setCurrentLanguage(langCode)
        localStorage.setItem('synapse_language', langCode)
        // Dispatch event so other components can react to language change
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: langCode }))
    }

    const handleDeleteAccount = async () => {
        // Validate Synapse ID input
        if (deleteInput.trim() !== synapseId) {
            setDeleteError('Synapse ID does not match. Please enter your exact Synapse ID.')
            return
        }

        setIsDeleting(true)
        setDeleteError('')

        try {
            const user = getCurrentUser()
            if (!user) {
                setDeleteError('Authentication error. Please try again.')
                return
            }

            let result
            if (isAdmin) {
                result = await deleteAdminAccount(user.uid, synapseId)
            } else {
                result = await deleteUserAccount(user.uid, synapseId)
            }

            if (result.success) {
                // Logout and redirect
                await logout()
                navigate('/user-login')
            } else {
                setDeleteError(result.error || 'Failed to delete account. Please try again.')
            }
        } catch (error) {
            console.error('Delete account error:', error)
            setDeleteError('An error occurred. Please try again.')
        } finally {
            setIsDeleting(false)
        }
    }

    const handleCloseDeleteConfirm = () => {
        setShowDeleteConfirm(false)
        setDeleteInput('')
        setDeleteError('')
    }

    return (
        <div className="settings-overlay" onClick={onClose}>
            <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
                <div className="settings-header">
                    <h2>Settings</h2>
                    <button className="settings-close-btn" onClick={onClose}>
                        ×
                    </button>
                </div>

                <div className="settings-content">
                    {/* Language Section */}
                    <div className="settings-section">
                        <h3 className="settings-section-title">Language</h3>
                        <p className="settings-section-desc">
                            Choose your preferred language for the website
                        </p>
                        <div className="language-options">
                            {LANGUAGES.map((lang) => (
                                <button
                                    key={lang.code}
                                    className={`language-option ${currentLanguage === lang.code ? 'active' : ''}`}
                                    onClick={() => handleLanguageChange(lang.code)}
                                >
                                    <span className="lang-native">{lang.nativeName}</span>
                                    <span className="lang-name">{lang.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="settings-section danger-zone">
                        <h3 className="settings-section-title danger">Danger Zone</h3>

                        {!showDeleteConfirm ? (
                            <div className="delete-account-section">
                                <p className="settings-section-desc">
                                    Permanently delete your account and all associated data. This action cannot be undone.
                                </p>
                                <button
                                    className="delete-account-btn"
                                    onClick={() => setShowDeleteConfirm(true)}
                                >
                                    Delete Account
                                </button>
                            </div>
                        ) : (
                            <div className="delete-confirm-section">
                                <p className="delete-warning">
                                    ⚠️ This will permanently delete your account, including all your registrations and data.
                                </p>
                                <p className="delete-instruction">
                                    To confirm, please enter your Synapse ID: <strong>{synapseId}</strong>
                                </p>
                                <input
                                    type="text"
                                    className="delete-input"
                                    placeholder="Enter your Synapse ID"
                                    value={deleteInput}
                                    onChange={(e) => {
                                        setDeleteInput(e.target.value)
                                        setDeleteError('')
                                    }}
                                />
                                {deleteError && (
                                    <p className="delete-error">{deleteError}</p>
                                )}
                                <div className="delete-actions">
                                    <button
                                        className="cancel-delete-btn"
                                        onClick={handleCloseDeleteConfirm}
                                        disabled={isDeleting}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="confirm-delete-btn"
                                        onClick={handleDeleteAccount}
                                        disabled={isDeleting || deleteInput.trim() !== synapseId}
                                    >
                                        {isDeleting ? 'Deleting...' : 'Delete My Account'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
