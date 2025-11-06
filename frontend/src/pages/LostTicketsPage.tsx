import { Link } from 'react-router-dom'
import './LostTicketsPage.css'

function LostTicketsPage() {
  return (
    <div className="container">
      <main className="main">
        <div className="help-page">
          <h2>Tappade biljetter?</h2>
          <p>Om du har tappat bort dina biljetter, kontakta oss så hjälper vi dig.</p>
          <div className="actions">
            <Link to="/" className="btn btn-primary">Tillbaka till startsidan</Link>
            <Link to="/contact" className="btn btn-secondary">Kontakta oss</Link>
          </div>
        </div>
      </main>
    </div>
  )
}

export default LostTicketsPage

