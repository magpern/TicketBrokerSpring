import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../services/api'
import { BookingResponse } from '../types/booking'
import { resizeImage } from '../utils/resizeImage'
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
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

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

  const handleReceiptSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !reference || !email) {
      return
    }
    setUploading(true)
    setUploadError('')
    try {
      const image = await resizeImage(file)
      const form = new FormData()
      form.append('receipt', image, 'kvitto.jpg')
      // multipart (not the api default JSON) so axios sends the FormData as-is
      await api.post(`/public/bookings/${reference}/receipt?email=${encodeURIComponent(email)}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const response = await api.get(`/public/bookings/${reference}?email=${email}`)
      setBooking(response.data)
      setPaymentInitiated(false)
      setQrCodeData('')
    } catch (error) {
      const message = (error as { response?: { data?: { error?: string } } }).response?.data?.error
      setUploadError(message || 'Det gick inte att ladda upp bilden. Försök igen.')
    } finally {
      setUploading(false)
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
  const ticketsPdfUrl = `/api/public/bookings/${encodeURIComponent(booking.bookingReference)}/tickets.pdf?email=${encodeURIComponent(booking.email)}`
  const hasReceipt = Boolean(booking.receiptUploadedAt)
  // The upload time is part of the URL so a replaced receipt isn't served from the browser cache
  const receiptUrl = `/api/public/bookings/${encodeURIComponent(booking.bookingReference)}/receipt?email=${encodeURIComponent(booking.email)}&v=${encodeURIComponent(booking.receiptUploadedAt ?? '')}`

  return (
    <Layout>
      <div className="success-container">
          {isConfirmed && (
            <div className="success-banner">
              <p className="success-banner-text">✓ Betalningen är bekräftad! Dina biljetter är klara.</p>
            </div>
          )}

          {isPending && hasReceipt && (
            <div className="success-banner">
              <p className="success-banner-text">
                ✓ Tack! Vi har fått ditt kvitto och bekräftar betalningen så snart vi har kontrollerat den.
              </p>
            </div>
          )}

          {/* Green success banner when buyer has confirmed payment */}
          {isPending && !hasReceipt && (
            <div className="success-banner">
              <p className="success-banner-text">
                ✓ Tack! Vi har fått din bekräftelse och kontrollerar betalningen.
              </p>
            </div>
          )}
          
          <div className={`success-message ${isPending ? 'compact' : ''}`}>
            {!isPending && <h2>{isConfirmed ? 'Dina biljetter' : 'Tack för din reservation!'}</h2>}

            {isConfirmed && (
              <div className="payment-action-inline">
                <a className="btn btn-primary btn-large" href={ticketsPdfUrl} download>
                  Ladda ner biljetter (PDF)
                </a>
                <p className="payment-note">
                  Visa QR-koden på biljetten vid entrén. Biljetterna har också skickats till din e-post.
                </p>
              </div>
            )}

            {/* Payment first: on a phone everything below the reference box is off-screen */}
            {!isConfirmed && (() => {
              const payStep = (
                <div className="step-card">
                  <div className="step-head">
                    <span className={`step-num ${isPending ? 'muted' : ''}`}>1</span>
                    {isPending ? 'Har du inte swishat än?' : 'Betala med Swish'}
                  </div>
                  {!paymentInitiated ? (
                    <div className="payment-action-inline">
                      <button id="pay-now-btn" className="btn btn-primary btn-large" onClick={handleInitiatePayment}>
                        Betala nu
                      </button>
                      <p className="payment-amount">
                        {booking.totalAmount} kr · meddelande {booking.bookingReference}
                      </p>
                      <p className="payment-note">{isMobile ? 'Öppnar Swish-appen' : 'Visar en QR-kod för Swish'}</p>
                      {isPending && !hasReceipt && (
                        <p className="payment-note">Om du redan har swishat behöver du inte göra något mer.</p>
                      )}
                    </div>
                  ) : (
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
                    </div>
                  )}
                </div>
              )

              const fileInput = (
                <input
                  type="file"
                  accept="image/*"
                  className="visually-hidden"
                  onChange={handleReceiptSelected}
                  disabled={uploading}
                />
              )

              const receiptStep = (
                <div className="step-card">
                  {hasReceipt ? (
                    <>
                      <div className="step-head">
                        <span className="step-num done">✓</span>
                        Kvitto uppladdat
                      </div>
                      <div className="receipt-row">
                        <img src={receiptUrl} alt="Ditt uppladdade kvitto" className="receipt-thumb" />
                        <div>
                          <p className="payment-note receipt-text">
                            Fel bild? Du kan byta den tills betalningen är bekräftad.
                          </p>
                          <label className="btn btn-outline">
                            {uploading ? 'Laddar upp…' : 'Byt bild'}
                            {fileInput}
                          </label>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="step-head">
                        <span className="step-num">2</span>
                        Skicka in ditt kvitto
                      </div>
                      <p className="payment-note step-text">
                        Ta en skärmdump av kvittot i Swish-appen och ladda upp den här, så kan vi bekräfta din
                        betalning snabbare.
                      </p>
                      <label className={`receipt-drop ${uploading ? 'busy' : ''}`}>
                        {uploading ? 'Laddar upp…' : '📷 Ladda upp skärmdump'}
                        <small>Välj bild från telefonen</small>
                        {fileInput}
                      </label>
                      {!isPending && (
                        <button type="button" className="link-button" onClick={handleConfirmPayment}>
                          Kan du inte ladda upp? Markera som betald ändå
                        </button>
                      )}
                    </>
                  )}
                  {uploadError && (
                    <p className="upload-error" role="alert">
                      {uploadError}
                    </p>
                  )}
                </div>
              )

              return hasReceipt ? (
                <>
                  {receiptStep}
                  {payStep}
                </>
              ) : (
                <>
                  {payStep}
                  {receiptStep}
                </>
              )
            })()}

            <div className="booking-reference-display">
              <h3>Din bokningsreferens:</h3>
              <div className="reference-code">{booking.bookingReference}</div>
              <p className="reference-warning">
                {isConfirmed
                  ? 'Ange bokningsreferensen om du har frågor om din bokning.'
                  : 'Ange referensen som meddelande när du swishar.'}
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
              <li><strong>{isConfirmed ? 'Totalt betalt' : 'Totalt att betala'}:</strong> {booking.totalAmount} kr</li>
            </ul>
          </div>
          
          <div className="actions">
            <Link to="/" className="btn btn-secondary">Tillbaka till startsidan</Link>
          </div>
        </div>
    </Layout>
  )
}

export default BookingSuccessPage
