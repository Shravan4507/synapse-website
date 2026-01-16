import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser } from '../../lib/auth'
import { createAdminDocument, checkAdminExists } from '../../lib/userService'
import './AdminSignupForm.css'

// Dropdown options (same as user signup)
const DEPARTMENTS = [
    'Computer Science & Engineering',
    'Information Technology',
    'Electronics & Communication',
    'Electrical Engineering',
    'Mechanical Engineering',
    'Civil Engineering',
    'Chemical Engineering',
    'Biotechnology',
    'Artificial Intelligence & ML',
    'Data Science',
    'Other'
]

const YEARS_OF_STUDY = [
    '1st Year',
    '2nd Year',
    '3rd Year',
    '4th Year',
    '5th Year'
]

// Generate completion years (current year to +6 years)
const generateCompletionYears = () => {
    const currentYear = new Date().getFullYear()
    const years = []
    for (let i = 0; i <= 6; i++) {
        years.push((currentYear + i).toString())
    }
    return years
}

const COMPLETION_YEARS = generateCompletionYears()

interface FormData {
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
}

export default function AdminSignupForm() {
    const navigate = useNavigate()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [userEmail, setUserEmail] = useState('')
    const [userPhoto, setUserPhoto] = useState<string | undefined>()

    const [formData, setFormData] = useState<FormData>({
        firstName: '',
        lastName: '',
        displayName: '',
        mobileNumber: '',
        dateOfBirth: '',
        gender: '',
        college: '',
        department: '',
        yearOfStudy: '',
        courseCompletionYear: ''
    })

    // Check if user is authenticated and hasn't already completed signup
    useEffect(() => {
        const checkAuth = async () => {
            const user = getCurrentUser()

            if (!user) {
                // Not logged in, redirect to admin signup
                navigate('/signup-admin')
                return
            }

            // Check if admin already exists
            const exists = await checkAdminExists(user.uid)
            if (exists) {
                // Already has admin account, go to dashboard
                navigate('/user-dashboard')
                return
            }

            // Set email from Google account
            setUserEmail(user.email || '')
            setUserPhoto(user.photoURL || undefined)

            // Pre-fill name from Google if available
            if (user.displayName) {
                const nameParts = user.displayName.split(' ')
                setFormData(prev => ({
                    ...prev,
                    firstName: nameParts[0] || '',
                    lastName: nameParts.slice(1).join(' ') || '',
                    displayName: user.displayName || ''
                }))
            }
        }

        checkAuth()
    }, [navigate])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        setError('')
    }

    const validateForm = (): boolean => {
        if (!formData.firstName.trim()) {
            setError('First name is required')
            return false
        }
        if (!formData.lastName.trim()) {
            setError('Last name is required')
            return false
        }
        if (!formData.displayName.trim()) {
            setError('Display name is required')
            return false
        }
        if (!formData.mobileNumber.trim()) {
            setError('Mobile number is required')
            return false
        }
        if (!/^\d{10}$/.test(formData.mobileNumber.replace(/\D/g, ''))) {
            setError('Please enter a valid 10-digit mobile number')
            return false
        }
        if (!formData.dateOfBirth) {
            setError('Date of birth is required')
            return false
        }
        if (!formData.gender) {
            setError('Please select your gender')
            return false
        }
        if (!formData.college.trim()) {
            setError('College name is required')
            return false
        }
        if (!formData.department) {
            setError('Please select your department')
            return false
        }
        if (!formData.yearOfStudy) {
            setError('Please select your year of study')
            return false
        }
        if (!formData.courseCompletionYear) {
            setError('Please select your course completion year')
            return false
        }
        return true
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!validateForm()) return

        setIsLoading(true)
        setError('')

        try {
            const user = getCurrentUser()
            if (!user) {
                setError('Authentication error. Please sign in again.')
                navigate('/signup-admin')
                return
            }

            const result = await createAdminDocument(user.uid, {
                email: userEmail,
                firstName: formData.firstName.trim(),
                lastName: formData.lastName.trim(),
                displayName: formData.displayName.trim(),
                mobileNumber: formData.mobileNumber.trim(),
                dateOfBirth: formData.dateOfBirth,
                gender: formData.gender,
                college: formData.college.trim(),
                department: formData.department,
                yearOfStudy: formData.yearOfStudy,
                courseCompletionYear: formData.courseCompletionYear,
                photoURL: userPhoto
            })

            if (result.success) {
                // Admin account created successfully, go to dashboard
                navigate('/user-dashboard')
            } else {
                setError(result.error || 'Failed to create admin account')
            }
        } catch (err) {
            console.error('Admin signup error:', err)
            setError('An error occurred. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="admin-form-page">
            <div className="admin-form-container">
                <div className="admin-form-card">
                    <div className="admin-badge">ADMIN</div>
                    <h1 className="admin-form-title">Complete Admin Profile</h1>
                    <p className="admin-form-subtitle">
                        Fill in your details to create your admin account
                    </p>

                    {error && <div className="error-message">{error}</div>}

                    <form className="admin-form" onSubmit={handleSubmit}>
                        {/* Name Row */}
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="firstName">First Name *</label>
                                <input
                                    type="text"
                                    id="firstName"
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleInputChange}
                                    placeholder="John"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="lastName">Last Name *</label>
                                <input
                                    type="text"
                                    id="lastName"
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleInputChange}
                                    placeholder="Doe"
                                    required
                                />
                            </div>
                        </div>

                        {/* Display Name */}
                        <div className="form-group">
                            <label htmlFor="displayName">Display Name *</label>
                            <input
                                type="text"
                                id="displayName"
                                name="displayName"
                                value={formData.displayName}
                                onChange={handleInputChange}
                                placeholder="How you want to be called"
                                required
                            />
                        </div>

                        {/* Contact Row */}
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="mobileNumber">Mobile Number *</label>
                                <input
                                    type="tel"
                                    id="mobileNumber"
                                    name="mobileNumber"
                                    value={formData.mobileNumber}
                                    onChange={handleInputChange}
                                    placeholder="9876543210"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="email">Email</label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={userEmail}
                                    disabled
                                    className="disabled-input"
                                />
                            </div>
                        </div>

                        {/* DOB and Gender Row */}
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="dateOfBirth">Date of Birth *</label>
                                <input
                                    type="date"
                                    id="dateOfBirth"
                                    name="dateOfBirth"
                                    value={formData.dateOfBirth}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="gender">Gender *</label>
                                <select
                                    id="gender"
                                    name="gender"
                                    value={formData.gender}
                                    onChange={handleInputChange}
                                    required
                                >
                                    <option value="">Select Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                    <option value="Prefer not to say">Prefer not to say</option>
                                </select>
                            </div>
                        </div>

                        {/* College */}
                        <div className="form-group">
                            <label htmlFor="college">College / University *</label>
                            <input
                                type="text"
                                id="college"
                                name="college"
                                value={formData.college}
                                onChange={handleInputChange}
                                placeholder="Your college or university name"
                                required
                            />
                        </div>

                        {/* Department */}
                        <div className="form-group">
                            <label htmlFor="department">Department *</label>
                            <select
                                id="department"
                                name="department"
                                value={formData.department}
                                onChange={handleInputChange}
                                required
                            >
                                <option value="">Select Department</option>
                                {DEPARTMENTS.map(dept => (
                                    <option key={dept} value={dept}>{dept}</option>
                                ))}
                            </select>
                        </div>

                        {/* Year Row */}
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="yearOfStudy">Year of Study *</label>
                                <select
                                    id="yearOfStudy"
                                    name="yearOfStudy"
                                    value={formData.yearOfStudy}
                                    onChange={handleInputChange}
                                    required
                                >
                                    <option value="">Select Year</option>
                                    {YEARS_OF_STUDY.map(year => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor="courseCompletionYear">Completion Year *</label>
                                <select
                                    id="courseCompletionYear"
                                    name="courseCompletionYear"
                                    value={formData.courseCompletionYear}
                                    onChange={handleInputChange}
                                    required
                                >
                                    <option value="">Select Year</option>
                                    {COMPLETION_YEARS.map(year => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            className="admin-submit-btn"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Creating Admin Account...' : 'Create Admin Account'}
                        </button>
                    </form>

                    <p className="admin-form-footer-text">
                        Your admin Synapse ID will be generated upon account creation
                    </p>
                </div>
            </div>
        </div>
    )
}
