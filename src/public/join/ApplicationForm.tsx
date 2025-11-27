import { useState, useEffect } from 'react'
import './ApplicationForm.css'

interface ApplicationFormProps {
    onClose: () => void
}

export default function ApplicationForm({ onClose }: ApplicationFormProps) {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        contact: '',
        whatsapp: '',
        sameAsContact: false,
        zprnNumber: '',
        department: '',
        class: '',
        division: '',
        selectedTeams: [] as string[],
        role: '',
        skills: '',
        contribution: ''
    })

    const beDepartments = [
        'Computer Engineering',
        'Information Technology',
        'Electronics & Telecommunication',
        'Mechanical Engineering',
        'Civil Engineering',
        'Electrical Engineering',
        'Instrumentation Engineering'
    ]

    const teams = [
        'Treasurer',
        'Documentation Team',
        'Media Team',
        'PR Team',
        'Decoration Team',
        'Stage Team',
        'Technical Team',
        'Sponsorship Team'
    ]

    // Disable body scroll when form is open
    useEffect(() => {
        // Lock scroll on multiple elements to ensure it works
        document.documentElement.style.overflow = 'hidden'
        document.body.style.overflow = 'hidden'
        const root = document.getElementById('root')
        if (root) root.style.overflow = 'hidden'

        return () => {
            document.documentElement.style.overflow = 'unset'
            document.body.style.overflow = 'unset'
            if (root) root.style.overflow = 'unset'
        }
    }, [])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target

        if (name === 'division') {
            // Auto-uppercase and limit to single letter A-Z
            const uppercased = value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 1)
            setFormData(prev => ({ ...prev, [name]: uppercased }))
        } else if (name === 'contact' || name === 'whatsapp') {
            // Only allow digits, max 10
            const digits = value.replace(/\D/g, '').slice(0, 10)
            setFormData(prev => ({ ...prev, [name]: digits }))
        } else {
            setFormData(prev => ({ ...prev, [name]: value }))
        }
    }

    const handleSameAsContact = (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked
        setFormData(prev => ({
            ...prev,
            sameAsContact: checked,
            whatsapp: checked ? prev.contact : ''
        }))
    }

    const handleTeamToggle = (team: string) => {
        setFormData(prev => {
            const newTeams = prev.selectedTeams.includes(team)
                ? prev.selectedTeams.filter(t => t !== team)
                : [...prev.selectedTeams, team]
            return { ...prev, selectedTeams: newTeams }
        })
    }

    const countWords = (text: string) => {
        return text.trim().split(/\s+/).filter(word => word.length > 0).length
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        console.log('Form submitted:', formData)
        alert('Application submitted successfully!')
        onClose()
    }

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose()
        }
    }

    return (
        <div className="form-overlay" onClick={handleOverlayClick}>
            <div className="form-container">
                <button className="form-close-btn" onClick={onClose}>×</button>

                <h2 className="form-heading">Join Synapse Team</h2>

                <form onSubmit={handleSubmit}>
                    {/* Personal Details */}
                    <section className="form-section">
                        <h3 className="section-heading">Personal Details</h3>

                        <div className="form-field">
                            <label>Name <span className="required">*</span></label>
                            <input
                                type="text"
                                name="name"
                                placeholder="Full Name"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                            />
                        </div>

                        <div className="form-field">
                            <label>Email <span className="required">*</span></label>
                            <input
                                type="email"
                                name="email"
                                placeholder="your.email@example.com"
                                value={formData.email}
                                onChange={handleInputChange}
                                required
                            />
                        </div>

                        <div className="form-field">
                            <label>Contact <span className="required">*</span></label>
                            <input
                                type="tel"
                                name="contact"
                                placeholder="10-digit mobile number"
                                value={formData.contact}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/\D/g, '').slice(0, 10)
                                    setFormData(prev => ({
                                        ...prev,
                                        contact: value,
                                        // Auto-sync WhatsApp if checkbox is checked
                                        whatsapp: prev.sameAsContact ? value : prev.whatsapp
                                    }))
                                }}
                                pattern="[6-9][0-9]{9}"
                                required
                            />
                        </div>

                        <div className="form-field">
                            <label>WhatsApp Number <span className="required">*</span></label>
                            <div className="input-with-checkbox">
                                <input
                                    type="tel"
                                    name="whatsapp"
                                    placeholder="10-digit mobile number"
                                    value={formData.whatsapp}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '').slice(0, 10)
                                        setFormData(prev => ({ ...prev, whatsapp: value }))
                                    }}
                                    disabled={formData.sameAsContact}
                                    pattern="[6-9][0-9]{9}"
                                    required
                                />
                                <label className="checkbox-inside">
                                    <input
                                        type="checkbox"
                                        checked={formData.sameAsContact}
                                        onChange={handleSameAsContact}
                                    />
                                    <span>Same as Contact</span>
                                </label>
                            </div>
                        </div>
                    </section>

                    {/* Academic Credentials */}
                    <section className="form-section">
                        <h3 className="section-heading">Academic Credentials</h3>

                        <div className="form-field">
                            <label>ZPRN Number <span className="required">*</span></label>
                            <input
                                type="text"
                                name="zprnNumber"
                                placeholder="Enter ZPRN Number"
                                value={formData.zprnNumber}
                                onChange={handleInputChange}
                                required
                            />
                        </div>

                        <div className="form-field">
                            <label>Department <span className="required">*</span></label>
                            <select
                                name="department"
                                value={formData.department}
                                onChange={handleInputChange}
                                required
                            >
                                <option value="">Select Department</option>
                                {beDepartments.map(dept => (
                                    <option key={dept} value={dept}>{dept}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-field">
                            <label>Class <span className="required">*</span></label>
                            <select
                                name="class"
                                value={formData.class}
                                onChange={handleInputChange}
                                required
                            >
                                <option value="">Select Class</option>
                                <option value="FY">FY</option>
                                <option value="SY">SY</option>
                                <option value="TE">TE</option>
                                <option value="BE">BE</option>
                            </select>
                        </div>

                        <div className="form-field">
                            <label>Division <span className="required">*</span></label>
                            <input
                                type="text"
                                name="division"
                                placeholder="A-Z"
                                value={formData.division}
                                onChange={handleInputChange}
                                maxLength={1}
                                required
                            />
                        </div>
                    </section>

                    {/* Interested Team */}
                    <section className="form-section">
                        <h3 className="section-heading">Interested Team <span className="required">*</span></h3>
                        <p className="field-note">Note: Selection order represents your priority preference</p>

                        <div className="team-checkboxes">
                            {teams.map((team) => (
                                <label key={team} className="team-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={formData.selectedTeams.includes(team)}
                                        onChange={() => handleTeamToggle(team)}
                                    />
                                    <span>{team}</span>
                                    {formData.selectedTeams.includes(team) && (
                                        <span className="priority-badge">
                                            #{formData.selectedTeams.indexOf(team) + 1}
                                        </span>
                                    )}
                                </label>
                            ))}
                        </div>
                    </section>

                    {/* Role */}
                    <section className="form-section">
                        <h3 className="section-heading">Role</h3>

                        <div className="form-field">
                            <label>Select Role <span className="required">*</span></label>
                            <select
                                name="role"
                                value={formData.role}
                                onChange={handleInputChange}
                                required
                            >
                                <option value="">Select Role</option>
                                <option value="core">Apply for Core Team</option>
                                <option value="volunteer">Apply as Volunteer</option>
                            </select>
                        </div>
                    </section>

                    {/* Additional Details */}
                    <section className="form-section">
                        <h3 className="section-heading">Additional Details</h3>

                        <div className="form-field">
                            <label>Skills <span className="required">*</span></label>
                            <div className="textarea-wrapper">
                                <textarea
                                    name="skills"
                                    placeholder="Let us know your skills"
                                    value={formData.skills}
                                    onChange={handleInputChange}
                                    rows={4}
                                    required
                                />
                                <span className="word-count">
                                    {countWords(formData.skills)}/150 words
                                </span>
                            </div>
                        </div>

                        <div className="form-field">
                            <label>Your Contribution <span className="required">*</span></label>
                            <div className="textarea-wrapper">
                                <textarea
                                    name="contribution"
                                    placeholder="Why do you think you can contribute to this team?"
                                    value={formData.contribution}
                                    onChange={handleInputChange}
                                    rows={4}
                                    required
                                />
                                <span className="word-count">
                                    {countWords(formData.contribution)}/150 words
                                </span>
                            </div>
                        </div>
                    </section>

                    <button type="submit" className="form-submit-btn">
                        Submit Application
                    </button>
                </form>
            </div>
        </div>
    )
}
