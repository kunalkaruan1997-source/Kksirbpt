import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { LiveClass } from '../types';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'motion/react';
import { Radio, Calendar, Clock, ExternalLink, Bell, Lock, DollarSign, ShieldCheck, Check, School, Copy, X, QrCode } from 'lucide-react';
import { useAppSettings } from '../hooks/useAppSettings';
import { AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import PaymentSubmission from './PaymentSubmission';

export default function LiveClasses() {
  const { profile, isPremium, isContentUnlocked } = useAuth();
  const { settings, monetization } = useAppSettings();
  const [classes, setClasses] = useState<LiveClass[]>([]);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<LiveClass | null>(null);

  const handleJoinLive = (c: LiveClass) => {
    if (c.isPremium && !isContentUnlocked(c.id)) {
      setSelectedClass(c);
      setShowPremiumModal(true);
      return;
    }
    window.open(c.youtubeLiveUrl, '_blank');
  };

  useEffect(() => {
    const q = query(collection(db, 'liveClasses'), orderBy('startTime', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const allLive = snap.docs.map(d => ({ id: d.id, ...d.data() } as LiveClass));
      if (profile?.role === 'admin') {
        setClasses(allLive);
      } else {
        setClasses(allLive.filter(c => !c.hidden));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'liveClasses');
    });
    return () => unsub();
  }, [profile]);

  const upcoming = classes.filter(c => c.status === 'upcoming');
  const live = classes.filter(c => c.status === 'live');
  const past = classes.filter(c => c.status === 'recorded');

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Live Classes</h1>
        <p className="text-neutral-500 dark:text-neutral-400 mt-1">Join interactive live sessions and see upcoming schedules</p>
      </header>

      {/* Live Now */}
      {live.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Happening Now</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {live.map(c => (
              <motion.div 
                key={c.id}
                initial={{ scale: 0.98, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-red-600 rounded-3xl p-8 text-white shadow-xl shadow-red-100 dark:shadow-none flex flex-col md:flex-row gap-8 items-center"
              >
                <div className="p-6 bg-white/20 rounded-2xl">
                  <Radio className="w-12 h-12 text-white" />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-2xl font-bold mb-2">{c.title}</h3>
                  <p className="text-red-100 mb-6">Interactive session is live. Join now to ask doubts!</p>
                  <button 
                    onClick={() => handleJoinLive(c)}
                    className="inline-flex items-center gap-2 px-8 py-3 bg-white text-red-600 rounded-xl font-bold hover:bg-red-50 transition-colors"
                  >
                    Join Live Stream
                    <ExternalLink className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Upcoming */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-3">
          <Calendar className="w-6 h-6 text-blue-600" />
          Upcoming Sessions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {upcoming.length > 0 ? upcoming.map(c => (
            <div key={c.id} className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl relative">
                    <Clock className="w-6 h-6 text-blue-600" />
                    {c.isPremium && (
                      <div className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-amber-500 rounded-lg flex items-center justify-center border-2 border-white dark:border-neutral-900 shadow-sm">
                        <span className="text-[8px] font-bold text-white">
                          {c.price && c.price > 0 ? `₹${c.price}` : <DollarSign className="w-2.5 h-2.5" />}
                        </span>
                      </div>
                    )}
                  </div>
                  {c.isPremium && (
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg border border-amber-100 dark:border-amber-900/30">
                      Premium
                    </span>
                  )}
                </div>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-xs font-bold rounded-lg hover:bg-blue-600 dark:hover:bg-blue-600 hover:text-white dark:hover:text-white transition-all">
                  <Bell className="w-4 h-4" />
                  Remind Me
                </button>
              </div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-4">{c.title}</h3>
              <div className="space-y-2 text-sm text-neutral-500 dark:text-neutral-400">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {new Date(c.startTime).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {new Date(c.startTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          )) : (
            <div className="col-span-full bg-neutral-100 dark:bg-neutral-900 p-12 rounded-3xl text-center border-2 border-dashed border-neutral-200 dark:border-neutral-800">
              <p className="text-neutral-500 dark:text-neutral-400">No upcoming sessions scheduled yet.</p>
            </div>
          )}
        </div>
      </section>

      {/* Past */}
      {past.length > 0 && (
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Recorded Sessions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {past.map(c => (
              <button 
                key={c.id} 
                onClick={() => handleJoinLive(c)}
                className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-blue-300 dark:hover:border-blue-500 transition-all group text-left w-full"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="font-bold text-neutral-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">{c.title}</h3>
                  {c.isPremium && <Lock className="w-3 h-3 text-amber-500" />}
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Ended on {new Date(c.startTime).toLocaleDateString()}
                </p>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Premium Modal */}
      <AnimatePresence>
        {showPremiumModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowPremiumModal(false);
                setSelectedClass(null);
              }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl p-8 shadow-2xl text-center overflow-y-auto max-h-[90vh]"
            >
              <button 
                onClick={() => {
                  setShowPremiumModal(false);
                  setSelectedClass(null);
                }}
                className="absolute top-4 right-4 p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-neutral-500" />
              </button>
              <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldCheck className="w-10 h-10 text-amber-600" />
              </div>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
                {selectedClass?.price && selectedClass.price > 0 ? `Unlock this Live Class for ₹${selectedClass.price}` : 'Premium Content'}
              </h2>
              <p className="text-neutral-500 dark:text-neutral-400 mb-6">
                {selectedClass?.price && selectedClass.price > 0 
                  ? "This is a premium live session. You can unlock it individually or upgrade to the full plan for complete access."
                  : "This live session is exclusive to Premium members. Upgrade your account to get full access to all premium content."}
              </p>

              {selectedClass?.price && selectedClass.price > 0 && (
                <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/20">
                  <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-1">Individual Price</p>
                  <p className="text-3xl font-black text-amber-700 dark:text-amber-300">₹{selectedClass.price}</p>
                  <p className="text-[10px] text-amber-600/60 dark:text-amber-400/60 mt-1">Pay exactly this amount to unlock this live class</p>
                </div>
              )}
              
              <div className="space-y-4">
                {(!selectedClass?.price || selectedClass.price === 0) && (
                  <a 
                    href={monetization?.paymentLink || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full py-4 bg-amber-600 text-white rounded-2xl font-bold hover:bg-amber-700 transition-all shadow-lg shadow-amber-100 dark:shadow-none"
                  >
                    Upgrade Full Plan - ₹{monetization?.premiumPrice || '499'}
                  </a>
                )}

                {(selectedClass?.qrCodeUrl || (monetization?.bankDetails && (monetization.bankDetails.accountNumber || monetization.bankDetails.qrCodeUrl || monetization.bankDetails.upiId))) && (
                  <div className="p-6 bg-blue-50 dark:bg-blue-900/10 rounded-3xl border border-blue-100 dark:border-blue-900/20 text-left space-y-4">
                    <h3 className="text-sm font-bold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                      <School className="w-4 h-4" />
                      {selectedClass?.price && selectedClass.price > 0 ? 'Pay for this Live Class' : 'Direct Payment / QR Code'}
                    </h3>
                    
                    {monetization?.bankDetails?.upiId && (
                      <a 
                        href={`upi://pay?pa=${monetization.bankDetails.upiId}&pn=${encodeURIComponent(settings?.appName || 'App Payment')}&am=${selectedClass?.price && selectedClass.price > 0 ? selectedClass.price : monetization.premiumPrice || 0}&cu=INR&tn=${encodeURIComponent(selectedClass?.price && selectedClass.price > 0 ? `Payment for Live Class: ${selectedClass.title}` : 'Full Premium Plan Upgrade')}`}
                        className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md"
                      >
                        <QrCode className="w-5 h-5" />
                        Pay via UPI App (GPay/PhonePe)
                      </a>
                    )}
                    
                    {(selectedClass?.qrCodeUrl || monetization?.bankDetails?.qrCodeUrl) && (
                      <div className="flex flex-col items-center gap-3 p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-blue-100 dark:border-blue-900/20">
                        <img 
                          src={selectedClass?.qrCodeUrl || monetization?.bankDetails?.qrCodeUrl} 
                          alt="Payment QR" 
                          className="w-40 h-40 object-contain" 
                        />
                        <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">
                          Scan to pay ₹{selectedClass?.price || monetization?.premiumPrice}
                        </p>
                      </div>
                    )}

                    <div className="space-y-2 text-xs">
                      {monetization.bankDetails.bankName && (
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Bank:</span>
                          <span className="font-bold text-neutral-900 dark:text-white">{monetization.bankDetails.bankName}</span>
                        </div>
                      )}
                      {monetization.bankDetails.accountHolder && (
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Holder:</span>
                          <span className="font-bold text-neutral-900 dark:text-white">{monetization.bankDetails.accountHolder}</span>
                        </div>
                      )}
                      {monetization.bankDetails.accountNumber && (
                        <div className="flex justify-between items-center">
                          <span className="text-neutral-500">A/C No:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-neutral-900 dark:text-white font-mono">{monetization.bankDetails.accountNumber}</span>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(monetization.bankDetails.accountNumber);
                                toast.success('Account number copied!');
                              }}
                              className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
                            >
                              <Copy className="w-3 h-3 text-blue-600" />
                            </button>
                          </div>
                        </div>
                      )}
                      {monetization.bankDetails.ifscCode && (
                        <div className="flex justify-between items-center">
                          <span className="text-neutral-500">IFSC:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-neutral-900 dark:text-white font-mono">{monetization.bankDetails.ifscCode}</span>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(monetization.bankDetails.ifscCode);
                                toast.success('IFSC code copied!');
                              }}
                              className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
                            >
                              <Copy className="w-3 h-3 text-blue-600" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-blue-600/60 dark:text-blue-400/60 text-center italic">
                      * After payment, please send screenshot to our WhatsApp/Contact
                    </p>
                  </div>
                )}

                {selectedClass && (
                  <PaymentSubmission
                    contentId={selectedClass.id}
                    contentTitle={selectedClass.title}
                    contentType="liveClass"
                    amount={selectedClass.price || monetization.premiumPrice || 0}
                    onSuccess={() => setShowPremiumModal(false)}
                  />
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
