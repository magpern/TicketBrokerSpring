import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import Layout from '../components/Layout'
import './ContactPage.css'

function ContactPage() {
  const [settings, setSettings] = useState<any>({})
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    gdprConsent: false
  })
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api.get('/public/settings').then((response) => {
      setSettings(response.data)
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const response = await api.post('/public/contact', formData)
      if (response.data.message) {
        setSubmitted(true)
        setFormData({
          name: '',
          email: '',
          phone: '',
          subject: '',
          message: '',
          gdprConsent: false
        })
        setTimeout(() => setSubmitted(false), 5000)
      }
    } catch (err: any) {
      if (err.response?.data?.error) {
        setError(err.response.data.error)
      } else {
        setError('Ett fel uppstod vid skickande av meddelandet. Försök igen senare.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Layout>
      <div className="booking-container">
          <div className="booking-step">
            <h2>Kontaktformulär</h2>
            <p>Har du frågor om konserten eller behöver hjälp? Skicka oss ett meddelande så återkommer vi så snart som möjligt.</p>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name">Ditt namn *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  placeholder="Ditt fullständiga namn"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="email">Din e-postadress *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  placeholder="din@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="phone">Telefonnummer (valfritt)</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  placeholder="012 345 67 89"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="subject">Ämne *</label>
                <select
                  id="subject"
                  name="subject"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                >
                  <option value="">Välj ämne</option>
                  <option value="Biljettfrågor">Biljettfrågor</option>
                  <option value="Betalningsproblem">Betalningsproblem</option>
                  <option value="Tekniska problem">Tekniska problem</option>
                  <option value="Konsertinformation">Konsertinformation</option>
                  <option value="Annat">Annat</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="message">Meddelande *</label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={6}
                  placeholder="Beskriv ditt ärende så detaljerat som möjligt..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                />
              </div>
              
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    name="gdpr_consent"
                    required
                    checked={formData.gdprConsent}
                    onChange={(e) => setFormData({ ...formData, gdprConsent: e.target.checked })}
                  />
                  Jag godkänner att mina uppgifter sparas och används för att hantera mitt ärende *
                </label>
              </div>
              
              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}
              
              {submitted && (
                <div className="success-message">
                  Tack för ditt meddelande! Vi återkommer så snart som möjligt.
                </div>
              )}
              
              <div className="step-actions">
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Skickar...' : 'Skicka meddelande'}
                </button>
              </div>
            </form>
            
            <div className="contact-info" style={{ marginTop: '30px', padding: '20px', background: 'rgba(255, 255, 255, 0.8)', borderRadius: '15px' }}>
              <h3>Kontaktinformation</h3>
              <p><strong>E-post:</strong> {settings.contactEmail || 'klassisktkonsertgruppen@gmail.com'}</p>
              <p><strong>Svarstid:</strong> Vi återkommer vanligtvis inom 24 timmar</p>
              <p><strong>Telefon:</strong> Kontakta oss via e-post för telefonnummer</p>
            </div>
            
            <div className="help-links" style={{ marginTop: '30px', textAlign: 'center' }}>
              <p>Behöver du hjälp med din bokning?</p>
              <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link to="/find-booking" className="btn btn-secondary">Hitta min bokning</Link>
                <Link to="/lost-tickets" className="btn btn-secondary">Tappade biljetter?</Link>
              </div>
            </div>
          </div>
        </div>
    </Layout>
  )
}

export default ContactPage
