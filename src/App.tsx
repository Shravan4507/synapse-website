import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { PageVisibilityProvider } from './context/PageVisibilityContext'
import { AuthProvider } from './context/AuthContext'
import ErrorBoundary from './components/error-boundary/ErrorBoundary'
import FloatingLines from './components/background/FloatingLines'
import Navbar from './components/navbar/Navbar'
import Footer from './components/footer/Footer'
import ProtectedRoute from './components/protected-route/ProtectedRoute'

// Lazy load page components for better initial load performance
// These will be loaded only when the user navigates to them
const Home = lazy(() => import('./public/home/Home'))
const Events = lazy(() => import('./public/events/Events'))
const Competitions = lazy(() => import('./public/competitions/Competitions'))
const CCP = lazy(() => import('./public/ccp/CCP'))
const Join = lazy(() => import('./public/join/Join'))
const Sponsors = lazy(() => import('./public/sponsors/Sponsors'))
const Contact = lazy(() => import('./public/contact/Contact'))
const UserLogin = lazy(() => import('./public/user-login/UserLogin'))
const UserSignup = lazy(() => import('./public/user-signup/UserSignup'))
const AdminSignup = lazy(() => import('./public/admin-signup/AdminSignup'))
const AdminSignupForm = lazy(() => import('./public/admin-signup/AdminSignupForm'))
const UserDashboard = lazy(() => import('./public/user-dashboard/UserDashboard'))
const ManageRecruitments = lazy(() => import('./public/manage-recruitments/ManageRecruitments'))
const ManageQueries = lazy(() => import('./public/manage-queries/ManageQueries'))
const ManageSponsors = lazy(() => import('./public/manage-sponsors/ManageSponsors'))
const ManageCompetitions = lazy(() => import('./public/manage-competitions/ManageCompetitions'))
const ManageEvents = lazy(() => import('./public/manage-events/ManageEvents'))
const ManageQRVerification = lazy(() => import('./public/manage-qr-verification/ManageQRVerification'))
const VolunteerScanner = lazy(() => import('./public/volunteer-scanner/VolunteerScanner'))

// Loading component for Suspense fallback
const PageLoader = () => (
  <div style={{
    minHeight: '60vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }}>
    <div className="loading-spinner" />
  </div>
)

function App() {
  return (
    <ErrorBoundary>
      <PageVisibilityProvider>
        <BrowserRouter>
          <AuthProvider>
            <Navbar />
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
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/events" element={<Events />} />
                      <Route path="/competitions" element={<Competitions />} />
                      <Route path="/ccp" element={<CCP />} />
                      <Route path="/join" element={<Join />} />
                      <Route path="/sponsors" element={<Sponsors />} />
                      <Route path="/contact" element={<Contact />} />
                      <Route path="/user-login" element={<UserLogin />} />
                      <Route path="/signup" element={
                        <ProtectedRoute>
                          <UserSignup />
                        </ProtectedRoute>
                      } />
                      {/* Admin Routes */}
                      <Route path="/signup-admin" element={<AdminSignup />} />
                      <Route path="/admin-signup-form" element={
                        <ProtectedRoute>
                          <AdminSignupForm />
                        </ProtectedRoute>
                      } />
                      <Route
                        path="/user-dashboard"
                        element={
                          <ProtectedRoute>
                            <UserDashboard />
                          </ProtectedRoute>
                        }
                      />
                      {/* Admin Management Routes (security handled within component) */}
                      <Route path="/manage-recruitment-applications" element={<ManageRecruitments />} />
                      <Route path="/manage-queries" element={<ManageQueries />} />
                      <Route path="/manage-sponsors" element={<ManageSponsors />} />
                      <Route path="/manage-competitions" element={<ManageCompetitions />} />
                      <Route path="/manage-events" element={<ManageEvents />} />
                      <Route path="/manage-qr-verification" element={<ManageQRVerification />} />
                      <Route path="/scan-qr" element={<VolunteerScanner />} />
                    </Routes>
                  </Suspense>
                </div>
                <div style={{ pointerEvents: 'auto' }}><Footer /></div>
              </div>
            </div>
          </AuthProvider>
        </BrowserRouter>
      </PageVisibilityProvider>
    </ErrorBoundary>
  )
}

export default App
