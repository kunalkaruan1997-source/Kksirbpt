import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot, where, documentId, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Video, Note, LiveClass, UserProfile } from '../types';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence } from 'motion/react';
import { Play, FileText, Radio, Clock, ChevronRight, User, Calendar, GraduationCap, School, Phone, Edit3, X, Check, MapPin, MessageSquare, ShieldCheck, DollarSign, Sparkles, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useAppSettings } from '../hooks/useAppSettings';
import PaymentSubmission from './PaymentSubmission';

export default function Dashboard() {
  const { profile, isPremium } = useAuth();
  const { settings, monetization } = useAppSettings();
  const [watchedVideos, setWatchedVideos] = useState<Video[]>([]);
  const [upcomingClasses, setUpcomingClasses] = useState<LiveClass[]>([]);
  const [savedNotes, setSavedNotes] = useState<Note[]>([]);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    fullName: '',
    dob: '',
    studentClass: '',
    school: '',
    contact: ''
  });
  const [saving, setSaving] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    const handlePromptAvailable = () => {
      setDeferredPrompt((window as any).deferredPrompt);
    };

    window.addEventListener('pwa-prompt-available', handlePromptAvailable);
    
    if ((window as any).deferredPrompt) {
      setDeferredPrompt((window as any).deferredPrompt);
    }

    return () => {
      window.removeEventListener('pwa-prompt-available', handlePromptAvailable);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
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

    return () => unsubs.forEach(unsub => unsub());
  }, [profile]);

  return (
    <div className="space-y-8">
      {/* Unified Header & Profile Section */}
      <header className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-8 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-bl-full -mr-16 -mt-16 transition-all group-hover:scale-110" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative">
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center flex-1">
            <div className="relative flex-shrink-0">
              <img 
                src={profile?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName}`} 
                alt="Profile" 
                className="w-20 h-20 rounded-2xl object-cover border-4 border-neutral-50 dark:border-neutral-800 shadow-lg"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Welcome, {profile?.displayName}!</h1>
                {isPremium && (
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-full border border-amber-200 dark:border-amber-900/50">
                    <ShieldCheck className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Premium</span>
                  </div>
                )}
              </div>
              <p className="text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-widest">{profile?.role}</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 mt-4">
                <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">{profile?.dob || 'DOB not set'}</span>
                </div>
                <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">{profile?.studentClass || 'Class not set'}</span>
                </div>
                <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
                  <School className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">{profile?.school || 'School not set'}</span>
                </div>
                <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
                  <Phone className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">{profile?.contact || 'Contact not set'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link 
              to="/chat"
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl font-bold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all"
            >
              <MessageSquare className="w-4 h-4 text-blue-600" />
              Group Chat
            </Link>
            <button 
              onClick={() => setIsEditingProfile(true)}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all"
            >
              <Edit3 className="w-4 h-4" />
              Edit Profile
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-8">
        {/* Premium Banner */}
        {!isPremium && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-amber-200 dark:shadow-none"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="space-y-4 text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full backdrop-blur-md text-xs font-bold uppercase tracking-widest">
                  <Sparkles className="w-3 h-3" />
                  Limited Offer
                </div>
                <h2 className="text-3xl font-bold">Unlock Premium Access</h2>
                <p className="text-amber-50 max-w-md">
                  Get full access to all premium videos, notes, mock tests, and ad-free experience. Join thousands of students today!
                </p>
                <div className="flex flex-wrap justify-center md:justify-start gap-4">
                  {monetization?.premiumBenefits?.slice(0, 3).map((benefit, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs font-medium bg-black/10 px-3 py-1.5 rounded-xl">
                      <Check className="w-3 h-3" />
                      {benefit}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-center gap-4 bg-white/10 p-6 rounded-3xl backdrop-blur-md border border-white/20 min-w-[240px]">
                <div className="text-center">
                  <p className="text-xs font-bold text-amber-100 uppercase tracking-widest mb-1">Premium Plan</p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-black">₹{monetization?.premiumPrice || '499'}</span>
                    <span className="text-sm font-medium text-amber-100">/ lifetime</span>
                  </div>
                </div>
                <div className="flex flex-col gap-3 w-full">
                  <button 
                    onClick={() => setShowPaymentModal(true)}
                    className="w-full py-3 bg-white text-amber-600 rounded-xl font-bold text-center hover:bg-amber-50 transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <DollarSign className="w-4 h-4" />
                    Get Premium Now
                  </button>
                  
                  {monetization?.bankDetails?.upiId && (
                    <a 
                      href={`upi://pay?pa=${monetization.bankDetails.upiId}&pn=${encodeURIComponent(settings?.appName || 'App Payment')}&am=${monetization.premiumPrice || 0}&cu=INR&tn=${encodeURIComponent('Full Premium Plan Upgrade')}`}
                      className="flex items-center justify-center gap-2 w-full py-3 bg-amber-100/20 text-white border border-white/30 rounded-xl font-bold hover:bg-white/10 transition-all"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      Pay via UPI App
                    </a>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Upcoming Classes */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-red-600" />
              Upcoming Live Classes
            </h2>
            <Link to="/live" className="text-blue-600 dark:text-blue-400 text-sm font-semibold hover:underline flex items-center gap-1">
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingClasses.length > 0 ? upcomingClasses.map((c) => (
              <motion.div 
                key={c.id}
                whileHover={{ y: -4 }}
                className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
                    <Radio className="w-6 h-6 text-red-600" />
                  </div>
                  <span className="px-3 py-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 text-xs font-bold rounded-full uppercase">
                    Upcoming
                  </span>
                </div>
                <h3 className="font-bold text-neutral-900 dark:text-white mb-2 line-clamp-1">{c.title}</h3>
                <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
                  <Clock className="w-4 h-4" />
                  {new Date(c.startTime).toLocaleString()}
                </div>
                <Link 
                  to="/live"
                  className="mt-4 w-full py-2 bg-neutral-900 dark:bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-neutral-800 dark:hover:bg-blue-700 transition-colors block text-center"
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
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Play className="w-5 h-5 text-blue-600" />
              Recently Watched
            </h2>
            <Link to="/videos" className="text-blue-600 dark:text-blue-400 text-sm font-semibold hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {watchedVideos.length > 0 ? watchedVideos.map((v) => (
              <Link 
                key={v.id} 
                to="/videos"
                className="flex items-center gap-4 bg-white dark:bg-neutral-900 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-blue-300 dark:hover:border-blue-500 transition-all group"
              >
                <div className="relative w-24 h-16 rounded-lg overflow-hidden flex-shrink-0">
                  <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-6 h-6 text-white fill-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-neutral-900 dark:text-white truncate">{v.title}</h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{v.category}</p>
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
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-600" />
              Saved Notes
            </h2>
            <Link to="/notes" className="text-blue-600 dark:text-blue-400 text-sm font-semibold hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {savedNotes.length > 0 ? savedNotes.map((n) => (
              <Link 
                key={n.id} 
                to="/notes"
                className="flex items-center gap-4 bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-green-300 dark:hover:border-green-500 transition-all"
              >
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                  <FileText className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-neutral-900 dark:text-white truncate">{n.title}</h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{n.subject} • {n.chapter}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-neutral-300 dark:text-neutral-600" />
              </Link>
            )) : (
              <div className="bg-white dark:bg-neutral-900 p-8 rounded-xl border border-neutral-200 dark:border-neutral-800 text-center">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">No notes saved yet.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Edit Profile Modal */}
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
