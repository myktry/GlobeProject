// src/pages/AdminLogin.jsx
import React from 'react';
import { useNavigate, Link } from 'react-router-dom';

const AdminLogin = () => {
  const nav = useNavigate();
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [resultModalVisible, setResultModalVisible] = React.useState(false);
  const [resultModalMessage, setResultModalMessage] = React.useState('');
  const [resultModalType, setResultModalType] = React.useState('success');
  const [resultModalHasUndo, setResultModalHasUndo] = React.useState(false);

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
        // show success modal instead of browser alert
        setResultModalType('success');
        setResultModalMessage('Admin credentials updated! You will be logged out.');
        setResultModalHasUndo(false);
        setResultModalVisible(true);
        // ✅ Auto logout after saving admin account
        setTimeout(() => {
          window.location.href = "/admin/login";
        }, 1500);
      } else {
        setResultModalType('error');
        setResultModalMessage(data.message || "Failed to update admin credentials.");
        setResultModalHasUndo(false);
        setResultModalVisible(true);
      }
    } catch (error) {
      console.error("Error updating admin account:", error);
      setResultModalType('error');
      setResultModalMessage((error && error.message) || 'Error updating admin account');
      setResultModalHasUndo(false);
      setResultModalVisible(true);
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
      {resultModalVisible && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2001 }}>
          <div style={{ width: 420, maxWidth: '92%', background: '#071028', border: '1px solid #213148', padding: 20, borderRadius: 10, boxShadow: '0 12px 40px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12 }}>
              <div style={{ width: 56, height: 56, borderRadius: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: resultModalType === 'success' ? '#064e3b' : resultModalType === 'error' ? '#6b021f' : '#0b2540' }}>
                {resultModalType === 'success' ? (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 6L9 17l-5-5" stroke="#9AE6B4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : resultModalType === 'error' ? (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 6L6 18M6 6l12 12" stroke="#FCA5A5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2a10 10 0 100 20 10 10 0 000-20zM11 10h2v6h-2v-6zm0-4h2v2h-2V6z" fill="#93C5FD" />
                  </svg>
                )}
              </div>

              <div style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>{resultModalMessage}</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12 }}>
              <button onClick={() => setResultModalVisible(false)} style={{ padding: '6px 10px', borderRadius: 8, background: '#0b1224', border: '1px solid #213148', color: '#cbd5e1' }}>OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLogin;
