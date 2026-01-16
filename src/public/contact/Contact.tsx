import { useState } from 'react'
import CustomDropdown from '../../components/custom-dropdown/CustomDropdown'
import { submitContactQuery } from '../../lib/queryService'
import './Contact.css'

export default function Contact() {
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        role: '',
        subject: '',
        message: ''
    })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleDropdownChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        setSubmitStatus('idle')

        // Build message with role info
        const fullMessage = formData.role
            ? `[${formData.role}]${formData.phone ? ` | Phone: ${formData.phone}` : ''}\n\n${formData.message}`
            : formData.message

        const result = await submitContactQuery({
            name: formData.fullName,
            email: formData.email,
            subject: formData.subject,
            message: fullMessage
        })

        setIsSubmitting(false)

        if (result.success) {
            setSubmitStatus('success')
            // Reset form
            setFormData({
                fullName: '',
                email: '',
                phone: '',
                role: '',
                subject: '',
                message: ''
            })
            // Reset status after 5 seconds
            setTimeout(() => setSubmitStatus('idle'), 5000)
        } else {
            setSubmitStatus('error')
        }
    }

    const contactInfo = {
        email: 'contact@synapsefest.org',
        phone: '+91 XXXX-XXXXXX',
        social: {
            instagram: 'https://instagram.com/synapse.zcoer',
        },
        location: {
            name: 'Zeal College of Engineering and Research',
            address: 'Survey No-39, Dhayari Narhe Rd, Narhe, Pune, Maharashtra 411041',
            mapLink: 'https://maps.app.goo.gl/zr4Yg3uhrYabnjH49'
        }
    }

    return (
        <div className="contact-page">
            <div className="contact-container">
                <h1 className="contact-title">Get in Touch</h1>
                <p className="contact-subtitle">We'd love to hear from you!</p>

                <div className="contact-content">
                    {/* Left: Custom Contact Form */}
                    <div className="contact-form-section">
                        <h2 className="section-heading">Send us a Message</h2>
                        <form className="custom-contact-form" onSubmit={handleSubmit}>
                            {/* Full Name */}
                            <div className="form-group">
                                <label htmlFor="fullName">Full Name</label>
                                <input
                                    type="text"
                                    id="fullName"
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={handleInputChange}
                                    placeholder="Enter your full name"
                                />
                            </div>

                            {/* Email */}
                            <div className="form-group">
                                <label htmlFor="email">Email Address <span className="required">*</span></label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    placeholder="your.email@example.com"
                                    required
                                />
                            </div>

                            {/* Phone Number */}
                            <div className="form-group">
                                <label htmlFor="phone">Phone Number</label>
                                <input
                                    type="tel"
                                    id="phone"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    placeholder="10-digit mobile number"
                                />
                            </div>

                            {/* I am a... */}
                            <div className="form-group">
                                <CustomDropdown
                                    label="I am a..."
                                    placeholder="Select your role"
                                    options={['Student', 'Faculty Member', 'Alumni', 'External Organization/Company']}
                                    value={formData.role}
                                    onChange={(value) => handleDropdownChange('role', value)}
                                    name="role"
                                    required
                                    maxHeight="280px"
                                />
                            </div>

                            {/* Subject */}
                            <div className="form-group">
                                <CustomDropdown
                                    label="Subject"
                                    placeholder="Select a subject"
                                    options={[
                                        'General Inquiry',
                                        'Event Registration/Information',
                                        'Competition Information',
                                        'Partnership/Collaboration',
                                        'Join Team Synapse',
                                        'Technical Support',
                                        'Feedback/Suggestions',
                                        'Media/Press Inquiry',
                                        'Sponsorship Inquiry'
                                    ]}
                                    value={formData.subject}
                                    onChange={(value) => handleDropdownChange('subject', value)}
                                    name="subject"
                                    required
                                    maxHeight="300px"
                                />
                            </div>

                            {/* Message */}
                            <div className="form-group">
                                <label htmlFor="message">Your Message <span className="required">*</span></label>
                                <textarea
                                    id="message"
                                    name="message"
                                    value={formData.message}
                                    onChange={handleInputChange}
                                    placeholder="Please provide details about your inquiry"
                                    rows={6}
                                    required
                                />
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                className={`contact-submit-btn ${submitStatus}`}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Sending...' :
                                    submitStatus === 'success' ? 'Message Sent!' :
                                        submitStatus === 'error' ? 'Failed - Try Again' :
                                            'Send Message'}
                            </button>

                            {submitStatus === 'success' && (
                                <p className="submit-success">Thank you! We'll get back to you soon.</p>
                            )}
                        </form>
                    </div>

                    {/* Right: Contact Information */}
                    <div className="contact-info-section">
                        <h2 className="section-heading">Contact Information</h2>

                        <div className="info-cards">
                            {/* Email Card */}
                            <div className="info-card">
                                <div className="info-icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                        <polyline points="22,6 12,13 2,6" />
                                    </svg>
                                </div>
                                <h3 className="info-label">Email</h3>
                                <a href={`mailto:${contactInfo.email}`} className="info-value">
                                    {contactInfo.email}
                                </a>
                            </div>

                            {/* Phone Card */}
                            <div className="info-card">
                                <div className="info-icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                    </svg>
                                </div>
                                <h3 className="info-label">Phone</h3>
                                <a href={`tel:${contactInfo.phone.replace(/\s/g, '')}`} className="info-value">
                                    {contactInfo.phone}
                                </a>
                            </div>

                            {/* Social Media */}
                            <div className="info-card social-card">
                                <div className="info-icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="18" cy="5" r="3" />
                                        <circle cx="6" cy="12" r="3" />
                                        <circle cx="18" cy="19" r="3" />
                                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                                    </svg>
                                </div>
                                <h3 className="info-label">Follow Us</h3>
                                <div className="social-links">
                                    <a
                                        href={contactInfo.social.instagram}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="social-link instagram"
                                        aria-label="Instagram"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                        </svg>
                                    </a>
                                </div>
                            </div>

                            {/* Office Location */}
                            <div className="info-card">
                                <div className="info-icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                        <circle cx="12" cy="10" r="3" />
                                    </svg>
                                </div>
                                <h3 className="info-label">Location</h3>
                                <a
                                    href={contactInfo.location.mapLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="info-value location-link"
                                >
                                    {contactInfo.location.name}<br />
                                    {contactInfo.location.address}
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
