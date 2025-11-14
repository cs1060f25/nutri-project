import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

// Robust fetch helper that handles non-JSON responses
async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    // Not JSON — likely an HTML error page from Vercel or a proxy
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 180)}`);
  }

  if (!res.ok) {
    const msg = data?.error?.message || data?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);

  // Check for existing session on mount
  useEffect(() => {
    const storedAccessToken = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
    const storedRefreshToken = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
    const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');

    if (storedAccessToken && storedUser) {
      setAccessToken(storedAccessToken);
      setRefreshToken(storedRefreshToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password, rememberMe = false) => {
    try {
      const data = await postJson('/auth/login', { email, password });

      // Store tokens and user info based on rememberMe choice
      const storage = rememberMe ? localStorage : sessionStorage;
      
      storage.setItem('accessToken', data.accessToken);
      storage.setItem('refreshToken', data.refreshToken);
      storage.setItem('user', JSON.stringify(data.user));

      // Clear from the other storage if it exists
      const otherStorage = rememberMe ? sessionStorage : localStorage;
      otherStorage.removeItem('accessToken');
      otherStorage.removeItem('refreshToken');
      otherStorage.removeItem('user');

      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      setUser(data.user);

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  };

  const register = async (email, password, firstName, lastName, residence, additionalData = null) => {
    try {
      const registrationPayload = { 
        email, 
        password,
        firstName,
        lastName,
        residence
      };

      // Merge additional registration data if provided
      if (additionalData) {
        Object.assign(registrationPayload, additionalData);
      }

      await postJson('/auth/register', registrationPayload);

      // After registration, automatically log in
      return await login(email, password);
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: error.message };
    }
  };

  const refreshAccessToken = async () => {
    try {
      const storedRefreshToken = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
      
      if (!storedRefreshToken) {
        throw new Error('No refresh token available');
      }

      const data = await postJson('/auth/refresh', { refreshToken: storedRefreshToken });

      // Update tokens in storage (use same storage type as before)
      const storage = localStorage.getItem('refreshToken') ? localStorage : sessionStorage;
      storage.setItem('accessToken', data.accessToken);
      storage.setItem('refreshToken', data.refreshToken);

      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken);

      return data.accessToken;
    } catch (error) {
      console.error('Token refresh error:', error);
      // If refresh fails, log out the user
      await logout();
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (accessToken) {
        await fetch('/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear both local storage and session storage
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('refreshToken');
      sessionStorage.removeItem('user');
      setAccessToken(null);
      setRefreshToken(null);
      setUser(null);
    }
  };

  const value = {
    user,
    accessToken,
    refreshToken,
    loading,
    login,
    register,
    logout,
    refreshAccessToken,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

