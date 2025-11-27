import { useState } from 'react'
import './Join.css'
import ApplicationForm from './ApplicationForm'

export default function Join() {
    const [showForm, setShowForm] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const handleApplyClick = () => {
        setIsLoading(true)
        setTimeout(() => {
            setIsLoading(false)
            setShowForm(true)
        }, 500)
    }

    return (
        <div className="join-page">
            <div className="join-content">
                <h1 className="join-heading">Wanna be Part of Team?</h1>
                <button
                    className="apply-now-btn"
                    onClick={handleApplyClick}
                    disabled={isLoading}
                >
                    {isLoading ? 'Loading...' : 'Apply Now'}
                </button>
            </div>

            {showForm && <ApplicationForm onClose={() => setShowForm(false)} />}
        </div>
    )
}
