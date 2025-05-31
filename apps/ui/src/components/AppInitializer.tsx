import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface AdminSetupResponse {
  setupRequired: boolean;
  message: string;
}

interface AppInitializerProps {
  children: React.ReactNode;
}

const AppInitializer: React.FC<AppInitializerProps> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [setupRequired, setSetupRequired] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAdminSetup = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/admin/setup/check`);
        if (response.ok) {
          const data: AdminSetupResponse = await response.json();
          setSetupRequired(data.setupRequired);
          
          // If setup is required and we're not already on the setup page, redirect
          if (data.setupRequired && location.pathname !== '/admin/setup') {
            navigate('/admin/setup', { replace: true });
          }
        } else {
          // If we can't reach the server, assume setup is required
          console.warn('Could not check admin setup status, assuming setup required');
          setSetupRequired(true);
          if (location.pathname !== '/admin/setup') {
            navigate('/admin/setup', { replace: true });
          }
        }
      } catch (error) {
        console.error('Error checking admin setup:', error);
        // If there's an error, assume setup is required
        setSetupRequired(true);
        if (location.pathname !== '/admin/setup') {
          navigate('/admin/setup', { replace: true });
        }
      } finally {
        setIsInitialized(true);
      }
    };

    checkAdminSetup();
  }, [navigate, location.pathname]);

  // Show loading screen while checking setup status
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Initializing application...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AppInitializer; 