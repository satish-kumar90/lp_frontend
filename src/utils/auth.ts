// Authentication utilities for token and session management

export interface UserInfo {
  email: string;
  role: string;
  loginTime: string;
  token: string;
}

// Get auth token from cookie or localStorage
export const getAuthToken = (): string | null => {
  // First try to get from cookie
  const cookies = document.cookie.split(';');
  const authCookie = cookies.find(cookie => cookie.trim().startsWith('authToken='));
  
  if (authCookie) {
    return authCookie.split('=')[1];
  }
  
  // Fallback to localStorage
  return localStorage.getItem('authToken');
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  const token = getAuthToken();
  if (!token) return false;
  
  // Check if token is expired
  const expires = localStorage.getItem('authExpires');
  if (expires) {
    const expiryTime = parseInt(expires);
    if (Date.now() > expiryTime) {
      // Token expired, clear it
      clearAuthData();
      return false;
    }
  }
  
  return true;
};

// Get user information
export const getUserInfo = (): UserInfo | null => {
  if (!isAuthenticated()) return null;
  
  const userInfoStr = localStorage.getItem('userInfo');
  if (!userInfoStr) return null;
  
  try {
    return JSON.parse(userInfoStr);
  } catch (error) {
    console.error('Error parsing user info:', error);
    return null;
  }
};

// Validate token format and structure
export const validateToken = (token: string): boolean => {
  if (!token || typeof token !== 'string') return false;
  
  try {
    // Decode the base64 token
    const decoded = atob(token);
    const parts = decoded.split('-');
    
    // Check if token has expected structure: timestamp-random-admin
    if (parts.length !== 3) return false;
    
    const timestamp = parseInt(parts[0]);
    const role = parts[2];
    
    // Check if timestamp is valid and not too old (max 30 days)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    if (timestamp < thirtyDaysAgo) return false;
    
    // Check if role is admin
    if (role !== 'admin') return false;
    
    return true;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
};

// Clear all authentication data
export const clearAuthData = (): void => {
  // Clear cookie
  document.cookie = 'authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  
  // Clear localStorage
  localStorage.removeItem('authToken');
  localStorage.removeItem('authExpires');
  localStorage.removeItem('userInfo');
};

// Refresh token (extend session)
export const refreshToken = (): boolean => {
  const userInfo = getUserInfo();
  if (!userInfo) return false;
  
  // Generate new token
  const newToken = generateAuthToken();
  
  // Update user info with new token
  const updatedUserInfo: UserInfo = {
    ...userInfo,
    token: newToken,
    loginTime: new Date().toISOString()
  };
  
  // Store new token and user info
  setAuthCookie(newToken, 7);
  localStorage.setItem('userInfo', JSON.stringify(updatedUserInfo));
  
  return true;
};

// Generate new auth token
export const generateAuthToken = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);
  return btoa(`${timestamp}-${random}-admin`).replace(/[^a-zA-Z0-9]/g, '');
};

// Set auth cookie with token
export const setAuthCookie = (token: string, expiresInDays: number = 7): void => {
  const expires = new Date();
  expires.setTime(expires.getTime() + (expiresInDays * 24 * 60 * 60 * 1000));
  
  // Set secure cookie
  document.cookie = `authToken=${token}; expires=${expires.toUTCString()}; path=/; SameSite=Strict; Secure`;
  
  // Also store in localStorage as backup
  localStorage.setItem('authToken', token);
  localStorage.setItem('authExpires', expires.getTime().toString());
};

// Check if token needs refresh (within 1 day of expiry)
export const shouldRefreshToken = (): boolean => {
  const expires = localStorage.getItem('authExpires');
  if (!expires) return false;
  
  const expiryTime = parseInt(expires);
  const oneDayFromNow = Date.now() + (24 * 60 * 60 * 1000);
  
  return expiryTime < oneDayFromNow;
};

// Auto-refresh token if needed
export const autoRefreshToken = (): void => {
  if (isAuthenticated() && shouldRefreshToken()) {
    refreshToken();
  }
};

// Initialize auth check on app load
export const initializeAuth = (): void => {
  // Auto-refresh token if needed
  autoRefreshToken();
  
  // Set up periodic token refresh check (every 5 minutes)
  setInterval(autoRefreshToken, 5 * 60 * 1000);
};
