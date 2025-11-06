import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import Layout from '../components/Layout'
import './LostTicketsPage.css'

function LostTicketsPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const response = await api.post('/public/lost-tickets', null, {
        params: { email }
      })
      
      if (response.data.message) {
        setSubmitted(true)
        setEmail('')
        setTimeout(() => setSubmitted(false), 5000)
      } else if (response.data.error) {
        setError(response.data.error)
      }
    } catch (err: any) {
      if (err.response?.data?.error) {
        setError(err.response.data.error)
      } else {
        setError('Ett fel uppstod. Försök igen senare.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Layout>
      <div className="booking-container">
        <div className="booking-step">
          <h2>Tappade biljetter?</h2>
          <p>Om du har tappat bort dina biljetter kan vi skicka dem igen till din e-postadress.</p>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Din e-postadress</label>
              <input
                type="email"
                id="email"
                name="email"
                required
                placeholder="din@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}
            
            {submitted && (
              <div className="success-message">
                Om denna e-post har biljetter kommer dessa skickas dit.
              </div>
            )}
            
            <div className="step-actions">
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Skickar...' : 'Skicka biljetter'}
              </button>
            </div>
          </form>
          
          <div className="info-box" style={{ marginTop: '30px', padding: '20px', background: '#f0f9ff', border: '1px solid #0ea5e9', borderRadius: '8px' }}>
            <h3>Viktigt att veta:</h3>
            <ul>
              <li>Vi skickar endast biljetter till bekräftade betalningar</li>
              <li>Om din e-post finns i systemet kommer biljetterna skickas</li>
              <li>Kontrollera även din skräppost-mapp</li>
              <li>Om du inte får något e-post inom några minuter, kontakta oss</li>
            </ul>
          </div>
          
          <div className="help-links" style={{ marginTop: '30px', textAlign: 'center' }}>
            <p>Behöver du hjälp med din bokning?</p>
            <Link to="/find-booking" className="btn btn-secondary">Hitta min bokning</Link>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default LostTicketsPage
