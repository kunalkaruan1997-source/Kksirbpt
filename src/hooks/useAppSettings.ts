import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ContactSettings, MonetizationSettings } from '../types';

export function useAppSettings() {
  const [settings, setSettings] = useState<ContactSettings | null>(null);
  const [monetization, setMonetization] = useState<MonetizationSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeContact = onSnapshot(doc(db, 'settings', 'contact'), (doc) => {
      if (doc.exists()) {
        const data = doc.data() as ContactSettings;
        setSettings(data);

        // Real-time identity updates
        const appName = data.appName || 'KK Sir bpt';
        const appIcon = data.appIcon || 'https://cdn-icons-png.flaticon.com/512/2232/2232688.png';

        // Update document title
        document.title = appName;

        // Update favicon
        const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
        if (favicon) favicon.href = appIcon;

        // Update apple touch icon
        const appleIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
        if (appleIcon) appleIcon.href = appIcon;
      } else {
        // Fallback for document title if settings don't exist yet
        document.title = 'KK Sir bpt';
      }
    }, (error) => {
      console.error('Error fetching contact settings:', error);
      // Ensure we have a title even on error
      document.title = 'KK Sir bpt';
    });

    const unsubscribeMonetization = onSnapshot(doc(db, 'settings', 'monetization'), (doc) => {
      if (doc.exists()) {
        setMonetization(doc.data() as MonetizationSettings);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching monetization settings:', error);
      setLoading(false);
    });

    return () => {
      unsubscribeContact();
      unsubscribeMonetization();
    };
  }, []);

  return { settings, monetization, loading };
}
