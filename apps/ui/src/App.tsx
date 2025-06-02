import { Layers, Activity, Settings, Terminal, Globe, Network, Server, Home, BarChart } from 'lucide-react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider } from './components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { Sidebar } from './components/ui/sidebar';
import { SystemStats } from '@/features/dashboard/components/SystemStats';
import { ServicesView } from '@/pages/ServicesView';
import { DNSConfigView } from '@/pages/DNSConfigView';
import { DHCPConfigView } from '@/pages/DHCPConfigView';
import { HTTPConfigView } from '@/pages/HTTPConfigView';
import { SettingsView } from '@/pages/SettingsView';
import { DashboardView } from '@/pages/DashboardView';

function AppContent() {
  const location = useLocation();
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
    const currentItem = sidebarItems.find(item => {
      if (item.href === "/") return location.pathname === "/" || location.pathname === "/stats";
      return location.pathname.startsWith(item.href);
    });
    return currentItem ? currentItem.title : "System Dashboard";
  };
  
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar items={sidebarItems} />
      <div className="flex-1 md:ml-64">
        <div className="flex flex-col space-y-8 p-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold md:block hidden">{getCurrentTitle()}</h1>
          </div>

          <Routes>
            <Route path="/" element={<DashboardView />} />
            <Route path="/stats" element={<SystemStats />} />
            <Route path="/services" element={<ServicesView />} />
            <Route path="/dns" element={<DNSConfigView />} />
            <Route path="/dhcp" element={<DHCPConfigView />} />
            <Route path="/http" element={<HTTPConfigView />} />
            <Route path="/settings" element={<SettingsView />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="app-theme">
      <Router>
        <AppContent />
        <Toaster />
      </Router>
    </ThemeProvider>
  );
}
