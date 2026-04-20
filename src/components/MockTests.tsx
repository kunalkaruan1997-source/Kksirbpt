import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { MockTest, TestResult } from '../types';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'motion/react';
import { ClipboardList, Clock, ChevronRight, CheckCircle2, History, Trophy, EyeOff, Lock, DollarSign, ShieldCheck, Check, School, Copy, X, QrCode } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { useAppSettings } from '../hooks/useAppSettings';
import PaymentSubmission from './PaymentSubmission';
import { AnimatePresence } from 'motion/react';

export default function MockTests() {
  const { profile, isPremium, isContentUnlocked } = useAuth();
  const { settings, monetization } = useAppSettings();
  const navigate = useNavigate();
  const [tests, setTests] = useState<MockTest[]>([]);
  const [results, setResults] = useState<TestResult[]>([]);
  const [activeTab, setActiveTab] = useState<'available' | 'history'>('available');
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [selectedTest, setSelectedTest] = useState<MockTest | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'mockTests'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const allTests = snap.docs.map(d => ({ id: d.id, ...d.data() } as MockTest));
      // Show all tests to admins, but only non-hidden tests to students
      if (profile?.role === 'admin') {
        setTests(allTests);
      } else {
        setTests(allTests.filter(t => !t.hidden));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'mockTests');
    });
    return () => unsub();
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    const q = query(
      collection(db, 'testResults'), 
      where('userId', '==', profile.uid),
      orderBy('completedAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setResults(snap.docs.map(d => ({ id: d.id, ...d.data() } as TestResult)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'testResults');
    });
    return () => unsub();
  }, [profile]);

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Mock Tests</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">Practice with our curated test series</p>
        </div>

        <div className="flex bg-neutral-100 dark:bg-neutral-900 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('available')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-bold transition-all",
              activeTab === 'available' 
                ? "bg-white dark:bg-neutral-800 text-blue-600 shadow-sm" 
                : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            )}
          >
            Available Tests
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-bold transition-all",
              activeTab === 'history' 
                ? "bg-white dark:bg-neutral-800 text-blue-600 shadow-sm" 
                : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            )}
          >
            My History
          </button>
        </div>
      </header>

      {activeTab === 'available' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tests.length > 0 ? tests.map((test) => {
            const previousResult = results.find(r => r.testId === test.id);
            return (
              <motion.div
                key={test.id}
                whileHover={{ y: -4 }}
                className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-6 shadow-sm flex flex-col"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl relative">
                    <ClipboardList className="w-6 h-6 text-blue-600" />
                    {test.isPremium && (
                      <div className="absolute -top-2 -right-2 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center border-2 border-white dark:border-neutral-900 shadow-sm">
                        <DollarSign className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {test.isPremium && (
                      <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs font-bold bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-full">
                        <ShieldCheck className="w-3 h-3" />
                        {test.price && test.price > 0 ? `₹${test.price}` : 'Premium'}
                      </div>
                    )}
                    {test.hidden && (
                      <div className="flex items-center gap-1 text-red-600 dark:text-red-400 text-xs font-bold bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-full">
                        <EyeOff className="w-3 h-3" />
                        Hidden
                      </div>
                    )}
                    {previousResult && (
                      <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs font-bold bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">
                        <CheckCircle2 className="w-3 h-3" />
                        Completed
                      </div>
                    )}
                  </div>
                </div>

                <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-6">{test.title}</h3>

                <div className="mt-auto space-y-4">
                  <div className="flex items-center justify-between text-xs font-mono uppercase tracking-widest text-neutral-500">
                    <div className="flex items-center gap-1.5 font-bold">
                      <ClipboardList className="w-3.5 h-3.5" />
                      {test.questions.length} Questions
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (test.isPremium && !isContentUnlocked(test.id)) {
                        setSelectedTest(test);
                        setShowPremiumModal(true);
                      } else {
                        navigate(`/take-test/${test.id}`);
                      }
                    }}
                    className={cn(
                      "w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg dark:shadow-none",
                      test.isPremium && !isContentUnlocked(test.id) 
                        ? "bg-amber-600 text-white hover:bg-amber-700 shadow-amber-100" 
                        : "bg-neutral-900 dark:bg-blue-600 text-white hover:bg-neutral-800 dark:hover:bg-blue-700 shadow-neutral-200"
                    )}
                  >
                    {test.isPremium && !isContentUnlocked(test.id) ? (
                      <>
                        <Lock className="w-4 h-4" />
                        Unlock Premium
                      </>
                    ) : (
                      <>
                        {previousResult ? 'Retake Assessment' : 'Begin Assessment'}
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            );
          }) : (
            <div className="col-span-full bg-neutral-100 dark:bg-neutral-900 p-12 rounded-3xl text-center border-2 border-dashed border-neutral-200 dark:border-neutral-800">
              <p className="text-neutral-500 dark:text-neutral-400">No mock tests available yet.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {results.length > 0 ? results.map((result) => (
            <div 
              key={result.id}
              className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
                  <History className="w-6 h-6 text-neutral-500" />
                </div>
                <div>
                  <h3 className="font-bold text-neutral-900 dark:text-white">{result.testTitle}</h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Completed on {new Date(result.completedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-8">
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 mb-1">Score</p>
                  <p className="text-lg font-bold text-blue-600">{result.score}%</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 mb-1">Accuracy</p>
                  <p className="text-lg font-bold text-neutral-900 dark:text-white">
                    {result.correctAnswers}/{result.totalQuestions}
                  </p>
                </div>
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Trophy className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </div>
          )) : (
            <div className="bg-neutral-100 dark:bg-neutral-900 p-12 rounded-3xl text-center border-2 border-dashed border-neutral-200 dark:border-neutral-800">
              <p className="text-neutral-500 dark:text-neutral-400">You haven't taken any tests yet.</p>
            </div>
          )}
        </div>
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
                setSelectedTest(null);
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
                  setSelectedTest(null);
                }}
                className="absolute top-4 right-4 p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-neutral-500" />
              </button>
              <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldCheck className="w-10 h-10 text-amber-600" />
              </div>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
                {selectedTest?.price && selectedTest.price > 0 ? `Unlock this Test for ₹${selectedTest.price}` : 'Premium Content'}
              </h2>
              <p className="text-neutral-500 dark:text-neutral-400 mb-6">
                {selectedTest?.price && selectedTest.price > 0 
                  ? "This is a premium mock test. You can unlock it individually or upgrade to the full plan for complete access."
                  : "This mock test is exclusive to Premium members. Upgrade your account to get full access to all premium content."}
              </p>

              {selectedTest?.price && selectedTest.price > 0 && (
                <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/20">
                  <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-1">Individual Price</p>
                  <p className="text-3xl font-black text-amber-700 dark:text-amber-300">₹{selectedTest.price}</p>
                  <p className="text-[10px] text-amber-600/60 dark:text-amber-400/60 mt-1">Pay exactly this amount to unlock this mock test</p>
                </div>
              )}
              
              <div className="space-y-4">
                {(!selectedTest?.price || selectedTest.price === 0) && (
                  <a 
                    href={monetization?.paymentLink || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full py-4 bg-amber-600 text-white rounded-2xl font-bold hover:bg-amber-700 transition-all shadow-lg shadow-amber-100 dark:shadow-none"
                  >
                    Upgrade Full Plan - ₹{monetization?.premiumPrice || '499'}
                  </a>
                )}

                {(selectedTest?.qrCodeUrl || (monetization?.bankDetails && (monetization.bankDetails.accountNumber || monetization.bankDetails.qrCodeUrl || monetization.bankDetails.upiId))) && (
                  <div className="p-6 bg-blue-50 dark:bg-blue-900/10 rounded-3xl border border-blue-100 dark:border-blue-900/20 text-left space-y-4">
                    <h3 className="text-sm font-bold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                      <School className="w-4 h-4" />
                      {selectedTest?.price && selectedTest.price > 0 ? 'Pay for this Test' : 'Direct Payment / QR Code'}
                    </h3>
                    
                    {monetization?.bankDetails?.upiId && (
                      <a 
                        href={`upi://pay?pa=${monetization.bankDetails.upiId}&pn=${encodeURIComponent(settings?.appName || 'App Payment')}&am=${selectedTest?.price && selectedTest.price > 0 ? selectedTest.price : monetization.premiumPrice || 0}&cu=INR&tn=${encodeURIComponent(selectedTest?.price && selectedTest.price > 0 ? `Payment for Test: ${selectedTest.title}` : 'Full Premium Plan Upgrade')}`}
                        className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md"
                      >
                        <QrCode className="w-5 h-5" />
                        Pay via UPI App (GPay/PhonePe)
                      </a>
                    )}
                    
                    {(selectedTest?.qrCodeUrl || monetization?.bankDetails?.qrCodeUrl) && (
                      <div className="flex flex-col items-center gap-3 p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-blue-100 dark:border-blue-900/20">
                        <img 
                          src={selectedTest?.qrCodeUrl || monetization?.bankDetails?.qrCodeUrl} 
                          alt="Payment QR" 
                          className="w-40 h-40 object-contain" 
                        />
                        <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">
                          Scan to pay ₹{selectedTest?.price || monetization?.premiumPrice}
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

              {selectedTest && (
                <PaymentSubmission
                  contentId={selectedTest.id}
                  contentTitle={selectedTest.title}
                  contentType="mockTest"
                  amount={selectedTest.price || monetization.premiumPrice || 0}
                  onSuccess={() => setShowPremiumModal(false)}
                />
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
