import { ReactNode, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useBackendStatus } from '../contexts/BackendStatusContext'
import api from '../services/api'
import LanguageSwitcher from './LanguageSwitcher'

interface LayoutProps {
  children: ReactNode
}

function Layout({ children }: LayoutProps) {
  const { t } = useTranslation()
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
            <h2>⚠️ {t('layout.backendOffline')}</h2>
            <p>{t('layout.backendOfflineMessage')}</p>
            <p className="offline-note">{t('layout.backendOfflineNote')}</p>
          </div>
        </div>
      )}
      <header className="header">
        <div className="header-content">
          <h1 className="title">{concertName}</h1>
          <LanguageSwitcher />
        </div>
      </header>
      <main className="main">
        {isChecking && lastChecked === null ? (
          <div className="backend-loading">
            <p>{t('layout.checkingConnection')}</p>
          </div>
        ) : isOnline ? (
          children
        ) : (
          <div className="backend-offline-content">
            <h2>{t('layout.systemUnavailable')}</h2>
            <p>{t('layout.systemUnavailableMessage')}</p>
          </div>
        )}
      </main>
      <footer className="footer">
        <p>
          {contactEmail ? (
            <>
              {t('common.contact')}: <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
            </>
          ) : (
            <span>{t('common.contactLoading')}</span>
          )}
        </p>
      </footer>
    </div>
  )
}

export default Layout
