import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import "./AdminLoginPage.css";

function AdminLoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Check for and display last auth error if redirected here
  useEffect(() => {
    const lastError = sessionStorage.getItem("lastAuthError");
    if (lastError) {
      try {
        const errorDetails = JSON.parse(lastError);
        console.error("Previous authentication error:", errorDetails);
        // Optionally show this to user
        sessionStorage.removeItem("lastAuthError");
      } catch (e) {
        console.error("Failed to parse last error:", e);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Try to authenticate with basic auth
      // Spring Security uses basic auth with username 'admin' and password from ADMIN_PASSWORD
      const username = "admin";

      // Test authentication by making a request to a protected endpoint
      const response = await fetch("/api/admin/bookings", {
        method: "GET",
        headers: {
          Authorization: `Basic ${btoa(`${username}:${password}`)}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        // Store base64 encoded Basic Auth token (not plain password)
        // Using sessionStorage instead of localStorage for better security (cleared on tab close)
        const authToken = btoa(`${username}:${password}`);
        sessionStorage.setItem("adminAuthToken", authToken);

        // Redirect to the page they were trying to access, or default to /admin
        const redirectTo = searchParams.get("redirect") || "/admin";
        navigate(redirectTo);
      } else {
        setError("Felaktigt lösenord.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Ett fel uppstod. Försök igen.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <main className="main">
        <div className="login-container">
          <div className="login-form">
            <h2>Administratörsinloggning</h2>

            {error && <div className="flash flash-error">{error}</div>}

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

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? "Loggar in..." : "Logga in"}
              </button>
            </form>

            <div className="login-info">
              <p>
                <Link to="/">← Tillbaka till startsidan</Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AdminLoginPage;
