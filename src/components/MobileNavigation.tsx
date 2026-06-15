import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home, Play, BookOpen, ClipboardList, Radio, MessageSquare, Phone } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { cn } from '../lib/utils';

const items = [
  { name: 'Dashboard', icon: Home, path: '/' },
  { name: 'Videos', icon: Play, path: '/videos' },
  { name: 'Notes', icon: BookOpen, path: '/notes' },
  { name: 'Mock Tests', icon: ClipboardList, path: '/mock-tests' },
  { name: 'Live', icon: Radio, path: '/live' },
  { name: 'Chat', icon: MessageSquare, path: '/chat' },
  { name: 'Contact', icon: Phone, path: '/contact' },
];

export default function MobileNavigation() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-900 border-t border-neutral-100 dark:border-neutral-800 px-2 py-2 flex items-center justify-around z-50 md:hidden shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
      {items.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex flex-col items-center gap-1 p-2 transition-all relative min-w-[50px]",
              isActive ? "text-blue-600 scale-110" : "text-neutral-400"
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[9px] font-bold uppercase tracking-tight">{item.name}</span>
            {isActive && (
              <motion.div
                layoutId="active-tab"
                className="absolute -top-2 left-0 right-0 h-0.5 bg-blue-600"
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
