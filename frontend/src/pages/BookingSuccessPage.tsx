import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../services/api'
import { BookingResponse } from '../types/booking'
import Layout from '../components/Layout'
import './BookingSuccessPage.css'

function BookingSuccessPage() {
  const { reference, email } = useParams<{ reference: string; email: string }>()
  const [booking, setBooking] = useState<BookingResponse | null>(null)
  const [qrCodeData, setQrCodeData] = useState<string>('')
  const [isMobile, setIsMobile] = useState(false)
  const [paymentInitiated, setPaymentInitiated] = useState(false)
  const [swishRecipientName, setSwishRecipientName] = useState<string>('')
  const [swishNumber, setSwishNumber] = useState<string>('')

  useEffect(() => {
    // Detect mobile device
    const userAgent = navigator.userAgent || navigator.vendor
    const mobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase())
    setIsMobile(mobile)

    // Store booking reference for session recovery
    if (reference && email) {
      localStorage.setItem('pendingBookingRef', reference)
      localStorage.setItem('pendingBookingEmail', email)
      
      // Load booking data
      api.get(`/public/bookings/${reference}?email=${email}`).then((response) => {
        setBooking(response.data)
        setPaymentInitiated((response.data.swishPaymentInitiated && !response.data.buyerConfirmedPayment) || false)
      }).catch(error => {
        console.error('Failed to load booking:', error)
      })

      // The Swish number is otherwise only known after clicking "Betala nu", so a reloaded
      // page would have no real number to show
      api.get('/public/settings').then((response) => {
        if (response.data.swishNumber) {
          setSwishNumber((current) => current || response.data.swishNumber)
        }
      }).catch(() => {})
    }

    // Clear localStorage if payment is confirmed
    return () => {
      if (booking?.status === 'confirmed' || booking?.buyerConfirmedPayment) {
        localStorage.removeItem('pendingBookingRef')
        localStorage.removeItem('pendingBookingEmail')
      }
    }
  }, [reference, email, booking?.status, booking?.buyerConfirmedPayment])

  const handleInitiatePayment = async () => {
    if (reference && email) {
      try {
        const response = await api.post(`/public/bookings/${reference}/initiate-payment?email=${email}`)
        setQrCodeData(response.data.qrCodeData || '')
        setPaymentInitiated(true)
        
        // Store swish recipient details
        if (response.data.swishRecipientName) {
          setSwishRecipientName(response.data.swishRecipientName)
        }
        if (response.data.swishNumber) {
          setSwishNumber(response.data.swishNumber)
        }
        
        if (response.data.isMobile || isMobile) {
          // Mobile: Open Swish app/website
          window.open(response.data.swishUrl, '_blank')
        }
        // Desktop: QR code will be shown (already in response)
      } catch (error) {
        console.error('Failed to initiate payment:', error)
        alert('Ett fel uppstod. Försök igen.')
      }
    }
  }

  const handleConfirmPayment = async () => {
    if (reference && email) {
      try {
        await api.post(`/public/bookings/${reference}/confirm-payment?email=${email}`)
        // Reload booking data
        const response = await api.get(`/public/bookings/${reference}?email=${email}`)
        setBooking(response.data)
        setPaymentInitiated(false) // Hide QR code section
        setQrCodeData('') // Clear QR code
        localStorage.removeItem('pendingBookingRef')
        localStorage.removeItem('pendingBookingEmail')
      } catch (error) {
        console.error('Failed to confirm payment:', error)
        alert('Ett fel uppstod. Försök igen.')
      }
    }
  }

  if (!booking) {
    return (
      <Layout>
        <div className="success-container">
          <p>Laddar...</p>
        </div>
      </Layout>
    )
  }

  const isConfirmed = booking.status === 'confirmed'
  const isPending = booking.buyerConfirmedPayment && !isConfirmed
  const payee = swishRecipientName ? `${swishRecipientName} (${swishNumber})` : swishNumber

  return (
    <Layout>
      <div className="success-container">
          {/* Green success banner when buyer has confirmed payment */}
          {isPending && (
            <div className="success-banner">
              <p className="success-banner-text">
                ✓ Tack! Vi har fått din bekräftelse och kontrollerar betalningen.
              </p>
            </div>
          )}
          
          <div className={`success-message ${isPending ? 'compact' : ''}`}>
            {!isPending && <h2>Tack för din reservation!</h2>}

            {/* Payment first: on a phone everything below the reference box is off-screen */}
            {!isConfirmed && !paymentInitiated && (
              <div className="payment-action-inline">
                {isPending && <p className="payment-question">Har du inte swishat än?</p>}
                <button id="pay-now-btn" className="btn btn-primary btn-large" onClick={handleInitiatePayment}>
                  Betala nu
                </button>
                <p className="payment-amount">
                  {booking.totalAmount} kr · meddelande {booking.bookingReference}
                </p>
                {isMobile ? (
                  <p className="payment-note">Klicka för att öppna Swish-appen</p>
                ) : (
                  <p className="payment-note">Klicka för att visa QR-kod</p>
                )}
                {isPending && (
                  <p className="payment-note">Om du redan har swishat behöver du inte göra något mer.</p>
                )}
              </div>
            )}
          
            {paymentInitiated && !isConfirmed && (
              <div className="payment-initiated">
                <p className="status-initiated">✓ Swish-betalning initierad</p>
                {isMobile ? (
                  <p className="payment-instruction">
                    Öppna Swish-appen och betala {booking.totalAmount} kr till {payee} med meddelandet {booking.bookingReference}
                  </p>
                ) : (
                  <div className="qr-code-section">
                    <p className="payment-instruction">
                      Skanna QR-koden med din telefon för att betala {booking.totalAmount} kr till {payee}
                    </p>
                    {qrCodeData && (
                      <div className="qr-code-container">
                        <img src={qrCodeData} alt="Swish QR-kod" className="qr-code" />
                      </div>
                    )}
                    <p className="qr-instruction">
                      Eller betala manuellt till {swishNumber} med meddelandet {booking.bookingReference}
                    </p>
                  </div>
                )}
                {!isPending && (
                  <button type="button" className="btn btn-success" onClick={handleConfirmPayment}>
                    Tryck här när du betalat med Swish
                  </button>
                )}
              </div>
            )}

            <div className="booking-reference-display">
              <h3>Din bokningsreferens:</h3>
              <div className="reference-code">{booking.bookingReference}</div>
              <p className="reference-warning">
                {isPending
                  ? 'Ange referensen som meddelande om du swishar.'
                  : 'Spara denna referens! Du behöver den för att bekräfta din betalning.'}
              </p>
            </div>
          </div>
          
          <div className="booking-details">
            <h3>Din bokning:</h3>
            <ul>
              <li><strong>Namn:</strong> {booking.firstName} {booking.lastName}</li>
              <li><strong>E-post:</strong> {booking.email}</li>
              <li><strong>Telefon:</strong> {booking.phone}</li>
              <li><strong>Datum:</strong> {booking.show?.date}</li>
              <li><strong>Tid:</strong> {booking.show?.startTime}-{booking.show?.endTime}</li>
              <li><strong>Ordinariebiljetter:</strong> {booking.adultTickets} st</li>
              <li><strong>Studentbiljetter:</strong> {booking.studentTickets} st</li>
              <li><strong>Totalt att betala:</strong> {booking.totalAmount} kr</li>
            </ul>
          </div>
          
          {isConfirmed && (
            <div className="payment-status">
              <p className="status-confirmed">✓ Betalning bekräftad! Dina biljetter är säkra.</p>
              {booking.tickets && booking.tickets.length > 0 && (
                <div className="ticket-references">
                  <h4>Dina biljettreferenser:</h4>
                  <ul>
                    {booking.tickets.map((ticket: any) => (
                      <li key={ticket.id}>
                        <strong>{ticket.ticketReference}</strong> - {ticket.ticketType === 'normal' ? 'Ordinarie' : 'Student'}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          {isPending && (
            <div className="payment-status">
              <p className="status-pending">✓ Betalning bekräftad av dig. Väntar på administratörens godkännande.</p>
            </div>
          )}
          
          {!isConfirmed && !isPending && !paymentInitiated && (
            <div className="payment-section">
              <h3>Betalning via Swish</h3>
              <div className="swish-info">
                <p>Klicka på betalningsknappen ovan för att betala</p>
                <p><strong>Belopp:</strong> {booking.totalAmount} kr</p>
                <p><strong>Meddelande:</strong> {booking.bookingReference}</p>
              </div>
            </div>
          )}
          
          <div className="actions">
            <Link to="/" className="btn btn-secondary">Tillbaka till startsidan</Link>
          </div>
        </div>
    </Layout>
  )
}

export default BookingSuccessPage
