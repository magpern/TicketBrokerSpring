import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import './ContactPage.css'

function ContactPage() {
  const [settings, setSettings] = useState<any>({})
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  })
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    api.get('/public/settings').then((response) => {
      setSettings(response.data)
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // You may want to add a contact API endpoint
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 5000)
  }

  return (
    <div className="container">
      <main className="main">
        <div className="contact-page">
          <h2>Kontakta oss</h2>
          
          <div className="contact-info">
            <p><strong>E-post:</strong> <a href={`mailto:${settings.contactEmail || 'admin@example.com'}`}>
              {settings.contactEmail || 'admin@example.com'}
            </a></p>
          </div>
          
          <form onSubmit={handleSubmit} className="contact-form">
            <div className="form-group">
              <label htmlFor="name">Namn *</label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="email">E-post *</label>
              <input
                type="email"
                id="email"
                name="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="message">Meddelande *</label>
              <textarea
                id="message"
                name="message"
                required
                rows={5}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              />
            </div>
            
            {submitted && (
              <div className="success-message">
                Tack för ditt meddelande! Vi återkommer så snart som möjligt.
              </div>
            )}
            
            <button type="submit" className="btn btn-primary">
              Skicka
            </button>
          </form>
          
          <div className="actions">
            <Link to="/" className="btn btn-secondary">Tillbaka till startsidan</Link>
          </div>
        </div>
      </main>
    </div>
  )
}

export default ContactPage

