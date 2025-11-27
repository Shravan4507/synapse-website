import './Hero.css'
import logo from '../../assets/logos/Logo Without Background - 2.png'

export default function Hero() {
    return (
        <div className="hero-container">
            <div className="hero-content">
                <div className="logo-heartbeat-container">
                    <img
                        src={logo}
                        alt="Synapse Logo"
                        className="logo-heartbeat"
                    />
                </div>
                <h2 className="hero-tagline">The Rise of Self-Driven Intelligence</h2>
                <div className="hero-description">
                    <p>Step into the future of technology at ZCOER's official technical festival.</p>
                    <p>Synapse '26 brings together innovation, autonomy, agents, robotics, design, engineering, and the wildest ideas students can imagine — all under one electrifying roof.</p>
                    <p>Experience workshops, competitions, showcases, team opportunities, and an unforgettable celebration of the tech culture.</p>
                </div>
            </div>
        </div>
    )
}
