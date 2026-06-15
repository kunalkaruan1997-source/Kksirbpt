import { useState, useEffect } from 'react';

export function useMobileApp() {
  const [canInstall, setCanInstall] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const checkStandalone = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
      setIsStandalone(!!isStandalone);
    };

    checkStandalone();

    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      (window as any).deferredPrompt = e;
      setCanInstall(true);
      console.log('PWA: Ready to install');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    
    // Check if event already happened
    if ((window as any).deferredPrompt) {
      setCanInstall(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const install = async () => {
    const promptEvent = (window as any).deferredPrompt;
    if (!promptEvent) return;

    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    console.log(`PWA: Install choice: ${outcome}`);

    if (outcome === 'accepted') {
      setCanInstall(false);
    }
    (window as any).deferredPrompt = null;
  };

  return { canInstall, isStandalone, install };
}
