import { useEffect, useState, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useBackendStatus } from '../contexts/BackendStatusContext'
import api from '../services/api'

interface LayoutProps {
  children: ReactNode
}

function Layout({ children }: LayoutProps) {
  const { isOnline, isChecking, lastChecked } = useBackendStatus()
  const [concertName, setConcertName] = useState('Klasskonsert')
  const [contactEmail, setContactEmail] = useState('')

  useEffect(() => {
    if (isOnline) {
      api.get('/public/settings').then((response) => {
        if (response.data.concertName) {
          setConcertName(response.data.concertName)
        }
        if (response.data.contactEmail) {
          setContactEmail(response.data.contactEmail)
        }
      }).catch(() => {
        // Silently fail - backend status will handle the offline state
      })
    }
  }, [isOnline])

  return (
    <div className="container">
      {!isOnline && !isChecking && (
        <div className="backend-offline-banner">
          <div className="offline-content">
            <h2>⚠️ Backend är inte tillgänglig</h2>
            <p>Systemet kan inte ansluta till servern. Vänligen försök igen senare.</p>
            <p className="offline-note">Sidan uppdateras automatiskt när anslutningen återställs.</p>
          </div>
        </div>
      )}
      <header className="header">
        <h1 className="title">{concertName}</h1>
      </header>
      <main className="main">
        {isChecking && lastChecked === null ? (
          <div className="backend-loading">
            <p>Kontrollerar anslutning till servern...</p>
          </div>
        ) : isOnline ? (
          children
        ) : (
          <div className="backend-offline-content">
            <h2>Systemet är inte tillgängligt</h2>
            <p>Vi kan för närvarande inte ansluta till servern. Vänligen försök igen om en stund.</p>
          </div>
        )}
      </main>
      <footer className="footer">
        <p>
          {contactEmail ? (
            <>
              Kontakt: <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
            </>
          ) : (
            <span>Kontaktinformation laddas...</span>
          )}
        </p>
      </footer>
    </div>
  )
}

export default Layout
