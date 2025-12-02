import { useState, useEffect, useCallback } from 'react'
import { getUserProfile, updateUserProfile, type UserProfile } from '../../utils/auth'
import CustomDropdown from '../custom-dropdown/CustomDropdown'
import './ProfileOverlay.css'

interface ProfileOverlayProps {
    isOpen: boolean
    onClose: () => void
}

export default function ProfileOverlay({ isOpen, onClose }: ProfileOverlayProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [error, setError] = useState('')
    const [profile, setProfile] = useState<UserProfile>({
        email: '',
        fullName: ''
    })
    const [editedProfile, setEditedProfile] = useState<UserProfile>(profile)

    const handleClose = useCallback(() => {
        setIsEditing(false)
        onClose()
    }, [onClose])

    useEffect(() => {
        if (isOpen) {
            try {
                const userProfile = getUserProfile()
                if (userProfile) {
                    setProfile(userProfile)
                    setEditedProfile(userProfile)
                    setError('')
                } else {
                    // User not authenticated or session expired
                    setError('Unable to load profile. Please log in again.')
                    // Close overlay after showing error briefly
                    setTimeout(() => onClose(), 2000)
                }
            } catch (err) {
                console.error('Error loading profile:', err)
                setError('Error loading profile data')
            }
        }
    }, [isOpen, onClose])

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                handleClose()
            }
        }

        if (isOpen) {
            window.addEventListener('keydown', handleEscape)
            document.body.style.overflow = 'hidden'
        }

        return () => {
            window.removeEventListener('keydown', handleEscape)
            document.body.style.overflow = 'unset'
        }
    }, [isOpen, handleClose])

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            handleClose()
        }
    }

    const handleEdit = () => {
        setIsEditing(true)
    }

    const handleCancel = () => {
        setEditedProfile(profile)
        setIsEditing(false)
    }

    const handleSave = () => {
        try {
            const result = updateUserProfile(editedProfile)
            if (result.success) {
                setProfile(editedProfile)
                setIsEditing(false)
                setError('')
            } else {
                setError(result.error || 'Failed to save profile')
            }
        } catch (err) {
            console.error('Error saving profile:', err)
            setError('An error occurred while saving')
        }
    }

    const handleInputChange = (field: keyof UserProfile, value: string) => {
        setEditedProfile(prev => ({
            ...prev,
            [field]: value
        }))
    }

    if (!isOpen) return null

    return (
        <div className="profile-overlay-backdrop" onClick={handleBackdropClick}>
            <div className="profile-overlay-card">
                {/* Close Button */}
                <button className="profile-close-btn" onClick={handleClose} aria-label="Close profile">
                    ✕
                </button>

                {/* Header */}
                <div className="profile-header">
                    <h2>User Profile</h2>
                </div>

                {/* Error Message */}
                {error && (
                    <div style={{
                        padding: '0.75rem 1rem',
                        background: 'rgba(239, 68, 68, 0.2)',
                        border: '1px solid rgba(239, 68, 68, 0.5)',
                        borderRadius: '10px',
                        color: 'rgba(255, 255, 255, 0.95)',
                        marginBottom: '1rem',
                        textAlign: 'center',
                        fontSize: '0.9rem'
                    }}>
                        {error}
                    </div>
                )}

                {/* Avatar Section */}
                <div className="profile-avatar-section">
                    <div className="profile-avatar-large">
                        <span className="avatar-placeholder-large">PROFILE IMAGE</span>
                    </div>
                </div>

                {/* Profile Content */}
                <div className="profile-content">
                    {/* Personal Details Section */}
                    <div className="profile-section">
                        <h3 className="profile-section-title">Personal Details</h3>

                        {/* Full Name */}
                        <div className="profile-field">
                            <label>Full Name</label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    className="profile-input"
                                    value={editedProfile.fullName}
                                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                                    placeholder="Enter your full name"
                                />
                            ) : (
                                <div className="profile-value">{profile.fullName || 'Not set'}</div>
                            )}
                        </div>

                        {/* Gender */}
                        <div className="profile-field">
                            {isEditing ? (
                                <CustomDropdown
                                    label="Gender"
                                    placeholder="Select gender"
                                    options={['Male', 'Female', 'Other', 'Prefer not to say']}
                                    value={editedProfile.gender || ''}
                                    onChange={(value) => handleInputChange('gender', value)}
                                    maxHeight="250px"
                                />
                            ) : (
                                <>
                                    <label>Gender</label>
                                    <div className="profile-value">{profile.gender || 'Not set'}</div>
                                </>
                            )}
                        </div>

                        {/* Date of Birth */}
                        <div className="profile-field">
                            <label>Date of Birth</label>
                            {isEditing ? (
                                <input
                                    type="date"
                                    className="profile-input"
                                    value={editedProfile.dateOfBirth || ''}
                                    onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                                />
                            ) : (
                                <div className="profile-value">{profile.dateOfBirth || 'Not set'}</div>
                            )}
                        </div>

                        {/* Mobile Number */}
                        <div className="profile-field">
                            <label>Mobile Number</label>
                            {isEditing ? (
                                <input
                                    type="tel"
                                    className="profile-input"
                                    value={editedProfile.mobileNumber || ''}
                                    onChange={(e) => handleInputChange('mobileNumber', e.target.value)}
                                    placeholder="Enter your mobile number"
                                />
                            ) : (
                                <div className="profile-value">{profile.mobileNumber || 'Not set'}</div>
                            )}
                        </div>

                        {/* City */}
                        <div className="profile-field">
                            <label>City</label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    className="profile-input"
                                    value={editedProfile.city || ''}
                                    onChange={(e) => handleInputChange('city', e.target.value)}
                                    placeholder="Enter your city"
                                />
                            ) : (
                                <div className="profile-value">{profile.city || 'Not set'}</div>
                            )}
                        </div>

                        {/* State */}
                        <div className="profile-field">
                            <label>State</label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    className="profile-input"
                                    value={editedProfile.state || ''}
                                    onChange={(e) => handleInputChange('state', e.target.value)}
                                    placeholder="Enter your state"
                                />
                            ) : (
                                <div className="profile-value">{profile.state || 'Not set'}</div>
                            )}
                        </div>
                    </div>

                    {/* Academic Details Section */}
                    <div className="profile-section">
                        <h3 className="profile-section-title">Academic Details</h3>

                        {/* College */}
                        <div className="profile-field">
                            <label>College</label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    className="profile-input"
                                    value={editedProfile.college || ''}
                                    onChange={(e) => handleInputChange('college', e.target.value)}
                                    placeholder="Enter your college name"
                                />
                            ) : (
                                <div className="profile-value">{profile.college || 'Not set'}</div>
                            )}
                        </div>

                        {/* Branch / Department */}
                        <div className="profile-field">
                            <label>Branch / Department</label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    className="profile-input"
                                    value={editedProfile.branch || ''}
                                    onChange={(e) => handleInputChange('branch', e.target.value)}
                                    placeholder="Enter your branch/department"
                                />
                            ) : (
                                <div className="profile-value">{profile.branch || 'Not set'}</div>
                            )}
                        </div>

                        {/* Current Year */}
                        <div className="profile-field">
                            {isEditing ? (
                                <CustomDropdown
                                    label="Current Year"
                                    placeholder="Select year"
                                    options={['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year']}
                                    value={editedProfile.currentYear || ''}
                                    onChange={(value) => handleInputChange('currentYear', value)}
                                    maxHeight="250px"
                                />
                            ) : (
                                <>
                                    <label>Current Year</label>
                                    <div className="profile-value">{profile.currentYear || 'Not set'}</div>
                                </>
                            )}
                        </div>

                        {/* Expected Graduation */}
                        <div className="profile-field">
                            <label>Expected Graduation</label>
                            {isEditing ? (
                                <input
                                    type="month"
                                    className="profile-input"
                                    value={editedProfile.expectedGraduation || ''}
                                    onChange={(e) => handleInputChange('expectedGraduation', e.target.value)}
                                />
                            ) : (
                                <div className="profile-value">{profile.expectedGraduation || 'Not set'}</div>
                            )}
                        </div>
                    </div>

                    {/* Account Details Section */}
                    <div className="profile-section">
                        <h3 className="profile-section-title">Account Details</h3>

                        {/* Email (Read-only) */}
                        <div className="profile-field">
                            <label>Email</label>
                            <div className="profile-value readonly">{profile.email}</div>
                        </div>

                        {/* Synapse ID (Read-only) */}
                        <div className="profile-field">
                            <label>Synapse ID</label>
                            <div className="profile-value readonly">{profile.synapseId || 'Not generated'}</div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="profile-actions">
                    {isEditing ? (
                        <>
                            <button className="profile-btn profile-btn-cancel" onClick={handleCancel}>
                                Cancel
                            </button>
                            <button className="profile-btn profile-btn-save" onClick={handleSave}>
                                Save Changes
                            </button>
                        </>
                    ) : (
                        <button className="profile-btn profile-btn-edit" onClick={handleEdit}>
                            Edit Profile
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
