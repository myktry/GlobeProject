// src/pages/AdminLogin.jsx
import React from 'react';
import { useNavigate, Link } from 'react-router-dom';

const AdminLogin = () => {
  const nav = useNavigate();
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      setLoading(true);
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include' // ✅ keep session cookies
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Login failed');
      }

      nav('/admin'); // redirect on success
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  
  const handleSaveAdminAccount = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
  
      const data = await res.json();
      if (data.success) {
        alert("Admin credentials updated! You will be logged out.");
        // ✅ Auto logout after saving admin account
        setTimeout(() => {
          window.location.href = "/admin/login";
        }, 1500);
      } else {
        alert(data.message || "Failed to update admin credentials.");
      }
    } catch (error) {
      console.error("Error updating admin account:", error);
    }
  };
  

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background:
          'radial-gradient(1200px 600px at 20% 0%, #0b1b3a 0%, #050a18 60%, #02040a 100%)',
        color: '#e5e7eb',
        fontFamily:
          'Roboto, system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif',
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          width: 340,
          background: '#0b1224',
          border: '1px solid #1f2a44',
          borderRadius: 12,
          padding: 20,
          boxShadow: '0 10px 30px rgba(0,0,0,.35)',
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 900, marginBottom: 14 }}>Admin Login</h1>
        <div style={{ display: 'grid', gap: 10 }}>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            style={{
              padding: 10,
              borderRadius: 8,
              border: '1px solid #263455',
              background: '#0a1020',
              color: '#e5e7eb',
            }}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            style={{
              padding: 10,
              borderRadius: 8,
              border: '1px solid #263455',
              background: '#0a1020',
              color: '#e5e7eb',
            }}
          />
          {error && <div style={{ color: '#fecaca', fontSize: 13 }}>{error}</div>}
          <button
            type="submit"
            disabled={loading || !(username && password)}
            style={{
              background:
                loading || !(username && password) ? '#155e75' : '#10b981',
              border: '1px solid #065f46',
              color: '#06261f',
              fontWeight: 800,
              padding: '10px 12px',
              borderRadius: 10,
              cursor:
                loading || !(username && password)
                  ? 'not-allowed'
                  : 'pointer',
              opacity: loading || !(username && password) ? 0.7 : 1,
            }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
          <Link
            to="/"
            style={{
              color: '#93c5fd',
              fontSize: 13,
              textDecoration: 'underline',
              textAlign: 'center',
            }}
          >
            Back Home
          </Link>
        </div>
      </form>
    </div>
  );
};

export default AdminLogin;
