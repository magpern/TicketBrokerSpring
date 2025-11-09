import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../services/api'
import { Show, BookingRequest } from '../types/booking'
import Layout from '../components/Layout'
import './BookingPage.css'

interface Settings {
  adultPrice?: number
  studentPrice?: number
  adultLabel?: string
  studentLabel?: string
}

function BookingPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [shows, setShows] = useState<Show[]>([])
  const [settings, setSettings] = useState<Settings>({})
  const [selectedShow, setSelectedShow] = useState<Show | null>(null)
  const [formData, setFormData] = useState<BookingRequest>({
    showId: 0,
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    adultTickets: 0,
    studentTickets: 0,
    gdprConsent: false,
  })

  useEffect(() => {
    // Check initialization status
    api.get('/public/initialization-status').then((response) => {
      const status = response.data
      if (!status.isInitialized) {
        // Redirect to home if not initialized
        navigate('/', { replace: true })
      }
    }).catch(() => {
      // If check fails, allow access (graceful degradation)
    })
    
    api.get('/public/shows').then((response) => {
      setShows(response.data)
      if (response.data.length === 0) {
        // No shows available, redirect to home
        navigate('/', { replace: true })
      }
    })
    api.get('/public/settings').then((response) => {
      setSettings(response.data)
    })
  }, [navigate])

  // Format date for Swedish display (yyyy-MM-dd -> dd MMM yyyy)
  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr + 'T00:00:00') // Add time to avoid timezone issues
      const months = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
      const day = date.getDate()
      const month = months[date.getMonth()]
      const year = date.getFullYear()
      return `${day} ${month} ${year}`
    } catch {
      return dateStr // Fallback to original if parsing fails
    }
  }

  // Group shows by date and format for display
  const formatShowsByDate = () => {
    if (shows.length === 0) {
      return null
    }

    // Group shows by date
    const showsByDate = shows.reduce((acc, show) => {
      const date = show.date
      if (!acc[date]) {
        acc[date] = []
      }
      acc[date].push(show)
      return acc
    }, {} as Record<string, Show[]>)

    // Sort dates
    const sortedDates = Object.keys(showsByDate).sort()

    return sortedDates.map(date => {
      const dateShows = showsByDate[date]
      return { date, formattedDate: formatDate(date), shows: dateShows }
    })
  }

  const showsByDate = formatShowsByDate()

  const adultPrice = settings.adultPrice || 200
  const studentPrice = settings.studentPrice || 100
  const totalAmount = (formData.adultTickets * adultPrice) + (formData.studentTickets * studentPrice)
  const totalTickets = formData.adultTickets + formData.studentTickets
  const maxTickets = 4

  const handleTimeSelection = (showId: number) => {
    const show = shows.find(s => s.id === showId)
    if (show) {
      setSelectedShow(show)
      setFormData({ ...formData, showId })
      setStep(2)
    }
  }

  const handleTicketChange = (type: 'adult' | 'student', delta: number) => {
    const currentValue = type === 'adult' ? formData.adultTickets : formData.studentTickets
    const newValue = Math.max(0, Math.min(maxTickets - (type === 'adult' ? formData.studentTickets : formData.adultTickets), currentValue + delta))
    
    setFormData({
      ...formData,
      [type === 'adult' ? 'adultTickets' : 'studentTickets']: newValue
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (step === 2) {
      if (totalTickets === 0) {
        alert('Välj minst en biljett')
        return
      }
      setStep(3)
    } else if (step === 3) {
      try {
        const response = await api.post('/public/bookings', formData)
        navigate(`/booking/success/${response.data.bookingReference}/${response.data.email}`)
      } catch (error) {
        console.error('Booking failed:', error)
        alert('Bokningen misslyckades. Försök igen.')
      }
    }
  }

  return (
    <Layout>
      <div className="booking-container">
          {step === 1 && (
            <div className="booking-step">
              <h2>Steg 1: Välj tid</h2>
              <form onSubmit={(e) => { e.preventDefault(); if (formData.showId) handleTimeSelection(formData.showId) }}>
                {showsByDate && showsByDate.length > 0 ? (
                  showsByDate.map((dateGroup) => (
                    <div key={dateGroup.date} className="date-group">
                      <h3 className="date-header">Datum: {dateGroup.formattedDate}</h3>
                      <div className="time-selection">
                        {dateGroup.shows.map((show) => (
                          <div key={show.id} className="time-option">
                            <input
                              type="radio"
                              id={`show_${show.id}`}
                              name="show_id"
                              value={show.id}
                              checked={formData.showId === show.id}
                              onChange={() => setFormData({ ...formData, showId: show.id })}
                              required
                            />
                            <label htmlFor={`show_${show.id}`} className="time-label">
                              <div className="time-slot">
                                <span className="time">{show.startTime}-{show.endTime}</span>
                                <span className="availability">
                                  {show.availableTickets === 0 ? (
                                    <span className="sold-out">Slutsåld</span>
                                  ) : (
                                    <span className="available">{show.availableTickets} biljetter kvar</span>
                                  )}
                                </span>
                              </div>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <p>Inga föreställningar tillgängliga.</p>
                )}
                <div className="step-actions">
                  <Link to="/" className="btn btn-secondary">Tillbaka</Link>
                  <button type="submit" className="btn btn-primary" disabled={!formData.showId}>
                    Nästa
                  </button>
                </div>
              </form>
            </div>
          )}

          {step === 2 && selectedShow && (
            <div className="booking-step">
              <h2>Steg 2: Välj antal biljetter</h2>
              <div className="selected-time">
                <p><strong>Datum:</strong> {selectedShow.date ? formatDate(selectedShow.date) : ''}</p>
                <p><strong>Vald tid:</strong> {selectedShow.startTime}-{selectedShow.endTime}</p>
              </div>
              
              <form onSubmit={handleSubmit}>
                <div className="ticket-selection">
                  <div className="ticket-type">
                    <h3>{settings.adultLabel || 'Ordinariebiljett'} ({adultPrice} kr)</h3>
                    <div className="ticket-counter">
                      <button
                        type="button"
                        className="btn-counter minus"
                        onClick={() => handleTicketChange('adult', -1)}
                        disabled={formData.adultTickets === 0}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        name="adult_tickets"
                        id="adult_tickets"
                        value={formData.adultTickets}
                        min="0"
                        max="4"
                        readOnly
                      />
                      <button
                        type="button"
                        className="btn-counter plus"
                        onClick={() => handleTicketChange('adult', 1)}
                        disabled={totalTickets >= maxTickets}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  
                  <div className="ticket-type">
                    <h3>{settings.studentLabel || 'Studentbiljett'} ({studentPrice} kr)</h3>
                    <div className="ticket-counter">
                      <button
                        type="button"
                        className="btn-counter minus"
                        onClick={() => handleTicketChange('student', -1)}
                        disabled={formData.studentTickets === 0}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        name="student_tickets"
                        id="student_tickets"
                        value={formData.studentTickets}
                        min="0"
                        max="4"
                        readOnly
                      />
                      <button
                        type="button"
                        className="btn-counter plus"
                        onClick={() => handleTicketChange('student', 1)}
                        disabled={totalTickets >= maxTickets}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="total-section">
                  <div className="total-display">
                    <p><strong>Totalt att betala:</strong> <span id="total-amount">{totalAmount}</span> kr</p>
                  </div>
                  <div className="swish-reminder">
                    <p>Klicka på betalningslänken nedan för att betala</p>
                  </div>
                </div>
                
                <div className="step-actions">
                  <button type="button" onClick={() => setStep(1)} className="btn btn-secondary">
                    Tillbaka
                  </button>
                  <button type="submit" className="btn btn-primary" id="next-btn" disabled={totalTickets === 0}>
                    Till Varukorg
                  </button>
                </div>
              </form>
            </div>
          )}

          {step === 3 && selectedShow && (
            <div className="booking-step">
              <h2>Steg 3: Kontaktuppgifter</h2>
              
              <div className="booking-summary">
                <h3>Din bokning:</h3>
                <ul>
                  <li><strong>Datum:</strong> {selectedShow.date ? formatDate(selectedShow.date) : ''}</li>
                  <li><strong>Tid:</strong> {selectedShow.startTime}-{selectedShow.endTime}</li>
                  <li><strong>{settings.adultLabel || 'Ordinariebiljett'}:</strong> {formData.adultTickets} st</li>
                  <li><strong>{settings.studentLabel || 'Studentbiljett'}:</strong> {formData.studentTickets} st</li>
                  <li><strong>Totalt:</strong> {totalAmount} kr</li>
                </ul>
              </div>
              
              <form onSubmit={handleSubmit}>
                <div className="contact-form">
                  <div className="form-group">
                    <label htmlFor="first_name">Förnamn *</label>
                    <input
                      type="text"
                      id="first_name"
                      name="first_name"
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="last_name">Efternamn *</label>
                    <input
                      type="text"
                      id="last_name"
                      name="last_name"
                      required
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="email">E-postadress *</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="phone">Telefonnummer *</label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  
                  <div className="form-group checkbox-group">
                    <input
                      type="checkbox"
                      id="gdpr_consent"
                      name="gdpr_consent"
                      required
                      checked={formData.gdprConsent}
                      onChange={(e) => setFormData({ ...formData, gdprConsent: e.target.checked })}
                    />
                    <label htmlFor="gdpr_consent">
                      Jag godkänner att denna information sparas för verifiering och raderas senast 1 månad efter konserten hos Klasskonsertgruppen *
                    </label>
                  </div>
                </div>
                
                <div className="swish-reminder">
                  <p>
                    <strong>OBS!</strong> Du har reserverat en plats först när du BÅDE har reserverat en biljett här på hemsidan - och betalat. 
                    Klicka på länken nedan för att betala.
                  </p>
                </div>
                
                <div className="step-actions">
                  <button type="button" onClick={() => setStep(2)} className="btn btn-secondary">
                    Tillbaka
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Till Betalning
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
    </Layout>
  )
}

export default BookingPage
