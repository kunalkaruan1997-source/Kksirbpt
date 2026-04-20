import { motion } from 'motion/react';
import { ShieldCheck, Camera, CheckCircle2, ArrowRight } from 'lucide-react';
import { useState } from 'react';

export default function PermissionSection({ onComplete }: { onComplete: () => void }) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequest = async () => {
    setIsRequesting(true);
    setError(null);
    try {
      // Attempt to request permissions to trigger browser prompt
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setIsDone(true);
      setTimeout(onComplete, 800);
    } catch (err: any) {
      console.log('Permissions not granted or blocked by policy:', err);
      // We show a message but allow them to continue since the user might have 
      // intentionally blocked them or the environment policy is strict.
      setError('Note: Camera access was not granted. You can still use the app, but some live features may be limited.');
      setIsDone(true);
      // Give them a moment to read the note before auto-completing
      setTimeout(onComplete, 3000);
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center p-6 transition-colors duration-500">
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="max-w-md w-full bg-white dark:bg-neutral-900 rounded-[2.5rem] p-10 shadow-2xl shadow-blue-500/5 border border-neutral-200 dark:border-neutral-800 text-center relative overflow-hidden"
      >
        {/* Decorative background glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl" />

        <div className="relative">
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="w-24 h-24 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-blue-500/20"
          >
            {isDone ? (
              <CheckCircle2 className="w-12 h-12 text-white" />
            ) : (
              <ShieldCheck className="w-12 h-12 text-white" />
            )}
          </motion.div>

          <h2 className="text-3xl font-bold text-neutral-900 dark:text-white mb-4 tracking-tight">
            {isDone ? 'All Set!' : 'App Permissions'}
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 mb-10 leading-relaxed text-sm">
            To provide the best learning experience, KK Sir bpt needs access to your camera for live interactions and doubt solving.
          </p>

          <div className="space-y-3 mb-10">
            <div className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${isDone ? 'bg-green-50/50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30' : 'bg-neutral-50 dark:bg-neutral-800/50 border-neutral-100 dark:border-neutral-800'}`}>
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${isDone ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-white dark:bg-neutral-800 text-neutral-400 shadow-sm'}`}>
                  <Camera className="w-5 h-5" />
                </div>
                <span className={`text-sm font-bold ${isDone ? 'text-green-700 dark:text-green-400' : 'text-neutral-700 dark:text-neutral-300'}`}>Camera Access</span>
              </div>
              {isDone && <CheckCircle2 className="w-5 h-5 text-green-600" />}
            </div>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs rounded-xl border border-amber-100 dark:border-amber-900/30 font-medium"
            >
              {error}
            </motion.div>
          )}

          <div className="flex flex-col gap-4">
            <button
              onClick={handleRequest}
              disabled={isRequesting || isDone}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl shadow-blue-500/20 group"
            >
              {isRequesting ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isDone ? (
                <>
                  Continuing...
                  <ArrowRight className="w-5 h-5 animate-bounce-x" />
                </>
              ) : (
                <>
                  Enable Access
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            {!isRequesting && !isDone && (
              <button
                onClick={onComplete}
                className="text-sm font-bold text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
              >
                Skip for now
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
