import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import adminApi from '../services/adminApi'
import './AdminAuditPage.css'

interface AuditLog {
  id: number
  timestamp: string
  actionType: string
  entityType: string
  entityId: number
  userType: string
  userIdentifier: string
  details: string | null
  oldValue: string | null
  newValue: string | null
}

interface AuditLogResponse {
  content: AuditLog[]
  totalElements: number
  totalPages: number
  number: number
  size: number
  first: boolean
  last: boolean
  hasNext: boolean
  hasPrevious: boolean
  actions: string[]
  entities: string[]
  users: string[]
}

function AdminAuditPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [auditData, setAuditData] = useState<AuditLogResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  const [filters, setFilters] = useState({
    action: searchParams.get('action') || '',
    entity: searchParams.get('entity') || '',
    user: searchParams.get('user') || ''
  })

  const currentPage = parseInt(searchParams.get('page') || '0')

  useEffect(() => {
    loadAuditLogs()
  }, [searchParams])

  const loadAuditLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('page', currentPage.toString())
      params.append('size', '50')
      if (filters.action) params.append('action', filters.action)
      if (filters.entity) params.append('entity', filters.entity)
      if (filters.user) params.append('user', filters.user)
      
      const response = await adminApi.get(`/audit?${params.toString()}`)
      setAuditData(response.data)
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Kunde inte ladda auditlogg: ' + (err.response?.data?.message || err.message) })
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (field: keyof typeof filters, value: string) => {
    const newFilters = { ...filters, [field]: value }
    setFilters(newFilters)
    
    const params = new URLSearchParams()
    params.append('page', '0') // Reset to first page when filtering
    if (newFilters.action) params.append('action', newFilters.action)
    if (newFilters.entity) params.append('entity', newFilters.entity)
    if (newFilters.user) params.append('user', newFilters.user)
    
    setSearchParams(params)
  }

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loadAuditLogs()
  }

  const handleClearFilters = () => {
    setFilters({ action: '', entity: '', user: '' })
    setSearchParams({ page: '0' })
    loadAuditLogs()
  }

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', newPage.toString())
    setSearchParams(params)
  }

  const formatActionType = (actionType: string) => {
    return actionType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const formatEntityType = (entityType: string) => {
    return entityType.charAt(0).toUpperCase() + entityType.slice(1)
  }

  const formatUserType = (userType: string) => {
    return userType.charAt(0).toUpperCase() + userType.slice(1)
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

  if (!auditData) {
    return (
      <Layout>
        <div className="admin-container">
          <p>Ingen data tillgänglig</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="admin-container">
        <div className="admin-header">
          <h2>Auditlogg</h2>
          <div className="admin-actions">
            <Link to="/admin" className="btn btn-secondary">
              ← Tillbaka till dashboard
            </Link>
          </div>
        </div>

        {message && (
          <div className={`flash flash-${message.type}`}>{message.text}</div>
        )}

        <div className="audit-section">
          <div className="filters-section">
            <form onSubmit={handleFilterSubmit} className="filter-form">
              <div className="filter-row">
                <div className="form-group">
                  <label htmlFor="action">Åtgärd:</label>
                  <select
                    id="action"
                    name="action"
                    value={filters.action}
                    onChange={(e) => handleFilterChange('action', e.target.value)}
                  >
                    <option value="">Alla åtgärder</option>
                    {auditData.actions.map((action) => (
                      <option key={action} value={action}>
                        {formatActionType(action)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="entity">Entitet:</label>
                  <select
                    id="entity"
                    name="entity"
                    value={filters.entity}
                    onChange={(e) => handleFilterChange('entity', e.target.value)}
                  >
                    <option value="">Alla entiteter</option>
                    {auditData.entities.map((entity) => (
                      <option key={entity} value={entity}>
                        {formatEntityType(entity)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="user">Användare:</label>
                  <select
                    id="user"
                    name="user"
                    value={filters.user}
                    onChange={(e) => handleFilterChange('user', e.target.value)}
                  >
                    <option value="">Alla användare</option>
                    {auditData.users.map((user) => (
                      <option key={user} value={user}>
                        {user}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <button type="submit" className="btn btn-primary">
                    Filtrera
                  </button>
                  <button type="button" onClick={handleClearFilters} className="btn btn-secondary">
                    Rensa
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div className="audit-summary">
            <h3>Auditlogg ({auditData.totalElements} poster)</h3>
          </div>

          {auditData.content.length > 0 ? (
            <>
              <div className="audit-table">
                <table>
                  <thead>
                    <tr>
                      <th>Tidpunkt</th>
                      <th>Åtgärd</th>
                      <th>Entitet</th>
                      <th>ID</th>
                      <th>Användare</th>
                      <th>Detaljer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditData.content.map((log) => (
                      <tr key={log.id}>
                        <td>{new Date(log.timestamp).toLocaleString('sv-SE')}</td>
                        <td>
                          <span className={`action-type ${log.actionType}`}>
                            {formatActionType(log.actionType)}
                          </span>
                        </td>
                        <td>{formatEntityType(log.entityType)}</td>
                        <td>{log.entityId}</td>
                        <td>
                          <span className={`user-type ${log.userType}`}>
                            {formatUserType(log.userType)}: {log.userIdentifier}
                          </span>
                        </td>
                        <td>
                          {log.details && (
                            <details>
                              <summary>Visa detaljer</summary>
                              <pre>{log.details}</pre>
                            </details>
                          )}
                          {(log.oldValue || log.newValue) && (
                            <details>
                              <summary>Ändringar</summary>
                              {log.oldValue && (
                                <>
                                  <strong>Före:</strong>
                                  <pre>{log.oldValue}</pre>
                                </>
                              )}
                              {log.newValue && (
                                <>
                                  <strong>Efter:</strong>
                                  <pre>{log.newValue}</pre>
                                </>
                              )}
                            </details>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {auditData.totalPages > 1 && (
                <div className="pagination">
                  {auditData.hasPrevious && (
                    <button
                      onClick={() => handlePageChange(auditData.number - 1)}
                      className="btn btn-secondary"
                    >
                      ← Föregående
                    </button>
                  )}
                  
                  <span className="page-info">
                    Sida {auditData.number + 1} av {auditData.totalPages}
                  </span>
                  
                  {auditData.hasNext && (
                    <button
                      onClick={() => handlePageChange(auditData.number + 1)}
                      className="btn btn-secondary"
                    >
                      Nästa →
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="no-logs">
              <p>Inga auditloggar hittades med de valda filtren.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default AdminAuditPage

