import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Note } from '../types';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence } from 'motion/react';
import { Search, FileText, Download, Bookmark, X, ChevronRight, Lock, DollarSign, ShieldCheck, Check, School, Copy, QrCode, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { useAppSettings } from '../hooks/useAppSettings';
import PaymentSubmission from './PaymentSubmission';

export default function Notes() {
  const { profile, isPremium, isContentUnlocked } = useAuth();
  const { settings, monetization } = useAppSettings();
  const [notes, setNotes] = useState<Note[]>([]);
  const [search, setSearch] = useState('');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'notes'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const allNotes = snap.docs.map(d => ({ id: d.id, ...d.data() } as Note));
      if (profile?.role === 'admin') {
        setNotes(allNotes);
      } else {
        setNotes(allNotes.filter(n => !n.hidden));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'notes');
    });
    return () => unsub();
  }, [profile]);

  const toggleBookmark = async (noteId: string) => {
    if (!profile) return;
    const userRef = doc(db, 'users', profile.uid);
    const isBookmarked = profile.savedNotes?.includes(noteId);
    
    try {
      await updateDoc(userRef, {
        savedNotes: isBookmarked ? arrayRemove(noteId) : arrayUnion(noteId)
      });
      toast.success(isBookmarked ? 'Removed from bookmarks' : 'Added to bookmarks');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${profile.uid}`);
      toast.error('Failed to update bookmarks');
    }
  };

  const handleNoteSelect = (note: Note) => {
    if (note.isPremium && !isContentUnlocked(note.id)) {
      setSelectedNote(note);
      setShowPremiumModal(true);
      return;
    }
    setSelectedNote(note);
  };

  const handleDownloadPdf = (pdfUrl: string, title: string) => {
    try {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `${title}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      toast.error('Failed to download PDF');
      console.error(err);
    }
  };

  const handleOpenPdf = (pdfUrl: string) => {
    try {
      if (pdfUrl.startsWith('data:application/pdf;base64,')) {
        const base64Data = pdfUrl.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      } else {
        window.open(pdfUrl, '_blank');
      }
    } catch (err) {
      toast.error('Failed to open PDF');
      console.error(err);
    }
  };

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(search.toLowerCase()) || 
    n.subject.toLowerCase().includes(search.toLowerCase()) ||
    n.chapter.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Study Materials</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">Access notes, PDFs, and chapter-wise materials</p>
        </div>
        
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
          <input
            type="text"
            placeholder="Search notes, subjects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 w-full"
          />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredNotes.map((note) => (
          <motion.div
            key={note.id}
            whileHover={{ y: -4 }}
            className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl relative">
                <FileText className="w-6 h-6 text-blue-600" />
                {note.isPremium && (
                  <div className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-amber-500 rounded-lg flex items-center justify-center border-2 border-white dark:border-neutral-900 shadow-sm">
                    <span className="text-[8px] font-bold text-white">
                      {note.price && note.price > 0 ? `₹${note.price}` : <DollarSign className="w-2.5 h-2.5" />}
                    </span>
                  </div>
                )}
              </div>
              <button 
                onClick={() => toggleBookmark(note.id)}
                className={cn(
                  "p-2 rounded-lg transition-all",
                  profile?.savedNotes?.includes(note.id)
                    ? "text-blue-600 bg-blue-50 dark:bg-blue-900/40"
                    : "text-neutral-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/40"
                )}
              >
                <Bookmark className={cn("w-5 h-5", profile?.savedNotes?.includes(note.id) && "fill-blue-600")} />
              </button>
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-[10px] font-bold rounded uppercase tracking-wider">
                  {note.subject}
                </span>
                <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] font-bold rounded uppercase tracking-wider">
                  {note.chapter}
                </span>
              </div>
              <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">{note.title}</h3>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm line-clamp-3 mb-6">
                {note.content.substring(0, 150)}...
              </p>
            </div>

            <div className="flex gap-3 mt-auto pt-4 border-t border-neutral-100 dark:border-neutral-800">
              <button 
                onClick={() => handleNoteSelect(note)}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2",
                  note.isPremium && !isPremium 
                    ? "bg-amber-600 text-white hover:bg-amber-700" 
                    : "bg-blue-600 text-white hover:bg-blue-700"
                )}
              >
                {note.isPremium && !isPremium ? (
                  <>
                    <Lock className="w-4 h-4" />
                    Unlock Premium
                  </>
                ) : (
                  <>
                    Read Notes
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
              {note.pdfUrl && (
                <button 
                  onClick={() => {
                    setSelectedNote(note);
                    if (note.isPremium && !isPremium) {
                      setShowPremiumModal(true);
                    } else {
                      window.open(note.pdfUrl, '_blank');
                    }
                  }}
                  className="p-2.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                  title="Download PDF"
                >
                  <Download className="w-5 h-5" />
                </button>
              )}
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
                setSelectedNote(null);
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
                  setSelectedNote(null);
                }}
                className="absolute top-4 right-4 p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-neutral-500" />
              </button>
              <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldCheck className="w-10 h-10 text-amber-600" />
              </div>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
                {selectedNote?.price && selectedNote.price > 0 ? `Unlock this Note for ₹${selectedNote.price}` : 'Premium Content'}
              </h2>
              <p className="text-neutral-500 dark:text-neutral-400 mb-6">
                {selectedNote?.price && selectedNote.price > 0 
                  ? "This is a premium study material. You can unlock it individually or upgrade to the full plan for complete access."
                  : "This study material is exclusive to Premium members. Upgrade your account to get full access to all premium content."}
              </p>

              {selectedNote?.price && selectedNote.price > 0 && (
                <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/20">
                  <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-1">Individual Price</p>
                  <p className="text-3xl font-black text-amber-700 dark:text-amber-300">₹{selectedNote.price}</p>
                  <p className="text-[10px] text-amber-600/60 dark:text-amber-400/60 mt-1">Pay exactly this amount to unlock this note</p>
                </div>
              )}
              
              <div className="space-y-4">
                {(!selectedNote?.price || selectedNote.price === 0) && (
                  <a 
                    href={monetization?.paymentLink || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full py-4 bg-amber-600 text-white rounded-2xl font-bold hover:bg-amber-700 transition-all shadow-lg shadow-amber-100 dark:shadow-none"
                  >
                    Upgrade Full Plan - ₹{monetization?.premiumPrice || '499'}
                  </a>
                )}

                {(selectedNote?.qrCodeUrl || (monetization?.bankDetails && (monetization.bankDetails.accountNumber || monetization.bankDetails.qrCodeUrl || monetization.bankDetails.upiId))) && (
                  <div className="p-6 bg-blue-50 dark:bg-blue-900/10 rounded-3xl border border-blue-100 dark:border-blue-900/20 text-left space-y-4">
                    <h3 className="text-sm font-bold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                      <School className="w-4 h-4" />
                      {selectedNote?.price && selectedNote.price > 0 ? 'Pay for this Note' : 'Direct Payment / QR Code'}
                    </h3>
                    
                    {monetization?.bankDetails?.upiId && (
                      <a 
                        href={`upi://pay?pa=${monetization.bankDetails.upiId}&pn=${encodeURIComponent(settings?.appName || 'App Payment')}&am=${selectedNote?.price && selectedNote.price > 0 ? selectedNote.price : monetization.premiumPrice || 0}&cu=INR&tn=${encodeURIComponent(selectedNote?.price && selectedNote.price > 0 ? `Payment for Note: ${selectedNote.title}` : 'Full Premium Plan Upgrade')}`}
                        className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md"
                      >
                        <QrCode className="w-5 h-5" />
                        Pay via UPI App (GPay/PhonePe)
                      </a>
                    )}
                    
                    {(selectedNote?.qrCodeUrl || monetization?.bankDetails?.qrCodeUrl) && (
                      <div className="flex flex-col items-center gap-3 p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-blue-100 dark:border-blue-900/20">
                        <img 
                          src={selectedNote?.qrCodeUrl || monetization?.bankDetails?.qrCodeUrl} 
                          alt="Payment QR" 
                          className="w-40 h-40 object-contain" 
                        />
                        <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">
                          Scan to pay ₹{selectedNote?.price || monetization?.premiumPrice}
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

              {selectedNote && (
                <PaymentSubmission
                  contentId={selectedNote.id}
                  contentTitle={selectedNote.title}
                  contentType="note"
                  amount={selectedNote.price || monetization.premiumPrice || 0}
                  onSuccess={() => setShowPremiumModal(false)}
                />
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Note Reader Modal */}
      <AnimatePresence>
        {selectedNote && (!selectedNote.isPremium || isContentUnlocked(selectedNote.id)) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedNote(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-4xl bg-white dark:bg-neutral-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <header className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-white dark:bg-neutral-900 sticky top-0 z-10">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">{selectedNote.subject}</span>
                    <span className="text-neutral-300 dark:text-neutral-700">•</span>
                    <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{selectedNote.chapter}</span>
                  </div>
                  <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">{selectedNote.title}</h2>
                </div>
                <button
                  onClick={() => setSelectedNote(null)}
                  className="p-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </header>
              
              <div className="flex-1 overflow-y-auto p-8 prose prose-blue dark:prose-invert max-w-none bg-white dark:bg-neutral-900">
                <ReactMarkdown>{selectedNote.content}</ReactMarkdown>
              </div>

              {selectedNote.pdfUrl && (
                <footer className="p-6 bg-neutral-50 dark:bg-neutral-800/50 border-t border-neutral-100 dark:border-neutral-800 flex justify-end gap-4">
                  <button 
                    onClick={() => handleDownloadPdf(selectedNote.pdfUrl!, selectedNote.title)}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                  >
                    <Download className="w-5 h-5" />
                    Download PDF
                  </button>
                  <button 
                    onClick={() => handleOpenPdf(selectedNote.pdfUrl!)}
                    className="flex items-center gap-2 px-6 py-3 bg-neutral-900 dark:bg-neutral-800 text-white rounded-xl font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-700 transition-colors"
                  >
                    <ExternalLink className="w-5 h-5" />
                    Open in New Tab
                  </button>
                </footer>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
