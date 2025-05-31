import { Layers, Settings, Globe, Network, Server, Home, BarChart } from 'lucide-react';
import { BrowserRouter as Router, Routes, Route, useLocation, Link, Navigate } from 'react-router-dom';
import { ThemeProvider } from './components/theme-provider';
import { Sidebar } from './components/ui/sidebar';
import { Button } from './components/ui/button'; // Assuming Button component exists
import { SystemStats } from '@/features/dashboard/components/SystemStats';
import { ServicesView } from '@/pages/ServicesView';
import { DNSConfigView } from '@/pages/DNSConfigView';
import { DHCPConfigView } from '@/pages/DHCPConfigView';
import { HTTPConfigView } from '@/pages/HTTPConfigView';
import { SettingsView } from '@/pages/SettingsView';
import { DashboardView } from '@/pages/DashboardView';

import { useAuth } from './features/auth/AuthContext';
import LoginPage from './features/auth/LoginPage';
import SignupPage from './features/auth/SignupPage';
import AdminSetup from './features/auth/AdminSetup';
import ProtectedRoute from './features/auth/ProtectedRoute';
import AppInitializer from './components/AppInitializer';

// Simple placeholder components
const HomePage = () => (
  <div className="p-4">
    <h2 className="text-2xl font-semibold">Home Page (Protected Dashboard)</h2>
    <p>This is the main dashboard area, only visible to authenticated users.</p>
    <DashboardView />
  </div>
);
const PublicPage = () => <div className="p-4"><h2 className="text-2xl font-semibold">Public Page</h2><p>This page is accessible to everyone.</p></div>;


function AppContent() {
  const location = useLocation();
  const { isAuthenticated, logout } = useAuth();

  const sidebarItems = [
    { title: "Dashboard", href: "/", icon: <Home className="h-4 w-4" /> },
    { title: "System Stats", href: "/stats", icon: <BarChart className="h-4 w-4" /> },
    { title: "Services", href: "/services", icon: <Layers className="h-4 w-4" /> },
    { title: "DNS Config", href: "/dns", icon: <Globe className="h-4 w-4" /> },
    { title: "DHCP Config", href: "/dhcp", icon: <Network className="h-4 w-4" /> },
    { title: "HTTP Config", href: "/http", icon: <Server className="h-4 w-4" /> },
    { title: "Settings", href: "/settings", icon: <Settings className="h-4 w-4" /> },
  ];

  const getCurrentTitle = () => {
    // Adjusted to check against new potential home path
    const currentItem = sidebarItems.find(item => {
      if (item.href === "/" && (location.pathname === "/" || location.pathname.startsWith('/stats'))) return true;
      return location.pathname.startsWith(item.href) && item.href !== "/";
    });
    return currentItem ? currentItem.title : "System Dashboard";
  };

  return (
    <AppInitializer>
      <div className="flex min-h-screen bg-background">
        {isAuthenticated && <Sidebar items={sidebarItems} />}
        <div className={`flex-1 ${isAuthenticated ? 'md:ml-64' : ''}`}>
          <header className="bg-card p-4 shadow-sm">
            <nav className="container mx-auto flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <Link to={isAuthenticated ? "/" : "/public"} className="text-xl font-bold">App</Link>
                <Link to="/public" className="text-sm hover:underline">Public Page</Link>
              </div>
              <div className="flex items-center space-x-2">
                {isAuthenticated ? (
                  <Button onClick={logout} variant="outline">Logout</Button>
                ) : (
                  <>
                    <Button asChild variant="ghost">
                      <Link to="/login">Login</Link>
                    </Button>
                    <Button asChild>
                      <Link to="/signup">Signup</Link>
                    </Button>
                  </>
                )}
              </div>
            </nav>
          </header>

          <main className="p-8">
            {isAuthenticated && (
               <div className="flex justify-between items-center mb-8">
                  <h1 className="text-3xl font-bold md:block hidden">{getCurrentTitle()}</h1>
               </div>
            )}
            <Routes>
              <Route path="/admin/setup" element={<AdminSetup />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/public" element={<PublicPage />} />

              {/* Protected Routes */}
              <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
              <Route path="/stats" element={<ProtectedRoute><SystemStats /></ProtectedRoute>} />
              <Route path="/services" element={<ProtectedRoute><ServicesView /></ProtectedRoute>} />
              <Route path="/dns" element={<ProtectedRoute><DNSConfigView /></ProtectedRoute>} />
              <Route path="/dhcp" element={<ProtectedRoute><DHCPConfigView /></ProtectedRoute>} />
              <Route path="/http" element={<ProtectedRoute><HTTPConfigView /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsView /></ProtectedRoute>} />

              {/* Catch-all */}
              <Route path="*" element={isAuthenticated ? <Navigate to="/" replace /> : <Navigate to="/login" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </AppInitializer>
  );
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="app-theme">
      <Router>
        <AppContent />
      </Router>
    </ThemeProvider>
  );
}
