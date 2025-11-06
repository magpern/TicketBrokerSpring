import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import './FindBookingPage.css'

function FindBookingPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    try {
      const response = await api.get(`/public/bookings?email=${encodeURIComponent(email)}`)
      const bookings = response.data
      
      if (bookings.length === 0) {
        setError('Ingen bokning hittades för denna e-postadress.')
      } else if (bookings.length === 1) {
        // Single booking - redirect to success page
        navigate(`/booking/success/${bookings[0].bookingReference}/${email}`)
      } else {
        // Multiple bookings - show selection (you may want to create a selection page)
        navigate(`/booking/success/${bookings[0].bookingReference}/${email}`)
      }
    } catch (error) {
      console.error('Failed to find booking:', error)
      setError('Ett fel uppstod. Försök igen.')
    }
  }

  return (
    <div className="container">
      <main className="main">
        <div className="find-booking-page">
          <h2>Hitta min bokning</h2>
          <p>Ange din e-postadress för att hitta din bokning.</p>
          
          <form onSubmit={handleSubmit} className="find-booking-form">
            <div className="form-group">
              <label htmlFor="email">E-postadress *</label>
              <input
                type="email"
                id="email"
                name="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="din@email.com"
              />
            </div>
            
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}
            
            <button type="submit" className="btn btn-primary">
              Hitta bokning
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}

export default FindBookingPage

