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
  Info,
  User,
  Bell,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useAppSettings } from '../hooks/useAppSettings';
import { useNotifications } from '../hooks/useNotifications';
import { auth } from '../lib/firebase';
import { cn } from '../lib/utils';
import NotificationPanel from './NotificationPanel';
import MobileNavigation from './MobileNavigation';

import AppLogo from './AppLogo';

export default function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { profile, isPremium } = useAuth();
  const { settings, monetization } = useAppSettings();
  const { unreadCount } = useNotifications();
  const location = useLocation();

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

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex transition-colors duration-300">
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header - Centered Branding */}
        <header className="h-16 bg-white dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between px-4 sticky top-0 z-40 transition-colors">
          <div className="flex items-center gap-2">
            {location.pathname !== '/' && (
              <button 
                onClick={() => navigate(-1)}
                className="p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                id="header-back-button"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <Link to="/" className="hover:opacity-80 transition-opacity">
              <AppLogo showText size={22} />
            </Link>
          </div>
          
          <div className="flex items-center gap-2">
             <button
              onClick={() => setIsNotificationsOpen(true)}
              className="p-2 text-neutral-500 hover:text-blue-600 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-xl transition-all relative"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />}
            </button>
            <Link 
              to="/profile-setup"
              className="flex items-center gap-2 p-1 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-100 dark:border-neutral-700 hover:border-blue-200 transition-all"
            >
              <img 
                src={profile?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName || 'User'}`} 
                className="w-7 h-7 rounded-lg object-cover" 
                alt="Avatar"
              />
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 pb-32 md:p-8 bg-transparent transition-colors duration-300">
          <div className="max-w-5xl mx-auto">
            {children}
          </div>
        </main>

        <MobileNavigation />
        
        <NotificationPanel 
          isOpen={isNotificationsOpen} 
          onClose={() => setIsNotificationsOpen(false)} 
        />
      </div>
    </div>
  );
}
