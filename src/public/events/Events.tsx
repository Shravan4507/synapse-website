import { useState } from 'react'
import './Events.css'

interface DayPass {
    day: number
    name: string
    price: number
    date: string
    highlights: string[]
    isSelected: boolean
    isDisabled: boolean
}

export default function Events() {
    const [selectedDays, setSelectedDays] = useState<number[]>([])

    // Day pass data
    const dayPasses: DayPass[] = [
        {
            day: 1,
            name: 'Day 1',
            price: 150,
            date: 'Coming Soon',
            highlights: [
                'Opening Ceremony',
                'Tech Talks & Workshops',
                'Gaming Zone Access',
                'Lunch & Refreshments'
            ],
            isSelected: selectedDays.includes(1),
            isDisabled: false // Day 1 is always available
        },
        {
            day: 2,
            name: 'Day 2',
            price: 100,
            date: 'Coming Soon',
            highlights: [
                'Hackathon Continues',
                'Cultural Events',
                'DJ Night Prelims',
                'Lunch & Refreshments'
            ],
            isSelected: selectedDays.includes(2),
            isDisabled: !selectedDays.includes(1) // Requires Day 1
        },
        {
            day: 3,
            name: 'Day 3',
            price: 50,
            date: 'Coming Soon',
            highlights: [
                'Grand Finale',
                'Prize Distribution',
                'DJ Night',
                'Closing Ceremony'
            ],
            isSelected: selectedDays.includes(3),
            isDisabled: !selectedDays.includes(1) || !selectedDays.includes(2) // Requires Day 1 + Day 2
        }
    ]

    const handleDaySelect = (day: number) => {
        const pass = dayPasses.find(p => p.day === day)
        if (pass?.isDisabled) return

        setSelectedDays(prev => {
            if (prev.includes(day)) {
                // Deselecting - also remove dependent days
                if (day === 1) {
                    return [] // Remove all if Day 1 is deselected
                } else if (day === 2) {
                    return prev.filter(d => d !== 2 && d !== 3) // Remove Day 2 and Day 3
                } else {
                    return prev.filter(d => d !== day)
                }
            } else {
                // Selecting
                return [...prev, day].sort((a, b) => a - b)
            }
        })
    }

    // Calculate total price
    const totalPrice = selectedDays.reduce((sum, day) => {
        const pass = dayPasses.find(p => p.day === day)
        return sum + (pass?.price || 0)
    }, 0)

    return (
        <div className="events-page">
            <div className="events-content">
                <h1 className="events-title">Synapse '26</h1>
                <p className="events-subtitle">Choose Your Experience</p>
                <p className="events-info">
                    Select the days you want to attend. Day passes are sequential —
                    Day 2 requires Day 1, and Day 3 requires both.
                </p>

                <div className="day-passes-container">
                    {dayPasses.map((pass, index) => (
                        <div
                            key={pass.day}
                            className={`day-pass-card ${pass.isSelected ? 'selected' : ''} ${pass.isDisabled ? 'disabled' : ''}`}
                            onClick={() => handleDaySelect(pass.day)}
                            style={{ animationDelay: `${index * 0.1}s` }}
                        >
                            {/* Card Header */}
                            <div className="day-pass-header">
                                <span className="day-badge">Day {pass.day}</span>
                                {pass.isDisabled && (
                                    <span className="locked-badge">
                                        🔒 Requires Day {pass.day - 1}
                                    </span>
                                )}
                            </div>

                            {/* Price */}
                            <div className="day-pass-price">
                                <span className="price-symbol">₹</span>
                                <span className="price-amount">{pass.price}</span>
                            </div>

                            {/* Date */}
                            <div className="day-pass-date">{pass.date}</div>

                            {/* Highlights */}
                            <ul className="day-pass-highlights">
                                {pass.highlights.map((highlight, i) => (
                                    <li key={i}>
                                        <span className="highlight-icon">✓</span>
                                        {highlight}
                                    </li>
                                ))}
                            </ul>

                            {/* Selection Indicator */}
                            <div className="day-pass-action">
                                {pass.isDisabled ? (
                                    <span className="action-locked">Unlock with Day {pass.day - 1}</span>
                                ) : pass.isSelected ? (
                                    <span className="action-selected">✓ Selected</span>
                                ) : (
                                    <span className="action-select">Click to Select</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Total & Checkout */}
                {selectedDays.length > 0 && (
                    <div className="checkout-section">
                        <div className="checkout-summary">
                            <span className="checkout-label">
                                {selectedDays.length} Day{selectedDays.length > 1 ? 's' : ''} Selected
                            </span>
                            <span className="checkout-total">
                                Total: <strong>₹{totalPrice}</strong>
                            </span>
                        </div>
                        <button className="checkout-btn">
                            Proceed to Checkout
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
