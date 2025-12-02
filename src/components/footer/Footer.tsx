import { useNavigate } from 'react-router-dom'
import { getCurrentUser } from '../../utils/auth'
import './Footer.css'
import footerLogo from '../../assets/logos/Logo Without Background - 1.png'

export default function Footer() {
    const navigate = useNavigate()
    const isLoggedIn = !!getCurrentUser()

    const handleNavigation = (path: string) => {
        navigate(path)
    }

    const handleLoginClick = (e: React.MouseEvent) => {
        if (isLoggedIn) {
            e.preventDefault()
            return
        }
        navigate('/user-login')
    }

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
                        <li><a onClick={() => handleNavigation('/')}>Home</a></li>
                        <li><a onClick={() => handleNavigation('/events')}>Events</a></li>
                        <li><a onClick={() => handleNavigation('/competitions')}>Competitions</a></li>
                        <li><a onClick={() => handleNavigation('/ccp')}>CCP</a></li>
                    </ul>
                </div>

                <div className="footer-column">
                    <h4>Get Involved</h4>
                    <ul>
                        <li><a onClick={() => handleNavigation('/join')}>Join the Team</a></li>
                        <li><a onClick={() => handleNavigation('/contact')}>Contact Us</a></li>
                        <li>
                            <a
                                onClick={handleLoginClick}
                                className={isLoggedIn ? 'disabled-link' : ''}
                                style={{
                                    cursor: isLoggedIn ? 'not-allowed' : 'pointer',
                                    opacity: isLoggedIn ? 0.5 : 1
                                }}
                            >
                                Login
                            </a>
                        </li>
                    </ul>
                </div>

                <div className="footer-column">
                    <h4>Connect</h4>
                    <ul>
                        <li><a href="https://instagram.com/synapse.zcoer" target="_blank" rel="noopener noreferrer">Instagram</a></li>
                        <li><a href="mailto:contact@synapsefest.org">E-mail</a></li>
                    </ul>
                </div>

                <div className="footer-column">
                    <h4>Location</h4>
                    <p>
                        <a
                            href="https://maps.app.goo.gl/zr4Yg3uhrYabnjH49"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="location-link"
                        >
                            Zeal College of Engineering and Research<br />
                            Survey No-39, Dhayari Narhe Rd, Narhe, Pune, Maharashtra 411041
                        </a>
                    </p>
                </div>
            </div>

            <div className="footer-bottom">
                <p>© 2026 Synapse. All rights reserved.</p>
                <p className="footer-tagline">Crafted with innovation by the Synapse Team</p>
            </div>
        </footer>
    )
}
