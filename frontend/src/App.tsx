import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import BookingPage from './pages/BookingPage'
import BookingSuccessPage from './pages/BookingSuccessPage'
import LostTicketsPage from './pages/LostTicketsPage'
import FindBookingPage from './pages/FindBookingPage'
import ContactPage from './pages/ContactPage'
import './App.css'

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/booking" element={<BookingPage />} />
          <Route path="/booking/success/:reference/:email" element={<BookingSuccessPage />} />
          <Route path="/lost-tickets" element={<LostTicketsPage />} />
          <Route path="/find-booking" element={<FindBookingPage />} />
          <Route path="/contact" element={<ContactPage />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App

