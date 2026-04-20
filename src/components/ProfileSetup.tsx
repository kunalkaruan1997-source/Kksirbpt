import { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'motion/react';
import { User, Calendar, GraduationCap, School, MapPin, Phone, Save, Lock, Shield, Upload, Camera, Info, Eye, EyeOff, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { updatePassword } from 'firebase/auth';
import { auth } from '../lib/firebase';

export default function ProfileSetup() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [formData, setFormData] = useState({
    fullName: profile?.fullName || '',
    dob: profile?.dob || '',
    studentClass: profile?.studentClass || '',
    school: profile?.school || '',
    contact: profile?.contact || '',
    photoURL: profile?.photoURL || '',
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024) { // 500KB limit for Base64 in Firestore
      toast.error('Image size must be less than 500KB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, photoURL: reader.result as string }));
      toast.success('Image uploaded locally. Save changes to apply.');
    };
    reader.readAsDataURL(file);
  };

  // Sync form data once profile is loaded
  useEffect(() => {
    if (profile) {
      setFormData({
        fullName: profile.fullName || '',
        dob: profile.dob || '',
        studentClass: profile.studentClass || '',
        school: profile.school || '',
        contact: profile.contact || '',
        photoURL: profile.photoURL || '',
      });
    }
  }, [profile]);

  const [showPassword, setShowPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleSendResetEmail = async () => {
    if (!user?.email) return;
    const resetEmail = user.email.trim();
    setIsResetting(true);
    try {
      const { sendPasswordResetEmail } = await import('firebase/auth');
      
      // Use custom action URL to handle reset within the app
      const actionCodeSettings = {
        url: `${window.location.origin}/auth/action`,
        handleCodeInApp: true,
      };

      await sendPasswordResetEmail(auth, resetEmail, actionCodeSettings);
      toast.success('Reset link sent to ' + resetEmail + '. Please check your inbox and Spam folder.', {
        duration: 6000
      });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsResetting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate mandatory fields
    if (!formData.fullName || !formData.dob || !formData.studentClass || !formData.school) {
      setError('Please fill in all mandatory fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Update Password if provided
      if (newPassword) {
        if (newPassword.length < 6) {
          throw new Error('Password must be at least 6 characters long');
        }
        await updatePassword(user, newPassword);
      }

      // 2. Update Firestore Profile
      const docRef = doc(db, 'users', user.uid);
      
      // Use existing studentId or generate one if missing (fallback)
      const studentId = profile?.studentId || `STU${Math.floor(1000 + Math.random() * 9000)}${Date.now().toString().slice(-4)}`;

      await updateDoc(docRef, {
        ...formData,
        studentId,
        profileCompleted: true,
        displayName: formData.fullName,
      });

      toast.success('Profile and security settings updated successfully');
      setNewPassword('');
      navigate('/');
    } catch (err: any) {
      console.error('Profile update error:', err);
      if (err.code === 'auth/requires-recent-login') {
        setError('For security reasons, please log out and log back in to change your password.');
      } else {
        setError(err.message || 'Failed to update profile');
      }
      toast.error('Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center p-6 transition-colors duration-300">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden"
      >
        <div className="p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200 dark:shadow-none">
              <User className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Profile Management</h2>
              <p className="text-neutral-500 dark:text-neutral-400">Manage your personal details and security</p>
            </div>
            {profile?.studentId && (
              <div className="text-right">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Your Student ID</p>
                <p className="text-lg font-black text-blue-600 dark:text-blue-400 tracking-tight">{profile.studentId}</p>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-100 dark:border-red-900/30">
              {error}
            </div>
          )}

          <div className="space-y-8">
            <form onSubmit={handleSubmit} className="space-y-12">
              <section>
                <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  Profile Picture
                </h3>
                <div className="flex flex-col md:flex-row items-center gap-8 bg-neutral-50 dark:bg-neutral-800/50 p-6 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                  <div className="relative group">
                    <img 
                      src={formData.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.fullName || 'User')}&background=random`} 
                      alt="Profile" 
                      className="w-32 h-32 rounded-full object-cover border-4 border-white dark:border-neutral-900 shadow-2xl transition-transform group-hover:scale-105"
                    />
                    <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2.5 rounded-full shadow-lg cursor-pointer hover:bg-blue-700 transition-all hover:scale-110">
                      <Upload className="w-5 h-5" />
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={handleImageUpload}
                      />
                    </label>
                  </div>
                  <div className="flex-1 w-full space-y-4">
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      <Info className="w-3 h-3" />
                      <p>Upload a profile picture to personalize your account.</p>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                        <input
                          type="text"
                          required
                          value={formData.fullName}
                          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                          placeholder="John Doe"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        Date of Birth <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                        <input
                          type="date"
                          required
                          value={formData.dob}
                          onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        Class/Grade <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                        <input
                          type="text"
                          required
                          value={formData.studentClass}
                          onChange={(e) => setFormData({ ...formData, studentClass: e.target.value })}
                          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                          placeholder="e.g. 10th Standard"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        School Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <School className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                        <input
                          type="text"
                          required
                          value={formData.school}
                          onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                          placeholder="Your School Name"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        Contact Number <span className="text-neutral-400 text-xs">(Optional)</span>
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                        <input
                          type="tel"
                          value={formData.contact}
                          onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                          placeholder="+91 98765 43210"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="pt-8 border-t border-neutral-100 dark:border-neutral-800">
                <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Security & Password
                </h3>
                <div className="max-w-md space-y-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        Change Password <span className="text-neutral-400 text-xs">(Leave blank to keep current)</span>
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                        <input
                          type={showPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full pl-10 pr-12 py-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                          placeholder="Enter new password"
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      <p className="mt-1 text-[10px] text-neutral-500">Minimum 6 characters required</p>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/20">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Alternative Method</p>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">If you're having trouble changing your password here, we can send a reset link to your email.</p>
                        <button
                          type="button"
                          onClick={handleSendResetEmail}
                          disabled={isResetting}
                          className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                        >
                          <Send className="w-3.5 h-3.5" />
                          {isResetting ? 'Sending...' : 'Send Password Reset Email'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <div className="pt-8 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-100 dark:shadow-none"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="w-6 h-6" />
                  )}
                  Save All Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
