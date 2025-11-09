import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
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

  // Format date based on current language (yyyy-MM-dd -> dd MMM yyyy)
  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr + 'T00:00:00') // Add time to avoid timezone issues
      const months = [
        t('months.jan'), t('months.feb'), t('months.mar'), t('months.apr'),
        t('months.maj'), t('months.jun'), t('months.jul'), t('months.aug'),
        t('months.sep'), t('months.okt'), t('months.nov'), t('months.dec')
      ]
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
                alt={isInitialized ? t('home.classPhoto') : t('home.underConstruction')} 
                className={`class-image ${!isInitialized ? 'under-construction' : ''}`}
                onError={(e) => {
                  // Fallback to under construction if image fails to load
                  e.currentTarget.src = '/under-construction.svg'
                  e.currentTarget.alt = t('home.underConstruction')
                  e.currentTarget.classList.add('under-construction')
                }}
              />
            </div>
          )}
          
          <div className="welcome-info">
            {!isInitialized && initStatus && (
              <div className="initialization-banner">
                <h2>⚠️ {t('home.systemInitializing')}</h2>
                <p>{initStatus.message}</p>
                <div className="init-status-details">
                  <p>
                    {!initStatus.hasShows && <span className="init-missing">❌ {t('home.noShowsDefined')}</span>}
                    {initStatus.hasShows && <span className="init-ok">✅ {t('home.showsConfigured')}</span>}
                  </p>
                  <p>
                    {!initStatus.hasClassPhoto && <span className="init-missing">❌ {t('home.noClassPhoto')}</span>}
                    {initStatus.hasClassPhoto && <span className="init-ok">✅ {t('home.classPhotoUploaded')}</span>}
                  </p>
                </div>
                <p className="init-note">
                  <strong>{t('home.adminNote')}</strong> {t('home.adminLoginNote')} <Link to="/admin/settings">{t('home.settingsPage')}</Link> {t('home.toCompleteConfig')}
                </p>
              </div>
            )}
            
            <h2>{settings.welcomeMessage || (isOnline ? t('home.welcome') : '')}</h2>
            {isOnline && (
              <p>
                {t('home.intro')}
              </p>
            )}
            
            {isInitialized && isOnline && (
              <>
                <div className="concert-info-compact">
                  <div className="concert-details">
                    <h3>{t('home.concertInfo')}</h3>
                    {settings.concertVenue && <p><strong>{t('common.venue')}:</strong> {settings.concertVenue}</p>}
                    {showsByDate && showsByDate.length > 0 && (
                      <div className="shows-by-date">
                        {showsByDate.map((group) => (
                          <div key={group.date} className="show-date-group">
                            <p><strong>{t('common.date')}:</strong> {group.formattedDate}</p>
                            <p><strong>{t('common.times')}:</strong> {group.times}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {(!showsByDate || showsByDate.length === 0) && isOnline && (
                      <p className="no-shows-message">{t('home.noShowsYet')}</p>
                    )}
                  </div>
                  
                  <div className="pricing-compact">
                    <h3>{t('home.prices')}</h3>
                    {settings.adultPrice && <p><strong>{t('home.adultTicket')}:</strong> {settings.adultPrice} {t('common.kr')}</p>}
                    {settings.studentPrice && <p><strong>{t('home.studentTicket')}:</strong> {settings.studentPrice} {t('common.kr')}</p>}
                  </div>
                </div>
                
                <div className="cta-prominent">
                  <p className="cta-text">🎟️ <strong>{t('home.readyToBook')}</strong> {t('home.selectTimeSecure')}</p>
                  <Link to="/booking" className="btn btn-primary btn-large">
                    {t('home.bookTicketsNow')}
                  </Link>
                </div>
              </>
            )}
            
            {isInitialized && (
              <>
                <div className="booking-instructions">
                  <h3>{t('home.howToBook')}</h3>
                  <ol>
                    <li>{t('home.step1')}</li>
                    <li>{t('home.step2')}</li>
                    <li>{t('home.step3')}</li>
                    <li>{t('home.step4')}</li>
                    <li>{t('home.step5')}</li>
                  </ol>
                </div>
                
                <div className="swish-reminder">
                  <p>
                    <strong>{t('home.important')}</strong> {t('home.reservationNote')}
                  </p>
                </div>
              </>
            )}
            
            <div className="help-section">
              <h3>{t('home.needHelp')}</h3>
              <p>{t('home.lostTicketsOrBooking')}</p>
              <div className="help-buttons">
                <Link to="/lost-tickets" className="btn btn-secondary">{t('home.lostTickets')}</Link>
                <Link to="/find-booking" className="btn btn-secondary">{t('home.findBooking')}</Link>
                <Link to="/contact" className="btn btn-secondary">{t('home.contactUs')}</Link>
              </div>
            </div>
          </div>
        </div>

      {/* Sticky booking button for mobile */}
      {isInitialized && (
        <div className="sticky-booking-btn">
          <Link to="/booking" className="btn btn-primary btn-sticky">
            {t('home.bookTicketsNow')}
          </Link>
        </div>
      )}
    </Layout>
  )
}

export default HomePage
