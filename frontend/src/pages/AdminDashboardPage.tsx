import { useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import adminApi from '../services/adminApi'
import { BookingResponse } from '../types/booking'
import ReceiptModal from '../components/ReceiptModal'
import AdminBookingList from '../components/AdminBookingList'
import Layout from '../components/Layout'
import './AdminDashboardPage.css'

function AdminDashboardPage() {
  const navigate = useNavigate()
  const [bookings, setBookings] = useState<BookingResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null)
  // Bookings with a confirm-payment request in flight. The ref guards against a second
  // click landing before React re-renders; the state drives the disabled button.
  const confirmingRef = useRef<Set<number>>(new Set())
  const [confirmingIds, setConfirmingIds] = useState<Set<number>>(new Set())
  const [resendShowId, setResendShowId] = useState('')
  const [resendingShow, setResendingShow] = useState(false)
  const [receiptBooking, setReceiptBooking] = useState<BookingResponse | null>(null)
  
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
  }, [])

  const loadBookings = async () => {
    try {
      setLoading(true)
      const response = await adminApi.get('/bookings')
      setBookings(response.data)
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
    if (confirmingRef.current.has(bookingId)) {
      return
    }
    confirmingRef.current.add(bookingId)
    setConfirmingIds(new Set(confirmingRef.current))

    try {
      const response = await adminApi.post(`/bookings/${bookingId}/confirm-payment`)
      const updatedBooking = response.data
      
      // Update the booking in state without reloading all bookings
      setBookings(prevBookings => 
        prevBookings.map(booking => 
          booking.id === bookingId ? updatedBooking : booking
        )
      )
      
      setMessage({ type: 'success', text: 'Betalning bekräftad!' })
    } catch (error) {
      console.error('Failed to confirm payment:', error)
      setMessage({ type: 'error', text: 'Kunde inte bekräfta betalning' })
    } finally {
      confirmingRef.current.delete(bookingId)
      setConfirmingIds(new Set(confirmingRef.current))
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

  // Shows that have at least one confirmed booking, i.e. ones tickets can be resent for
  const resendShows = Array.from(
    new Map(
      bookings
        .filter(b => b.status === 'confirmed' && b.show)
        .map(b => [b.show!.id, b.show!] as const)
    ).values()
  ).sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))

  const handleResendTicketsForShow = async () => {
    const show = resendShows.find(s => String(s.id) === resendShowId)
    if (!show) return
    const recipients = bookings.filter(b => b.status === 'confirmed' && b.show?.id === show.id).length
    if (!confirm(`Skicka biljetter igen till ${recipients} bokningar för ${show.date} ${show.startTime}–${show.endTime}? Ett mejl skickas varje sekund.`)) {
      return
    }
    setResendingShow(true)
    try {
      const response = await adminApi.post(`/shows/${show.id}/resend-tickets`)
      setMessage({ type: 'success', text: response.data.message })
    } catch (error: any) {
      console.error('Failed to resend tickets for show:', error)
      setMessage({ type: 'error', text: error.response?.data?.error || 'Kunde inte skicka om biljetter' })
    } finally {
      setResendingShow(false)
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
            {resendShows.length > 0 && (
              <div className="resend-show">
                <select
                  value={resendShowId}
                  onChange={e => setResendShowId(e.target.value)}
                  aria-label="Välj föreställning"
                >
                  <option value="">Välj föreställning…</option>
                  {resendShows.map(show => (
                    <option key={show.id} value={show.id}>
                      {show.date} {show.startTime}–{show.endTime}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="nav-link"
                  disabled={!resendShowId || resendingShow}
                  onClick={handleResendTicketsForShow}
                >
                  Skicka biljetter igen till alla
                </button>
              </div>
            )}
          </div>
          {bookings.length === 0 ? (
            <p>Inga bokningar hittades.</p>
          ) : (
            <AdminBookingList
              bookings={bookings}
              confirmingIds={confirmingIds}
              onConfirm={handleConfirmPayment}
              onResendConfirmation={handleResendConfirmation}
              onResendTickets={handleResendTickets}
              onDelete={handleDeleteBooking}
              onShowReceipt={setReceiptBooking}
            />
          )}
        </div>
      </div>
      {receiptBooking && (
        <ReceiptModal
          booking={receiptBooking}
          confirming={confirmingIds.has(receiptBooking.id!)}
          onConfirm={async () => {
            await handleConfirmPayment(receiptBooking.id!)
            setReceiptBooking(null)
          }}
          onClose={() => setReceiptBooking(null)}
        />
      )}
    </Layout>
  )
}

export default AdminDashboardPage
