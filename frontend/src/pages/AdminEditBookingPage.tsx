import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import adminApi from '../services/adminApi'
import { BookingResponse } from '../types/booking'
import Layout from '../components/Layout'
import './AdminEditBookingPage.css'

function AdminEditBookingPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [booking, setBooking] = useState<BookingResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null)
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    status: '',
    swishPaymentInitiated: false,
    buyerConfirmedPayment: false,
  })

  useEffect(() => {
    loadBooking()
  }, [id])

  const loadBooking = async () => {
    try {
      setLoading(true)
      const response = await adminApi.get(`/bookings/${id}`)
      const bookingData = response.data
      setBooking(bookingData)
      setFormData({
        firstName: bookingData.firstName || '',
        lastName: bookingData.lastName || '',
        email: bookingData.email || '',
        phone: bookingData.phone || '',
        status: bookingData.status || 'reserved',
        swishPaymentInitiated: bookingData.swishPaymentInitiated || false,
        buyerConfirmedPayment: bookingData.buyerConfirmedPayment || false,
      })
    } catch (error: any) {
      if (error.response?.status === 401) {
        navigate('/admin/login')
      } else {
        console.error('Failed to load booking:', error)
        setMessage({ type: 'error', text: 'Kunde inte ladda bokning' })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!booking) return
    
    try {
      setSaving(true)
      setMessage(null)
      
      await adminApi.put(`/bookings/${id}`, formData)
      
      setMessage({ type: 'success', text: 'Bokning uppdaterad!' })
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate('/admin')
      }, 1500)
    } catch (error: any) {
      console.error('Failed to update booking:', error)
      if (error.response?.data?.error) {
        setMessage({ type: 'error', text: error.response.data.error })
      } else {
        setMessage({ type: 'error', text: 'Kunde inte uppdatera bokning' })
      }
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target
    const value = target.type === 'checkbox' ? (target as HTMLInputElement).checked : target.value
    const name = target.name
    
    setFormData({
      ...formData,
      [name]: value,
    })
  }

  if (loading) {
    return (
      <Layout>
        <div className="admin-container">
          <p>Laddar...</p>
        </div>
      </Layout>
    )
  }

  if (!booking) {
    return (
      <Layout>
        <div className="admin-container">
          <p>Bokning hittades inte.</p>
          <Link to="/admin" className="btn btn-secondary">
            Tillbaka till dashboard
          </Link>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="admin-container">
        <div className="admin-header">
          <h2>Redigera bokning</h2>
          <div className="admin-actions">
            <Link to="/admin" className="btn btn-secondary">
              ← Tillbaka till dashboard
            </Link>
          </div>
        </div>

        {message && (
          <div className={`flash flash-${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="edit-booking-section">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="firstName">Förnamn</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="lastName">Efternamn</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">E-postadress</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Telefonnummer</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="status-select"
                disabled={booking?.status === 'confirmed' && booking?.tickets && booking.tickets.some((t: any) => t.used)}
              >
                <option value="reserved">Reserverad</option>
                <option value="confirmed">Bekräftad</option>
              </select>
              <small className="status-note">
                {formData.status === 'confirmed' && booking?.status !== 'confirmed' && (
                  <span className="status-warning">
                    Varning: Att ändra till bekräftad kommer att generera biljetter.
                  </span>
                )}
                {booking?.status === 'confirmed' && formData.status !== 'confirmed' && !(booking?.tickets && booking.tickets.some((t: any) => t.used)) && (
                  <span className="status-warning">
                    Varning: Att ändra från bekräftad kommer att radera alla biljetter för denna bokning och uppdatera tillgängliga biljetter.
                  </span>
                )}
                {booking?.status === 'confirmed' && booking?.tickets && booking.tickets.some((t: any) => t.used) && (
                  <span className="status-error">
                    Varning: Denna bokning har använda biljetter och kan inte ändras från bekräftad.
                  </span>
                )}
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="swishPaymentInitiated" className="checkbox-label">
                <input
                  type="checkbox"
                  id="swishPaymentInitiated"
                  name="swishPaymentInitiated"
                  checked={formData.swishPaymentInitiated}
                  onChange={handleChange}
                />
                Swish-betalning initierad
              </label>
            </div>

            <div className="form-group">
              <label htmlFor="buyerConfirmedPayment" className="checkbox-label">
                <input
                  type="checkbox"
                  id="buyerConfirmedPayment"
                  name="buyerConfirmedPayment"
                  checked={formData.buyerConfirmedPayment}
                  onChange={handleChange}
                />
                Köpare har bekräftat betalning
              </label>
            </div>

            <div className="form-group">
              <label>Ordinariebiljetter</label>
              <input
                type="text"
                value={booking.adultTickets}
                readOnly
                className="readonly-field"
              />
              <small className="readonly-note">
                Antal biljetter kan inte ändras efter bokning
              </small>
            </div>

            <div className="form-group">
              <label>Studentbiljetter</label>
              <input
                type="text"
                value={booking.studentTickets}
                readOnly
                className="readonly-field"
              />
              <small className="readonly-note">
                Antal biljetter kan inte ändras efter bokning
              </small>
            </div>

            {booking.tickets && booking.tickets.length > 0 && (
              <div className="form-group">
                <label>Genererade biljetter</label>
                <div className="ticket-list">
                  {booking.tickets.map((ticket: any) => (
                    <div key={ticket.id} className="ticket-item">
                      <strong>{ticket.ticketReference}</strong> -{' '}
                      {ticket.ticketType === 'normal' ? 'Ordinarie' : 'Student'}
                      {ticket.used ? (
                        <span className="status-used"> (Använd)</span>
                      ) : (
                        <span className="status-unused"> (Oanvänd)</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Sparar...' : 'Spara ändringar'}
              </button>
              <Link to="/admin" className="btn btn-secondary">
                Avbryt
              </Link>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  )
}

export default AdminEditBookingPage

