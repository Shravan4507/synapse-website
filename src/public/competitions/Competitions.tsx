import './Competitions.css'

export default function Competitions() {
    return (
        <div className="competitions-page">
            <div className="competitions-content">
                <h1 className="competitions-title">Competitions</h1>
                <p className="competitions-subtitle">
                    Exciting competitions coming soon! Stay tuned.
                </p>

                <div style={{
                    textAlign: 'center',
                    padding: '4rem 1rem',
                    minHeight: '50vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <div style={{ fontSize: '6rem', marginBottom: '1rem' }}>🏆</div>
                    <p style={{
                        color: 'rgba(255,255,255,0.6)',
                        fontSize: '1.2rem',
                        maxWidth: '500px'
                    }}>
                        We're preparing amazing competitions for you. Check back soon!
                    </p>
                </div>
            </div>
        </div>
    )
}
