import { Bell, X, Check, ExternalLink, Info, Upload, DollarSign, ShieldCheck, ArrowLeft, ChevronLeft } from 'lucide-react';
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

  const formatNoteDate = (createdAt: any) => {
    try {
      if (!createdAt) return 'Just now';
      
      // If it's a Firestore Timestamp
      if (createdAt && typeof createdAt.toDate === 'function') {
        return formatDistanceToNow(createdAt.toDate(), { addSuffix: true });
      }
      
      // If it's a string or Date object
      return formatDistanceToNow(new Date(createdAt), { addSuffix: true });
    } catch (e) {
      console.error('Date formatting error:', e);
      return 'Recently';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay for mobile */}
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] md:z-[90]" 
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-full md:w-[400px] bg-white dark:bg-neutral-900 shadow-2xl z-[100] flex flex-col"
          >
            {/* Header */}
            <div className="px-4 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-4 bg-white dark:bg-neutral-900 sticky top-0 z-10 shadow-sm">
              <button 
                onClick={onClose}
                className="p-2 text-neutral-900 dark:text-white bg-neutral-100 dark:bg-neutral-800 rounded-xl hover:bg-neutral-200 transition-colors flex items-center gap-1 group"
                id="notification-back-button"
              >
                <ChevronLeft className="w-6 h-6 transition-transform group-hover:-translate-x-1" />
                <span className="text-sm font-bold pr-2">Back</span>
              </button>
              
              <div className="flex-1">
                <h3 className="text-xl font-black text-neutral-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  Alerts
                  {unreadCount > 0 && (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-black text-white">
                      {unreadCount}
                    </span>
                  )}
                </h3>
              </div>
              
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="p-2 text-blue-600 bg-blue-50 dark:bg-blue-900/30 rounded-xl hover:bg-blue-100 transition-colors"
                  title="Mark all as read"
                >
                  <Check className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
              {notifications.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-12 text-center text-neutral-500">
                  <div className="w-20 h-20 bg-neutral-50 dark:bg-neutral-800/50 rounded-[2rem] flex items-center justify-center mb-6 rotate-12">
                    <Bell className="w-10 h-10 text-neutral-300 -rotate-12" />
                  </div>
                  <h4 className="text-lg font-black text-neutral-900 dark:text-white uppercase tracking-tight">No Alerts Yet</h4>
                  <p className="text-xs font-medium text-neutral-500 mt-2 max-w-[200px]">
                    We'll push notifications here when something important happens.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((note) => (
                    <motion.button
                      layout
                      key={note.id}
                      onClick={() => handleNotificationClick(note)}
                      className={cn(
                        "w-full p-4 flex gap-4 text-left transition-all rounded-3xl border border-transparent active:scale-[0.98]",
                        note.read 
                          ? "bg-white dark:bg-neutral-800/20 border-neutral-100 dark:border-neutral-800" 
                          : "bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/30"
                      )}
                    >
                      <div className="relative flex-shrink-0">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center",
                          note.read ? "bg-neutral-100 dark:bg-neutral-800" : "bg-blue-100 dark:bg-blue-900/50"
                        )}>
                          {getIcon(note.type)}
                        </div>
                        {!note.read && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 border-4 border-blue-50 dark:border-blue-900 rounded-full" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className={cn(
                            "text-sm font-black uppercase tracking-tight truncate",
                            note.read ? "text-neutral-900 dark:text-white" : "text-blue-950 dark:text-blue-100"
                          )}>
                            {note.title}
                          </p>
                          <span className="text-[10px] font-bold text-neutral-400 whitespace-nowrap">
                            {formatNoteDate(note.createdAt)}
                          </span>
                        </div>
                        <p className={cn(
                          "text-xs leading-relaxed line-clamp-2",
                          note.read ? "text-neutral-500 dark:text-neutral-400" : "text-blue-700 dark:text-blue-300"
                        )}>
                          {note.message}
                        </p>
                        {note.link && (
                          <div className="mt-3 flex items-center gap-2 text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em]">
                            TAP TO VIEW <ExternalLink className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30">
              <div className="flex items-center justify-center gap-2 opacity-50">
                <ShieldCheck className="w-4 h-4 text-neutral-400" />
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em]">
                  Encrypted & Secure
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
