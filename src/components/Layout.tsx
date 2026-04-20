import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  ClipboardList,
  LayoutDashboard, 
  Video, 
  FileText, 
  Radio, 
  MessageSquare, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  PhoneCall,
  Moon,
  Sun,
  Download,
  Info,
  User,
  Bell
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useAppSettings } from '../hooks/useAppSettings';
import { useNotifications } from '../hooks/useNotifications';
import { auth } from '../lib/firebase';
import { cn } from '../lib/utils';
import NotificationPanel from './NotificationPanel';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallInfo, setShowInstallInfo] = useState(false);
  const { profile, isAdmin, isPremium } = useAuth();
  const { settings, monetization } = useAppSettings();
  const { unreadCount } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handlePromptAvailable = () => {
      setDeferredPrompt((window as any).deferredPrompt);
    };

    window.addEventListener('pwa-prompt-available', handlePromptAvailable);
    
    // Check if it's already available
    if ((window as any).deferredPrompt) {
      setDeferredPrompt((window as any).deferredPrompt);
    }

    return () => {
      window.removeEventListener('pwa-prompt-available', handlePromptAvailable);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  useEffect(() => {
    if (monetization?.adsEnabled && monetization?.adSenseClientId && !isPremium) {
      const script = document.createElement('script');
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${monetization.adSenseClientId}`;
      script.async = true;
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);

      return () => {
        document.head.removeChild(script);
      };
    }
  }, [monetization, isPremium]);

  useEffect(() => {
    if (settings?.appName) {
      document.title = settings.appName;
    }
  }, [settings?.appName]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { name: 'Videos', icon: Video, path: '/videos' },
    { name: 'Notes', icon: FileText, path: '/notes' },
    { name: 'Mock Tests', icon: ClipboardList, path: '/mock-tests' },
    { name: 'Live Classes', icon: Radio, path: '/live' },
    { name: 'Chat', icon: MessageSquare, path: '/chat' },
    { name: 'Profile', icon: User, path: '/profile-setup' },
    { name: 'Contact', icon: PhoneCall, path: '/contact' },
  ];

  if (isAdmin) {
    menuItems.push({ name: 'Admin Panel', icon: Settings, path: '/admin' });
  }

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex transition-colors duration-300">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 w-64 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 z-50 transform transition-transform duration-300 md:relative md:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-full flex flex-col">
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {settings?.appIcon ? (
                <img 
                  src={settings.appIcon} 
                  alt="Logo" 
                  className="w-10 h-10 rounded-xl object-cover shadow-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://img.icons8.com/fluency/512/000000/education.png';
                  }}
                />
              ) : (
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-200 dark:shadow-none">
                  {settings?.appName?.charAt(0) || 'K'}
                </div>
              )}
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white truncate max-w-[120px]">
                {settings?.appName || 'KK Sir bpt'}
              </h1>
            </div>
            <div className="flex items-center gap-1">
              <div className="relative">
                <button 
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className="p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors relative"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-blue-600 rounded-full border-2 border-white dark:border-neutral-900" />
                  )}
                </button>
              </div>
              <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <nav className="flex-1 px-4 space-y-1">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                  location.pathname === item.path
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                    : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            ))}
            {deferredPrompt && (
              <button
                onClick={handleInstallClick}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/20 hover:opacity-90 transition-all mt-4"
              >
                <Download className="w-5 h-5" />
                Install App
              </button>
            )}
          </nav>

          <div className="p-4 border-t border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-3 px-4 py-3">
              <img 
                src={profile?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName}`} 
                alt="Profile" 
                className="w-10 h-10 rounded-full border border-neutral-200 dark:border-neutral-700"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                  {profile?.displayName}
                </p>
                {profile?.studentId && (
                  <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                    ID: {profile.studentId}
                  </p>
                )}
                <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate uppercase tracking-wider font-bold">
                  {profile?.role}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors mt-2"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header (Mobile) */}
        <header className="h-16 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between px-6 md:hidden">
          <div className="flex items-center gap-2">
            {settings?.appIcon ? (
              <img 
                src={settings.appIcon} 
                alt="Logo" 
                className="w-8 h-8 rounded-lg object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://img.icons8.com/fluency/512/000000/education.png';
                }}
              />
            ) : (
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                {settings?.appName?.charAt(0) || 'K'}
              </div>
            )}
            <h1 className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight truncate max-w-[150px]">
              {settings?.appName || 'KK Sir bpt'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors relative"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full border-2 border-white dark:border-neutral-900" />
                )}
              </button>
            </div>
            {deferredPrompt && (
              <button 
                onClick={handleInstallClick}
                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                title="Install App"
              >
                <Download className="w-5 h-5" />
              </button>
            )}
            {isAdmin && (
              <Link 
                to="/admin"
                className="p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <Settings className="w-5 h-5" />
              </Link>
            )}
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button 
              onClick={handleLogout}
              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-6 bg-neutral-50 dark:bg-neutral-950 transition-colors duration-300">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>

        {/* Bottom Navigation (Mobile) */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 px-2 py-2 flex items-center justify-around z-50 md:hidden">
          {menuItems.filter(item => item.path !== '/admin').map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-1 px-2 py-1 rounded-lg transition-all",
                location.pathname === item.path
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-neutral-500 dark:text-neutral-400"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-tighter">{item.name.split(' ')[0]}</span>
            </Link>
          ))}
        </nav>
        
        <NotificationPanel 
          isOpen={isNotificationsOpen} 
          onClose={() => setIsNotificationsOpen(false)} 
        />
      </div>
    </div>
  );
}
