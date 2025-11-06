import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import adminApi from '../services/adminApi'
import './AdminShowsPage.css'

interface Show {
  id: number
  date: string
  startTime: string
  endTime: string
  totalTickets: number
  availableTickets: number
  bookingsCount: number
}

function AdminShowsPage() {
  const [shows, setShows] = useState<Show[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [editingShow, setEditingShow] = useState<Show | null>(null)
  const [showForm, setShowForm] = useState({
    date: '',
    startTime: '',
    endTime: '',
    totalTickets: 100
  })

  useEffect(() => {
    loadShows()
  }, [])

  const loadShows = async () => {
    try {
      const response = await adminApi.get('/shows')
      setShows(response.data)
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Kunde inte ladda föreställningar: ' + (err.response?.data?.message || err.message) })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateShow = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    try {
      await adminApi.post('/shows', showForm)
      setMessage({ type: 'success', text: 'Ny föreställning skapad!' })
      setShowForm({ date: '', startTime: '', endTime: '', totalTickets: 100 })
      loadShows()
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Kunde inte skapa föreställning: ' + (err.response?.data?.message || err.message) })
    }
  }

  const handleEditShow = (show: Show) => {
    setEditingShow(show)
  }

  const handleUpdateShow = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingShow) return

    setMessage(null)

    const formData = new FormData(e.currentTarget as HTMLFormElement)
    const totalTickets = parseInt(formData.get('totalTickets') as string)
    const availableTickets = parseInt(formData.get('availableTickets') as string)

    try {
      await adminApi.put(`/shows/${editingShow.id}`, {
        totalTickets,
        availableTickets
      })
      setMessage({ type: 'success', text: 'Föreställning uppdaterad!' })
      setEditingShow(null)
      loadShows()
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Kunde inte uppdatera föreställning: ' + (err.response?.data?.message || err.message) })
    }
  }

  const handleDeleteShow = async (id: number) => {
    if (!confirm('Är du säker på att du vill radera denna föreställning?')) {
      return
    }

    setMessage(null)

    try {
      await adminApi.delete(`/shows/${id}`)
      setMessage({ type: 'success', text: 'Föreställning raderad!' })
      loadShows()
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Kunde inte radera föreställning: ' + (err.response?.data?.message || err.message) })
    }
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
        <div className="admin-header">
          <h2>Hantera föreställningar</h2>
          <div className="admin-actions">
            <Link to="/admin" className="btn btn-secondary">
              ← Tillbaka till dashboard
            </Link>
          </div>
        </div>

        {message && (
          <div className={`flash flash-${message.type}`}>{message.text}</div>
        )}

        <div className="shows-section">
          <h3>Skapa ny föreställning</h3>
          <form onSubmit={handleCreateShow} className="create-show-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="date">Datum</label>
                <input
                  type="text"
                  id="date"
                  name="date"
                  value={showForm.date}
                  onChange={(e) => setShowForm({ ...showForm, date: e.target.value })}
                  placeholder="29/1 2026"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="start_time">Starttid</label>
                <input
                  type="text"
                  id="start_time"
                  name="startTime"
                  value={showForm.startTime}
                  onChange={(e) => setShowForm({ ...showForm, startTime: e.target.value })}
                  placeholder="17:45"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="end_time">Sluttid</label>
                <input
                  type="text"
                  id="end_time"
                  name="endTime"
                  value={showForm.endTime}
                  onChange={(e) => setShowForm({ ...showForm, endTime: e.target.value })}
                  placeholder="18:45"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="total_tickets">Antal biljetter</label>
                <input
                  type="number"
                  id="total_tickets"
                  name="totalTickets"
                  value={showForm.totalTickets}
                  onChange={(e) => setShowForm({ ...showForm, totalTickets: parseInt(e.target.value) || 100 })}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary">
              Skapa föreställning
            </button>
          </form>

          <h3>Befintliga föreställningar</h3>
          {shows.length > 0 ? (
            <div className="shows-table">
              <table>
                <thead>
                  <tr>
                    <th>Datum</th>
                    <th>Tid</th>
                    <th>Totalt biljetter</th>
                    <th>Tillgängliga</th>
                    <th>Bokningar</th>
                    <th>Åtgärder</th>
                  </tr>
                </thead>
                <tbody>
                  {shows.map((show) => (
                    <tr key={show.id}>
                      <td>{show.date}</td>
                      <td>{show.startTime}-{show.endTime}</td>
                      <td>{show.totalTickets}</td>
                      <td>{show.availableTickets}</td>
                      <td>{show.bookingsCount}</td>
                      <td className="actions">
                        <button
                          onClick={() => handleEditShow(show)}
                          className="btn btn-small btn-secondary"
                        >
                          Redigera
                        </button>
                        {show.bookingsCount === 0 ? (
                          <button
                            onClick={() => handleDeleteShow(show.id)}
                            className="btn btn-small btn-danger"
                            style={{ marginLeft: '10px' }}
                          >
                            Radera
                          </button>
                        ) : (
                          <span className="disabled" style={{ marginLeft: '10px' }}>
                            Kan inte raderas (har bokningar)
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>Inga föreställningar skapade än.</p>
          )}
        </div>

        {editingShow && (
          <div className="edit-show-modal">
            <div className="edit-show-content">
              <div className="admin-header">
                <h2>Redigera föreställning</h2>
                <button
                  onClick={() => setEditingShow(null)}
                  className="btn btn-secondary"
                >
                  Stäng
                </button>
              </div>

              <div className="edit-show-section">
                <div className="show-info">
                  <h3>Föreställningsinformation</h3>
                  <div className="info-display">
                    <div className="info-row">
                      <strong>Datum:</strong> {editingShow.date}
                    </div>
                    <div className="info-row">
                      <strong>Tid:</strong> {editingShow.startTime}-{editingShow.endTime}
                    </div>
                    <div className="info-row">
                      <strong>Befintliga bokningar:</strong> {editingShow.bookingsCount} st
                    </div>
                  </div>
                </div>

                <form onSubmit={handleUpdateShow} className="edit-show-form">
                  <h3>Uppdatera biljettantal</h3>

                  <div className="form-group">
                    <label htmlFor="edit_total_tickets">Totalt antal biljetter</label>
                    <input
                      type="number"
                      id="edit_total_tickets"
                      name="totalTickets"
                      defaultValue={editingShow.totalTickets}
                      min="0"
                      required
                    />
                    <small className="form-help">
                      Det maximala antalet biljetter för denna föreställning
                    </small>
                  </div>

                  <div className="form-group">
                    <label htmlFor="edit_available_tickets">Tillgängliga biljetter</label>
                    <input
                      type="number"
                      id="edit_available_tickets"
                      name="availableTickets"
                      defaultValue={editingShow.availableTickets}
                      min="0"
                      required
                    />
                    <small className="form-help">
                      Antal biljetter som fortfarande är tillgängliga för bokning.
                      Kan inte vara fler än totalt antal biljetter eller färre än antal bekräftade biljetter.
                    </small>
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary">
                      Uppdatera föreställning
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingShow(null)}
                      className="btn btn-secondary"
                    >
                      Avbryt
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default AdminShowsPage

