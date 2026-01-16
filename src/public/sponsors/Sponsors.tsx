import { useState, useEffect } from 'react'
import { getSponsorsGroupedByCategory, type Sponsor, type SponsorCategory } from '../../lib/sponsorService'
import './Sponsors.css'

// Component for auto-rotating sponsor images
function SponsorCard({ sponsor }: { sponsor: Sponsor }) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0)

    useEffect(() => {
        if (sponsor.images.length <= 1) return

        const interval = setInterval(() => {
            setCurrentImageIndex(prev => (prev + 1) % sponsor.images.length)
        }, 3000) // Rotate every 3 seconds

        return () => clearInterval(interval)
    }, [sponsor.images.length])

    const handleClick = () => {
        if (sponsor.link) {
            window.open(sponsor.link, '_blank', 'noopener,noreferrer')
        }
    }

    return (
        <div
            className={`sponsor-card ${sponsor.link ? 'clickable' : ''}`}
            onClick={handleClick}
        >
            <div className="sponsor-image-container">
                <img
                    src={sponsor.images[currentImageIndex]}
                    alt={sponsor.title}
                    className="sponsor-image"
                />
            </div>
            <p className="sponsor-name">{sponsor.title}</p>
        </div>
    )
}

export default function Sponsors() {
    const [sponsorGroups, setSponsorGroups] = useState<{ category: SponsorCategory; sponsors: Sponsor[] }[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchSponsors = async () => {
            const groups = await getSponsorsGroupedByCategory()
            setSponsorGroups(groups)
            setLoading(false)
        }
        fetchSponsors()
    }, [])

    const hasSponsors = sponsorGroups.length > 0

    return (
        <div className="sponsors-page">
            <div className="sponsors-content">
                {loading ? (
                    <div className="sponsors-loading">Loading sponsors...</div>
                ) : hasSponsors ? (
                    <>
                        {sponsorGroups.map(({ category, sponsors }) => (
                            <div key={category.id} className="sponsor-category">
                                <h2 className="category-title">{category.name}</h2>
                                <div className="sponsor-grid">
                                    {sponsors.map(sponsor => (
                                        <SponsorCard key={sponsor.id} sponsor={sponsor} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </>
                ) : null}

                {/* Become a Sponsor - Always visible at bottom */}
                <div className="become-sponsor">
                    <h3>Want to become a sponsor?</h3>
                    <p>Partner with us to reach thousands of tech enthusiasts</p>
                    <a href="/contact" className="sponsor-cta-btn">
                        Get in Touch
                    </a>
                </div>
            </div>
        </div>
    )
}
