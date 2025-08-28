import  { useState, useEffect } from 'react';
import LoginPage from './pages/login/LoginPage';
import UploadPage from './pages/upload/UploadPage';
import ProtectedRoute from './components/ProtectedRoute';
import { isAuthenticated, initializeAuth } from './utils/auth';

type AppState = 'login' | 'upload';

function App() {
  const [currentPage, setCurrentPage] = useState<AppState>('login');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize authentication on app load
  useEffect(() => {
    // Initialize auth utilities
    initializeAuth();
    
    // Check if user is already authenticated
    if (isAuthenticated()) {
      setCurrentPage('upload');
    }
    
    setIsLoading(false);
  }, []);

  const handleLogin = () => {
    setCurrentPage('upload');
  };

  const handleUpload = (file: File) => {
    setUploadedFile(file);
    setCurrentPage('upload');
  };

  const handleLogout = () => {
    setCurrentPage('login');
    setUploadedFile(null);
  };


  const handleUnauthorized = () => {
    setCurrentPage('login');
    setUploadedFile(null);
  };

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="App">
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: '#0b1216',
          color: '#a3e635',
          fontSize: '1.2rem'
        }}>
          Loading...
        </div>
      </div>
    );
  }

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'login':
        return <LoginPage onLogin={handleLogin} />;
      case 'upload':
        return (
          <ProtectedRoute onUnauthorized={handleUnauthorized}>
            <UploadPage onUpload={handleUpload} onLogout={handleLogout} uploadedFile={uploadedFile} />
          </ProtectedRoute>
        );
      default:
        return <LoginPage onLogin={handleLogin} />;
    }
  };

  return (
    <div className="App">
      {renderCurrentPage()}
    </div>
  );
}

export default App;