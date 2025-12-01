import { BrowserRouter, Routes, Route } from 'react-router-dom'
import FloatingLines from './components/background/FloatingLines'
import Navbar from './components/navbar/Navbar'
import UserDashboardButton from './components/user-dashboard-button/UserDashboardButton'
import Footer from './components/footer/Footer'
import ProtectedRoute from './components/protected-route/ProtectedRoute'
import Home from './public/home/Home'
import Events from './public/events/Events'
import Competitions from './public/competitions/Competitions'
import CCP from './public/ccp/CCP'
import Join from './public/join/Join'
import Contact from './public/contact/Contact'
import UserLogin from './public/user-login/UserLogin'
import UserDashboard from './public/user-dashboard/UserDashboard'

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <UserDashboardButton />
      <div style={{ position: 'relative', width: '100%', minHeight: '100vh' }}>
        {/* Background layer - behind everything */}
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', overflow: 'hidden', zIndex: 0 }}>
          <FloatingLines
            enabledWaves={['top', 'middle', 'bottom']}
            lineCount={[5, 6, 7]}
            lineDistance={[8, 6, 4]}
            bendRadius={5.0}
            bendStrength={-0.5}
            interactive={true}
            parallax={false}
          />
        </div>

        {/* Content layer - on top with transparent backgrounds */}
        <div style={{ position: 'relative', zIndex: 1, pointerEvents: 'none' }}>
          <div style={{ pointerEvents: 'auto' }}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/events" element={<Events />} />
              <Route path="/competitions" element={<Competitions />} />
              <Route path="/ccp" element={<CCP />} />
              <Route path="/join" element={<Join />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/user-login" element={<UserLogin />} />
              <Route
                path="/user-dashboard"
                element={
                  <ProtectedRoute>
                    <UserDashboard />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </div>
          <div style={{ pointerEvents: 'auto' }}><Footer /></div>
        </div>
      </div>
    </BrowserRouter>
  )
}

export default App
