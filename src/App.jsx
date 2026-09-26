import { BasketProvider } from './context/BasketContext'
import { SmoothScrollProvider } from './lib/smoothScroll'
import Preloader from './components/Preloader'
import Navbar from './components/Navbar'
import CoconutScene from './components/CoconutScene'
import Hero from './components/Hero'
import Benefits from './components/Benefits'
import SequenceAnimation from './components/SequenceAnimation'
import SectionBreak from './components/SectionBreak'
import Introduction from './components/Introduction'
import Flavours from './components/Flavours'
import HealthBenefits from './components/HealthBenefits'
import Reviews from './components/Reviews'
import CTA from './components/CTA'
import Footer from './components/Footer'
import BasketDrawer from './components/BasketDrawer'

function App() {
  return (
    <SmoothScrollProvider>
      <BasketProvider>
        <Preloader />
        <Navbar />

        {/* The footer is fixed behind the page, so main has to carry its own
            background and sit above it. */}
        <main id="main-content" className="flex-1 overflow-x-clip w-full relative">
          <CoconutScene>
            <Hero />
            <Benefits />
            <SequenceAnimation />
          </CoconutScene>
          <SectionBreak />
          <Introduction />
          <Flavours />
          <HealthBenefits />
          <Reviews />
          <CTA />
        </main>

        <Footer />
        <BasketDrawer />
      </BasketProvider>
    </SmoothScrollProvider>
  )
}

export default App
