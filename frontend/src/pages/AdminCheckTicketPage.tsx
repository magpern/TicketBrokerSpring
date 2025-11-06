import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import adminApi from '../services/adminApi'
import './AdminCheckTicketPage.css'

interface TicketDetails {
  id: number
  ticketReference: string
  ticketType: string
  isUsed: boolean
  usedAt: string | null
  checkedBy: string | null
  createdAt: string
  bookingReference: string
  buyerName: string
  buyerPhone: string
  buyerEmail: string
  showTime: string
}

function AdminCheckTicketPage() {
  const [ticketReference, setTicketReference] = useState('')
  const [ticket, setTicket] = useState<TicketDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Auto-focus on input
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ticketReference.trim()) {
      setError('Ange en biljettreferens.')
      setTicket(null)
      return
    }

    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      const response = await adminApi.get(`/tickets/by-reference/${ticketReference.trim().toUpperCase()}`)
      setTicket(response.data)
      setError(null)
    } catch (err: any) {
      if (err.response?.status === 404 || err.response?.data?.message?.includes('not found')) {
        setError(`Biljett ${ticketReference.trim().toUpperCase()} hittades inte.`)
      } else {
        setError('Ett fel uppstod vid sökning av biljett.')
      }
      setTicket(null)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleState = async () => {
    if (!ticket) return

    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      const response = await adminApi.post(
        `/tickets/by-reference/${ticket.ticketReference}/toggle-state`,
        null,
        {
          params: { checkerUser: 'admin' }
        }
      )
      setTicket(response.data)
      if (response.data.isUsed) {
        setMessage({ type: 'success', text: `Biljett ${ticket.ticketReference} markerad som använd!` })
      } else {
        setMessage({ type: 'success', text: `Biljett ${ticket.ticketReference} återställd till oanvänd!` })
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Ett fel uppstod: ' + (err.response?.data?.message || err.message) })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTicketReference(e.target.value.toUpperCase())
  }

  return (
    <Layout>
      <div className="admin-container">
        <div className="admin-header">
          <h2>Biljettkontroll</h2>
          <div className="admin-actions">
            <Link to="/admin" className="btn btn-secondary">
              ← Tillbaka till dashboard
            </Link>
            <Link to="/admin/tickets" className="btn btn-secondary">
              Visa alla biljetter
            </Link>
          </div>
        </div>

        <div className="ticket-checker-section">
          <div className="checker-form">
            <h3>Kontrollera biljett</h3>
            <form onSubmit={handleSearch}>
              <div className="form-group">
                <label htmlFor="ticket_reference">Biljettreferens:</label>
                <input
                  type="text"
                  id="ticket_reference"
                  ref={inputRef}
                  value={ticketReference}
                  onChange={handleInputChange}
                  placeholder="T.ex. 65TGR-N01"
                  required
                  style={{ textTransform: 'uppercase', fontSize: '1.2rem', padding: '15px' }}
                />
              </div>
              <button type="submit" className="btn btn-primary btn-large" disabled={loading}>
                {loading ? 'Söker...' : 'Kontrollera biljett'}
              </button>
            </form>
            {error && <div className="flash flash-error">{error}</div>}
            {message && (
              <div className={`flash flash-${message.type}`}>{message.text}</div>
            )}
          </div>

          {ticket && (
            <div className="ticket-result">
              <h3>Biljettinformation</h3>
              <div className="ticket-details">
                <div className="detail-row">
                  <strong>Biljettreferens:</strong> {ticket.ticketReference}
                </div>
                <div className="detail-row">
                  <strong>Typ:</strong>
                  <span className={`ticket-type ${ticket.ticketType}`}>
                    {ticket.ticketType === 'normal' ? 'Ordinarie' : 'Student'}
                  </span>
                </div>
                <div className="detail-row">
                  <strong>Bokningsreferens:</strong> {ticket.bookingReference}
                </div>
                <div className="detail-row">
                  <strong>Köpare:</strong> {ticket.buyerName}
                </div>
                <div className="detail-row">
                  <strong>Telefon:</strong> {ticket.buyerPhone}
                </div>
                <div className="detail-row">
                  <strong>E-post:</strong> {ticket.buyerEmail}
                </div>
                <div className="detail-row">
                  <strong>Föreställning:</strong> {ticket.showTime}
                </div>
                <div className="detail-row">
                  <strong>Status:</strong>
                  {ticket.isUsed ? (
                    <>
                      <span className="status-used">✓ Använd</span>
                      {ticket.usedAt && (
                        <>
                          <br />
                          <small>Använd: {new Date(ticket.usedAt).toLocaleString('sv-SE')}</small>
                        </>
                      )}
                      {ticket.checkedBy && (
                        <>
                          <br />
                          <small>Kontrollerad av: {ticket.checkedBy}</small>
                        </>
                      )}
                    </>
                  ) : (
                    <span className="status-unused">○ Oanvänd</span>
                  )}
                </div>
                <div className="detail-row">
                  <strong>Skapad:</strong> {new Date(ticket.createdAt).toLocaleString('sv-SE')}
                </div>
              </div>

              <div className="ticket-actions">
                {ticket.isUsed ? (
                  <button
                    onClick={handleToggleState}
                    className="btn btn-warning btn-large"
                    disabled={loading}
                  >
                    Återställ till oanvänd
                  </button>
                ) : (
                  <button
                    onClick={handleToggleState}
                    className="btn btn-success btn-large"
                    disabled={loading}
                  >
                    Markera som använd
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default AdminCheckTicketPage

