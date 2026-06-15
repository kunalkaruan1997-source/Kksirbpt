import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { useAppSettings } from '../hooks/useAppSettings';

import AppLogo from './AppLogo';

export default function WelcomeOverlay({ onComplete }: { onComplete?: () => void }) {
  const { settings } = useAppSettings();
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !localStorage.getItem('onboarding_completed');
  });

  useEffect(() => {
    if (!isVisible) {
      onComplete?.();
      return;
    }

    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, 5000);
    return () => clearTimeout(timer);
  }, [isVisible, onComplete]);

  const handleSkip = () => {
    setIsVisible(false);
    onComplete?.();
  };

  const welcomeText = "Welcome to";
  const line2Text = settings?.appName || "KK Sir bpt";
  const line3Text = "" as string;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.02,
      },
    },
  };

  const letterVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4
      }
    },
  };

  return (
    <AnimatePresence>
      {isVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ willChange: 'opacity' }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-white dark:bg-neutral-950"
          >
          {/* Skip Button */}
          <button
            onClick={handleSkip}
            className="absolute top-8 right-8 p-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all z-10 flex items-center gap-2 text-sm font-bold"
          >
            Skip
            <X className="w-5 h-5" />
          </button>

          {/* Animated Background Elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(15)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  x: `${Math.random() * 100}%`, 
                  y: `${Math.random() * 100}%`,
                  opacity: 0,
                  scale: 0 
                }}
                animate={{ 
                  y: [null, "-20%"],
                  opacity: [0, 0.4, 0],
                  scale: [0, 1.2, 0]
                }}
                transition={{ 
                  duration: 4 + Math.random() * 4,
                  repeat: Infinity,
                  delay: Math.random() * 5,
                  ease: "easeInOut"
                }}
                style={{ willChange: 'transform, opacity' }}
                className="absolute w-2 h-2 bg-blue-500/30 rounded-full blur-sm"
              />
            ))}
          </div>

          <div className="relative text-center px-6">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ 
                type: "spring",
                stiffness: 100,
                damping: 20,
                delay: 0
              }}
              className="flex flex-col items-center"
            >
              <motion.div 
                initial={{ rotate: -10, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: "spring", delay: 0.1, bounce: 0.4 }}
                style={{ willChange: 'transform' }}
                className="w-32 h-32 bg-white rounded-[2.5rem] flex items-center justify-center mb-10 shadow-2xl shadow-blue-500/20 overflow-hidden border border-neutral-100"
              >
                <AppLogo size={80} />
              </motion.div>

              {/* Line 1: Welcome to */}
              <motion.h2 
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="text-xs md:text-sm font-bold text-neutral-500 dark:text-neutral-400 tracking-[0.3em] uppercase mb-6 flex flex-wrap justify-center gap-x-2"
              >
                {welcomeText.split("").map((char, index) => (
                  <motion.span key={index} variants={letterVariants}>
                    {char === " " ? "\u00A0" : char}
                  </motion.span>
                ))}
              </motion.h2>
              
              {/* Line 2: KK Sir */}
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="flex flex-wrap justify-center gap-x-3"
              >
                {line2Text.split("").map((char, index) => (
                  <motion.span 
                    key={index} 
                    variants={letterVariants}
                    transition={{ delay: 0.3 + index * 0.02 }}
                    className="text-4xl md:text-5xl font-serif font-bold text-neutral-900 dark:text-white italic"
                  >
                    {char === " " ? "\u00A0" : char}
                  </motion.span>
                ))}
              </motion.div>

              {/* Line 3: Optional additional text */}
              {line3Text && (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="mt-2 flex flex-wrap justify-center gap-x-3"
                >
                  {line3Text.split(" ").map((word, index) => (
                    <motion.span 
                      key={index} 
                      variants={letterVariants}
                      transition={{ delay: 0.6 + index * 0.1 }}
                      className="text-3xl md:text-4xl font-serif font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
                    >
                      {word}
                    </motion.span>
                  ))}
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
                className="mt-16 flex flex-col items-center gap-4"
              >
                <div className="flex items-center gap-3 text-neutral-500 dark:text-neutral-400 font-medium text-xs">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-ping" />
                  Preparing your personalized learning space...
                </div>
                
                {/* Progress Bar */}
                <div className="w-48 h-1 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 5, ease: "linear" }}
                    className="h-full bg-blue-600"
                  />
                </div>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
