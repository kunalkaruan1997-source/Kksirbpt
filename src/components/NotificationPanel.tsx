import { Bell, X, Check, ExternalLink, Info, Upload, DollarSign, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNotifications } from '../hooks/useNotifications';
import { AppNotification } from '../types';
import { cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();

  const handleNotificationClick = (notification: AppNotification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
      onClose();
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'upload': return <Upload className="w-4 h-4 text-blue-600" />;
      case 'approval': return <ShieldCheck className="w-4 h-4 text-green-600" />;
      case 'payment_request': return <DollarSign className="w-4 h-4 text-amber-600" />;
      default: return <Info className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay for mobile */}
          <div 
            className="fixed inset-0 bg-black/20 z-[60] md:hidden" 
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="fixed top-4 md:top-20 right-4 md:right-10 w-[calc(100vw-2rem)] md:w-96 max-h-[80vh] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl z-[100] overflow-hidden flex flex-col"
          >
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-white dark:bg-neutral-900 sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-neutral-900 dark:text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"
                    title="Mark all as read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
                <button 
                  onClick={onClose}
                  className="p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="p-12 text-center text-neutral-500">
                  <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bell className="w-8 h-8 text-neutral-400" />
                  </div>
                  <p className="font-bold">No notifications yet</p>
                  <p className="text-xs">We'll notify you when there's something new.</p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {notifications.map((note) => (
                    <button
                      key={note.id}
                      onClick={() => handleNotificationClick(note)}
                      className={cn(
                        "w-full p-4 flex gap-4 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800",
                        !note.read && "bg-blue-50/50 dark:bg-blue-900/10"
                      )}
                    >
                      <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-2xl flex items-center justify-center">
                          {getIcon(note.type)}
                        </div>
                        {!note.read && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-600 border-2 border-white dark:border-neutral-900 rounded-full" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-bold text-neutral-900 dark:text-white truncate">
                            {note.title}
                          </p>
                          <span className="text-[10px] text-neutral-400 whitespace-nowrap">
                            {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 mt-1">
                          {note.message}
                        </p>
                        {note.link && (
                          <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                            View Details <ExternalLink className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-4 text-center border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/50">
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                You're all caught up!
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
