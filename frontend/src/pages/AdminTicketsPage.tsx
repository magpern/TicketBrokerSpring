import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import adminApi from '../services/adminApi'
import api from '../services/api'
import './AdminTicketsPage.css'

interface Ticket {
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
  showTime: string
  showId: number
}

interface Show {
  id: number
  date: string
  startTime: string
  endTime: string
}

function AdminTicketsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [shows, setShows] = useState<Show[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  const [filters, setFilters] = useState({
    showId: searchParams.get('show_id') || '',
    used: searchParams.get('used') || '',
    search: searchParams.get('search') || '',
    bookingRef: searchParams.get('booking_ref') || ''
  })

  useEffect(() => {
    loadShows()
    loadTickets()
  }, [])

  useEffect(() => {
    loadTickets()
  }, [searchParams])

  const loadShows = async () => {
    try {
      const response = await api.get('/public/shows')
      setShows(response.data)
    } catch (err: any) {
      console.error('Failed to load shows:', err)
    }
  }

  const loadTickets = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.showId) params.append('showId', filters.showId)
      if (filters.used) params.append('used', filters.used)
      if (filters.search) params.append('search', filters.search)
      if (filters.bookingRef) params.append('bookingRef', filters.bookingRef)
      
      const response = await adminApi.get(`/tickets?${params.toString()}`)
      setTickets(response.data)
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Kunde inte ladda biljetter: ' + (err.response?.data?.message || err.message) })
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (field: keyof typeof filters, value: string) => {
    const newFilters = { ...filters, [field]: value }
    setFilters(newFilters)
    
    const params = new URLSearchParams()
    if (newFilters.showId) params.append('show_id', newFilters.showId)
    if (newFilters.used) params.append('used', newFilters.used)
    if (newFilters.search) params.append('search', newFilters.search)
    if (newFilters.bookingRef) params.append('booking_ref', newFilters.bookingRef)
    
    setSearchParams(params)
  }

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loadTickets()
  }

  const handleClearFilters = () => {
    setFilters({ showId: '', used: '', search: '', bookingRef: '' })
    setSearchParams({})
    loadTickets()
  }

  const handleToggleState = async (ticketId: number) => {
    setMessage(null)
    try {
      await adminApi.post(`/tickets/${ticketId}/toggle-state`, null, {
        params: { checkerUser: 'admin' }
      })
      setMessage({ type: 'success', text: 'Biljettstatus uppdaterad!' })
      loadTickets()
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Kunde inte uppdatera biljettstatus: ' + (err.response?.data?.message || err.message) })
    }
  }

  const handleDeleteTicket = async (ticketId: number, ticketReference: string) => {
    if (!confirm(`Är du säker på att du vill radera biljett ${ticketReference}?`)) {
      return
    }

    setMessage(null)
    try {
      await adminApi.delete(`/tickets/${ticketId}`, {
        params: { adminUser: 'admin', reason: 'Admin deletion' }
      })
      setMessage({ type: 'success', text: `Biljett ${ticketReference} har raderats.` })
      loadTickets()
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Kunde inte radera biljett: ' + (err.response?.data?.message || err.message) })
    }
  }

  const unusedCount = tickets.filter(t => !t.isUsed).length
  const usedCount = tickets.filter(t => t.isUsed).length

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
        <div className="admin-header">
          <h2>Biljetthantering</h2>
          {filters.bookingRef && (
            <div className="filter-info">
              <span className="filter-badge">
                Filtrerat på bokning: <strong>{filters.bookingRef}</strong>
              </span>
              <button onClick={handleClearFilters} className="btn btn-small btn-secondary">
                Rensa filter
              </button>
            </div>
          )}
          <div className="admin-actions">
            <Link to="/admin" className="btn btn-secondary">
              ← Tillbaka till dashboard
            </Link>
            <Link to="/admin/check-ticket" className="btn btn-primary">
              Kontrollera biljett
            </Link>
          </div>
        </div>

        {message && (
          <div className={`flash flash-${message.type}`}>{message.text}</div>
        )}

        <div className="tickets-section">
          <div className="filters-section">
            <form onSubmit={handleFilterSubmit} className="filter-form">
              <div className="filter-row">
                <div className="form-group">
                  <label htmlFor="show_id">Föreställning:</label>
                  <select
                    id="show_id"
                    name="showId"
                    value={filters.showId}
                    onChange={(e) => handleFilterChange('showId', e.target.value)}
                  >
                    <option value="">Alla föreställningar</option>
                    {shows.map((show) => (
                      <option key={show.id} value={show.id.toString()}>
                        {show.startTime}-{show.endTime}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="used">Status:</label>
                  <select
                    id="used"
                    name="used"
                    value={filters.used}
                    onChange={(e) => handleFilterChange('used', e.target.value)}
                  >
                    <option value="">Alla biljetter</option>
                    <option value="unused">Oanvända</option>
                    <option value="used">Använda</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="search">Sök:</label>
                  <input
                    type="text"
                    id="search"
                    name="search"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    placeholder="Biljettreferens, bokning, namn..."
                  />
                </div>

                <div className="form-group">
                  <button type="submit" className="btn btn-primary">
                    Filtrera
                  </button>
                  <button type="button" onClick={handleClearFilters} className="btn btn-secondary">
                    Rensa
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div className="tickets-summary">
            <h3>Biljetter ({tickets.length} st)</h3>
            <div className="summary-stats">
              <span className="stat">Oanvända: {unusedCount}</span>
              <span className="stat">Använda: {usedCount}</span>
            </div>
          </div>

          {tickets.length > 0 ? (
            <div className="tickets-table">
              <table>
                <thead>
                  <tr>
                    <th>Biljettreferens</th>
                    <th>Typ</th>
                    <th>Bokning</th>
                    <th>Köpare</th>
                    <th>Telefon</th>
                    <th>Föreställning</th>
                    <th>Status</th>
                    <th>Skapad</th>
                    <th>Åtgärder</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <tr key={ticket.id} className={ticket.isUsed ? 'used' : 'unused'}>
                      <td><strong>{ticket.ticketReference}</strong></td>
                      <td>
                        <span className={`ticket-type ${ticket.ticketType}`}>
                          {ticket.ticketType === 'normal' ? 'Ordinarie' : 'Student'}
                        </span>
                      </td>
                      <td>{ticket.bookingReference}</td>
                      <td>{ticket.buyerName}</td>
                      <td>{ticket.buyerPhone}</td>
                      <td>{ticket.showTime}</td>
                      <td>
                        {ticket.isUsed ? (
                          <>
                            <span className="status-used">✓ Använd</span>
                            {ticket.usedAt && (
                              <>
                                <br />
                                <small>{new Date(ticket.usedAt).toLocaleString('sv-SE')}</small>
                              </>
                            )}
                          </>
                        ) : (
                          <span className="status-unused">○ Oanvänd</span>
                        )}
                      </td>
                      <td>{new Date(ticket.createdAt).toLocaleString('sv-SE')}</td>
                      <td className="actions">
                        {ticket.isUsed ? (
                          <button
                            onClick={() => handleToggleState(ticket.id)}
                            className="btn btn-small btn-warning"
                          >
                            Återställ
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleToggleState(ticket.id)}
                              className="btn btn-small btn-success"
                            >
                              Markera använd
                            </button>
                            <button
                              onClick={() => handleDeleteTicket(ticket.id, ticket.ticketReference)}
                              className="btn btn-small btn-danger"
                              style={{ marginLeft: '5px' }}
                            >
                              Radera
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="no-tickets">
              <p>Inga biljetter hittades med de valda filtren.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default AdminTicketsPage

