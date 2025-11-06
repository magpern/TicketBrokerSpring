import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

interface LayoutProps {
  children: React.ReactNode
}

function Layout({ children }: LayoutProps) {
  const [settings, setSettings] = useState<any>({})

  useEffect(() => {
    api.get('/public/settings').then((response) => {
      setSettings(response.data)
    })
  }, [])

  return (
    <div className="container">
      <header className="header">
        <h1 className="title">{settings.concertName || 'Klasskonsert 24C'}</h1>
      </header>

      <main className="main">
        {children}
      </main>

      <footer className="footer">
        <p>
          Kontakt: <a href={`mailto:${settings.contactEmail || 'admin@example.com'}`}>
            {settings.contactEmail || 'admin@example.com'}
          </a> | <Link to="/contact">Kontaktformulär</Link>
        </p>
      </footer>
    </div>
  )
}

export default Layout

