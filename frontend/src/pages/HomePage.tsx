import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import api from '../services/api'
import { Show } from '../types/booking'
import './HomePage.css'

interface Settings {
  concertName?: string
  welcomeMessage?: string
  concertDate?: string
  concertVenue?: string
  adultPrice?: number
  studentPrice?: number
  contactEmail?: string
  classPhotoData?: string
  classPhotoContentType?: string
}

function HomePage() {
  const [shows, setShows] = useState<Show[]>([])
  const [settings, setSettings] = useState<Settings>({})
  const [classPhotoUrl, setClassPhotoUrl] = useState<string>('')
  const [isInitialized, setIsInitialized] = useState<boolean>(true)
  const [initStatus, setInitStatus] = useState<{
    isInitialized: boolean
    hasShows: boolean
    hasClassPhoto: boolean
    message: string | null
  } | null>(null)

  useEffect(() => {
    api.get('/public/shows').then((response) => {
      setShows(response.data)
    })
    api.get('/public/settings').then((response) => {
      setSettings(response.data)
      // Set class photo URL from API data if available
      if (response.data.classPhotoData && response.data.classPhotoContentType) {
        setClassPhotoUrl(`data:${response.data.classPhotoContentType};base64,${response.data.classPhotoData}`)
      } else {
        // Show under construction image if no class photo in database
        setClassPhotoUrl('/under-construction.svg')
      }
    })
    api.get('/public/initialization-status').then((response) => {
      const status = response.data
      setIsInitialized(status.isInitialized)
      setInitStatus(status)
    })
  }, [])

  // Format show times for display
  const formatShowTimes = () => {
    if (shows.length === 0) return '17:45-18:45 eller 19:00-20:00'
    return shows.map(show => `${show.startTime}-${show.endTime}`).join(' eller ')
  }

  return (
    <Layout>
      <div className="welcome-section">
          {classPhotoUrl && (
            <div className="class-photo">
              <img 
                src={classPhotoUrl} 
                alt={isInitialized ? "Klassbild" : "Under konstruktion"} 
                className={`class-image ${!isInitialized ? 'under-construction' : ''}`}
                onError={(e) => {
                  // Fallback to under construction if image fails to load
                  e.currentTarget.src = '/under-construction.svg'
                  e.currentTarget.alt = 'Under konstruktion'
                  e.currentTarget.classList.add('under-construction')
                }}
              />
            </div>
          )}
          
          <div className="welcome-info">
            {!isInitialized && initStatus && (
              <div className="initialization-banner">
                <h2>⚠️ Systemet är under initialisering</h2>
                <p>{initStatus.message}</p>
                <div className="init-status-details">
                  <p>
                    {!initStatus.hasShows && <span className="init-missing">❌ Inga föreställningar definierade</span>}
                    {initStatus.hasShows && <span className="init-ok">✅ Föreställningar konfigurerade</span>}
                  </p>
                  <p>
                    {!initStatus.hasClassPhoto && <span className="init-missing">❌ Ingen klassbild uppladdad</span>}
                    {initStatus.hasClassPhoto && <span className="init-ok">✅ Klassbild uppladdad</span>}
                  </p>
                </div>
                <p className="init-note">
                  <strong>Administratörer:</strong> Logga in på <Link to="/admin/settings">inställningssidan</Link> för att slutföra konfigurationen.
                </p>
              </div>
            )}
            
            <h2>{settings.welcomeMessage || 'Välkommen till 24c:s klasspelning!'}</h2>
            <p>
              På den här sidan kan du boka biljetter. Glöm inte att anmälan är gjord först när både bokning och betalning är inne. 
              Dörrarna öppnar 15 minuter innan konsertstart. Ses där!
            </p>
            
            {isInitialized && (
              <>
                <div className="concert-info-compact">
                  <div className="concert-details">
                    <h3>Konsertinformation</h3>
                    <p><strong>Datum:</strong> {settings.concertDate || '2026-01-29'}</p>
                    <p><strong>Plats:</strong> {settings.concertVenue || 'Aulan på Rytmus Stockholm'}</p>
                    <p><strong>Tider:</strong> {formatShowTimes()}</p>
                  </div>
                  
                  <div className="pricing-compact">
                    <h3>Priser</h3>
                    <p><strong>Ordinariebiljett:</strong> {settings.adultPrice || 200} kr</p>
                    <p><strong>Studentbiljett:</strong> {settings.studentPrice || 100} kr</p>
                  </div>
                </div>
                
                <div className="cta-prominent">
                  <p className="cta-text">🎟️ <strong>Redo att boka?</strong> Välj din tid och säkra din plats nu!</p>
                  <Link to="/booking" className="btn btn-primary btn-large">
                    Boka biljetter nu
                  </Link>
                </div>
              </>
            )}
            
            {isInitialized && (
              <>
                <div className="booking-instructions">
                  <h3>Så här bokar du:</h3>
                  <ol>
                    <li>Välj tid för konserten</li>
                    <li>Välj antal biljetter (max 4)</li>
                    <li>Fyll i dina kontaktuppgifter</li>
                    <li>Klicka på betalningslänken för att betala</li>
                    <li>Bekräfta betalningen på hemsidan</li>
                  </ol>
                </div>
                
                <div className="swish-reminder">
                  <p>
                    <strong>OBS!</strong> Du har reserverat en plats först när du BÅDE har reserverat en biljett här på hemsidan - och betalat. 
                    Klicka på länken nedan för att betala.
                  </p>
                </div>
              </>
            )}
            
            <div className="help-section">
              <h3>Behöver du hjälp?</h3>
              <p>Har du tappat bort dina biljetter eller behöver komma tillbaka till din bokning?</p>
              <div className="help-buttons">
                <Link to="/lost-tickets" className="btn btn-secondary">Tappade biljetter?</Link>
                <Link to="/find-booking" className="btn btn-secondary">Hitta min bokning</Link>
                <Link to="/contact" className="btn btn-secondary">Kontakta oss</Link>
              </div>
            </div>
          </div>
        </div>

      {/* Sticky booking button for mobile */}
      {isInitialized && (
        <div className="sticky-booking-btn">
          <Link to="/booking" className="btn btn-primary btn-sticky">
            Boka biljetter
          </Link>
        </div>
      )}
    </Layout>
  )
}

export default HomePage
