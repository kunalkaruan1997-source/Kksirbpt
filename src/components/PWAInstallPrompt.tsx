import { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppSettings } from '../hooks/useAppSettings';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const { settings } = useAppSettings();

  useEffect(() => {
    // Check if in iframe
    const inIframe = window.self !== window.top;
    setIsInIframe(inIframe);

    // Check if it's iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isStandalone) {
      console.log('PWA: App is already in standalone mode');
      return;
    }

    const handlePromptAvailable = () => {
      console.log('PWA: pwa-prompt-available event received');
      const prompt = (window as any).deferredPrompt;
      if (prompt) {
        setDeferredPrompt(prompt);
        setShowPrompt(true);
      }
    };

    window.addEventListener('pwa-prompt-available', handlePromptAvailable);
    
    // Check if it's already available
    if ((window as any).deferredPrompt) {
      console.log('PWA: deferredPrompt already available on mount');
      setDeferredPrompt((window as any).deferredPrompt);
      setShowPrompt(true);
    }

    // Show prompt in iframe to guide users to open in new tab
    if (inIframe) {
      setShowPrompt(true);
    }

    // For iOS, show manual instruction
    if (isIOSDevice) {
      const hasShownIOSPrompt = localStorage.getItem('ios_pwa_prompt_shown');
      if (!hasShownIOSPrompt) {
        setShowPrompt(true);
      }
    }

    // Fallback: If no event after 10 seconds and not in iframe/iOS, show manual instructions
    const timer = setTimeout(() => {
      if (!inIframe && !isIOSDevice && !(window as any).deferredPrompt) {
        console.log('PWA: Event not fired after 10s, showing manual instructions');
        setShowPrompt(true);
      }
    }, 10000);

    return () => {
      window.removeEventListener('pwa-prompt-available', handlePromptAvailable);
      clearTimeout(timer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const closePrompt = () => {
    setShowPrompt(false);
    if (isIOS) {
      localStorage.setItem('ios_pwa_prompt_shown', 'true');
    }
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-4 left-4 right-4 z-[200] md:left-auto md:right-8 md:top-8 md:w-96"
        >
          <div className="bg-blue-600 dark:bg-blue-600 rounded-3xl p-5 shadow-2xl border border-blue-500 relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
            
            <button 
              onClick={closePrompt}
              className="absolute top-4 right-4 p-1 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-white/70" />
            </button>

            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner overflow-hidden border border-white/20">
                {settings?.appIcon ? (
                  <img 
                    src={settings.appIcon} 
                    alt="App Icon" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://img.icons8.com/fluency/512/000000/education.png';
                    }}
                  />
                ) : (
                  <Smartphone className="w-8 h-8 text-blue-600" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white leading-tight">Install {settings?.appName || 'KK Sir bpt'}</h3>
                <p className="text-xs text-white/80 mt-1">
                  Add to home screen for a better experience.
                </p>
              </div>
            </div>

            <div className="mt-4">
              {isInIframe ? (
                <div className="p-3 bg-white/10 rounded-xl border border-white/20">
                  <p className="text-[10px] text-white font-medium leading-relaxed">
                    To install, please click <b>"Open in new tab"</b> at the top right of this screen first.
                  </p>
                </div>
              ) : isIOS ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[10px] text-white bg-white/10 p-2 rounded-xl border border-white/10">
                    <img src="https://img.icons8.com/ios/50/ffffff/share.png" className="w-4 h-4" alt="share" />
                    <p>Tap <b>Share</b> then <b>'Add to Home Screen'</b></p>
                  </div>
                </div>
              ) : deferredPrompt ? (
                <button
                  onClick={handleInstallClick}
                  className="w-full py-3 bg-white text-blue-600 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:bg-blue-50 active:scale-95 shadow-lg"
                >
                  <Download className="w-4 h-4" />
                  Install Now
                </button>
              ) : (
                <div className="p-3 bg-white/10 rounded-xl border border-white/20">
                  <p className="text-[10px] text-white font-medium leading-relaxed">
                    Tap the <b>three dots</b> (⋮) in your browser menu and select <b>"Install app"</b> or <b>"Add to Home screen"</b>.
                  </p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
