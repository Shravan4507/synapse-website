import FloatingLines from './components/background/FloatingLines'
import Navbar from './components/navbar/Navbar'
import Hero from './components/hero/Hero'
import ContentSections from './components/sections/ContentSections'
import Footer from './components/footer/Footer'

function App() {
  return (
    <>
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
          <div style={{ pointerEvents: 'auto' }}><Hero /></div>
          <div style={{ pointerEvents: 'auto' }}><ContentSections /></div>
          <div style={{ pointerEvents: 'auto' }}><Footer /></div>
        </div>
      </div>
    </>
  )
}

export default App
