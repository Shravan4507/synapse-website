import './Footer.css'
import footerLogo from '../../assets/logos/Logo Without Background - 1.png'

export default function Footer() {
    return (
        <footer className="footer">
            <div className="footer-container">
                <div className="footer-column footer-brand">
                    <img
                        src={footerLogo}
                        alt="Synapse"
                        onClick={() => window.location.reload()}
                        style={{
                            width: '160px',
                            height: 'auto',
                            marginBottom: '-0.1rem',
                            cursor: 'pointer'
                        }}
                    />
                    <p>The official annual technical festival of Zeal College of Engineering & Research.</p>
                </div>

                <div className="footer-column">
                    <h4>Quick Links</h4>
                    <ul>
                        <li><a href="#home">Home</a></li>
                        <li><a href="#events">Events</a></li>
                        <li><a href="#competitions">Competitions</a></li>
                        <li><a href="#ccp">CCP</a></li>
                    </ul>
                </div>

                <div className="footer-column">
                    <h4>Get Involved</h4>
                    <ul>
                        <li><a href="#join">Join the Team</a></li>
                        <li><a href="#contact">Contact Us</a></li>
                        <li><a href="#login">Login</a></li>
                    </ul>
                </div>

                <div className="footer-column">
                    <h4>Connect</h4>
                    <ul>
                        <li><a href="https://instagram.com" target="_blank" rel="noopener noreferrer">Instagram</a></li>
                        <li><a href="https://youtube.com" target="_blank" rel="noopener noreferrer">YouTube</a></li>
                        <li><a href="https://linkedin.com" target="_blank" rel="noopener noreferrer">LinkedIn</a></li>
                        <li><a href="https://twitter.com" target="_blank" rel="noopener noreferrer">Twitter</a></li>
                    </ul>
                </div>

                <div className="footer-column">
                    <h4>Contact</h4>
                    <p><a href="mailto:contact@synapsefest.in">contact@synapsefest.in</a></p>
                    <p>ZCOER, Narhe, Pune</p>
                    <p>Maharashtra, India</p>
                </div>
            </div>

            <div className="footer-bottom">
                <p>© 2026 Synapse. All rights reserved.</p>
                <p className="footer-tagline">Crafted with innovation by the Synapse Team</p>
            </div>
        </footer>
    )
}
