import { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { LogIn, UserPlus, Mail, Lock, Chrome, User } from 'lucide-react';
import { motion } from 'motion/react';
import { useAppSettings } from '../hooks/useAppSettings';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [loading, setLoading] = useState(false);
  const { settings } = useAppSettings();
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleResetPassword = async (e: React.MouseEvent | React.FormEvent) => {
    if (e) e.preventDefault();
    if (!identifier) {
      setError('Please enter your Student ID or Email address first to reset password');
      return;
    }
    setIsResetting(true);
    setError('');
    try {
      let resetEmail = identifier.trim();

      // 1. Find the email (either from Student ID or directly)
      if (!resetEmail.includes('@')) {
        const q = query(
          collection(db, 'users'), 
          where('studentId', '==', resetEmail),
          limit(1)
        );
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          throw new Error('No student found with ID "' + resetEmail + '". Please check your ID.');
        }
        
        resetEmail = querySnapshot.docs[0].data().email;
      } else {
        // Even if it's an email, check if it exists in our users collection
        const q = query(
          collection(db, 'users'), 
          where('email', '==', resetEmail),
          limit(1)
        );
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          throw new Error('This email address is not registered in our database. Please check for typos or sign up.');
        }
      }

      // 2. Send the reset email
      const { sendPasswordResetEmail } = await import('firebase/auth');
      
      // Use custom action URL to handle reset within the app
      const actionCodeSettings = {
        url: `${window.location.origin}/auth/action`,
        handleCodeInApp: true,
      };

      await sendPasswordResetEmail(auth, resetEmail, actionCodeSettings);
      
      setResetEmailSent(true);
      toast.success('Reset link sent to ' + resetEmail + '. Check your inbox and SPAM folder!', {
        duration: 8000,
      });
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsResetting(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let loginEmail = identifier;

      // If it's a login attempt and doesn't look like an email, try to find by Student ID
      if (isLogin && !identifier.includes('@')) {
        console.log('Attempting login with Student ID:', identifier);
        const q = query(
          collection(db, 'users'), 
          where('studentId', '==', identifier),
          limit(1)
        );
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          console.error('No user found with Student ID:', identifier);
          throw new Error('No student found with this ID. Please use your registered email or check your ID.');
        }
        
        loginEmail = querySnapshot.docs[0].data().email;
        console.log('Found email for Student ID:', loginEmail);
      }

      if (isLogin) {
        await signInWithEmailAndPassword(auth, loginEmail, password);
      } else {
        if (!fullName) {
          throw new Error('Please enter your full name');
        }
        const { updateProfile } = await import('firebase/auth');
        const userCredential = await createUserWithEmailAndPassword(auth, loginEmail, password);
        await updateProfile(userCredential.user, {
          displayName: fullName
        });
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center justify-center p-6 transition-colors duration-300">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[350px] space-y-4"
      >
        {/* Main Auth Box */}
        <div className="bg-white dark:bg-neutral-900 p-10 border border-neutral-200 dark:border-neutral-800 rounded-sm shadow-sm">
          <div className="flex justify-center mb-10">
            <h1 className="text-4xl font-bold italic tracking-tighter text-neutral-900 dark:text-white">
              {settings?.appName || 'KK Sir bpt'}
            </h1>
          </div>
          
          {error && (
            <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs text-center rounded border border-red-100 dark:border-red-900/30">
              {error}
            </div>
          )}

          {resetEmailSent && (
            <div className="mb-6 space-y-3">
              <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-xs text-center rounded border border-green-100 dark:border-green-900/30">
                Password reset link sent to your email!
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded border border-blue-100 dark:border-blue-900/20">
                <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase mb-2">Not receiving the email?</p>
                <ul className="text-[10px] text-blue-700 dark:text-blue-300 list-disc list-inside space-y-1">
                  <li>Check your <strong>Spam/Junk</strong> folder</li>
                  <li>Wait 2-3 minutes for the mail to arrive</li>
                  <li>Ensure you used the correct email address</li>
                  <li>Try logging in with <strong>Google</strong> instead</li>
                </ul>
              </div>
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-2">
            {!isLogin && (
              <div className="relative">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white focus:border-neutral-400 outline-none transition-all"
                  placeholder="Full Name"
                  required={!isLogin}
                />
              </div>
            )}

            <div className="relative">
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white focus:border-neutral-400 outline-none transition-all"
                placeholder={isLogin ? "Student ID or Email" : "Email Address"}
                required
              />
            </div>

            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white focus:border-neutral-400 outline-none transition-all"
                placeholder="Password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-500 text-white py-1.5 rounded font-bold text-sm hover:bg-blue-600 transition-colors disabled:opacity-50 mt-4"
            >
              {loading ? 'Processing...' : isLogin ? 'Log In' : 'Sign Up'}
            </button>
            {!isLogin && (
              <p className="text-[10px] text-neutral-500 text-center mt-2 px-4">
                By signing up, you'll be assigned a unique Student ID to access your dashboard.
              </p>
            )}
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200 dark:border-neutral-800"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-4 bg-white dark:bg-neutral-900 text-neutral-400 font-bold uppercase">OR</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 py-2 border border-neutral-200 dark:border-neutral-800 rounded text-sm font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            <Chrome className="w-4 h-4 text-blue-500" />
            Continue with Google
          </button>

          {isLogin && (
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={isResetting}
                className="text-xs text-blue-900 dark:text-blue-400 hover:underline"
              >
                Forgot password?
              </button>
            </div>
          )}
        </div>

        {/* Toggle Box */}
        <div className="bg-white dark:bg-neutral-900 p-6 border border-neutral-200 dark:border-neutral-800 rounded-sm shadow-sm text-center">
          <p className="text-sm text-neutral-900 dark:text-white">
            {isLogin ? "Don't have an account? " : "Have an account? "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-blue-500 font-bold hover:underline"
            >
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
