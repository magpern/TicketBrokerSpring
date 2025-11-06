import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import Layout from '../components/Layout'
import './FindBookingPage.css'

function FindBookingPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!email || !lastName) {
      setError('Vänligen fyll i både e-post och efternamn.')
      return
    }
    
    try {
      const response = await api.get(`/public/bookings/search?email=${encodeURIComponent(email)}&lastName=${encodeURIComponent(lastName)}`)
      const bookings = response.data
      
      if (bookings.length === 0) {
        setError('Ingen bokning hittades med denna e-post och efternamn.')
      } else if (bookings.length === 1) {
        // Single booking - redirect to success page
        navigate(`/booking/success/${bookings[0].bookingReference}/${email}`)
      } else {
        // Multiple bookings - show selection (you may want to create a selection page)
        // For now, redirect to the first booking
        navigate(`/booking/success/${bookings[0].bookingReference}/${email}`)
      }
    } catch (err: any) {
      console.error('Failed to find booking:', err)
      if (err.response?.status === 404 || err.response?.status === 400) {
        setError('Ingen bokning hittades med denna e-post och efternamn.')
      } else {
        setError('Ett fel uppstod. Försök igen.')
      }
    }
  }

  return (
    <Layout>
      <div className="booking-container">
          <div className="booking-step">
            <h2>Hitta min bokning</h2>
            <p>Ange din e-postadress och efternamn för att komma till din bokning.</p>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="email">Din e-postadress</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  placeholder="din@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="last_name">Ditt efternamn</label>
                <input
                  type="text"
                  id="last_name"
                  name="last_name"
                  required
                  placeholder="Ditt efternamn"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
              
              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}
              
              <div className="step-actions">
                <button type="submit" className="btn btn-primary">Hitta bokning</button>
              </div>
            </form>
            
            <div className="info-box" style={{ marginTop: '30px', padding: '20px', background: '#f0f9ff', border: '1px solid #0ea5e9', borderRadius: '8px' }}>
              <h3>Vad händer härnäst?</h3>
              <ul>
                <li>Vi hittar din bokning baserat på e-post och efternamn</li>
                <li>Du kommer till din bokningssida där du kan betala</li>
                <li>Om betalningen är bekräftad kan du se dina biljetter</li>
              </ul>
            </div>
            
            <div className="help-links" style={{ marginTop: '30px', textAlign: 'center' }}>
              <p>Tappade bort dina biljetter?</p>
              <Link to="/lost-tickets" className="btn btn-secondary">Skicka biljetter igen</Link>
            </div>
          </div>
        </div>
    </Layout>
  )
}

export default FindBookingPage
