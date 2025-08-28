import  { useState } from 'react';
import {  EyeOff } from 'lucide-react';
import "./Login.css"
import logo from "../../images/login-logo.svg"
import mail from "../../images/mail-icon.svg"
import lock from "../../images/pass-icon.svg"
import btm from "../../images/lg-footer -logo.svg"

interface LoginPageProps {
  onLogin: () => void;
}

// Auth utilities
const generateAuthToken = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);
  return btoa(`${timestamp}-${random}-admin`).replace(/[^a-zA-Z0-9]/g, '');
};

const setAuthCookie = (token: string, expiresInDays: number = 7): void => {
  const expires = new Date();
  expires.setTime(expires.getTime() + (expiresInDays * 24 * 60 * 60 * 1000));
  
  document.cookie = `authToken=${token}; expires=${expires.toUTCString()}; path=/; SameSite=Strict; Secure`;
  
  // Also store in localStorage as backup
  localStorage.setItem('authToken', token);
  localStorage.setItem('authExpires', expires.getTime().toString());
};

const clearAuthCookie = (): void => {
  document.cookie = 'authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  localStorage.removeItem('authToken');
  localStorage.removeItem('authExpires');
};

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Admin credentials
  const ADMIN_EMAIL = 'admin';
  const ADMIN_PASSWORD = 'admin';

  const validateCredentials = (email: string, password: string): boolean => {
    return email === ADMIN_EMAIL && password === ADMIN_PASSWORD;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate inputs
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }

    setIsLoading(true);

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 800));

      // Validate credentials
      if (validateCredentials(email.trim(), password.trim())) {
        // Generate authentication token
        const authToken = generateAuthToken();
        
        // Store token in cookie and localStorage
        setAuthCookie(authToken, 7); // 7 days expiration
        
        // Store user info
        const userInfo = {
          email: email.trim(),
          role: 'admin',
          loginTime: new Date().toISOString(),
          token: authToken
        };
        
        localStorage.setItem('userInfo', JSON.stringify(userInfo));
        
        // Successful login
        setIsLoading(false);
        onLogin();
      } else {
        // Invalid credentials
        setError('Invalid email or password.');
        setIsLoading(false);
      }
    } catch (error) {
      setError('Login failed. Please try again.');
      setIsLoading(false);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error) setError(''); // Clear error when user starts typing
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (error) setError(''); // Clear error when user starts typing
  };

  return (
    <div className="login-container">
      {/* HUD Elements - Background threat displays */}
      <div className="hud-container">
        
      </div>

      {/* Dark overlay */}
      <div className="login-overlay" />

      {/* Main content */}
      <div className="login-content">
        {/* App title */}
        <div className="app-title">
          <img src={logo} alt="logo" />
        </div>

        {/* Login form container */}
        <div className="login-form-container">
          <h2 className="welcome-text">Welcome</h2>

          <form onSubmit={handleSubmit} className="login-form">
            {/* Error message */}
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <div className="form-field">
              <label htmlFor="email" className="form-label">
                Your Email
              </label>
              <div className="input-container">
                <input
                  type="text"
                  id="email"
                  value={email}
                  onChange={handleEmailChange}
                  className={`form-input ${error ? 'error' : ''}`}
                  placeholder="Enter your email"
                  required
                  disabled={isLoading}
                />
                <div className="input-icon">
                  <img src={mail} alt="mail" />
                </div>
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <div className="input-container">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={handlePasswordChange}
                  className={`form-input ${error ? 'error' : ''}`}
                  placeholder="Enter your password"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle"
                  disabled={isLoading}
                >
                  <div className="input-icon">
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <img src={lock} alt="" />
                    )}
                  </div>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="login-button"
            >
              {isLoading ? 'Signing In...' : 'Login'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="login-footer">
          <div className="footer-text">
            <span>Powered by</span>
            <div className="footer-logo">
              <div>
                <img src={btm} alt="" />
              </div>
            </div>
            <span>© 2025. All Rights Reserved</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

// Export auth utilities for use in other components
export { generateAuthToken, setAuthCookie, clearAuthCookie };


