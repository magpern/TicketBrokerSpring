import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import HomePage from './pages/HomePage'
import BookingPage from './pages/BookingPage'
import BookingSuccessPage from './pages/BookingSuccessPage'
import LostTicketsPage from './pages/LostTicketsPage'
import FindBookingPage from './pages/FindBookingPage'
import ContactPage from './pages/ContactPage'
import AdminLoginPage from './pages/AdminLoginPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import AdminSettingsPage from './pages/AdminSettingsPage'
import AdminCheckTicketPage from './pages/AdminCheckTicketPage'
import ValidateTicketPage from './pages/ValidateTicketPage'
import './App.css'

// Protected route component
function ProtectedRoute({ children }: { children: React.ReactElement }) {
  const auth = localStorage.getItem('adminAuth')
  if (!auth) {
    return <Navigate to="/admin/login" replace />
  }
  return children
}

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/booking" element={<BookingPage />} />
          <Route path="/booking/success/:reference/:email" element={<BookingSuccessPage />} />
          <Route path="/lost-tickets" element={<LostTicketsPage />} />
          <Route path="/find-booking" element={<FindBookingPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute>
                <AdminSettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/check-ticket"
            element={
              <ProtectedRoute>
                <AdminCheckTicketPage />
              </ProtectedRoute>
            }
          />
          <Route path="/validate-ticket" element={<ValidateTicketPage />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App

