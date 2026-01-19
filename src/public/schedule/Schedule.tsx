import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Schedule.css'

interface ScheduleEvent {
    time: string
    title: string
    description: string
    type: 'workshop' | 'competition' | 'showcase' | 'keynote'
    location?: string
}

interface DaySchedule {
    day: string
    date: string
    events: ScheduleEvent[]
}

const scheduleData: DaySchedule[] = [
    {
        day: 'Day 1',
        date: 'February 15, 2026',
        events: [
            {
                time: '09:00 AM',
                title: 'Opening Ceremony',
                description: 'Kickoff of Synapse \'26 with keynote speeches and welcome address',
                type: 'keynote',
                location: 'Main Auditorium'
            },
            {
                time: '10:30 AM',
                title: 'AI & Machine Learning Workshop',
                description: 'Hands-on workshop on building ML models with Python',
                type: 'workshop',
                location: 'Lab 1'
            },
            {
                time: '02:00 PM',
                title: 'Hackathon Begins',
                description: '24-hour coding marathon starts. Build innovative solutions!',
                type: 'competition',
                location: 'Computer Lab'
            },
            {
                time: '04:00 PM',
                title: 'Robotics Showcase',
                description: 'Student projects and demonstrations',
                type: 'showcase',
                location: 'Exhibition Hall'
            }
        ]
    },
    {
        day: 'Day 2',
        date: 'February 16, 2026',
        events: [
            {
                time: '10:00 AM',
                title: 'Web Development Bootcamp',
                description: 'Learn modern web development with React and Node.js',
                type: 'workshop',
                location: 'Lab 2'
            },
            {
                time: '12:00 PM',
                title: 'Code Sprint Challenge',
                description: 'Fast-paced competitive programming event',
                type: 'competition',
                location: 'Auditorium B'
            },
            {
                time: '02:00 PM',
                title: 'Hackathon Submissions',
                description: 'Final submissions and project presentations',
                type: 'competition',
                location: 'Computer Lab'
            },
            {
                time: '05:00 PM',
                title: 'Innovation Expo',
                description: 'Showcase of student innovations and startups',
                type: 'showcase',
                location: 'Exhibition Hall'
            }
        ]
    },
    {
        day: 'Day 3',
        date: 'February 17, 2026',
        events: [
            {
                time: '10:00 AM',
                title: 'Tech Talk: Future of AI',
                description: 'Industry experts discuss the future of artificial intelligence',
                type: 'keynote',
                location: 'Main Auditorium'
            },
            {
                time: '01:00 PM',
                title: 'Design Thinking Workshop',
                description: 'Creative problem-solving and UX design principles',
                type: 'workshop',
                location: 'Design Studio'
            },
            {
                time: '03:00 PM',
                title: 'Project Expo & Awards',
                description: 'Final project presentations and prize distribution',
                type: 'showcase',
                location: 'Main Auditorium'
            },
            {
                time: '06:00 PM',
                title: 'Closing Ceremony',
                description: 'Celebration, awards, and closing remarks',
                type: 'keynote',
                location: 'Main Auditorium'
            }
        ]
    }
]

export default function Schedule() {
    const navigate = useNavigate()
    const [selectedDay, setSelectedDay] = useState(0)
    const [selectedType, setSelectedType] = useState<string>('all')

    const eventTypes = [
        { id: 'all', label: 'All Events' },
        { id: 'workshop', label: 'Workshop' },
        { id: 'competition', label: 'Competition' },
        { id: 'showcase', label: 'Showcase' },
        { id: 'keynote', label: 'Keynote' }
    ]

    const getEventTypeColor = (type: string) => {
        switch (type) {
            case 'workshop': return '#00ff88'
            case 'competition': return '#ff6b6b'
            case 'showcase': return '#ffd93d'
            case 'keynote': return '#8a2be2'
            default: return '#00d4ff'
        }
    }

    const getEventTypeIcon = (type: string) => {
        switch (type) {
            case 'workshop': return '🛠️'
            case 'competition': return '🏆'
            case 'showcase': return '🎨'
            case 'keynote': return '🎤'
            default: return '📅'
        }
    }

    // Filter events by selected type
    const filteredEvents = selectedType === 'all'
        ? scheduleData[selectedDay].events
        : scheduleData[selectedDay].events.filter(event => event.type === selectedType)

    return (
        <div className="schedule-page">
            <div className="schedule-container">
                {/* Header */}
                <div className="schedule-header">
                    <button className="back-btn" onClick={() => navigate('/')}>
                        ← Back
                    </button>
                    <h1 className="schedule-title">Event Schedule</h1>
                    <p className="schedule-subtitle">
                        Synapse '26 - Three Days of Innovation, Learning & Celebration
                    </p>
                </div>

                {/* Day Selector */}
                <div className="day-selector">
                    {scheduleData.map((day, index) => (
                        <button
                            key={index}
                            className={`day-btn ${selectedDay === index ? 'active' : ''}`}
                            onClick={() => setSelectedDay(index)}
                        >
                            <span className="day-name">{day.day}</span>
                            <span className="day-date">{day.date}</span>
                        </button>
                    ))}
                </div>

                {/* Event Type Filters */}
                <div className="event-type-filters">
                    {eventTypes.map((type) => (
                        <button
                            key={type.id}
                            className={`filter-btn ${selectedType === type.id ? 'active' : ''}`}
                            onClick={() => setSelectedType(type.id)}
                        >
                            {type.label}
                        </button>
                    ))}
                </div>

                {/* Timeline */}
                <div className="timeline-container">
                    <div className="timeline">
                        {filteredEvents.map((event, index) => (
                            <div
                                key={index}
                                className="timeline-item"
                                style={{ '--event-color': getEventTypeColor(event.type) } as React.CSSProperties}
                            >
                                <div className="timeline-marker">
                                    <div className="marker-dot"></div>
                                    <div className="marker-line"></div>
                                </div>

                                <div className="timeline-content">
                                    <div className="event-time">{event.time}</div>
                                    <div className="event-card">
                                        <div className="event-header">
                                            <span className="event-icon">
                                                {getEventTypeIcon(event.type)}
                                            </span>
                                            <div className="event-info">
                                                <h3 className="event-title">{event.title}</h3>
                                                <span className="event-type">{event.type}</span>
                                            </div>
                                        </div>
                                        <p className="event-description">{event.description}</p>
                                        {event.location && (
                                            <div className="event-location">
                                                📍 {event.location}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* CTA */}
                <div className="schedule-cta">
                    <button
                        className="register-btn"
                        onClick={() => navigate('/events')}
                    >
                        🎫 Register for Events
                    </button>
                </div>
            </div>
        </div>
    )
}
