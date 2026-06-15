import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot, where, documentId, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from '../lib/firebase';
import { Video, Note, LiveClass, UserProfile, MockTest } from '../types';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence } from 'motion/react';
import { Play, FileText, Radio, Clock, ChevronRight, User, Calendar, GraduationCap, School, Phone, Edit3, X, Check, MapPin, MessageSquare, ShieldCheck, DollarSign, Sparkles, Download, ClipboardList, Instagram, Send, Settings, Smartphone, Share2, Copy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { useAppSettings } from '../hooks/useAppSettings';
import { useMobileApp } from '../hooks/useMobileApp';
import PaymentSubmission from './PaymentSubmission';

import AppLogo from './AppLogo';

export default function Dashboard() {
  const { profile, isPremium, isAdmin } = useAuth();
  const { settings, monetization } = useAppSettings();
  const { canInstall, isStandalone, install } = useMobileApp();
  const [watchedVideos, setWatchedVideos] = useState<Video[]>([]);
  const [upcomingClasses, setUpcomingClasses] = useState<LiveClass[]>([]);
  const [savedNotes, setSavedNotes] = useState<Note[]>([]);
  const [latestTests, setLatestTests] = useState<MockTest[]>([]);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: '',
    dob: '',
    studentClass: '',
    school: '',
    contact: ''
  });
  const [saving, setSaving] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const APP_SHARE_URL = 'https://ais-pre-2levp3steimmebovvc2cuf-781183105407.asia-southeast1.run.app';

  const copyLink = () => {
    navigator.clipboard.writeText(APP_SHARE_URL);
    toast.success('Link copied to clipboard');
  };

  const downloadQRCode = () => {
    const svg = document.getElementById('app-qr-code');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Set high resolution (4x)
      canvas.width = 1000;
      canvas.height = 1000;
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `${settings?.appName || 'kksirbpt'}-qr-code.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
        toast.success('QR Code image saved');
      }
    };

    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    img.src = url;
  };

  useEffect(() => {
    if (profile) {
      setEditForm({
        fullName: profile.fullName || '',
        dob: profile.dob || '',
        studentClass: profile.studentClass || '',
        school: profile.school || '',
        contact: profile.contact || ''
      });
    }
  }, [profile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), editForm);
      setIsEditingProfile(false);
      toast.success('Profile updated successfully');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${profile.uid}`);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const unsubs: (() => void)[] = [];

    // Upcoming classes (global)
    const cQuery = query(collection(db, 'liveClasses'), where('status', '==', 'upcoming'), orderBy('startTime', 'asc'), limit(3));
    const unsubC = onSnapshot(cQuery, (snap) => {
      setUpcomingClasses(snap.docs.map(d => ({ id: d.id, ...d.data() } as LiveClass)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'liveClasses');
    });
    unsubs.push(unsubC);

    // User's watched videos
    if (profile?.watchedVideos?.length) {
      const vQuery = query(collection(db, 'videos'), where(documentId(), 'in', profile.watchedVideos.slice(-3)));
      const unsubV = onSnapshot(vQuery, (snap) => {
        setWatchedVideos(snap.docs.map(d => ({ id: d.id, ...d.data() } as Video)));
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'videos');
      });
      unsubs.push(unsubV);
    } else {
      setWatchedVideos([]);
    }

    // User's saved notes
    if (profile?.savedNotes?.length) {
      const nQuery = query(collection(db, 'notes'), where(documentId(), 'in', profile.savedNotes.slice(-3)));
      const unsubN = onSnapshot(nQuery, (snap) => {
        setSavedNotes(snap.docs.map(d => ({ id: d.id, ...d.data() } as Note)));
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'notes');
      });
      unsubs.push(unsubN);
    } else {
      setSavedNotes([]);
    }

    // Latest Mock Tests
    const tQuery = query(collection(db, 'mockTests'), orderBy('createdAt', 'desc'), limit(3));
    const unsubT = onSnapshot(tQuery, (snap) => {
      setLatestTests(snap.docs
        .map(d => ({ id: d.id, ...d.data() } as MockTest))
        .filter(t => !t.hidden)
      );
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'mockTests');
    });
    unsubs.push(unsubT);

    return () => unsubs.forEach(unsub => unsub());
  }, [profile]);

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      {/* Real Mobile Install Prompt */}
      <AnimatePresence>
        {canInstall && !isStandalone && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="mb-8"
          >
            <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-800 rounded-[2.5rem] p-8 text-white relative overflow-hidden ring-4 ring-white/10 shadow-2xl">
              <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none">
                <Smartphone className="w-40 h-40 -rotate-12" />
              </div>
              
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center border border-white/30 shadow-inner overflow-hidden">
                  <AppLogo size={60} />
                </div>
                
                <div className="text-center md:text-left flex-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-[10px] uppercase font-black tracking-widest mb-3 border border-white/10">
                    <Sparkles className="w-3 h-3" />
                    Premium Experience
                  </div>
                  <h3 className="text-3xl font-black italic uppercase tracking-tighter leading-none mb-2">Install {settings?.appName || 'Official App'}</h3>
                  <p className="text-blue-100 font-medium text-sm max-w-sm">Get instant access from your home screen with offline features & faster speeds.</p>
                </div>

                <button 
                  onClick={install}
                  className="w-full md:w-auto px-12 py-5 bg-white text-blue-700 rounded-3xl font-black uppercase tracking-tighter text-sm hover:bg-neutral-50 active:scale-95 transition-all shadow-xl flex items-center justify-center gap-3 group"
                >
                  <Smartphone className="w-5 h-5 transition-transform group-hover:-translate-y-1" />
                  Install Now
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Profile Section */}
      <section className="relative">
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800 overflow-hidden shadow-sm">
          {/* Cover/Accent */}
          <div className="h-24 bg-blue-600 relative overflow-hidden">
            <div className="absolute inset-0 bg-blue-700 opacity-20" />
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white dark:from-neutral-900 to-transparent" />
          </div>
          
          <div className="px-5 pb-5 -mt-10 relative">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                <div className="relative group">
                  <img 
                    src={profile?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName}`} 
                    alt="Profile" 
                    className="w-20 h-20 rounded-xl object-cover border-4 border-white dark:border-neutral-900 shadow-md"
                  />
                  {isPremium && (
                    <div className="absolute -top-2 -right-2 w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center text-white border-2 border-white dark:border-neutral-900 shadow-sm">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>

                <div className="space-y-0.5 mb-1">
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-bold text-neutral-900 dark:text-white">
                      {profile?.displayName || 'Student Name'}
                    </h1>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-blue-600 dark:text-blue-400 font-bold text-[9px] uppercase tracking-wider">
                      {profile?.role || 'STUDENT'}
                    </p>
                    {profile?.studentId && (
                      <span className="text-neutral-400 font-bold text-[8px] uppercase tracking-widest bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                        ID: {profile.studentId}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {isAdmin && (
                  <Link 
                    to="/admin"
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center justify-center hover:bg-blue-700 transition-all shadow-sm"
                  >
                    Admin Panel
                  </Link>
                )}
                <button 
                  onClick={() => setIsEditingProfile(true)}
                  className="px-3 py-1.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg text-xs font-bold flex items-center justify-center hover:opacity-90 transition-all shadow-sm"
                >
                  Edit Profile
                </button>
                <button 
                  onClick={() => setShowShareModal(true)}
                  className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold flex items-center justify-center hover:bg-blue-100 transition-all border border-blue-100"
                >
                  <Share2 className="w-3.5 h-3.5 mr-1.5" />
                  Share App
                </button>
                <button 
                  onClick={() => {
                    auth.signOut();
                    window.location.href = '/auth';
                  }}
                  className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold flex items-center justify-center hover:bg-red-100 transition-all border border-red-100"
                >
                  Logout
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
              <div className="bg-neutral-50 dark:bg-neutral-950 p-3 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-0.5">Class</p>
                <p className="text-xs font-bold text-neutral-900 dark:text-white">{profile?.studentClass || 'Not Set'}</p>
              </div>
              <div className="bg-neutral-50 dark:bg-neutral-950 p-3 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-0.5">School</p>
                <p className="text-xs font-bold text-neutral-900 dark:text-white line-clamp-1">{profile?.school || 'Not Set'}</p>
              </div>
              <div className="bg-neutral-50 dark:bg-neutral-950 p-3 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-0.5">D.O.B</p>
                <p className="text-xs font-bold text-neutral-900 dark:text-white">{profile?.dob || 'Not Set'}</p>
              </div>
              <div className="bg-neutral-50 dark:bg-neutral-950 p-3 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-0.5">Status</p>
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${isPremium ? 'bg-amber-500' : 'bg-neutral-400 animate-pulse'}`} />
                  <p className="text-xs font-bold text-neutral-900 dark:text-white">{isPremium ? 'Premium' : 'Free'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-8">
        {/* Premium Banner */}
        {!isPremium && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl p-6 text-white relative overflow-hidden shadow-lg shadow-amber-200 dark:shadow-none"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-3 text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-white/20 rounded-full backdrop-blur-md text-[10px] font-bold uppercase tracking-widest">
                  <Sparkles className="w-3 h-3" />
                  Limited Offer
                </div>
                <h2 className="text-xl font-bold">Unlock Premium Access</h2>
                <p className="text-amber-50 text-sm max-w-md">
                   Full access to videos, notes, mock tests, and ad-free experience.
                </p>
                <div className="flex flex-wrap justify-center md:justify-start gap-3">
                  {monetization?.premiumBenefits?.slice(0, 3).map((benefit, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[10px] font-bold bg-black/10 px-2.5 py-1 rounded-lg">
                      <Check className="w-2.5 h-2.5" />
                      {benefit}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-center gap-4 bg-white/10 p-5 rounded-2xl backdrop-blur-md border border-white/20 min-w-[220px]">
                <div className="text-center">
                  <p className="text-[10px] font-bold text-amber-100 uppercase tracking-widest mb-1">Premium Plan</p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl font-black">₹{monetization?.premiumPrice || '499'}</span>
                    <span className="text-xs font-medium text-amber-100">/ lifetime</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 w-full">
                  <button 
                    onClick={() => setShowPaymentModal(true)}
                    className="w-full py-2.5 bg-white text-amber-600 rounded-xl font-bold text-sm hover:bg-amber-50 transition-all shadow flex items-center justify-center gap-2"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    Get Premium Now
                  </button>
                  
                  {monetization?.bankDetails?.upiId && (
                    <a 
                      href={`upi://pay?pa=${monetization.bankDetails.upiId}&pn=${encodeURIComponent(settings?.appName || 'App Payment')}&am=${monetization.premiumPrice || 0}&cu=INR&tn=${encodeURIComponent('Full Premium Plan Upgrade')}`}
                      className="flex items-center justify-center gap-2 w-full py-2.5 bg-amber-100/20 text-white border border-white/30 rounded-xl text-xs font-bold hover:bg-white/10 transition-all"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Pay via UPI App
                    </a>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Admin Quick Control Panel */}
        {isAdmin && (
          <section className="space-y-2">
            <h2 className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-[0.2em] ml-1">
              Admin Console
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Link 
                to="/admin" 
                className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/10 flex items-center justify-between group overflow-hidden relative"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-500" />
                <div className="relative z-10">
                  <p className="text-[8px] font-black uppercase tracking-[0.2em] opacity-80 mb-0.5">Management</p>
                  <h3 className="text-base font-black italic">Full Control</h3>
                </div>
                <div className="relative z-10 w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-md">
                  <Settings className="w-4 h-4" />
                </div>
              </Link>

              <div className="grid grid-cols-2 gap-3">
                <Link 
                  to="/admin?tab=video" 
                  className="bg-white dark:bg-neutral-900 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800 hover:border-blue-500 transition-all text-center"
                >
                  <p className="text-[8px] font-black uppercase tracking-widest text-neutral-400 mb-1">Upload</p>
                  <p className="text-xs font-bold text-neutral-900 dark:text-white">Videos</p>
                </Link>
                <Link 
                  to="/admin?tab=students" 
                  className="bg-white dark:bg-neutral-900 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800 hover:border-blue-500 transition-all text-center"
                >
                  <p className="text-[8px] font-black uppercase tracking-widest text-neutral-400 mb-1">Manage</p>
                  <p className="text-xs font-bold text-neutral-900 dark:text-white">Users</p>
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Upcoming Classes */}
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-[0.2em]">
              Upcoming Live
            </h2>
            <Link to="/live" className="text-blue-600 dark:text-blue-400 text-[9px] font-bold uppercase tracking-wider hover:underline flex items-center gap-1">
              View all
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {upcomingClasses.length > 0 ? upcomingClasses.map((c) => (
              <motion.div 
                key={c.id}
                whileHover={{ y: -2 }}
                className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-100 dark:border-neutral-800 shadow-sm"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <Radio className="w-4 h-4 text-red-600" />
                  </div>
                  <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 text-[8px] font-black rounded uppercase tracking-wider">
                    Upcoming
                  </span>
                </div>
                <h3 className="text-xs font-bold text-neutral-900 dark:text-white mb-1 line-clamp-1">{c.title}</h3>
                <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 dark:text-neutral-400">
                  <Clock className="w-3 h-3" />
                  {new Date(c.startTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </div>
                <Link 
                  to="/live"
                  className="mt-3 w-full py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-bold hover:bg-blue-700 transition-colors block text-center"
                >
                  Join Class
                </Link>
              </motion.div>
            )) : (
              <div className="col-span-full bg-white dark:bg-neutral-900 p-12 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-800 text-center">
                <p className="text-neutral-500 dark:text-neutral-400">No upcoming classes scheduled.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recently Watched Videos */}
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-[0.2em]">
              Recent Videos
            </h2>
            <Link to="/videos" className="text-blue-600 dark:text-blue-400 text-[9px] font-bold uppercase tracking-wider hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {watchedVideos.length > 0 ? watchedVideos.map((v) => (
              <Link 
                key={v.id} 
                to="/videos"
                className="flex items-center gap-2.5 bg-white dark:bg-neutral-900 p-2 rounded-xl border border-neutral-100 dark:border-neutral-800 hover:border-blue-300 dark:hover:border-blue-500 transition-all group shadow-sm"
              >
                <div className="relative w-16 h-10 rounded-md overflow-hidden flex-shrink-0">
                  <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-3 h-3 text-white fill-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-bold text-neutral-900 dark:text-white truncate">{v.title}</h3>
                  <p className="text-[9px] text-neutral-400 mt-0.5">{v.category}</p>
                </div>
              </Link>
            )) : (
              <div className="bg-white dark:bg-neutral-900 p-8 rounded-xl border border-neutral-200 dark:border-neutral-800 text-center">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">No videos watched yet.</p>
              </div>
            )}
          </div>
        </section>

        {/* Saved Notes */}
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-[0.2em]">
              Saved Notes
            </h2>
            <Link to="/notes" className="text-blue-600 dark:text-blue-400 text-[9px] font-bold uppercase tracking-wider hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {savedNotes.length > 0 ? savedNotes.map((n) => (
              <Link 
                key={n.id} 
                to="/notes"
                className="flex items-center gap-2.5 bg-white dark:bg-neutral-900 p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800 hover:border-green-300 dark:hover:border-green-500 transition-all shadow-sm"
              >
                <div className="p-1.5 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <FileText className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-bold text-neutral-900 dark:text-white truncate">{n.title}</h3>
                  <p className="text-[9px] text-neutral-400 mt-0.5">{n.subject} • {n.chapter}</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-neutral-300 dark:text-neutral-600" />
              </Link>
            )) : (
              <div className="bg-white dark:bg-neutral-900 p-8 rounded-xl border border-neutral-200 dark:border-neutral-800 text-center">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">No notes saved yet.</p>
              </div>
            )}
          </div>
        </section>

        {/* Latest Mock Tests */}
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-[0.2em]">
              Mock Tests
            </h2>
            <Link to="/mock-tests" className="text-blue-600 dark:text-blue-400 text-[9px] font-bold uppercase tracking-wider hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {latestTests.length > 0 ? latestTests.map((t) => (
              <Link 
                key={t.id} 
                to="/mock-tests"
                className="flex items-center gap-2.5 bg-white dark:bg-neutral-900 p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800 hover:border-amber-300 dark:hover:border-amber-500 transition-all shadow-sm"
              >
                <div className="p-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <ClipboardList className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-bold text-neutral-900 dark:text-white truncate">{t.title}</h3>
                  <p className="text-[9px] text-neutral-400 mt-0.5">{t.questions?.length || 0} Questions</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-neutral-300 dark:text-neutral-600" />
              </Link>
            )) : (
              <div className="bg-white dark:bg-neutral-900 p-8 rounded-xl border border-neutral-200 dark:border-neutral-800 text-center">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">No mock tests available.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Edit Profile Modal remains here */}
      <AnimatePresence>
        {isEditingProfile && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditingProfile(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-[2.5rem] p-8 shadow-2xl border border-neutral-200 dark:border-neutral-800"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Edit Profile</h2>
                <button 
                  onClick={() => setIsEditingProfile(false)}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-neutral-500" />
                </button>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2 ml-1">Full Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={editForm.fullName}
                      onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                      className="w-full px-4 py-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2 ml-1">Date of Birth <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      required
                      value={editForm.dob}
                      onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
                      className="w-full px-4 py-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2 ml-1">Class <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        value={editForm.studentClass}
                        onChange={(e) => setEditForm({ ...editForm, studentClass: e.target.value })}
                        className="w-full px-4 py-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        placeholder="e.g. 10th"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2 ml-1">Contact</label>
                      <input
                        type="text"
                        value={editForm.contact}
                        onChange={(e) => setEditForm({ ...editForm, contact: e.target.value })}
                        className="w-full px-4 py-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        placeholder="Phone number"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2 ml-1">School <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={editForm.school}
                      onChange={(e) => setEditForm({ ...editForm, school: e.target.value })}
                      className="w-full px-4 py-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      placeholder="School name"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20"
                >
                  {saving ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Save Profile
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Share App Modal */}
      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowShareModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white dark:bg-neutral-900 rounded-[2.5rem] p-8 shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black italic uppercase tracking-tighter text-neutral-900 dark:text-white">Share App</h2>
                <button 
                  onClick={() => setShowShareModal(false)}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-neutral-500" />
                </button>
              </div>

              <div className="flex flex-col items-center gap-6">
                <div className="p-4 bg-white rounded-2xl shadow-inner border border-neutral-100 relative group">
                  <QRCodeSVG 
                    id="app-qr-code"
                    value={APP_SHARE_URL} 
                    size={200}
                    level="H"
                    includeMargin={true}
                  />
                  <button 
                    onClick={downloadQRCode}
                    className="absolute -bottom-3 right-0 bg-neutral-900 dark:bg-blue-600 text-white px-3 py-2 rounded-xl shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                    title="Download QR Image"
                  >
                    <Download className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-tighter">Save Image</span>
                  </button>
                </div>

                <div className="w-full space-y-4 pt-2">
                  <div className="p-4 bg-neutral-50 dark:bg-neutral-950 rounded-2xl border border-neutral-100 dark:border-neutral-800 relative group overflow-hidden">
                    <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-1">Direct Access Link</p>
                    <p className="text-xs font-bold text-blue-600 truncate mb-1">kksirbpt</p>
                    <p className="text-[10px] text-neutral-400 truncate opacity-60">{APP_SHARE_URL}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={copyLink}
                      className="flex flex-col items-center gap-2 p-4 bg-blue-600 text-white rounded-2xl font-bold text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                    >
                      <Copy className="w-5 h-5 mb-1" />
                      Copy Link
                    </button>
                    <button 
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({
                            title: settings?.appName || 'Study App',
                            text: 'Join me on ' + (settings?.appName || 'our learning app') + '!',
                            url: APP_SHARE_URL
                          });
                        } else {
                          copyLink();
                        }
                      }}
                      className="flex flex-col items-center gap-2 p-4 bg-neutral-900 dark:bg-white dark:text-neutral-900 text-white rounded-2xl font-bold text-xs hover:opacity-90 transition-all"
                    >
                      <Share2 className="w-5 h-5 mb-1" />
                      Share
                    </button>
                  </div>
                </div>

                <p className="text-[10px] text-neutral-400 text-center leading-relaxed">
                  Scan this QR code to open the app instantly on any mobile device. 
                  No downloads required - works directly in the browser!
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Payment Modal */}
      <AnimatePresence>
        {showPaymentModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPaymentModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-[2.5rem] p-8 shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Upgrade to Premium</h2>
                    <p className="text-xs text-neutral-500">Choose your preferred payment method</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowPaymentModal(false)}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-neutral-500" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Price Display */}
                <div className="bg-amber-50 dark:bg-amber-900/10 p-6 rounded-3xl border border-amber-100 dark:border-amber-900/20 text-center">
                  <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-1">Lifetime Access</p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-black text-neutral-900 dark:text-white">₹{monetization?.premiumPrice || '499'}</span>
                    <span className="text-sm font-medium text-neutral-500">/ once</span>
                  </div>
                </div>

                {/* Automated Payment */}
                {monetization?.paymentLink && monetization.paymentLink !== '#' && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">Instant Activation</h3>
                    <a 
                      href={monetization.paymentLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-center hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                    >
                      <DollarSign className="w-5 h-5" />
                      Pay via Razorpay/Stripe
                    </a>
                  </div>
                )}

                {/* Manual Payment Section */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">Manual Payment (Bank/UPI)</h3>
                  
                  {monetization?.bankDetails?.upiId && (
                    <a 
                      href={`upi://pay?pa=${monetization.bankDetails.upiId}&pn=${encodeURIComponent(settings?.appName || 'App Payment')}&am=${monetization.premiumPrice || 0}&cu=INR&tn=${encodeURIComponent('Full Premium Plan Upgrade')}`}
                      className="flex items-center justify-center gap-3 w-full py-4 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-2xl font-bold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all"
                    >
                      <ShieldCheck className="w-5 h-5 text-blue-600" />
                      Pay via UPI App
                    </a>
                  )}

                  {monetization?.bankDetails?.qrCodeUrl && (
                    <div className="p-6 bg-white dark:bg-neutral-950 rounded-3xl border border-neutral-200 dark:border-neutral-800 flex flex-col items-center gap-4">
                      <p className="text-xs font-bold text-neutral-500 uppercase">Scan QR Code</p>
                      <img src={monetization.bankDetails.qrCodeUrl} alt="Payment QR" className="w-48 h-48 object-contain rounded-xl" />
                      <p className="text-[10px] text-neutral-400 text-center">Scan this QR using any UPI app (GPay, PhonePe, Paytm)</p>
                    </div>
                  )}

                  {monetization?.bankDetails?.bankName && (
                    <div className="p-6 bg-neutral-50 dark:bg-neutral-950/50 rounded-3xl border border-neutral-200 dark:border-neutral-800 space-y-3">
                      <p className="text-xs font-bold text-neutral-500 uppercase">Bank Transfer Details</p>
                      <div className="grid grid-cols-2 gap-y-3 text-sm">
                        <span className="text-neutral-500">Bank Name:</span>
                        <span className="font-bold text-neutral-900 dark:text-white text-right">{monetization.bankDetails.bankName}</span>
                        
                        <span className="text-neutral-500">Account Holder:</span>
                        <span className="font-bold text-neutral-900 dark:text-white text-right">{monetization.bankDetails.accountHolder}</span>
                        
                        <span className="text-neutral-500">Account No:</span>
                        <span className="font-bold text-neutral-900 dark:text-white text-right">{monetization.bankDetails.accountNumber}</span>
                        
                        <span className="text-neutral-500">IFSC Code:</span>
                        <span className="font-bold text-neutral-900 dark:text-white text-right">{monetization.bankDetails.ifscCode}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/20">
                  <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium text-center">
                    After successful payment, please send the screenshot to our support team via WhatsApp or Chat for manual activation.
                  </p>
                </div>

                <PaymentSubmission
                  contentId="full_premium_subscription"
                  contentTitle="Full Premium Plan"
                  contentType="subscription"
                  amount={monetization?.premiumPrice || 0}
                  onSuccess={() => setShowPaymentModal(false)}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
