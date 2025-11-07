import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import adminApi from '../services/adminApi'
import { BookingResponse } from '../types/booking'
import Layout from '../components/Layout'
import './AdminDashboardPage.css'

interface BookingGroup {
  showTime: string
  bookings: BookingResponse[]
}

function AdminDashboardPage() {
  const navigate = useNavigate()
  const [bookings, setBookings] = useState<BookingResponse[]>([])
  const [bookingsByShow, setBookingsByShow] = useState<BookingGroup[]>([])
  const [filterUnconfirmed, setFilterUnconfirmed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null)
  
  // Calculate stats
  const stats = {
    total: bookings.length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    pending: bookings.filter(b => b.buyerConfirmedPayment && b.status !== 'confirmed').length,
    reserved: bookings.filter(b => !b.buyerConfirmedPayment && b.status !== 'confirmed').length,
    totalRevenue: bookings.filter(b => b.status === 'confirmed').reduce((sum, b) => sum + (b.totalAmount || 0), 0),
    potentialRevenue: bookings.filter(b => b.status !== 'confirmed').reduce((sum, b) => sum + (b.totalAmount || 0), 0)
  }

  useEffect(() => {
    loadBookings()
  }, [filterUnconfirmed])

  const loadBookings = async () => {
    try {
      setLoading(true)
      const response = await adminApi.get('/bookings')
      let allBookings = response.data

      // Filter unconfirmed if needed
      if (filterUnconfirmed) {
        allBookings = allBookings.filter(
          (b: BookingResponse) =>
            b.status === 'reserved' ||
            (b.buyerConfirmedPayment && b.status !== 'confirmed')
        )
      }

      // Group by show time
      const grouped: { [key: string]: BookingResponse[] } = {}
      allBookings.forEach((booking: BookingResponse) => {
        const showTime = booking.show
          ? `${booking.show.startTime}-${booking.show.endTime}`
          : 'Unknown'
        if (!grouped[showTime]) {
          grouped[showTime] = []
        }
        grouped[showTime].push(booking)
      })

      const groupedArray: BookingGroup[] = Object.entries(grouped)
        .map(([showTime, bookings]) => ({
          showTime,
          bookings: bookings.sort(
            (a, b) =>
              new Date(b.createdAt || '').getTime() -
              new Date(a.createdAt || '').getTime()
          ),
        }))
        .sort((a, b) => a.showTime.localeCompare(b.showTime))

      setBookings(allBookings)
      setBookingsByShow(groupedArray)
    } catch (error: any) {
      if (error.response?.status === 401) {
        navigate('/admin/login')
      } else {
        console.error('Failed to load bookings:', error)
        setMessage({ type: 'error', text: 'Kunde inte ladda bokningar' })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmPayment = async (bookingId: number) => {
    try {
      await adminApi.post(`/bookings/${bookingId}/confirm-payment`)
      setMessage({ type: 'success', text: 'Betalning bekräftad!' })
      loadBookings()
    } catch (error) {
      console.error('Failed to confirm payment:', error)
      setMessage({ type: 'error', text: 'Kunde inte bekräfta betalning' })
    }
  }

  const handleResendConfirmation = async (bookingId: number) => {
    try {
      const response = await adminApi.post(`/bookings/${bookingId}/resend-confirmation`)
      if (response.data.message) {
        setMessage({ type: 'success', text: response.data.message })
      }
      loadBookings()
    } catch (error: any) {
      console.error('Failed to resend confirmation:', error)
      if (error.response?.data?.error) {
        setMessage({ type: 'error', text: error.response.data.error })
      } else {
        setMessage({ type: 'error', text: 'Kunde inte skicka om bekräftelse' })
      }
    }
  }

  const handleResendTickets = async (bookingId: number) => {
    try {
      const response = await adminApi.post(`/bookings/${bookingId}/resend-tickets`)
      if (response.data.message) {
        setMessage({ type: 'success', text: response.data.message })
      }
      loadBookings()
    } catch (error: any) {
      console.error('Failed to resend tickets:', error)
      if (error.response?.data?.error) {
        setMessage({ type: 'error', text: error.response.data.error })
      } else {
        setMessage({ type: 'error', text: 'Kunde inte skicka om biljetter' })
      }
    }
  }

  const handleDeleteBooking = async (bookingId: number) => {
    if (!confirm('Är du säker på att du vill radera denna bokning?')) {
      return
    }

    try {
      await adminApi.delete(`/bookings/${bookingId}`)
      setMessage({ type: 'success', text: 'Bokning raderad!' })
      loadBookings()
    } catch (error) {
      console.error('Failed to delete booking:', error)
      setMessage({ type: 'error', text: 'Kunde inte radera bokning' })
    }
  }

  const handleExportExcel = async () => {
    try {
      const response = await adminApi.get('/export/excel', {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'bookings.xlsx')
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error('Failed to export Excel:', error)
      setMessage({ type: 'error', text: 'Kunde inte exportera till Excel' })
    }
  }

  const handleExportRevenue = async () => {
    try {
      const response = await adminApi.get('/export/revenue', {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      const today = new Date().toISOString().split('T')[0].replace(/-/g, '')
      link.setAttribute('download', `revenue_report_${today}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error('Failed to export revenue report:', error)
      setMessage({ type: 'error', text: 'Kunde inte exportera revenue report' })
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem('adminAuthToken')
    navigate('/admin/login')
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

  return (
    <Layout>
      <div className="admin-container">
        {message && (
          <div className={`flash flash-${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="admin-header">
          <h2>Administratörspanel</h2>
          <div className="admin-nav">
            <div className="nav-group">
              <Link to="/admin/check-ticket" className="nav-link nav-link-primary">
                Kontrollera biljett
              </Link>
              <Link to="/admin/tickets" className="nav-link">
                Biljetter
              </Link>
              <Link to="/admin/shows" className="nav-link">
                Föreställningar
              </Link>
            </div>
            <div className="nav-group">
              <Link to="/admin/settings" className="nav-link">
                Inställningar
              </Link>
              <Link to="/admin/audit" className="nav-link">
                Auditlogg
              </Link>
            </div>
            <div className="nav-group">
              <button onClick={handleExportRevenue} className="nav-link nav-link-success">
                Revenue Report
              </button>
              <button onClick={handleExportExcel} className="nav-link">
                Excel Export
              </button>
              <Link to="/validate-ticket" className="nav-link nav-link-info" target="_blank">
                🎫 Validera
              </Link>
            </div>
            <div className="nav-group">
              <button onClick={handleLogout} className="nav-link nav-link-danger">
                Logga ut
              </button>
            </div>
          </div>
        </div>

        <div className="admin-stats">
          <div className="stat-card">
            <div className="stat-label">Totalt bokningar</div>
            <div className="stat-value">{stats.total}</div>
          </div>
          <div className="stat-card stat-confirmed">
            <div className="stat-label">Bekräftade</div>
            <div className="stat-value">{stats.confirmed}</div>
          </div>
          <div className="stat-card stat-pending">
            <div className="stat-label">Väntar på bekräftelse</div>
            <div className="stat-value">{stats.pending}</div>
          </div>
          <div className="stat-card stat-reserved">
            <div className="stat-label">Reserverade</div>
            <div className="stat-value">{stats.reserved}</div>
          </div>
          <div className="stat-card stat-revenue">
            <div className="stat-label">Bekräftad intäkt</div>
            <div className="stat-value">{stats.totalRevenue} kr</div>
          </div>
          <div className="stat-card stat-potential">
            <div className="stat-label">Potentiell intäkt</div>
            <div className="stat-value">{stats.potentialRevenue} kr</div>
          </div>
        </div>

        <div className="bookings-section">
          <div className="bookings-header">
            <h3>Alla bokningar</h3>
            <div className="quick-filters">
              {filterUnconfirmed ? (
                <>
                  <span className="filter-active">Visa: Obekräftade betalningar</span>
                  <button
                    onClick={() => setFilterUnconfirmed(false)}
                    className="btn btn-small btn-secondary"
                  >
                    Visa alla
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setFilterUnconfirmed(true)}
                  className="btn btn-small btn-warning"
                >
                  Visa obekräftade betalningar
                </button>
              )}
            </div>
          </div>

          {bookingsByShow.length === 0 ? (
            <p>Inga bokningar hittades.</p>
          ) : (
            bookingsByShow.map((group) => (
              <div key={group.showTime} className="show-group">
                <h4>{group.showTime}</h4>

                {group.bookings.length === 0 ? (
                  <p>Inga bokningar för denna tid.</p>
                ) : (
                  <div className="bookings-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Bokning</th>
                          <th>Namn</th>
                          <th>E-post</th>
                          <th>Telefon</th>
                          <th>Ordinarie</th>
                          <th>Student</th>
                          <th>Totalt</th>
                          <th>Status</th>
                          <th>Åtgärder</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.bookings.map((booking) => (
                          <tr
                            key={booking.id}
                            className={
                              booking.status === 'confirmed'
                                ? 'confirmed'
                                : booking.buyerConfirmedPayment
                                ? 'pending'
                                : ''
                            }
                          >
                            <td>
                              <strong>{booking.bookingReference}</strong>
                            </td>
                            <td>{`${booking.firstName} ${booking.lastName}`}</td>
                            <td>{booking.email}</td>
                            <td>{booking.phone}</td>
                            <td>{booking.adultTickets}</td>
                            <td>{booking.studentTickets}</td>
                            <td>{booking.totalAmount} kr</td>
                            <td>
                              {booking.status === 'confirmed' ? (
                                <span className="status-confirmed">Bekräftad</span>
                              ) : booking.buyerConfirmedPayment ? (
                                <span className="status-pending">Väntar på bekräftelse</span>
                              ) : (
                                <span className="status-reserved">Reserverad</span>
                              )}
                            </td>
                            <td className="actions">
                              {booking.status !== 'confirmed' ? (
                                <>
                                  <button
                                    onClick={() => handleResendConfirmation(booking.id!)}
                                    className="btn btn-small btn-primary"
                                  >
                                    Skicka om bekräftelse
                                  </button>
                                  <button
                                    onClick={() => handleConfirmPayment(booking.id!)}
                                    className="btn btn-small btn-success"
                                  >
                                    Bekräfta betalning
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => handleResendTickets(booking.id!)}
                                  className="btn btn-small btn-info"
                                >
                                  Skicka om biljetter
                                </button>
                              )}
                              <Link
                                to={`/admin/bookings/${booking.id}/edit`}
                                className="btn btn-small btn-secondary"
                              >
                                Redigera
                              </Link>
                              <button
                                onClick={() => handleDeleteBooking(booking.id!)}
                                className="btn btn-small btn-danger"
                              >
                                Radera
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  )
}

export default AdminDashboardPage
