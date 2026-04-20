export type UserRole = 'student' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: UserRole;
  createdAt: string;
  fullName?: string;
  dob?: string;
  studentClass?: string;
  school?: string;
  contact?: string;
  studentId?: string;
  profileCompleted?: boolean;
  savedNotes?: string[];
  watchedVideos?: string[];
  blocked?: boolean;
  isPremium?: boolean;
  premiumUntil?: string;
  unlockedContent?: string[];
}

export interface Video {
  id: string;
  youtubeId: string;
  title?: string;
  description?: string;
  category?: string;
  thumbnail: string;
  createdAt: string;
  class?: string;
  subject?: string;
  chapter?: string;
  hidden?: boolean;
  isPremium?: boolean;
  price?: number;
  qrCodeUrl?: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  pdfUrl?: string;
  subject: string;
  chapter: string;
  createdAt: string;
  hidden?: boolean;
  isPremium?: boolean;
  price?: number;
  qrCodeUrl?: string;
}

export interface LiveClass {
  id: string;
  title: string;
  youtubeLiveUrl: string;
  startTime: string;
  status: 'upcoming' | 'live' | 'recorded';
  hidden?: boolean;
  isPremium?: boolean;
  price?: number;
  qrCodeUrl?: string;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctOptionIndex: number;
}

export interface MockTest {
  id: string;
  title: string;
  questions: Question[];
  createdAt: string;
  hidden?: boolean;
  isPremium?: boolean;
  price?: number;
  qrCodeUrl?: string;
}

export interface TestResult {
  id: string;
  userId: string;
  testId: string;
  testTitle: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  skippedAnswers: number;
  completedAt: string;
  answers: { [questionId: string]: number }; // questionId -> selectedOptionIndex
}

export interface ContactSettings {
  whatsapp: string;
  instagram: string;
  telegram: string;
  email: string;
  appName?: string;
  appIcon?: string;
  updatedAt: string;
}

export interface MonetizationSettings {
  adsEnabled: boolean;
  adSenseClientId?: string;
  adMobAppId?: string;
  paymentLink?: string;
  premiumPrice?: number;
  premiumBenefits?: string[];
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    accountHolder: string;
    upiId?: string;
    qrCodeUrl?: string;
  };
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole?: string;
  text: string;
  channelId: string;
  createdAt: string;
  attachment?: {
    url: string;
    type: 'image' | 'video' | 'pdf' | 'audio' | 'other';
    name: string;
  };
  replyTo?: {
    id: string;
    text: string;
    senderName: string;
  };
  isEdited?: boolean;
  isDeleted?: boolean;
}

export interface PaymentRequest {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  amount: number;
  transactionId: string;
  screenshotUrl: string;
  contentId: string; // 'premium' for full subscription, or specific item ID
  contentTitle: string;
  contentType: 'subscription' | 'video' | 'note' | 'liveClass' | 'mockTest';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
  rejectionReason?: string;
}

export interface AppNotification {
  id: string;
  userId: string; // 'all' for admin uploads, or specific userId for targeted notifications
  title: string;
  message: string;
  type: 'upload' | 'approval' | 'system' | 'payment_request';
  link?: string; // Where to redirect when clicked
  image?: string;
  read: boolean;
  createdAt: string;
}
