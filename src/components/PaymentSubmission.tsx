import { useState, useEffect } from 'react';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, serverTimestamp } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Loader2, CheckCircle2, Upload, Send, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import FileUpload from './FileUpload';
import { sendNotification } from '../lib/firebase';

interface PaymentSubmissionProps {
  contentId: string;
  contentTitle: string;
  contentType: 'subscription' | 'video' | 'note' | 'liveClass' | 'mockTest';
  amount: number;
  onSuccess: () => void;
}

export default function PaymentSubmission({ contentId, contentTitle, contentType, amount, onSuccess }: PaymentSubmissionProps) {
  const { user, profile } = useAuth();
  const [transactionId, setTransactionId] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [existingRequest, setExistingRequest] = useState<any>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    console.log('Payment Form State:', { 
      hasTransactionId: !!transactionId.trim(), 
      hasScreenshot: !!screenshotUrl,
      submitting,
      amount
    });
  }, [transactionId, screenshotUrl, submitting, amount]);

  useEffect(() => {
    // Small delay to ensure modal animation is finished before focusing
    const timer = setTimeout(() => {
      const input = document.getElementById('transactionId');
      if (input) input.focus();
    }, 500);
    return () => clearTimeout(timer);
  }, [checking, existingRequest, submitted]);

  useEffect(() => {
    const checkExisting = async () => {
      if (!user) {
        setChecking(false);
        return;
      }
      try {
        const q = query(
          collection(db, 'paymentRequests'),
          where('userId', '==', user.uid),
          where('contentId', '==', contentId)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          // Sort by date manually if needed, or just take the latest pending/rejected
          const requests = snap.docs.map(d => d.data());
          const pending = requests.find(r => r.status === 'pending');
          const rejected = requests.find(r => r.status === 'rejected');
          
          if (pending) setExistingRequest({ ...pending, status: 'pending' });
          else if (rejected) setExistingRequest({ ...rejected, status: 'rejected' });
        }
      } catch (err) {
        console.error('Check existing request error:', err);
      } finally {
        setChecking(false);
      }
    };
    checkExisting();
  }, [user, contentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Trim transaction ID for validation
    const cleanTransactionId = transactionId.trim();
    
    if (!user || !profile) {
      toast.error('Please login to submit payment proof');
      return;
    }
    if (!cleanTransactionId) {
      toast.error('Please enter your 12-digit Transaction ID');
      return;
    }
    if (!screenshotUrl) {
      toast.error('Please upload your payment screenshot');
      return;
    }

    const amountValue = Number(amount);
    if (isNaN(amountValue)) {
      toast.error('Invalid payment amount. Please try again.');
      return;
    }

    setSubmitting(true);
    console.log('Submitting payment proof...', {
      userId: user.uid,
      contentId,
      amount: amountValue,
      transactionId: cleanTransactionId,
      screenshotUrl: screenshotUrl.substring(0, 50) + '...'
    });

    try {
      await addDoc(collection(db, 'paymentRequests'), {
        userId: user.uid,
        userEmail: user.email,
        userName: profile.fullName || profile.displayName || 'Student',
        amount: amountValue,
        transactionId: cleanTransactionId,
        screenshotUrl,
        contentId,
        contentTitle,
        contentType,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Notify admin
      await sendNotification({
        userId: 'admin',
        title: 'New Payment Request',
        message: `${profile.fullName || profile.displayName} submitted a payment request for ${contentTitle}.`,
        type: 'payment_request',
        link: '/admin',
        image: screenshotUrl
      });

      console.log('Payment proof submitted successfully');
      setSubmitted(true);
      toast.success('Payment proof submitted! Admin will verify soon.');
      setTimeout(onSuccess, 2000);
    } catch (err: any) {
      console.error('Payment submission error:', err);
      const errorMessage = err.message || 'Unknown error';
      if (errorMessage.includes('insufficient permissions')) {
        toast.error('Permission denied. Please check your account or try again.');
      } else if (errorMessage.includes('quota')) {
        toast.error('Storage quota exceeded. Please try again later.');
      } else {
        toast.error(`Failed to submit: ${errorMessage}`);
      }
      handleFirestoreError(err, OperationType.CREATE, 'paymentRequests');
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-2xl border border-amber-100 dark:border-amber-900/30 text-center space-y-3 mt-6">
        <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
        <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Login Required</h3>
        <p className="text-[10px] text-neutral-500">Please login to your account to submit payment proof and unlock content.</p>
      </div>
    );
  }

  if (existingRequest && existingRequest.status === 'pending') {
    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-2xl border border-blue-100 dark:border-blue-900/30 text-center space-y-3 mt-6">
        <Clock className="w-8 h-8 text-blue-600 mx-auto" />
        <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Approval Pending</h3>
        <p className="text-[10px] text-neutral-500">You have already submitted a request for this content. Please wait while our team verifies it.</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-xl font-bold text-neutral-900 dark:text-white">Proof Submitted!</h3>
        <p className="text-sm text-neutral-500">Our team will verify your payment and unlock the content within 2-4 hours.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-6 pt-6 border-t border-neutral-100 dark:border-neutral-800">
      {existingRequest && existingRequest.status === 'rejected' && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-red-900 dark:text-red-400">Previous Request Rejected</p>
            <p className="text-[10px] text-red-600">Reason: {existingRequest.rejectionReason}</p>
            <p className="text-[10px] text-red-500 mt-1">Please submit again with correct details.</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 select-text">
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
          <Upload className="w-4 h-4 text-blue-600" />
          Submit Payment Proof
        </h3>
        
        <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
          <label htmlFor="transactionId" className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Transaction ID / Ref No.</label>
          <input
            id="transactionId"
            name="transactionId"
            type="text"
            inputMode="text"
            required
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
            placeholder="Enter 12-digit Transaction ID"
            className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all relative z-10"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <div className="space-y-2">
          <FileUpload
            onUploadComplete={setScreenshotUrl}
            accept="image/*"
            label="Payment Screenshot"
            folder="payments"
            useBase64={true}
          />
          {screenshotUrl && (
            <p className="text-[10px] text-green-600 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Screenshot uploaded successfully
            </p>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
          submitting 
            ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed' 
            : (!screenshotUrl || !transactionId.trim())
              ? 'bg-blue-600/50 text-white/50 cursor-pointer hover:bg-blue-600' // Keep it clickable but look "dimmed"
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
        }`}
      >
        {submitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <Send className="w-5 h-5" />
            Submit for Approval
          </>
        )}
      </button>
    </form>
  </div>
  );
}
