import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'
import './AdminLoginPage.css'

function AdminLoginPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Try to authenticate with basic auth
      // Spring Security uses basic auth with username 'admin' and password from ADMIN_PASSWORD
      const username = 'admin'
      
      // Test authentication by making a request to a protected endpoint
      const response = await fetch('/api/admin/bookings', {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${btoa(`${username}:${password}`)}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        // Store auth credentials
        localStorage.setItem('adminAuth', JSON.stringify({ username, password }))
        navigate('/admin')
      } else {
        setError('Felaktigt lösenord.')
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('Ett fel uppstod. Försök igen.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <main className="main">
        <div className="login-container">
          <div className="login-form">
            <h2>Administratörsinloggning</h2>
            
            {error && (
              <div className="flash flash-error">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="password">Lösenord</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                />
              </div>
              
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Loggar in...' : 'Logga in'}
              </button>
            </form>
            
            <div className="login-info">
              <p><Link to="/">← Tillbaka till startsidan</Link></p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default AdminLoginPage

