import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import adminApi from '../services/adminApi'
import Layout from '../components/Layout'
import './AdminSettingsPage.css'

interface Settings {
  concertName: string
  welcomeMessage: string
  concertDate: string
  concertVenue: string
  adultPrice: string
  studentPrice: string
  adultTicketLabel: string
  studentTicketLabel: string
  swishNumber: string
  swishRecipientName: string
  contactEmail: string
  adminEmail: string
  maxTicketsPerBooking: string
  classPhotoData?: string
  classPhotoContentType?: string
  qrLogoData?: string
  qrLogoContentType?: string
}

function AdminSettingsPage() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState<Settings>({
    concertName: '',
    welcomeMessage: '',
    concertDate: '',
    concertVenue: '',
    adultPrice: '',
    studentPrice: '',
    adultTicketLabel: '',
    studentTicketLabel: '',
    swishNumber: '',
    swishRecipientName: '',
    contactEmail: '',
    adminEmail: '',
    maxTicketsPerBooking: '',
  })
  const [classPhotoFile, setClassPhotoFile] = useState<File | null>(null)
  const [qrLogoFile, setQrLogoFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await adminApi.get('/settings')
      const data = response.data
      setSettings({
        concertName: data.concertName || '',
        welcomeMessage: data.welcomeMessage || '',
        concertDate: data.concertDate || '',
        concertVenue: data.concertVenue || '',
        adultPrice: data.adultPrice || '',
        studentPrice: data.studentPrice || '',
        adultTicketLabel: data.adultTicketLabel || '',
        studentTicketLabel: data.studentTicketLabel || '',
        swishNumber: data.swishNumber || '',
        swishRecipientName: data.swishRecipientName || '',
        contactEmail: data.contactEmail || '',
        adminEmail: data.adminEmail || '',
        maxTicketsPerBooking: data.maxTicketsPerBooking || '',
        classPhotoData: data.classPhotoData || '',
        classPhotoContentType: data.classPhotoContentType || '',
        qrLogoData: data.qrLogoData || '',
        qrLogoContentType: data.qrLogoContentType || '',
      })
    } catch (error: any) {
      if (error.response?.status === 401) {
        navigate('/admin/login')
      } else {
        console.error('Failed to load settings:', error)
        setMessage({ type: 'error', text: 'Kunde inte ladda inställningar' })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const formData = new FormData()

      // Map frontend keys to backend keys for text settings
      const settingsToSave: { [key: string]: string } = {
        concert_name: settings.concertName,
        welcome_message: settings.welcomeMessage,
        concert_date: settings.concertDate,
        concert_venue: settings.concertVenue,
        adult_ticket_price: settings.adultPrice,
        student_ticket_price: settings.studentPrice,
        adult_ticket_label: settings.adultTicketLabel,
        student_ticket_label: settings.studentTicketLabel,
        swish_number: settings.swishNumber,
        swish_recipient_name: settings.swishRecipientName,
        contact_email: settings.contactEmail,
        admin_email: settings.adminEmail,
        max_tickets_per_booking: settings.maxTicketsPerBooking,
      }

      // Add text settings to FormData
      Object.entries(settingsToSave).forEach(([key, value]) => {
        formData.append(key, value)
      })

      // Add file uploads if present
      if (classPhotoFile) {
        console.log('Adding class photo to FormData:', classPhotoFile.name, classPhotoFile.size, classPhotoFile.type)
        formData.append('class_photo', classPhotoFile)
      } else {
        console.log('No class photo file selected')
      }
      if (qrLogoFile) {
        console.log('Adding QR logo to FormData:', qrLogoFile.name, qrLogoFile.size, qrLogoFile.type)
        formData.append('qr_logo', qrLogoFile)
      } else {
        console.log('No QR logo file selected')
      }

      // Log FormData contents for debugging
      console.log('FormData entries:')
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`  ${key}: File(${value.name}, ${value.size} bytes, ${value.type})`)
        } else {
          console.log(`  ${key}: ${value}`)
        }
      }

      // Don't set Content-Type header - axios will set it automatically with boundary for FormData
      await adminApi.post('/settings', formData)
      setMessage({ type: 'success', text: 'Inställningar sparade!' })
      // Reload settings to get updated image data
      loadSettings()
      setClassPhotoFile(null)
      setQrLogoFile(null)
    } catch (error: any) {
      if (error.response?.status === 401) {
        navigate('/admin/login')
      } else {
        console.error('Failed to save settings:', error)
        setMessage({ type: 'error', text: 'Kunde inte spara inställningar' })
      }
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (field: keyof Settings, value: string) => {
    setSettings((prev) => ({ ...prev, [field]: value }))
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
            <div className={`flash flash-${message.type}`}>{message.text}</div>
          )}

          <div className="admin-header">
            <h2>Inställningar</h2>
            <div className="admin-actions">
              <Link to="/admin" className="btn btn-secondary">
                ← Tillbaka till dashboard
              </Link>
            </div>
          </div>

          <div className="settings-section">
            <form onSubmit={handleSubmit}>
              <div className="settings-group">
                <h3>Konsertinformation</h3>
                <div className="form-group">
                  <label htmlFor="concertName">Konsert namn</label>
                  <input
                    type="text"
                    id="concertName"
                    value={settings.concertName}
                    onChange={(e) => handleChange('concertName', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="welcomeMessage">Välkomstmeddelande</label>
                  <input
                    type="text"
                    id="welcomeMessage"
                    value={settings.welcomeMessage}
                    onChange={(e) => handleChange('welcomeMessage', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="concertDate">Konsertdatum</label>
                  <input
                    type="date"
                    id="concertDate"
                    value={settings.concertDate}
                    onChange={(e) => handleChange('concertDate', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="concertVenue">Konsertlokal</label>
                  <input
                    type="text"
                    id="concertVenue"
                    value={settings.concertVenue}
                    onChange={(e) => handleChange('concertVenue', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="settings-group">
                <h3>Priser</h3>
                <div className="form-group">
                  <label htmlFor="adultPrice">Ordinariebiljett (kr)</label>
                  <input
                    type="number"
                    id="adultPrice"
                    value={settings.adultPrice}
                    onChange={(e) => handleChange('adultPrice', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="studentPrice">Studentbiljett (kr)</label>
                  <input
                    type="number"
                    id="studentPrice"
                    value={settings.studentPrice}
                    onChange={(e) => handleChange('studentPrice', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="settings-group">
                <h3>Biljettyper</h3>
                <div className="form-group">
                  <label htmlFor="adultTicketLabel">Ordinariebiljett - etikett</label>
                  <input
                    type="text"
                    id="adultTicketLabel"
                    value={settings.adultTicketLabel}
                    onChange={(e) => handleChange('adultTicketLabel', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="studentTicketLabel">Studentbiljett - etikett</label>
                  <input
                    type="text"
                    id="studentTicketLabel"
                    value={settings.studentTicketLabel}
                    onChange={(e) => handleChange('studentTicketLabel', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="settings-group">
                <h3>Kontaktinformation</h3>
                <div className="form-group">
                  <label htmlFor="swishNumber">Swish-nummer</label>
                  <input
                    type="text"
                    id="swishNumber"
                    value={settings.swishNumber}
                    onChange={(e) => handleChange('swishNumber', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="swishRecipientName">Swish-mottagarens namn</label>
                  <input
                    type="text"
                    id="swishRecipientName"
                    value={settings.swishRecipientName}
                    onChange={(e) => handleChange('swishRecipientName', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="contactEmail">Kontakt e-post (visas i sidfot)</label>
                  <input
                    type="email"
                    id="contactEmail"
                    value={settings.contactEmail}
                    onChange={(e) => handleChange('contactEmail', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="adminEmail">Administratörs e-post</label>
                  <input
                    type="email"
                    id="adminEmail"
                    value={settings.adminEmail}
                    onChange={(e) => handleChange('adminEmail', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="settings-group">
                <h3>Klassbild</h3>
                <div className="form-group">
                  <label htmlFor="classPhoto">
                    Ladda upp klassbild (PNG/JPG, rekommenderad storlek: 800x600px)
                  </label>
                  <input
                    type="file"
                    id="classPhoto"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={(e) => setClassPhotoFile(e.target.files?.[0] || null)}
                  />
                  {settings.classPhotoData && (
                    <div className="current-photo">
                      <p>Aktuell klassbild:</p>
                      <img
                        src={`data:${settings.classPhotoContentType || 'image/jpeg'};base64,${settings.classPhotoData}`}
                        alt="Current class photo"
                        style={{
                          maxWidth: '300px',
                          maxHeight: '200px',
                          border: '1px solid #ddd',
                          padding: '5px',
                          borderRadius: '8px',
                        }}
                      />
                      <p>
                        <small>För att ändra klassbild, välj en ny fil ovan</small>
                      </p>
                    </div>
                  )}
                  {!settings.classPhotoData && (
                    <p>
                      <small>Ingen klassbild uppladdad. Standardbild från filsystemet används.</small>
                    </p>
                  )}
                </div>
              </div>

              <div className="settings-group">
                <h3>Logo för QR-koder</h3>
                <div className="form-group">
                  <label htmlFor="qrLogo">Ladda upp logo (PNG/JPG, max 200x200px)</label>
                  <input
                    type="file"
                    id="qrLogo"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={(e) => setQrLogoFile(e.target.files?.[0] || null)}
                  />
                  {settings.qrLogoData && (
                    <div className="current-logo">
                      <p>Aktuell logo:</p>
                      <img
                        src={`data:${settings.qrLogoContentType || 'image/jpeg'};base64,${settings.qrLogoData}`}
                        alt="Current logo"
                        style={{
                          maxWidth: '100px',
                          maxHeight: '100px',
                          border: '1px solid #ddd',
                          padding: '5px',
                        }}
                      />
                      <p>
                        <small>För att ändra logo, välj en ny fil ovan</small>
                      </p>
                    </div>
                  )}
                  {!settings.qrLogoData && (
                    <p>
                      <small>Ingen logo uppladdad. QR-koder kommer att visas utan logo.</small>
                    </p>
                  )}
                </div>
              </div>

              <div className="settings-group">
                <h3>Systeminställningar</h3>
                <div className="form-group">
                  <label htmlFor="maxTicketsPerBooking">Max biljetter per bokning</label>
                  <input
                    type="number"
                    id="maxTicketsPerBooking"
                    value={settings.maxTicketsPerBooking}
                    onChange={(e) => handleChange('maxTicketsPerBooking', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Sparar...' : 'Spara inställningar'}
                </button>
              </div>
            </form>
          </div>
        </div>
    </Layout>
  )
}

export default AdminSettingsPage

