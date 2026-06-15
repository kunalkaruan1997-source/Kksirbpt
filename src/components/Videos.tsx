import { useEffect, useState, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Video } from '../types';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Filter, Play, X, Lock, DollarSign, ShieldCheck, Check, School, Copy, QrCode } from 'lucide-react';
import YouTube from 'react-youtube';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { useAppSettings } from '../hooks/useAppSettings';
import PaymentSubmission from './PaymentSubmission';

export default function Videos() {
  const { profile, isPremium, isContentUnlocked } = useAuth();
  const { settings, monetization } = useAppSettings();
  const [videos, setVideos] = useState<Video[]>([]);
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'videos'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const allVideos = snap.docs.map(d => ({ id: d.id, ...d.data() } as Video));
      if (profile?.role === 'admin') {
        setVideos(allVideos);
      } else {
        setVideos(allVideos.filter(v => !v.hidden));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'videos');
    });
    return () => unsub();
  }, [profile]);

  const classes = [...new Set(videos.map(v => v.class || 'Other'))].sort();
  
  const subjects = useMemo(() => {
    if (!selectedClass) return [];
    return [...new Set(videos.filter(v => (v.class || 'Other') === selectedClass).map(v => v.subject || 'General'))].sort();
  }, [videos, selectedClass]);

  const chapters = useMemo(() => {
    if (!selectedClass || !selectedSubject) return [];
    return [...new Set(videos.filter(v => (v.class || 'Other') === selectedClass && (v.subject || 'General') === selectedSubject).map(v => v.chapter || 'Intro'))].sort();
  }, [videos, selectedClass, selectedSubject]);

  const extractYoutubeId = (url: string) => {
    if (!url) return '';
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : url;
  };

  const handleVideoSelect = async (video: Video) => {
    if (video.isPremium && !isContentUnlocked(video.id)) {
      setSelectedVideo(video);
      setShowPremiumModal(true);
      return;
    }
    setSelectedVideo(video);
    if (profile) {
      const userRef = doc(db, 'users', profile.uid);
      try {
        await updateDoc(userRef, {
          watchedVideos: arrayUnion(video.id)
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${profile.uid}`);
      }
    }
  };

  const filteredVideos = videos.filter(v => {
    const matchesSearch = (v.title?.toLowerCase().includes(search.toLowerCase()) || false) || 
                         (v.description?.toLowerCase().includes(search.toLowerCase()) || false) ||
                         (v.youtubeId?.toLowerCase().includes(search.toLowerCase()) || false);
    const matchesClass = !selectedClass || (v.class || 'Other') === selectedClass;
    const matchesSubject = !selectedSubject || (v.subject || 'General') === selectedSubject;
    const matchesChapter = !selectedChapter || (v.chapter || 'Intro') === selectedChapter;
    return matchesSearch && matchesClass && matchesSubject && matchesChapter;
  });

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Learning Playlists</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">Class-wise, Subject-wise & Chapter-wise videos</p>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
          <input
            type="text"
            placeholder="Search videos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
          />
        </div>
      </header>

      {/* Playlist Navigation */}
      <div className="space-y-4">
        {/* Class Selection */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setSelectedClass(null); setSelectedSubject(null); setSelectedChapter(null); }}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-bold transition-all",
              !selectedClass ? "bg-blue-600 text-white shadow-lg" : "bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800"
            )}
          >
            All Classes
          </button>
          {classes.map(c => (
            <button
              key={c}
              onClick={() => { setSelectedClass(c); setSelectedSubject(null); setSelectedChapter(null); }}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-bold transition-all",
                selectedClass === c ? "bg-blue-600 text-white shadow-lg" : "bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800"
              )}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Subject Selection */}
        <AnimatePresence>
          {selectedClass && subjects.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-wrap gap-2 p-4 bg-neutral-50 dark:bg-neutral-950/50 rounded-2xl border border-neutral-200 dark:border-neutral-800"
            >
              <button
                onClick={() => { setSelectedSubject(null); setSelectedChapter(null); }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                  !selectedSubject ? "bg-blue-500 text-white" : "text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-800"
                )}
              >
                All Subjects
              </button>
              {subjects.map(s => (
                <button
                  key={s}
                  onClick={() => { setSelectedSubject(s); setSelectedChapter(null); }}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                    selectedSubject === s ? "bg-blue-500 text-white" : "text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-800"
                  )}
                >
                  {s}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chapter Selection */}
        <AnimatePresence>
          {selectedSubject && chapters.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-wrap gap-2 p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm"
            >
              <button
                onClick={() => setSelectedChapter(null)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                  !selectedChapter ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900" : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                )}
              >
                All Chapters
              </button>
              {chapters.map(ch => (
                <button
                  key={ch}
                  onClick={() => setSelectedChapter(ch)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                    selectedChapter === ch ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900" : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  )}
                >
                  {ch}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-8">
        {filteredVideos.map((video) => (
          <motion.div
            key={video.id}
            layoutId={video.id}
            whileHover={{ y: -3 }}
            onClick={() => handleVideoSelect(video)}
            className="flex flex-col cursor-pointer group"
          >
            {/* Thumbnail Box */}
            <div className="relative aspect-video rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-800 shadow-sm transition-shadow duration-300 group-hover:shadow-md">
              <img src={video.thumbnail} alt={video.chapter || video.title || 'Video Thumbnail'} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-550 ease-out" />
              
              {/* Hover Play Button Overlay */}
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="w-12 h-12 bg-white/95 dark:bg-neutral-900/95 rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-200">
                  {video.isPremium && !isContentUnlocked(video.id) ? (
                    <Lock className="w-5 h-5 text-amber-500 fill-amber-500/10" />
                  ) : (
                    <Play className="w-5 h-5 text-blue-600 fill-blue-600 ml-0.5" />
                  )}
                </div>
              </div>

              {/* Badges Overlay */}
              <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5 pointer-events-none">
                {video.isPremium && (
                  <span className="px-2 py-0.5 bg-amber-500 text-white text-[9px] font-black rounded-md uppercase tracking-wider flex items-center gap-1 shadow-md">
                    <Lock className="w-2.5 h-2.5" />
                    {video.price && video.price > 0 ? `₹${video.price}` : 'Premium'}
                  </span>
                )}
              </div>
            </div>

            {/* Title / Info Section - YouTube style */}
            <div className="mt-2 text-left">
              {/* Title */}
              <h3 className="font-bold text-neutral-900 dark:text-neutral-100 line-clamp-2 leading-snug text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {video.title || 'Untitled Video'}
              </h3>
              
              {/* Class, Subject, and Chapter info under title - Always visible YouTube metadata */}
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 font-semibold flex items-center flex-wrap gap-1.5">
                <span>{video.class || 'General'}</span>
                <span className="text-neutral-300 dark:text-neutral-700 font-normal">•</span>
                <span>{video.subject || 'Subject'}</span>
                <span className="text-neutral-300 dark:text-neutral-700 font-normal">•</span>
                <span className="truncate">Chapter: {video.chapter || 'Introduction'}</span>
              </p>
            </div>
          </motion.div>
        ))}
      </div>

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
                setSelectedVideo(null);
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
                  setSelectedVideo(null);
                }}
                className="absolute top-4 right-4 p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-neutral-500" />
              </button>
              <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldCheck className="w-10 h-10 text-amber-600" />
              </div>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
                {selectedVideo?.price && selectedVideo.price > 0 ? `Unlock this Video for ₹${selectedVideo.price}` : 'Premium Content'}
              </h2>
              <p className="text-neutral-500 dark:text-neutral-400 mb-6">
                {selectedVideo?.price && selectedVideo.price > 0 
                  ? "This is a premium video. You can unlock it individually or upgrade to the full plan for complete access."
                  : "This video is exclusive to Premium members. Upgrade your account to get full access to all premium content."}
              </p>

              {selectedVideo?.price && selectedVideo.price > 0 && (
                <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/20">
                  <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-1">Individual Price</p>
                  <p className="text-3xl font-black text-amber-700 dark:text-amber-300">₹{selectedVideo.price}</p>
                  <p className="text-[10px] text-amber-600/60 dark:text-amber-400/60 mt-1">Pay exactly this amount to unlock this video</p>
                </div>
              )}
              
              <div className="space-y-4">
                {(!selectedVideo?.price || selectedVideo.price === 0) && (
                  <a 
                    href={monetization?.paymentLink || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full py-4 bg-amber-600 text-white rounded-2xl font-bold hover:bg-amber-700 transition-all shadow-lg shadow-amber-100 dark:shadow-none"
                  >
                    Upgrade Full Plan - ₹{monetization?.premiumPrice || '499'}
                  </a>
                )}

                {(selectedVideo?.qrCodeUrl || (monetization?.bankDetails && (monetization.bankDetails.accountNumber || monetization.bankDetails.qrCodeUrl || monetization.bankDetails.upiId))) && (
                  <div className="p-6 bg-blue-50 dark:bg-blue-900/10 rounded-3xl border border-blue-100 dark:border-blue-900/20 text-left space-y-4">
                    <h3 className="text-sm font-bold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                      <School className="w-4 h-4" />
                      {selectedVideo?.price && selectedVideo.price > 0 ? 'Pay for this Video' : 'Direct Payment / QR Code'}
                    </h3>
                    
                    {monetization?.bankDetails?.upiId && (
                      <a 
                        href={`upi://pay?pa=${monetization.bankDetails.upiId}&pn=${encodeURIComponent(settings?.appName || 'App Payment')}&am=${selectedVideo?.price && selectedVideo.price > 0 ? selectedVideo.price : monetization.premiumPrice || 0}&cu=INR&tn=${encodeURIComponent(selectedVideo?.price && selectedVideo.price > 0 ? `Payment for Video: ${selectedVideo.title}` : 'Full Premium Plan Upgrade')}`}
                        className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md"
                      >
                        <QrCode className="w-5 h-5" />
                        Pay via UPI App (GPay/PhonePe)
                      </a>
                    )}
                    
                    {(selectedVideo?.qrCodeUrl || monetization?.bankDetails?.qrCodeUrl) && (
                      <div className="flex flex-col items-center gap-3 p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-blue-100 dark:border-blue-900/20">
                        <img 
                          src={selectedVideo?.qrCodeUrl || monetization?.bankDetails?.qrCodeUrl} 
                          alt="Payment QR" 
                          className="w-40 h-40 object-contain" 
                        />
                        <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">
                          Scan to pay ₹{selectedVideo?.price || monetization?.premiumPrice}
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
              </div>
              
              {monetization?.premiumBenefits && (
                <div className="mt-8 pt-8 border-t border-neutral-100 dark:border-neutral-800">
                  <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4">Premium Benefits</p>
                  <div className="grid grid-cols-2 gap-3">
                    {monetization.premiumBenefits.map((benefit, i) => (
                      <div key={i} className="flex items-center gap-2 text-[10px] text-neutral-600 dark:text-neutral-400 font-medium">
                        <Check className="w-3 h-3 text-green-500" />
                        {benefit}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedVideo && (
                <PaymentSubmission
                  contentId={selectedVideo.id}
                  contentTitle={selectedVideo.title || 'Premium Video'}
                  contentType="video"
                  amount={selectedVideo.price || monetization.premiumPrice || 0}
                  onSuccess={() => setShowPremiumModal(false)}
                />
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Video Player Modal */}
      <AnimatePresence>
        {selectedVideo && (!selectedVideo.isPremium || isContentUnlocked(selectedVideo.id)) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedVideo(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            />
            <motion.div
              layoutId={selectedVideo.id}
              className="relative w-full max-w-5xl bg-white dark:bg-neutral-900 rounded-3xl overflow-hidden shadow-2xl"
            >
              <button
                onClick={() => setSelectedVideo(null)}
                className="absolute top-4 right-4 z-10 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              
              <div className="aspect-video bg-black flex items-center justify-center">
                {selectedVideo.videoUrl ? (
                  <video 
                    src={selectedVideo.videoUrl} 
                    controls 
                    autoPlay 
                    className="w-full h-full"
                    controlsList="nodownload"
                    onContextMenu={(e) => e.preventDefault()}
                  />
                ) : (
                  <YouTube
                    videoId={extractYoutubeId(selectedVideo.youtubeId || '')}
                    className="w-full h-full"
                    opts={{
                      width: '100%',
                      height: '100%',
                      playerVars: { 
                        autoplay: 1,
                        rel: 0,
                        modestbranding: 1,
                        iv_load_policy: 3,
                        showinfo: 0,
                        ec: 0,
                        disablekb: 1
                      },
                    }}
                  />
                )}
              </div>
              
              <div className="p-6 sm:p-8 space-y-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    {selectedVideo.class && (
                      <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-full uppercase">
                        {selectedVideo.class}
                      </span>
                    )}
                    {selectedVideo.subject && (
                      <span className="px-3 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-xs font-bold rounded-full uppercase">
                        {selectedVideo.subject}
                      </span>
                    )}
                  </div>
                  <span className="px-3 py-1 bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-xs font-bold rounded-xl uppercase tracking-wider border border-neutral-100 dark:border-neutral-700">
                    Chapter: {selectedVideo.chapter || 'Introduction'}
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white uppercase tracking-tight leading-tight">
                  {selectedVideo.title || 'Untitled Video'}
                </h2>

                {selectedVideo.description && (
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed mt-2 bg-neutral-50 dark:bg-neutral-900/50 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                    {selectedVideo.description}
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
