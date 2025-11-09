import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { useBackendStatus } from '../contexts/BackendStatusContext'
import api from '../services/api'
import { Show } from '../types/booking'
import './HomePage.css'

interface Settings {
  concertName?: string
  welcomeMessage?: string
  concertVenue?: string
  adultPrice?: number
  studentPrice?: number
  contactEmail?: string
  classPhotoData?: string
  classPhotoContentType?: string
}

function HomePage() {
  const { isOnline } = useBackendStatus()
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
    // Only fetch data if backend is online
    if (!isOnline) {
      return
    }

    api.get('/public/shows').then((response) => {
      setShows(response.data)
    }).catch(() => {
      // Error handled by backend status context
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
    }).catch(() => {
      // Error handled by backend status context
    })
    
    api.get('/public/initialization-status').then((response) => {
      const status = response.data
      setIsInitialized(status.isInitialized)
      setInitStatus(status)
    }).catch(() => {
      // Error handled by backend status context
    })
  }, [isOnline])

  // Format date for Swedish display (yyyy-MM-dd -> dd MMM yyyy)
  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr + 'T00:00:00') // Add time to avoid timezone issues
      const months = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
      const day = date.getDate()
      const month = months[date.getMonth()]
      const year = date.getFullYear()
      return `${day} ${month} ${year}`
    } catch {
      return dateStr // Fallback to original if parsing fails
    }
  }

  // Group shows by date and format for display
  const formatShowsByDate = () => {
    if (shows.length === 0) {
      return null
    }

    // Group shows by date
    const showsByDate = shows.reduce((acc, show) => {
      const date = show.date
      if (!acc[date]) {
        acc[date] = []
      }
      acc[date].push(show)
      return acc
    }, {} as Record<string, Show[]>)

    // Sort dates
    const sortedDates = Object.keys(showsByDate).sort()

    return sortedDates.map(date => {
      const dateShows = showsByDate[date]
      const times = dateShows.map(s => `${s.startTime}-${s.endTime}`).join(', ')
      return { date, formattedDate: formatDate(date), times, shows: dateShows }
    })
  }

  const showsByDate = formatShowsByDate()

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
            
            <h2>{settings.welcomeMessage || (isOnline ? 'Välkommen till 24c:s klasspelning!' : '')}</h2>
            {isOnline && (
              <p>
                På den här sidan kan du boka biljetter. Glöm inte att anmälan är gjord först när både bokning och betalning är inne. 
                Dörrarna öppnar 15 minuter innan konsertstart. Ses där!
              </p>
            )}
            
            {isInitialized && isOnline && (
              <>
                <div className="concert-info-compact">
                  <div className="concert-details">
                    <h3>Konsertinformation</h3>
                    {settings.concertVenue && <p><strong>Plats:</strong> {settings.concertVenue}</p>}
                    {showsByDate && showsByDate.length > 0 && (
                      <div className="shows-by-date">
                        {showsByDate.map((group) => (
                          <div key={group.date} className="show-date-group">
                            <p><strong>Datum:</strong> {group.formattedDate}</p>
                            <p><strong>Tider:</strong> {group.times}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {(!showsByDate || showsByDate.length === 0) && isOnline && (
                      <p className="no-shows-message">Inga föreställningar definierade ännu.</p>
                    )}
                  </div>
                  
                  <div className="pricing-compact">
                    <h3>Priser</h3>
                    {settings.adultPrice && <p><strong>Ordinariebiljett:</strong> {settings.adultPrice} kr</p>}
                    {settings.studentPrice && <p><strong>Studentbiljett:</strong> {settings.studentPrice} kr</p>}
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
