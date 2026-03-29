import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { api, setToken, getToken } from './api';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check for token in URL (from OAuth callback)
    const params = new URLSearchParams(location.search);
    const urlToken = params.get('token');
    
    if (urlToken) {
      setToken(urlToken);
      // Clean up URL
      window.history.replaceState({}, '', location.pathname);
    }

    // Check auth status
    const checkAuth = async () => {
      const token = getToken();
      if (!token) {
        setLoading(false);
        if (location.pathname !== '/login') {
          navigate('/login');
        }
        return;
      }

      try {
        const data = await api.getMe();
        setUser(data);
        
        // Redirect based on installation status
        if (!data.hasInstallation && location.pathname === '/dashboard') {
          navigate('/connect');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setToken(null);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [location.search]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <h1>🤖 PR Bot</h1>
        {user && (
          <div className="user-info">
            <span>@{user.user.username}</span>
            <button onClick={() => { setToken(null); navigate('/login'); }}>
              Logout
            </button>
          </div>
        )}
      </header>
      <main className="main">
        <Outlet context={{ user, setUser }} />
      </main>
    </div>
  );
}
