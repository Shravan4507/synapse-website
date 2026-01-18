import { useNavigate } from 'react-router-dom'
import './Hero.css'
import logo from '../../assets/logos/Logo Without Background - 2.png'
import neuralBrain from '/Neural Brain.png'

export default function Hero() {
    const navigate = useNavigate()

    return (
        <div className="hero-section">
            <div className="hero-main">
                {/* Left Content */}
                <div className="hero-left">
                    <div className="hero-branding">
                        <img src={logo} alt="Synapse '26" className="hero-logo" />
                    </div>

                    <h2 className="hero-tagline">The Rise of Self-Driven Intelligence</h2>

                    <div className="hero-description">
                        <p>Step into the future of technology at ZCOER's official technical festival.</p>
                        <p>Synapse '26 brings together innovation, autonomy, agents, robotics, design, engineering, and the wildest ideas students can imagine — all under one electrifying roof.</p>
                        <p>Experience workshops, competitions, showcases, team opportunities, and an unforgettable celebration of the tech culture.</p>
                    </div>
                </div>

                {/* Center - Neural Brain */}
                <div className="hero-center">
                    <div className="brain-container">
                        <img
                            src={neuralBrain}
                            alt="Neural Brain"
                            className="neural-brain"
                        />
                        <div className="brain-glow"></div>
                    </div>
                </div>

                {/* Right - Cards */}
                <div className="hero-right">
                    <div className="hero-card" onClick={() => navigate('/contact')}>
                        <div className="card-header">
                            <h3>About us</h3>
                            <span className="card-arrow">↗</span>
                        </div>
                        <p className="card-text">We specialize in delivering innovative experiences that drive growth.</p>
                    </div>

                    <div className="hero-card" onClick={() => navigate('/events')}>
                        <div className="card-header">
                            <h3>Events & Competitions</h3>
                            <span className="card-arrow">↗</span>
                        </div>
                        <div className="card-tags">
                            <span className="card-tag">WORKSHOPS</span>
                            <span className="card-tag">COMPETITIONS</span>
                            <span className="card-tag">SHOWCASES</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
