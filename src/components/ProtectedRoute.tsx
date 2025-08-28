import React, { useEffect, useState } from 'react';
import { isAuthenticated } from '../utils/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  onUnauthorized: () => void;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, onUnauthorized }) => {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = isAuthenticated();
      setIsAuthorized(authenticated);
      
      if (!authenticated) {
        onUnauthorized();
      }
      
      setIsChecking(false);
    };

    checkAuth();
  }, [onUnauthorized]);

  // Show loading while checking authentication
  if (isChecking) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#0b1216',
        color: '#a3e635',
        fontSize: '1.2rem'
      }}>
        Verifying authentication...
      </div>
    );
  }

  // If not authorized, don't render children (will redirect via onUnauthorized)
  if (!isAuthorized) {
    return null;
  }

  // If authorized, render the protected content
  return <>{children}</>;
};

export default ProtectedRoute;
