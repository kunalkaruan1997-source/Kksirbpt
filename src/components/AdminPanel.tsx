import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, updateDoc, where, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, serverTimestamp } from '../lib/firebase';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { Video, Note, LiveClass, UserProfile, MockTest, Question, ContactSettings, PaymentRequest } from '../types';
import { Plus, Video as VideoIcon, FileText, Radio, Check, AlertCircle, Trash2, ExternalLink, Settings, Users, Mail, Phone, GraduationCap, School, Calendar, MapPin, Loader2, ClipboardList, X, Eye, EyeOff, Pencil, Instagram, MessageCircle, Send as TelegramIcon, DollarSign, ShieldCheck, UserPlus, Unlock, LayoutDashboard, Download, Bell } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import FileUpload from './FileUpload';
import { toast } from 'sonner';
import { sendNotification } from '../lib/firebase';

import { useAppSettings } from '../hooks/useAppSettings';

export default function AdminPanel() {
  const { settings } = useAppSettings();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'video' | 'note' | 'live' | 'students' | 'mockTest' | 'contact' | 'monetization' | 'approvals'>('dashboard');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [existingContent, setExistingContent] = useState<any[]>([]);
  const [fetchingContent, setFetchingContent] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [blockingId, setBlockingId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalStudents: 0,
    premiumStudents: 0,
    totalVideos: 0,
    totalNotes: 0,
    totalMockTests: 0,
    totalLiveClasses: 0,
    pendingApprovals: 0
  });
  const [showUnlocksModal, setShowUnlocksModal] = useState(false);
  const [selectedStudentForUnlocks, setSelectedStudentForUnlocks] = useState<UserProfile | null>(null);
  const [allContent, setAllContent] = useState<{ id: string, title: string, type: string }[]>([]);
  const [showCreateStudent, setShowCreateStudent] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

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
  const [newStudentForm, setNewStudentForm] = useState({
    email: '',
    password: '',
    fullName: '',
    studentId: '',
    studentClass: ''
  });

  // Form States
  const [videoForm, setVideoForm] = useState({ 
    youtubeId: '', 
    class: '',
    subject: '',
    chapter: '',
    hidden: false,
    isPremium: false,
    price: 0,
    qrCodeUrl: ''
  });
  const [noteForm, setNoteForm] = useState({ title: '', content: '', subject: '', chapter: '', pdfUrl: '', hidden: false, isPremium: false, price: 0, qrCodeUrl: '' });
  const [liveForm, setLiveForm] = useState({ 
    title: '', 
    youtubeLiveUrl: '', 
    startTime: '',
    status: 'upcoming' as 'upcoming' | 'live' | 'recorded',
    hidden: false,
    isPremium: false,
    price: 0,
    qrCodeUrl: ''
  });
  const [mockTestForm, setMockTestForm] = useState<{
    title: string;
    questions: Question[];
    hidden: boolean;
    isPremium: boolean;
    price: number;
    qrCodeUrl: string;
  }>({
    title: '',
    questions: [],
    hidden: false,
    isPremium: false,
    price: 0,
    qrCodeUrl: ''
  });

  const [contactForm, setContactForm] = useState<ContactSettings>({
    whatsapp: '',
    instagram: '',
    telegram: '',
    email: '',
    appName: '',
    appIcon: '',
    updatedAt: ''
  });

  const [monetizationForm, setMonetizationForm] = useState({
    adsEnabled: false,
    adSenseClientId: '',
    adMobAppId: '',
    paymentLink: '',
    premiumPrice: 0,
    premiumBenefits: ['Ad-free experience', 'Premium videos & notes', 'Exclusive mock tests', 'Direct chat support'],
    bankDetails: {
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      accountHolder: '',
      upiId: '',
      qrCodeUrl: ''
    },
    updatedAt: ''
  });

  const [currentQuestion, setCurrentQuestion] = useState<Partial<Question>>({
    text: '',
    options: ['', '', '', ''],
    correctOptionIndex: 0
  });

  useEffect(() => {
    fetchContent();
    setEditingId(null);
    resetForms();
  }, [activeTab]);

  const extractYoutubeId = (url: string) => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : url;
  };

  const fetchContent = async () => {
    setFetchingContent(true);
    try {
      if (activeTab === 'dashboard') {
        const [uSnap, vSnap, nSnap, mSnap, pSnap, lSnap] = await Promise.all([
          getDocs(query(collection(db, 'users'), where('role', '==', 'student'))),
          getDocs(collection(db, 'videos')),
          getDocs(collection(db, 'notes')),
          getDocs(collection(db, 'mockTests')),
          getDocs(query(collection(db, 'paymentRequests'), where('status', '==', 'pending'))),
          getDocs(collection(db, 'liveClasses'))
        ]);
        
        setStats({
          totalStudents: uSnap.size,
          premiumStudents: uSnap.docs.filter(d => d.data().isPremium).length,
          totalVideos: vSnap.size,
          totalNotes: nSnap.size,
          totalMockTests: mSnap.size,
          totalLiveClasses: lSnap.size,
          pendingApprovals: pSnap.size
        });
      } else if (activeTab === 'students') {
        const q = query(collection(db, 'users'), where('role', '==', 'student'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const studentList = querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
        setStudents(studentList);
      } else if (activeTab === 'approvals') {
        const q = query(collection(db, 'paymentRequests'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const requests = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaymentRequest));
        setPaymentRequests(requests);
      } else if (activeTab === 'contact') {
        const docRef = doc(db, 'settings', 'contact');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setContactForm(docSnap.data() as ContactSettings);
        }
      } else if (activeTab === 'monetization') {
        const docRef = doc(db, 'settings', 'monetization');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setMonetizationForm(docSnap.data() as any);
        }
      } else {
        const collectionName = activeTab === 'video' ? 'videos' : activeTab === 'note' ? 'notes' : activeTab === 'live' ? 'liveClasses' : 'mockTests';
        const q = query(collection(db, collectionName), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const content = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setExistingContent(content);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, activeTab === 'students' ? 'users' : (activeTab === 'video' ? 'videos' : activeTab === 'note' ? 'notes' : activeTab === 'live' ? 'liveClasses' : activeTab === 'contact' ? 'settings/contact' : 'mockTests'));
    } finally {
      setFetchingContent(false);
    }
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setEditingQuestionIndex(null);
    if (activeTab === 'video') {
      setVideoForm({ 
        youtubeId: item.youtubeId, 
        class: item.class || '',
        subject: item.subject || '',
        chapter: item.chapter || '',
        hidden: item.hidden || false,
        isPremium: item.isPremium || false,
        price: item.price || 0,
        qrCodeUrl: item.qrCodeUrl || ''
      });
    } else if (activeTab === 'note') {
      setNoteForm({ 
        title: item.title, 
        content: item.content, 
        subject: item.subject, 
        chapter: item.chapter, 
        pdfUrl: item.pdfUrl || '',
        hidden: item.hidden || false,
        isPremium: item.isPremium || false,
        price: item.price || 0,
        qrCodeUrl: item.qrCodeUrl || ''
      });
    } else if (activeTab === 'live') {
      setLiveForm({ 
        title: item.title, 
        youtubeLiveUrl: item.youtubeLiveUrl, 
        startTime: item.startTime, 
        status: item.status,
        hidden: item.hidden || false,
        isPremium: item.isPremium || false,
        price: item.price || 0,
        qrCodeUrl: item.qrCodeUrl || ''
      });
    } else if (activeTab === 'mockTest') {
      setMockTestForm({
        title: item.title,
        questions: item.questions || [],
        hidden: item.hidden || false,
        isPremium: item.isPremium || false,
        price: item.price || 0,
        qrCodeUrl: item.qrCodeUrl || ''
      });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteStudent = (uid: string) => {
    toast('Remove Student Account?', {
      description: 'This will permanently delete the student profile from the database.',
      action: {
        label: 'Remove',
        onClick: async () => {
          setBlockingId(uid);
          try {
            await deleteDoc(doc(db, 'users', uid));
            setStudents(prev => prev.filter(s => s.uid !== uid));
            toast.success('Student removed successfully');
          } catch (err: any) {
            console.error('Delete student error:', err);
            toast.error('Failed to remove student');
            handleFirestoreError(err, OperationType.DELETE, `users/${uid}`);
          } finally {
            setBlockingId(null);
          }
        }
      },
    });
  };

  const handleToggleBlockStudent = async (student: UserProfile) => {
    setBlockingId(student.uid);
    try {
      const newBlockedStatus = !student.blocked;
      await updateDoc(doc(db, 'users', student.uid), { blocked: newBlockedStatus });
      setStudents(prev => prev.map(s => s.uid === student.uid ? { ...s, blocked: newBlockedStatus } : s));
      toast.success(newBlockedStatus ? 'Student blocked' : 'Student unblocked');
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${student.uid}`);
      toast.error('Failed to update student status');
    } finally {
      setBlockingId(null);
    }
  };

  const handleTogglePremiumStudent = async (student: UserProfile) => {
    setBlockingId(student.uid);
    try {
      const newPremiumStatus = !student.isPremium;
      await updateDoc(doc(db, 'users', student.uid), { 
        isPremium: newPremiumStatus,
        premiumUntil: newPremiumStatus ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null // 30 days default
      });
      setStudents(prev => prev.map(s => s.uid === student.uid ? { ...s, isPremium: newPremiumStatus } : s));
      toast.success(newPremiumStatus ? 'Student upgraded to Premium' : 'Student Premium removed');
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${student.uid}`);
      toast.error('Failed to update student premium status');
    } finally {
      setBlockingId(null);
    }
  };

  const handleToggleContentUnlock = async (studentUid: string, contentId: string, isUnlocked: boolean) => {
    const student = students.find(s => s.uid === studentUid);
    if (!student) return;

    const currentUnlocks = student.unlockedContent || [];
    const newUnlocks = isUnlocked 
      ? [...currentUnlocks, contentId]
      : currentUnlocks.filter(id => id !== contentId);

    try {
      await updateDoc(doc(db, 'users', studentUid), { unlockedContent: newUnlocks });
      setStudents(prev => prev.map(s => s.uid === studentUid ? { ...s, unlockedContent: newUnlocks } : s));
      if (selectedStudentForUnlocks?.uid === studentUid) {
        setSelectedStudentForUnlocks(prev => prev ? { ...prev, unlockedContent: newUnlocks } : null);
      }
      toast.success(isUnlocked ? 'Content unlocked' : 'Content locked');
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${studentUid}`);
      toast.error('Failed to update unlock status');
    }
  };

  const fetchAllContentForUnlocks = async () => {
    try {
      const [vSnap, nSnap, tSnap] = await Promise.all([
        getDocs(collection(db, 'videos')),
        getDocs(collection(db, 'notes')),
        getDocs(collection(db, 'mockTests'))
      ]);

      const content = [
        ...vSnap.docs.map(d => ({ id: d.id, title: d.data().title || d.id, type: 'Video' })),
        ...nSnap.docs.map(d => ({ id: d.id, title: d.data().title, type: 'Note' })),
        ...tSnap.docs.map(d => ({ id: d.id, title: d.data().title, type: 'Mock Test' }))
      ];
      setAllContent(content);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.GET, 'multiple collections');
      toast.error('Failed to fetch content list');
    }
  };

  const handleApprovePayment = async (request: PaymentRequest) => {
    setBlockingId(request.id);
    try {
      const userRef = doc(db, 'users', request.userId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        toast.error('User not found');
        return;
      }
      const userData = userSnap.data() as UserProfile;

      if (request.contentType === 'subscription') {
        await updateDoc(userRef, {
          isPremium: true,
          premiumUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });
      } else {
        const currentUnlocks = userData.unlockedContent || [];
        if (!currentUnlocks.includes(request.contentId)) {
          await updateDoc(userRef, {
            unlockedContent: [...currentUnlocks, request.contentId]
          });
        }
      }

      await updateDoc(doc(db, 'paymentRequests', request.id), {
        status: 'approved',
        updatedAt: serverTimestamp()
      });

      // Notify student
      await sendNotification({
        userId: request.userId,
        title: 'Payment Approved!',
        message: `Your payment for ${request.contentTitle} has been approved. You now have access!`,
        type: 'approval',
        link: request.contentType === 'subscription' ? '/' : (request.contentType === 'video' ? '/videos' : request.contentType === 'note' ? '/notes' : request.contentType === 'liveClass' ? '/live' : '/mock-tests')
      });

      setPaymentRequests(prev => prev.map(r => r.id === request.id ? { ...r, status: 'approved' } : r));
      toast.success('Payment approved and content unlocked!');
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `paymentRequests/${request.id}`);
      toast.error('Failed to approve payment');
    } finally {
      setBlockingId(null);
    }
  };

  const handleRejectPayment = async (request: PaymentRequest, reason: string) => {
    setBlockingId(request.id);
    try {
      await updateDoc(doc(db, 'paymentRequests', request.id), {
        status: 'rejected',
        rejectionReason: reason,
        updatedAt: serverTimestamp()
      });

      // Notify student
      await sendNotification({
        userId: request.userId,
        title: 'Payment Rejected',
        message: `Your payment request for ${request.contentTitle} was rejected. Reason: ${reason}`,
        type: 'approval'
      });

      setPaymentRequests(prev => prev.map(r => r.id === request.id ? { ...r, status: 'rejected', rejectionReason: reason } : r));
      toast.success('Payment request rejected');
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `paymentRequests/${request.id}`);
      toast.error('Failed to reject payment');
    } finally {
      setBlockingId(null);
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Initialize a secondary app to create the user without logging out the admin
      const secondaryApp = initializeApp(firebaseConfig, "secondary");
      const secondaryAuth = getAuth(secondaryApp);
      
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newStudentForm.email, newStudentForm.password);
      const user = userCredential.user;

      // Create the user profile in Firestore
      const userProfile: UserProfile = {
        uid: user.uid,
        email: newStudentForm.email,
        displayName: newStudentForm.fullName,
        fullName: newStudentForm.fullName,
        studentId: newStudentForm.studentId,
        studentClass: newStudentForm.studentClass,
        photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(newStudentForm.fullName)}&background=random`,
        role: 'student',
        createdAt: new Date().toISOString(),
        profileCompleted: true,
        blocked: false,
        isPremium: false
      };

      await setDoc(doc(db, 'users', user.uid), userProfile);
      
      // Clean up the secondary app
      await secondaryAuth.signOut();
      
      toast.success('Student account created successfully');
      setShowCreateStudent(false);
      setNewStudentForm({ email: '', password: '', fullName: '', studentId: '', studentClass: '' });
      fetchContent();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create student account');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    toast('Delete Content?', {
      description: 'Are you sure you want to permanently delete this item?',
      action: {
        label: 'Delete',
        onClick: async () => {
          setBlockingId(id);
          try {
            const collectionName = activeTab === 'video' ? 'videos' : activeTab === 'note' ? 'notes' : activeTab === 'live' ? 'liveClasses' : 'mockTests';
            await deleteDoc(doc(db, collectionName, id));
            setExistingContent(prev => prev.filter(item => item.id !== id));
            if (editingId === id) {
              setEditingId(null);
              resetForms();
            }
            toast.success('Content deleted successfully');
          } catch (err: any) {
            console.error('Delete content error:', err);
            toast.error('Failed to delete content');
            handleFirestoreError(err, OperationType.DELETE, activeTab === 'video' ? `videos/${id}` : activeTab === 'note' ? `notes/${id}` : activeTab === 'live' ? `liveClasses/${id}` : `mockTests/${id}`);
          } finally {
            setBlockingId(null);
          }
        }
      },
    });
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    if (typeof date === 'string') return new Date(date).toLocaleString();
    if (date instanceof Date) return date.toLocaleString();
    if (date && typeof date === 'object' && 'toDate' in date) return date.toDate().toLocaleString();
    return 'N/A';
  };

  const resetForms = () => {
    setVideoForm({ 
      youtubeId: '', 
      class: '',
      subject: '',
      chapter: '',
      hidden: false,
      isPremium: false,
      price: 0,
      qrCodeUrl: ''
    });
    setNoteForm({ title: '', content: '', subject: '', chapter: '', pdfUrl: '', hidden: false, isPremium: false, price: 0, qrCodeUrl: '' });
    setLiveForm({ title: '', youtubeLiveUrl: '', startTime: '', status: 'upcoming', hidden: false, isPremium: false, price: 0, qrCodeUrl: '' });
    setMockTestForm({ title: '', questions: [], hidden: false, isPremium: false, price: 0, qrCodeUrl: '' });
    setCurrentQuestion({ text: '', options: ['', '', '', ''], correctOptionIndex: 0 });
    setEditingId(null);
    setEditingQuestionIndex(null);
    setError('');
    setSuccess(false);
  };

  const editQuestion = (index: number) => {
    const q = mockTestForm.questions[index];
    setCurrentQuestion({
      text: q.text,
      options: [...q.options],
      correctOptionIndex: q.correctOptionIndex
    });
    setEditingQuestionIndex(index);
  };

  const addQuestion = () => {
    if (!currentQuestion.text || currentQuestion.options?.some(opt => !opt)) {
      toast.error('Please fill all question fields and options');
      return;
    }

    if (editingQuestionIndex !== null) {
      // Update existing question
      const updatedQuestions = [...mockTestForm.questions];
      updatedQuestions[editingQuestionIndex] = {
        ...updatedQuestions[editingQuestionIndex],
        text: currentQuestion.text!,
        options: currentQuestion.options as string[],
        correctOptionIndex: currentQuestion.correctOptionIndex!
      };
      setMockTestForm(prev => ({
        ...prev,
        questions: updatedQuestions
      }));
      setEditingQuestionIndex(null);
      toast.success('Question updated');
    } else {
      // Add new question
      const newQuestion: Question = {
        id: Math.random().toString(36).substr(2, 9),
        text: currentQuestion.text!,
        options: currentQuestion.options as string[],
        correctOptionIndex: currentQuestion.correctOptionIndex!
      };
      setMockTestForm(prev => ({
        ...prev,
        questions: [...prev.questions, newQuestion]
      }));
      toast.success('Question added');
    }
    setCurrentQuestion({ text: '', options: ['', '', '', ''], correctOptionIndex: 0 });
  };

  const removeQuestion = (id: string) => {
    setMockTestForm(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== id)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    if (activeTab === 'contact') {
      try {
        await setDoc(doc(db, 'settings', 'contact'), {
          ...contactForm,
          updatedAt: serverTimestamp()
        });
        toast.success('App & Contact settings updated successfully');
        setSuccess(true);
      } catch (err: any) {
        handleFirestoreError(err, OperationType.UPDATE, 'settings/contact');
        setError(err.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (activeTab === 'monetization') {
      try {
        await setDoc(doc(db, 'settings', 'monetization'), {
          ...monetizationForm,
          updatedAt: serverTimestamp()
        });
        toast.success('Monetization settings updated successfully');
        setSuccess(true);
      } catch (err: any) {
        handleFirestoreError(err, OperationType.UPDATE, 'settings/monetization');
        setError(err.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    let collectionName = '';
    try {
      let data: any = {};

      if (activeTab === 'mockTest' && currentQuestion.text?.trim()) {
        toast.error('You have an unsaved question. Please add it to the list or clear it.');
        setLoading(false);
        return;
      }

      if (activeTab === 'video') {
        collectionName = 'videos';
        const videoId = extractYoutubeId(videoForm.youtubeId);
        data = {
          ...videoForm,
          youtubeId: videoId,
          thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
          createdAt: serverTimestamp()
        };
      } else if (activeTab === 'note') {
        collectionName = 'notes';
        data = { ...noteForm, createdAt: serverTimestamp() };
      } else if (activeTab === 'live') {
        collectionName = 'liveClasses';
        data = { ...liveForm, createdAt: serverTimestamp() };
      } else if (activeTab === 'mockTest') {
        collectionName = 'mockTests';
        if (!mockTestForm.title.trim()) {
          throw new Error('Please fill the test title');
        }
        if (mockTestForm.questions.length === 0) {
          throw new Error('Please add at least one question to the test');
        }
        data = { ...mockTestForm, createdAt: serverTimestamp() };
      }

      if (editingId) {
        const { createdAt, ...updateData } = data;
        await updateDoc(doc(db, collectionName, editingId), updateData);
        toast.success('Content updated successfully');
      } else {
        const docRef = await addDoc(collection(db, collectionName), data);
        toast.success('Content added successfully');

        // Send notification to all students
        await sendNotification({
          userId: 'all',
          title: `New ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Added`,
          message: `Check out the new ${activeTab === 'mockTest' ? 'Mock Test' : activeTab}: "${data.title || data.id}"`,
          type: 'upload',
          link: activeTab === 'video' ? '/videos' : activeTab === 'note' ? '/notes' : activeTab === 'live' ? '/live' : '/mock-tests',
          image: activeTab === 'video' ? data.thumbnail : undefined
        });
      }
      
      resetForms();
      fetchContent();
    } catch (err: any) {
      handleFirestoreError(err, editingId ? OperationType.UPDATE : OperationType.CREATE, editingId ? `${collectionName}/${editingId}` : collectionName);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 min-h-[80vh]">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 space-y-2">
        <div className="mb-8 px-4">
          <button 
            onClick={() => window.location.href = '/'}
            className="mb-4 flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
          >
            ← Back to App
          </button>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Admin Panel</h1>
          <p className="text-xs text-neutral-500 font-medium uppercase tracking-widest mt-1">Control Center</p>
        </div>

        <div className="px-4 mb-6">
          <div className="relative group">
            <button
              className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-none"
            >
              <Plus className="w-5 h-5" />
              ADD NEW CONTENT
            </button>
            <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 p-2 overflow-hidden">
              <button onClick={() => setActiveTab('video')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-blue-600 transition-colors">
                <VideoIcon className="w-4 h-4" /> YouTube Video
              </button>
              <button onClick={() => setActiveTab('note')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-green-600 transition-colors">
                <FileText className="w-4 h-4" /> Study Notes
              </button>
              <button onClick={() => setActiveTab('live')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-red-600 transition-colors">
                <Radio className="w-4 h-4" /> Live Session
              </button>
              <button onClick={() => setActiveTab('mockTest')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-amber-600 transition-colors">
                <ClipboardList className="w-4 h-4" /> Mock Test
              </button>
              <div className="h-px bg-neutral-100 dark:bg-neutral-800 my-1" />
              <button onClick={() => { setActiveTab('students'); setShowCreateStudent(true); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-blue-600 transition-colors">
                <UserPlus className="w-4 h-4" /> New Student ID
              </button>
            </div>
          </div>
        </div>

        <nav className="space-y-1">
          <p className="px-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Overview</p>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
              activeTab === 'dashboard' 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-100 dark:shadow-none" 
                : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            )}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </button>

          <div className="pt-4">
            <p className="px-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Content</p>
            <button
              onClick={() => setActiveTab('video')}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
                activeTab === 'video' 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-100 dark:shadow-none" 
                  : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              )}
            >
              <VideoIcon className="w-4 h-4" />
              Videos
            </button>
            <button
              onClick={() => setActiveTab('note')}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
                activeTab === 'note' 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-100 dark:shadow-none" 
                  : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              )}
            >
              <FileText className="w-4 h-4" />
              Notes
            </button>
            <button
              onClick={() => setActiveTab('live')}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
                activeTab === 'live' 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-100 dark:shadow-none" 
                  : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              )}
            >
              <Radio className="w-4 h-4" />
              Live Classes
            </button>
            <button
              onClick={() => setActiveTab('mockTest')}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
                activeTab === 'mockTest' 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-100 dark:shadow-none" 
                  : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              )}
            >
              <ClipboardList className="w-4 h-4" />
              Mock Tests
            </button>
          </div>

          <div className="pt-4">
            <p className="px-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Management</p>
            <button
              onClick={() => setActiveTab('students')}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
                activeTab === 'students' 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-100 dark:shadow-none" 
                  : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              )}
            >
              <Users className="w-4 h-4" />
              Students
            </button>
            <button
              onClick={() => setActiveTab('approvals')}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all",
                activeTab === 'approvals' 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-100 dark:shadow-none" 
                  : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              )}
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-4 h-4" />
                Approvals
              </div>
              {paymentRequests.filter(r => r.status === 'pending').length > 0 && (
                <span className="flex h-2 w-2 rounded-full bg-red-500" />
              )}
            </button>
          </div>

          <div className="pt-4">
            <p className="px-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Settings</p>
            <button
              onClick={() => setActiveTab('contact')}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
                activeTab === 'contact' 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-100 dark:shadow-none" 
                  : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              )}
            >
              <Settings className="w-4 h-4" />
              App & Contact
            </button>
            <button
              onClick={() => setActiveTab('monetization')}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
                activeTab === 'monetization' 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-100 dark:shadow-none" 
                  : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              )}
            >
              <DollarSign className="w-4 h-4" />
              Monetization
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-8"
          >
            {activeTab === 'dashboard' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-6 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600">
                        <Users className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Total Students</p>
                        <h3 className="text-2xl font-bold text-neutral-900 dark:text-white">{stats.totalStudents}</h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium text-blue-600">
                      <ShieldCheck className="w-3 h-3" />
                      {stats.premiumStudents} Premium Users
                    </div>
                  </div>

                  <div className="p-6 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-2xl flex items-center justify-center text-green-600">
                        <VideoIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Total Content</p>
                        <h3 className="text-2xl font-bold text-neutral-900 dark:text-white">{stats.totalVideos + stats.totalNotes + stats.totalMockTests + stats.totalLiveClasses}</h3>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-[9px] font-bold text-neutral-500 uppercase tracking-tighter">
                      <span>{stats.totalVideos} Videos</span>
                      <span>{stats.totalNotes} Notes</span>
                      <span>{stats.totalLiveClasses} Live</span>
                      <span>{stats.totalMockTests} Tests</span>
                    </div>
                  </div>

                  <div className="p-6 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center text-red-600">
                        <AlertCircle className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Pending Approvals</p>
                        <h3 className="text-2xl font-bold text-neutral-900 dark:text-white">{stats.pendingApprovals}</h3>
                      </div>
                    </div>
                    <button 
                      onClick={() => setActiveTab('approvals')}
                      className="text-xs font-bold text-red-600 hover:underline"
                    >
                      Review Requests →
                    </button>
                  </div>
                </div>

                <div className="p-8 bg-blue-600 rounded-[2rem] text-white relative overflow-hidden">
                  <div className="relative z-10">
                    <h2 className="text-3xl font-bold mb-2">Welcome back, Admin!</h2>
                    <p className="text-blue-100 max-w-md">Your educational platform is growing. Use the quick actions below or the sidebar to manage your content.</p>
                  </div>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-400/20 rounded-full -ml-10 -mb-10 blur-2xl" />
                </div>

                {/* Quick Add Section - This is likely what is missing from "Dashboard Panel" */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Quick Content Creator</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button 
                      onClick={() => setActiveTab('video')}
                      className="group p-6 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 hover:border-blue-500 transition-all text-center"
                    >
                      <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 mx-auto mb-4 group-hover:scale-110 transition-transform">
                        <VideoIcon className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-neutral-900 dark:text-white">Add Video</p>
                      <p className="text-[10px] text-neutral-400 uppercase tracking-widest mt-1">YouTube</p>
                    </button>

                    <button 
                      onClick={() => setActiveTab('note')}
                      className="group p-6 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 hover:border-green-500 transition-all text-center"
                    >
                      <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-2xl flex items-center justify-center text-green-600 mx-auto mb-4 group-hover:scale-110 transition-transform">
                        <FileText className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-neutral-900 dark:text-white">Add Notes</p>
                      <p className="text-[10px] text-neutral-400 uppercase tracking-widest mt-1">Study Material</p>
                    </button>

                    <button 
                      onClick={() => setActiveTab('live')}
                      className="group p-6 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 hover:border-red-500 transition-all text-center"
                    >
                      <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center text-red-600 mx-auto mb-4 group-hover:scale-110 transition-transform">
                        <Radio className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-neutral-900 dark:text-white">Go Live</p>
                      <p className="text-[10px] text-neutral-400 uppercase tracking-widest mt-1">Live Class</p>
                    </button>

                    <button 
                      onClick={() => setActiveTab('mockTest')}
                      className="group p-6 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 hover:border-amber-500 transition-all text-center"
                    >
                      <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center text-amber-600 mx-auto mb-4 group-hover:scale-110 transition-transform">
                        <ClipboardList className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-neutral-900 dark:text-white">Create Test</p>
                      <p className="text-[10px] text-neutral-400 uppercase tracking-widest mt-1">Mock Test</p>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'approvals' ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Payment Approvals</h2>
              <p className="text-neutral-500 dark:text-neutral-400">Verify and approve student payment proofs</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {fetchingContent ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                <p className="text-neutral-500">Fetching payment requests...</p>
              </div>
            ) : paymentRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800">
                <ShieldCheck className="w-12 h-12 text-neutral-300 mb-4" />
                <p className="text-neutral-500">No payment requests found</p>
              </div>
            ) : (
              paymentRequests.map((request) => (
                <div 
                  key={request.id}
                  className={cn(
                    "bg-white dark:bg-neutral-900 p-6 rounded-3xl border transition-all flex flex-col md:flex-row gap-6",
                    request.status === 'pending' ? "border-blue-200 dark:border-blue-900/30 ring-1 ring-blue-50 dark:ring-blue-900/10" : "border-neutral-200 dark:border-neutral-800"
                  )}
                >
                  <div className="w-full md:w-48 h-48 rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 flex-shrink-0 border border-neutral-200 dark:border-neutral-700">
                    <img 
                      src={request.screenshotUrl} 
                      alt="Payment Proof" 
                      className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform"
                      onClick={() => window.open(request.screenshotUrl, '_blank')}
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <div className="flex-1 space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn(
                            "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider",
                            request.status === 'pending' ? "bg-blue-100 text-blue-600" :
                            request.status === 'approved' ? "bg-green-100 text-green-600" :
                            "bg-red-100 text-red-600"
                          )}>
                            {request.status}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-md">
                            {request.contentType}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-neutral-900 dark:text-white">{request.contentTitle}</h3>
                        <p className="text-sm text-neutral-500">{request.userName} ({request.userEmail})</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-neutral-900 dark:text-white">₹{request.amount}</p>
                        <p className="text-[10px] text-neutral-400 font-mono uppercase">TXN: {request.transactionId}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 py-4 border-y border-neutral-100 dark:border-neutral-800">
                      <div>
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Submitted On</p>
                        <p className="text-sm text-neutral-700 dark:text-neutral-300">
                          {formatDate(request.createdAt)}
                        </p>
                      </div>
                      {request.rejectionReason && (
                        <div>
                          <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Rejection Reason</p>
                          <p className="text-sm text-red-600">{request.rejectionReason}</p>
                        </div>
                      )}
                    </div>

                    {request.status === 'pending' && (
                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={() => handleApprovePayment(request)}
                          disabled={blockingId === request.id}
                          className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                        >
                          {blockingId === request.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          Approve & Unlock
                        </button>
                        <button
                          onClick={() => {
                            const reason = prompt('Enter rejection reason:');
                            if (reason) handleRejectPayment(request, reason);
                          }}
                          disabled={blockingId === request.id}
                          className="flex-1 py-3 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                        >
                          <X className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : activeTab === 'students' ? (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Student Management</h2>
            <button
              onClick={() => setShowCreateStudent(!showCreateStudent)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 dark:shadow-none"
            >
              <Plus className="w-4 h-4" />
              {showCreateStudent ? 'Close Form' : 'Create New Student'}
            </button>
          </div>

          {showCreateStudent && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-neutral-900 p-8 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm"
            >
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-6">Create Individual Student ID & Password</h3>
              <form onSubmit={handleCreateStudent} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Full Name</label>
                  <input
                    type="text"
                    required
                    value={newStudentForm.fullName}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, fullName: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Student ID (Unique)</label>
                  <input
                    type="text"
                    required
                    value={newStudentForm.studentId}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, studentId: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. STU2024001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Email Address</label>
                  <input
                    type="email"
                    required
                    value={newStudentForm.email}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="student@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Password</label>
                  <input
                    type="text"
                    required
                    value={newStudentForm.password}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, password: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Set a secure password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Class</label>
                  <input
                    type="text"
                    required
                    value={newStudentForm.studentClass}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, studentClass: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Class 10"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
                    Create Student Account
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm">
            <div className="p-8 border-b border-neutral-100 dark:border-neutral-800">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Registered Students</h2>
              <p className="text-sm text-neutral-500 mt-1">View and manage student profiles</p>
            </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-950/50">
                  <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-widest">Student</th>
                  <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-widest">Details</th>
                  <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-widest">Contact</th>
                  <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-widest">Joined</th>
                  <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {fetchingContent ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm text-neutral-500">Loading students...</p>
                      </div>
                    </td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-neutral-500 italic">No students registered yet.</td>
                  </tr>
                ) : (
                  students.map((student) => (
                    <tr key={student.uid} className={cn(
                      "hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors group",
                      student.blocked && "bg-red-50/50 dark:bg-red-900/10"
                    )}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <img 
                              src={student.photoURL || `https://ui-avatars.com/api/?name=${student.displayName}`} 
                              alt="" 
                              className={cn(
                                "w-10 h-10 rounded-xl object-cover",
                                student.blocked && "grayscale opacity-50"
                              )}
                            />
                            {student.blocked && (
                              <div className="absolute -top-1 -right-1 bg-red-500 text-white p-0.5 rounded-full">
                                <X className="w-2.5 h-2.5" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-neutral-900 dark:text-white">{student.fullName || student.displayName}</p>
                              {student.studentId && (
                                <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold rounded uppercase tracking-wider">ID: {student.studentId}</span>
                              )}
                              {student.blocked && (
                                <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-bold rounded uppercase tracking-wider">Blocked</span>
                              )}
                            </div>
                            <p className="text-xs text-neutral-500">{student.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                            <GraduationCap className="w-3 h-3" />
                            <span>Class: {student.studentClass || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                            <School className="w-3 h-3" />
                            <span>{student.school || 'No school set'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                            <Phone className="w-3 h-3" />
                            <span>{student.contact || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                            <Calendar className="w-3 h-3" />
                            <span>DOB: {student.dob || 'N/A'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-neutral-500">
                          {student.createdAt ? new Date(student.createdAt).toLocaleDateString() : 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleTogglePremiumStudent(student)}
                            disabled={blockingId === student.uid}
                            className={cn(
                              "p-2 rounded-lg transition-all",
                              student.isPremium 
                                ? "text-amber-600 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100" 
                                : "text-neutral-400 bg-neutral-50 dark:bg-neutral-900/20 hover:bg-neutral-100"
                            )}
                            title={student.isPremium ? "Remove Premium" : "Grant Premium"}
                          >
                            {blockingId === student.uid ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <DollarSign className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedStudentForUnlocks(student);
                              setShowUnlocksModal(true);
                              fetchAllContentForUnlocks();
                            }}
                            className="p-2 rounded-lg text-blue-600 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 transition-all"
                            title="Manage Individual Unlocks"
                          >
                            <Unlock className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleBlockStudent(student)}
                            disabled={blockingId === student.uid}
                            className={cn(
                              "p-2 rounded-lg transition-all",
                              student.blocked 
                                ? "text-green-600 bg-green-50 dark:bg-green-900/20 hover:bg-green-100" 
                                : "text-amber-600 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100"
                            )}
                            title={student.blocked ? "Unblock Student" : "Block Student"}
                          >
                            {blockingId === student.uid ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : student.blocked ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <EyeOff className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStudent(student.uid)}
                            disabled={blockingId === student.uid}
                            className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all disabled:opacity-50"
                            title="Remove Student"
                          >
                            {blockingId === student.uid ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-neutral-900 p-8 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                {editingId ? 'Edit' : 'Add New'} {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
              </h2>
              {editingId && (
                <button 
                  onClick={resetForms}
                  className="text-xs font-bold text-blue-600 hover:underline"
                >
                  Cancel Editing
                </button>
              )}
            </div>
            
            {success && (
              <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-xl flex items-center gap-3 border border-green-100 dark:border-green-900/30">
                <Check className="w-5 h-5" />
                Content {editingId ? 'updated' : 'added'} successfully!
              </div>
            )}
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-xl flex items-center gap-3 border border-red-100 dark:border-red-900/30">
                <AlertCircle className="w-5 h-5" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {activeTab === 'video' && (
                <>
                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">YouTube Video ID or URL</label>
                      <input
                        type="text"
                        required
                        value={videoForm.youtubeId}
                        onChange={(e) => setVideoForm({ ...videoForm, youtubeId: extractYoutubeId(e.target.value) })}
                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. dQw4w9WgXcQ or full URL"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Class</label>
                      <input
                        type="text"
                        required
                        value={videoForm.class}
                        onChange={(e) => setVideoForm({ ...videoForm, class: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. Class 10"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Subject</label>
                      <input
                        type="text"
                        required
                        value={videoForm.subject}
                        onChange={(e) => setVideoForm({ ...videoForm, subject: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. Biology"
                      />
                    </div>
                    <div className="flex items-end gap-4">
                      <div className="flex-1">
                        <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Chapter</label>
                        <input
                          type="text"
                          required
                          value={videoForm.chapter}
                          onChange={(e) => setVideoForm({ ...videoForm, chapter: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g. Chapter 1"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setVideoForm({ ...videoForm, hidden: !videoForm.hidden })}
                        className={cn(
                          "p-3 rounded-xl border transition-all",
                          videoForm.hidden 
                            ? "bg-red-50 dark:bg-red-900/20 text-red-600 border-red-200 dark:border-red-900/30" 
                            : "bg-green-50 dark:bg-green-900/20 text-green-600 border-green-200 dark:border-green-900/30"
                        )}
                        title={videoForm.hidden ? "Hidden" : "Visible"}
                      >
                        {videoForm.hidden ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setVideoForm({ ...videoForm, isPremium: !videoForm.isPremium })}
                        className={cn(
                          "p-3 rounded-xl border transition-all",
                          videoForm.isPremium 
                            ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 border-amber-200 dark:border-amber-900/30" 
                            : "bg-neutral-50 dark:bg-neutral-900/20 text-neutral-400 border-neutral-200 dark:border-neutral-800"
                        )}
                        title={videoForm.isPremium ? "Premium Content" : "Free Content"}
                      >
                        <DollarSign className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  {videoForm.isPremium && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                      <div>
                        <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Individual Video Price (₹) - Leave 0 for global premium only</label>
                        <input
                          type="number"
                          value={videoForm.price}
                          onChange={(e) => setVideoForm({ ...videoForm, price: Number(e.target.value) })}
                          className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g. 99"
                        />
                      </div>
                      <div>
                        <FileUpload 
                          label="Upload Specific QR Code for this Video (Optional)"
                          accept="image/*"
                          folder="payments"
                          useBase64={true}
                          onUploadComplete={(url) => setVideoForm({ ...videoForm, qrCodeUrl: url })}
                        />
                        {videoForm.qrCodeUrl && (
                          <div className="mt-2 p-2 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 w-fit">
                            <img src={videoForm.qrCodeUrl} alt="QR Code" className="w-20 h-20 object-contain" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {activeTab === 'note' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Subject</label>
                      <input
                        type="text"
                        required
                        value={noteForm.subject}
                        onChange={(e) => setNoteForm({ ...noteForm, subject: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. Biology"
                      />
                    </div>
                    <div className="flex items-end gap-4">
                      <div className="flex-1">
                        <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Chapter</label>
                        <input
                          type="text"
                          required
                          value={noteForm.chapter}
                          onChange={(e) => setNoteForm({ ...noteForm, chapter: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g. Chapter 1"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setNoteForm({ ...noteForm, hidden: !noteForm.hidden })}
                        className={cn(
                          "p-3 rounded-xl border transition-all",
                          noteForm.hidden 
                            ? "bg-red-50 dark:bg-red-900/20 text-red-600 border-red-200 dark:border-red-900/30" 
                            : "bg-green-50 dark:bg-green-900/20 text-green-600 border-green-200 dark:border-green-900/30"
                        )}
                        title={noteForm.hidden ? "Hidden" : "Visible"}
                      >
                        {noteForm.hidden ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setNoteForm({ ...noteForm, isPremium: !noteForm.isPremium })}
                        className={cn(
                          "p-3 rounded-xl border transition-all",
                          noteForm.isPremium 
                            ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 border-amber-200 dark:border-amber-900/30" 
                            : "bg-neutral-50 dark:bg-neutral-900/20 text-neutral-400 border-neutral-200 dark:border-neutral-800"
                        )}
                        title={noteForm.isPremium ? "Premium Content" : "Free Content"}
                      >
                        <DollarSign className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  {noteForm.isPremium && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                      <div>
                        <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Individual Note Price (₹) - Leave 0 for global premium only</label>
                        <input
                          type="number"
                          value={noteForm.price}
                          onChange={(e) => setNoteForm({ ...noteForm, price: Number(e.target.value) })}
                          className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g. 49"
                        />
                      </div>
                      <div>
                        <FileUpload 
                          label="Upload Specific QR Code for this Note (Optional)"
                          accept="image/*"
                          folder="payments"
                          useBase64={true}
                          onUploadComplete={(url) => setNoteForm({ ...noteForm, qrCodeUrl: url })}
                        />
                        {noteForm.qrCodeUrl && (
                          <div className="mt-2 p-2 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 w-fit">
                            <img src={noteForm.qrCodeUrl} alt="QR Code" className="w-20 h-20 object-contain" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Title</label>
                    <input
                      type="text"
                      required
                      value={noteForm.title}
                      onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Note Title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Content (Markdown supported)</label>
                    <textarea
                      required
                      value={noteForm.content}
                      onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 h-48 font-mono text-sm"
                      placeholder="# Chapter 1: Introduction..."
                    />
                  </div>
                  
                  <FileUpload 
                    label="Upload PDF Note (Optional)"
                    accept=".pdf"
                    folder="notes"
                    useBase64={true}
                    onUploadComplete={(url) => setNoteForm({ ...noteForm, pdfUrl: url })}
                  />
                  <p className="text-[10px] text-neutral-500 mt-1">Note: PDF must be under 1MB for direct upload. For larger files, use a URL.</p>
                  
                  {(!noteForm.pdfUrl || editingId) && (
                    <div>
                      <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Or Provide PDF URL</label>
                      <input
                        type="url"
                        value={noteForm.pdfUrl}
                        onChange={(e) => setNoteForm({ ...noteForm, pdfUrl: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://example.com/notes.pdf"
                      />
                    </div>
                  )}
                </>
              )}

              {activeTab === 'live' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Class Title</label>
                      <input
                        type="text"
                        required
                        value={liveForm.title}
                        onChange={(e) => setLiveForm({ ...liveForm, title: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Live Session Title"
                      />
                    </div>
                    <div className="flex items-end gap-4">
                      <div className="flex-1">
                        <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Status</label>
                        <select
                          value={liveForm.status}
                          onChange={(e) => setLiveForm({ ...liveForm, status: e.target.value as any })}
                          className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="upcoming">Upcoming</option>
                          <option value="live">Live Now</option>
                          <option value="recorded">Recorded</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLiveForm({ ...liveForm, hidden: !liveForm.hidden })}
                        className={cn(
                          "p-3 rounded-xl border transition-all",
                          liveForm.hidden 
                            ? "bg-red-50 dark:bg-red-900/20 text-red-600 border-red-200 dark:border-red-900/30" 
                            : "bg-green-50 dark:bg-green-900/20 text-green-600 border-green-200 dark:border-green-900/30"
                        )}
                        title={liveForm.hidden ? "Hidden" : "Visible"}
                      >
                        {liveForm.hidden ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setLiveForm({ ...liveForm, isPremium: !liveForm.isPremium })}
                        className={cn(
                          "p-3 rounded-xl border transition-all",
                          liveForm.isPremium 
                            ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 border-amber-200 dark:border-amber-900/30" 
                            : "bg-neutral-50 dark:bg-neutral-900/20 text-neutral-400 border-neutral-200 dark:border-neutral-800"
                        )}
                        title={liveForm.isPremium ? "Premium Content" : "Free Content"}
                      >
                        <DollarSign className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  {liveForm.isPremium && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                      <div>
                        <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Individual Live Class Price (₹) - Leave 0 for global premium only</label>
                        <input
                          type="number"
                          value={liveForm.price}
                          onChange={(e) => setLiveForm({ ...liveForm, price: Number(e.target.value) })}
                          className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g. 199"
                        />
                      </div>
                      <div>
                        <FileUpload 
                          label="Upload Specific QR Code for this Live Class (Optional)"
                          accept="image/*"
                          folder="payments"
                          useBase64={true}
                          onUploadComplete={(url) => setLiveForm({ ...liveForm, qrCodeUrl: url })}
                        />
                        {liveForm.qrCodeUrl && (
                          <div className="mt-2 p-2 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 w-fit">
                            <img src={liveForm.qrCodeUrl} alt="QR Code" className="w-20 h-20 object-contain" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">YouTube Live URL</label>
                      <input
                        type="url"
                        required
                        value={liveForm.youtubeLiveUrl}
                        onChange={(e) => setLiveForm({ ...liveForm, youtubeLiveUrl: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://youtube.com/live/..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Start Date & Time</label>
                      <input
                        type="datetime-local"
                        required
                        value={liveForm.startTime}
                        onChange={(e) => setLiveForm({ ...liveForm, startTime: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'mockTest' && (
                <>
                  {/* Test Summary Card */}
                  <div className="p-6 bg-blue-50 dark:bg-blue-900/10 rounded-3xl border border-blue-100 dark:border-blue-900/20 flex items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                        <ClipboardList className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Assessment Summary</h3>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Review your test details before publishing</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-center">
                        <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1">Questions</p>
                        <p className="text-2xl font-bold text-blue-600">{mockTestForm.questions.length}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Test Title</label>
                        <input
                          type="text"
                          required
                          value={mockTestForm.title}
                          onChange={(e) => setMockTestForm({ ...mockTestForm, title: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g. NEET Biology Mock 1"
                        />
                      </div>
                      <div className="pt-7">
                        <button
                          type="button"
                          onClick={() => setMockTestForm({ ...mockTestForm, hidden: !mockTestForm.hidden })}
                          className={cn(
                            "flex items-center gap-2 px-4 py-3 rounded-xl font-bold transition-all",
                            mockTestForm.hidden 
                              ? "bg-red-50 dark:bg-red-900/20 text-red-600 border border-red-200 dark:border-red-900/30" 
                              : "bg-green-50 dark:bg-green-900/20 text-green-600 border border-green-200 dark:border-green-900/30"
                          )}
                        >
                          {mockTestForm.hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          {mockTestForm.hidden ? 'Hidden' : 'Visible'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setMockTestForm({ ...mockTestForm, isPremium: !mockTestForm.isPremium })}
                          className={cn(
                            "flex items-center gap-2 px-4 py-3 rounded-xl font-bold transition-all",
                            mockTestForm.isPremium 
                              ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 border border-amber-200 dark:border-amber-900/30" 
                              : "bg-neutral-50 dark:bg-neutral-900/20 text-neutral-400 border border-neutral-200 dark:border-neutral-800"
                          )}
                        >
                          <DollarSign className="w-4 h-4" />
                          {mockTestForm.isPremium ? 'Premium' : 'Free'}
                        </button>
                      </div>
                    </div>
                    {mockTestForm.isPremium && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2">
                        <div>
                          <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Individual Mock Test Price (₹) - Leave 0 for global premium only</label>
                          <input
                            type="number"
                            value={mockTestForm.price}
                            onChange={(e) => setMockTestForm({ ...mockTestForm, price: Number(e.target.value) })}
                            className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g. 149"
                          />
                        </div>
                        <div>
                          <FileUpload 
                            label="Upload Specific QR Code for this Test (Optional)"
                            accept="image/*"
                            folder="payments"
                            useBase64={true}
                            onUploadComplete={(url) => setMockTestForm({ ...mockTestForm, qrCodeUrl: url })}
                          />
                          {mockTestForm.qrCodeUrl && (
                            <div className="mt-2 p-2 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 w-fit">
                              <img src={mockTestForm.qrCodeUrl} alt="QR Code" className="w-20 h-20 object-contain" />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Question Builder */}
                  <div className="mt-8 p-8 bg-neutral-50 dark:bg-neutral-950/50 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-inner">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-neutral-900 dark:bg-white rounded-xl flex items-center justify-center text-white dark:text-neutral-900">
                        <Plus className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                          {editingQuestionIndex !== null ? 'Edit Question' : 'Question Builder'}
                        </h3>
                        <p className="text-xs text-neutral-500">
                          {editingQuestionIndex !== null ? 'Update the selected question' : 'Construct your assessment questions one by one'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                      <div>
                        <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Question Text</label>
                        <textarea
                          value={currentQuestion.text}
                          onChange={(e) => setCurrentQuestion({ ...currentQuestion, text: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 h-24"
                          placeholder="What is the powerhouse of the cell?"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {currentQuestion.options?.map((opt, idx) => (
                          <div key={idx}>
                            <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Option {idx + 1}</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => {
                                  const newOpts = [...(currentQuestion.options || [])];
                                  newOpts[idx] = e.target.value;
                                  setCurrentQuestion({ ...currentQuestion, options: newOpts });
                                }}
                                className="flex-1 px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder={`Option ${idx + 1}`}
                              />
                              <button
                                type="button"
                                onClick={() => setCurrentQuestion({ ...currentQuestion, correctOptionIndex: idx })}
                                className={cn(
                                  "p-2 rounded-xl border transition-all",
                                  currentQuestion.correctOptionIndex === idx 
                                    ? "bg-green-600 border-green-600 text-white" 
                                    : "border-neutral-200 dark:border-neutral-800 text-neutral-400 hover:border-green-600"
                                )}
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-3">
                        {editingQuestionIndex !== null && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingQuestionIndex(null);
                              setCurrentQuestion({ text: '', options: ['', '', '', ''], correctOptionIndex: 0 });
                            }}
                            className="flex-1 py-3 bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl font-bold hover:opacity-90 transition-all"
                          >
                            Cancel Edit
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={addQuestion}
                          className="flex-[2] py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          {editingQuestionIndex !== null ? 'Save Changes' : 'Add Question to List'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Questions List */}
                  {mockTestForm.questions.length > 0 && (
                    <div className="mt-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Questions ({mockTestForm.questions.length})</h3>
                        <button
                          type="button"
                          onClick={() => setMockTestForm(prev => ({ ...prev, questions: [] }))}
                          className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          Clear All
                        </button>
                      </div>
                      <div className="space-y-3">
                        {mockTestForm.questions.map((q, idx) => (
                          <div key={q.id} className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-neutral-900 dark:text-white">Q{idx + 1}: {q.text}</p>
                              <div className="grid grid-cols-2 gap-2 mt-2">
                                {q.options.map((opt, oIdx) => (
                                  <p key={oIdx} className={cn(
                                    "text-xs p-2 rounded-lg border",
                                    oIdx === q.correctOptionIndex 
                                      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/30 text-green-700 dark:text-green-400" 
                                      : "border-neutral-100 dark:border-neutral-800 text-neutral-500"
                                  )}>
                                    {opt}
                                  </p>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => editQuestion(idx)}
                                className="p-2 text-neutral-400 hover:text-blue-600 transition-colors"
                                title="Edit Question"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeQuestion(q.id)}
                                className="p-2 text-neutral-400 hover:text-red-500 transition-colors"
                                title="Remove Question"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {activeTab === 'contact' && (
                <div className="space-y-8">
                  {/* App Identity Section */}
                  <div className="p-6 bg-neutral-50 dark:bg-neutral-950/50 rounded-3xl border border-neutral-200 dark:border-neutral-800 space-y-6">
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-blue-600" />
                      App Identity
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">App Name</label>
                        <input
                          type="text"
                          value={contactForm.appName}
                          onChange={(e) => setContactForm({ ...contactForm, appName: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g. KK Sir bpt"
                        />
                      </div>
                      <div>
                        <FileUpload 
                          label="App Icon (Square recommended)"
                          accept="image/*"
                          folder="app"
                          useBase64={true}
                          onUploadComplete={(url) => setContactForm(prev => ({ ...prev, appIcon: url }))}
                        />
                        {contactForm.appIcon && (
                          <div className="mt-2 flex items-center gap-3">
                            <img src={contactForm.appIcon} alt="App Icon Preview" className="w-12 h-12 rounded-xl object-cover border border-neutral-200 dark:border-neutral-800" />
                            <span className="text-xs text-neutral-500">Current Icon Preview</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Social Links Section */}
                  <div className="space-y-6">
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                      <MessageCircle className="w-5 h-5 text-green-600" />
                      Contact & Social Links
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2 flex items-center gap-2">
                          <MessageCircle className="w-4 h-4 text-green-500" />
                          WhatsApp Number/Link
                        </label>
                        <input
                          type="text"
                          value={contactForm.whatsapp}
                          onChange={(e) => setContactForm({ ...contactForm, whatsapp: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g. https://wa.me/91XXXXXXXXXX"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2 flex items-center gap-2">
                          <Instagram className="w-4 h-4 text-pink-600" />
                          Instagram Profile URL
                        </label>
                        <input
                          type="text"
                          value={contactForm.instagram}
                          onChange={(e) => setContactForm({ ...contactForm, instagram: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="https://instagram.com/yourprofile"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2 flex items-center gap-2">
                          <TelegramIcon className="w-4 h-4 text-blue-500" />
                          Telegram Channel/Group Link
                        </label>
                        <input
                          type="text"
                          value={contactForm.telegram}
                          onChange={(e) => setContactForm({ ...contactForm, telegram: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="https://t.me/yourchannel"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2 flex items-center gap-2">
                          <Mail className="w-4 h-4 text-neutral-900 dark:text-white" />
                          Support Email
                        </label>
                        <input
                          type="email"
                          value={contactForm.email}
                          onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="support@example.com"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'monetization' && (
                <div className="space-y-8">
                  {/* Ads Configuration */}
                  <div className="p-6 bg-neutral-50 dark:bg-neutral-950/50 rounded-3xl border border-neutral-200 dark:border-neutral-800 space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-green-600" />
                        Ads Configuration (AdSense / AdMob)
                      </h3>
                      <button
                        type="button"
                        onClick={() => setMonetizationForm({ ...monetizationForm, adsEnabled: !monetizationForm.adsEnabled })}
                        className={cn(
                          "px-4 py-2 rounded-xl font-bold text-xs transition-all",
                          monetizationForm.adsEnabled 
                            ? "bg-green-600 text-white" 
                            : "bg-neutral-200 dark:bg-neutral-800 text-neutral-500"
                        )}
                      >
                        {monetizationForm.adsEnabled ? 'Ads Enabled' : 'Ads Disabled'}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Google AdSense Client ID</label>
                        <input
                          type="text"
                          value={monetizationForm.adSenseClientId}
                          onChange={(e) => setMonetizationForm({ ...monetizationForm, adSenseClientId: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="ca-pub-XXXXXXXXXXXXXXXX"
                        />
                        <p className="text-[10px] text-neutral-500 mt-1">Used for Web App monetization</p>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Google AdMob App ID</label>
                        <input
                          type="text"
                          value={monetizationForm.adMobAppId}
                          onChange={(e) => setMonetizationForm({ ...monetizationForm, adMobAppId: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX"
                        />
                        <p className="text-[10px] text-neutral-500 mt-1">Used for Android/iOS App monetization</p>
                      </div>
                    </div>
                  </div>

                  {/* Premium Subscription Section */}
                  <div className="p-6 bg-amber-50 dark:bg-amber-900/10 rounded-3xl border border-amber-100 dark:border-amber-900/20 space-y-6">
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-amber-600" />
                      Premium Subscription Settings
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Premium Price (₹)</label>
                        <input
                          type="number"
                          value={monetizationForm.premiumPrice}
                          onChange={(e) => setMonetizationForm({ ...monetizationForm, premiumPrice: Number(e.target.value) })}
                          className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g. 499"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Payment Link (Razorpay/Stripe)</label>
                        <input
                          type="url"
                          value={monetizationForm.paymentLink}
                          onChange={(e) => setMonetizationForm({ ...monetizationForm, paymentLink: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="https://rzp.io/l/yourlink"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Premium Benefits (One per line)</label>
                      <textarea
                        value={monetizationForm.premiumBenefits.join('\n')}
                        onChange={(e) => setMonetizationForm({ ...monetizationForm, premiumBenefits: e.target.value.split('\n') })}
                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 h-32"
                        placeholder="Ad-free experience&#10;Premium videos..."
                      />
                    </div>
                  </div>

                  {/* Bank Details Section */}
                  <div className="p-6 bg-blue-50 dark:bg-blue-900/10 rounded-3xl border border-blue-100 dark:border-blue-900/20 space-y-6">
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                      <School className="w-5 h-5 text-blue-600" />
                      Bank Details & QR Code (Manual Payment)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Bank Name</label>
                        <input
                          type="text"
                          value={monetizationForm.bankDetails.bankName}
                          onChange={(e) => setMonetizationForm({ 
                            ...monetizationForm, 
                            bankDetails: { ...monetizationForm.bankDetails, bankName: e.target.value } 
                          })}
                          className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g. State Bank of India"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Account Holder Name</label>
                        <input
                          type="text"
                          value={monetizationForm.bankDetails.accountHolder}
                          onChange={(e) => setMonetizationForm({ 
                            ...monetizationForm, 
                            bankDetails: { ...monetizationForm.bankDetails, accountHolder: e.target.value } 
                          })}
                          className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Name as per bank"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Account Number</label>
                        <input
                          type="text"
                          value={monetizationForm.bankDetails.accountNumber}
                          onChange={(e) => setMonetizationForm({ 
                            ...monetizationForm, 
                            bankDetails: { ...monetizationForm.bankDetails, accountNumber: e.target.value } 
                          })}
                          className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="1234567890"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">IFSC Code</label>
                        <input
                          type="text"
                          value={monetizationForm.bankDetails.ifscCode}
                          onChange={(e) => setMonetizationForm({ 
                            ...monetizationForm, 
                            bankDetails: { ...monetizationForm.bankDetails, ifscCode: e.target.value } 
                          })}
                          className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="SBIN0001234"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">UPI ID (VPA) - For Direct Payment Apps</label>
                        <input
                          type="text"
                          value={monetizationForm.bankDetails.upiId}
                          onChange={(e) => setMonetizationForm({ 
                            ...monetizationForm, 
                            bankDetails: { ...monetizationForm.bankDetails, upiId: e.target.value } 
                          })}
                          className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g. yourname@okaxis"
                        />
                      </div>
                      <div>
                        <FileUpload 
                          label="Upload Payment QR Code (Image)"
                          accept="image/*"
                          folder="payments"
                          useBase64={true}
                          onUploadComplete={(url) => setMonetizationForm({ 
                            ...monetizationForm, 
                            bankDetails: { ...monetizationForm.bankDetails, qrCodeUrl: url } 
                          })}
                        />
                        {monetizationForm.bankDetails.qrCodeUrl && (
                          <div className="mt-4 p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 w-fit">
                            <img src={monetizationForm.bankDetails.qrCodeUrl} alt="QR Code" className="w-32 h-32 object-contain" />
                            <p className="text-[10px] text-center text-neutral-500 mt-2">Current QR Code</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-100 dark:shadow-none"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : editingId ? (
                  <Check className="w-5 h-5" />
                ) : activeTab === 'contact' || activeTab === 'monetization' ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Plus className="w-5 h-5" />
                )}
                {loading ? 'Processing...' : activeTab === 'contact' ? 'Update App & Contact Settings' : activeTab === 'monetization' ? 'Update Monetization Settings' : editingId ? `Update ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}` : `Add ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`}
              </button>
            </form>
          </div>
        </div>

        {/* Existing Content List Section */}
        {activeTab !== 'contact' && activeTab !== 'monetization' && (
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-neutral-900 p-8 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm h-full max-h-[800px] overflow-y-auto">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-6">Existing {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}s</h2>
              
              {fetchingContent ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-neutral-500">Loading content...</p>
                </div>
              ) : existingContent.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-neutral-500 italic">No content found in this category.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {existingContent.map((item) => (
                    <div 
                      key={item.id}
                      className={cn(
                        "p-4 bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl border transition-all group",
                        editingId === item.id ? "border-blue-500 ring-2 ring-blue-500/10" : "border-neutral-200 dark:border-neutral-800"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-neutral-900 dark:text-white truncate">{activeTab === 'video' ? item.youtubeId : item.title}</h3>
                            {item.hidden && (
                              <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-bold rounded uppercase tracking-wider">Hidden</span>
                            )}
                          </div>
                          <p className="text-xs text-neutral-500 mt-1">
                            {activeTab === 'video' ? item.subject : activeTab === 'note' ? item.subject : activeTab === 'live' ? item.status : `${item.questions?.length || 0} Questions`}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button 
                            type="button"
                            onClick={async () => {
                              try {
                                const newHidden = !item.hidden;
                                const coll = activeTab === 'video' ? 'videos' : 
                                           activeTab === 'note' ? 'notes' : 
                                           activeTab === 'live' ? 'liveClasses' : 'mockTests';
                                
                                await updateDoc(doc(db, coll, item.id), { hidden: newHidden });
                                setExistingContent(prev => prev.map(i => i.id === item.id ? { ...i, hidden: newHidden } : i));
                                
                                // Sync with form if currently editing this item
                                if (editingId === item.id) {
                                  if (activeTab === 'video') setVideoForm(prev => ({ ...prev, hidden: newHidden }));
                                  else if (activeTab === 'note') setNoteForm(prev => ({ ...prev, hidden: newHidden }));
                                  else if (activeTab === 'live') setLiveForm(prev => ({ ...prev, hidden: newHidden }));
                                  else if (activeTab === 'mockTest') setMockTestForm(prev => ({ ...prev, hidden: newHidden }));
                                }
                                
                                toast.success(newHidden ? 'Content is now hidden' : 'Content is now visible');
                              } catch (err) {
                                toast.error('Failed to update visibility');
                              }
                            }}
                            className={cn(
                              "p-2 rounded-lg transition-all",
                              item.hidden ? "text-red-500 bg-red-50 dark:bg-red-900/20" : "text-green-500 bg-green-50 dark:bg-green-900/20"
                            )}
                            title={item.hidden ? "Make Visible" : "Hide"}
                          >
                            {item.hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleEdit(item)}
                            className="p-2 text-neutral-600 dark:text-neutral-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            disabled={blockingId === item.id}
                            className="p-2 text-neutral-600 dark:text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all disabled:opacity-50"
                            title="Delete"
                          >
                            {blockingId === item.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
          )}
          </motion.div>
        </AnimatePresence>
      </main>
      {/* Manage Unlocks Modal */}
      <AnimatePresence>
        {showUnlocksModal && selectedStudentForUnlocks && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUnlocksModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-3xl p-8 shadow-2xl max-h-[80vh] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-white">Manage Unlocks</h3>
                  <p className="text-sm text-neutral-500">For {selectedStudentForUnlocks.fullName || selectedStudentForUnlocks.displayName}</p>
                </div>
                <button onClick={() => setShowUnlocksModal(false)} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors">
                  <X className="w-6 h-6 text-neutral-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                {allContent.length === 0 ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
                    <p className="text-sm text-neutral-500">Loading content list...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {allContent.map((item) => {
                      const isUnlocked = selectedStudentForUnlocks.unlockedContent?.includes(item.id);
                      return (
                        <div 
                          key={item.id}
                          className={cn(
                            "p-4 rounded-2xl border flex items-center justify-between gap-4 transition-all",
                            isUnlocked 
                              ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30" 
                              : "bg-neutral-50 dark:bg-neutral-900/50 border-neutral-200 dark:border-neutral-800"
                          )}
                        >
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-2 py-0.5 bg-white dark:bg-neutral-800 rounded-md border border-neutral-100 dark:border-neutral-700 mb-1 inline-block">
                              {item.type}
                            </span>
                            <h4 className="text-sm font-bold text-neutral-900 dark:text-white">{item.title}</h4>
                            <p className="text-[10px] text-neutral-500 font-mono mt-0.5">ID: {item.id}</p>
                          </div>
                          <button
                            onClick={() => handleToggleContentUnlock(selectedStudentForUnlocks.uid, item.id, !isUnlocked)}
                            className={cn(
                              "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                              isUnlocked
                                ? "bg-red-100 text-red-600 hover:bg-red-200"
                                : "bg-blue-600 text-white hover:bg-blue-700"
                            )}
                          >
                            {isUnlocked ? 'Lock Content' : 'Unlock Content'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  onClick={() => setShowUnlocksModal(false)}
                  className="w-full py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl font-bold hover:opacity-90 transition-all"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
