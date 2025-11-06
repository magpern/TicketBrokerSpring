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
    localStorage.removeItem('adminAuth')
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
          <div className="admin-actions">
            <Link to="/admin/settings" className="btn btn-secondary">
              Inställningar
            </Link>
            <Link to="/admin/shows" className="btn btn-secondary">
              Hantera föreställningar
            </Link>
            <Link to="/admin/tickets" className="btn btn-secondary">
              Biljetter
            </Link>
            <Link to="/admin/check-ticket" className="btn btn-primary">
              Kontrollera biljett
            </Link>
            <Link to="/admin/audit" className="btn btn-secondary">
              Auditlogg
            </Link>
            <button onClick={handleExportRevenue} className="btn btn-success">
              Revenue Report
            </button>
            <Link to="/validate-ticket" className="btn btn-info" target="_blank">
              🎫 Validera Biljetter
            </Link>
            <button onClick={handleExportExcel} className="btn btn-secondary">
              Exportera till Excel
            </button>
            <button onClick={handleLogout} className="btn btn-danger">
              Logga ut
            </button>
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
                          <th>Biljetter</th>
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
                            <td>
                              {booking.tickets && booking.tickets.length > 0 ? (
                                <Link
                                  to={`/admin/tickets?booking=${booking.bookingReference}`}
                                  className="ticket-count-link"
                                >
                                  {booking.tickets.length} biljetter
                                </Link>
                              ) : (
                                <span className="no-tickets">Inga biljetter</span>
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
