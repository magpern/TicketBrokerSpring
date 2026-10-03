import { useEffect, useState } from 'react'
import adminApi from '../services/adminApi'
import { BookingResponse } from '../types/booking'
import './ReceiptModal.css'

interface ReceiptModalProps {
  booking: BookingResponse
  confirming: boolean
  onConfirm: () => void
  onClose: () => void
}

function ReceiptModal({ booking, confirming, onConfirm, onClose }: ReceiptModalProps) {
  const [imageUrl, setImageUrl] = useState('')
  const [loadError, setLoadError] = useState(false)
  const [recipient, setRecipient] = useState('')

  useEffect(() => {
    let objectUrl = ''
    // A plain <img src> can't send the admin Basic auth header, so fetch the image as a blob
    adminApi
      .get(`/bookings/${booking.id}/receipt`, { responseType: 'blob' })
      .then((response) => {
        objectUrl = URL.createObjectURL(response.data)
        setImageUrl(objectUrl)
      })
      .catch(() => setLoadError(true))

    adminApi
      .get('/settings')
      .then((response) => {
        const { swishRecipientName, swishNumber } = response.data
        setRecipient(swishRecipientName ? `${swishRecipientName} (${swishNumber})` : swishNumber || '')
      })
      .catch(() => {})

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [booking.id])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const isConfirmed = booking.status === 'confirmed'
  const uploadedOn = booking.receiptUploadedAt
    ? new Date(booking.receiptUploadedAt).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })
    : ''

  return (
    <div className="receipt-modal-backdrop" onClick={onClose}>
      <div
        className="receipt-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Kvitto för ${booking.bookingReference}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="receipt-modal-header">
          <h2>
            🧾 Kvitto – {booking.bookingReference} · {booking.firstName} {booking.lastName}
          </h2>
          <button type="button" className="receipt-modal-close" onClick={onClose} aria-label="Stäng">
            ✕
          </button>
        </div>
        <div className="receipt-modal-body">
          <div className="receipt-modal-image">
            {imageUrl ? (
              <a href={imageUrl} target="_blank" rel="noreferrer" title="Öppna i full storlek">
                <img src={imageUrl} alt={`Kvitto för ${booking.bookingReference}`} />
              </a>
            ) : (
              <p>{loadError ? 'Kunde inte hämta kvittot.' : 'Laddar kvitto…'}</p>
            )}
          </div>
          <div className="receipt-modal-facts">
            <h3>Stämmer kvittot med bokningen?</h3>
            <div className="receipt-fact">
              <span>Belopp att betala</span>
              <strong>{booking.totalAmount} kr</strong>
            </div>
            <div className="receipt-fact">
              <span>Meddelande ska vara</span>
              <strong>{booking.bookingReference}</strong>
            </div>
            {recipient && (
              <div className="receipt-fact">
                <span>Mottagare</span>
                <strong>{recipient}</strong>
              </div>
            )}
            <div className="receipt-fact">
              <span>Bokat av</span>
              <strong>
                {booking.firstName} {booking.lastName}, {booking.phone}
              </strong>
            </div>
            {uploadedOn && (
              <div className="receipt-fact">
                <span>Kvitto uppladdat</span>
                <strong>{uploadedOn}</strong>
              </div>
            )}
            <p className="receipt-hint">Jämför belopp och meddelande med kvittot – och gärna med Swish-appen.</p>
            <div className="receipt-modal-buttons">
              {isConfirmed ? (
                <p className="receipt-confirmed">✓ Betalningen är redan bekräftad</p>
              ) : (
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={onConfirm}
                  disabled={confirming}
                  aria-busy={confirming}
                >
                  {confirming ? 'Bekräftar…' : '✓ Bekräfta betalning'}
                </button>
              )}
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Stäng
              </button>
            </div>
            {!isConfirmed && (
              <p className="receipt-small">Vid bekräftelse skickas biljetterna automatiskt till {booking.email}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReceiptModal
