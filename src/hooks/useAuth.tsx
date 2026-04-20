import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isBlocked: boolean;
  isPremium: boolean;
  isContentUnlocked: (contentId: string) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  isBlocked: false,
  isPremium: false,
  isContentUnlocked: () => false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsBlocked(false);
      
      // Clean up previous profile listener if it exists
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (currentUser) {
        const docRef = doc(db, 'users', currentUser.uid);
        
        // Use onSnapshot for reactive updates
        unsubscribeProfile = onSnapshot(docRef, 
          async (docSnap) => {
            const isAdminEmail = currentUser.email === 'kunalkaruan1997@gmail.com';
            
            if (docSnap.exists()) {
              const data = docSnap.data() as UserProfile;
              
              if (data.blocked) {
                setIsBlocked(true);
                setProfile(data);
                setLoading(false);
                return;
              }

              // Ensure super admin always has admin role
              if (isAdminEmail && data.role !== 'admin') {
                try {
                  await setDoc(docRef, { ...data, role: 'admin' }, { merge: true });
                } catch (err) {
                  handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}`);
                }
              }
              setProfile(data);
              setIsBlocked(false);
            } else {
              // Create default profile for new user
              const studentId = `STU${Math.floor(1000 + Math.random() * 9000)}${Date.now().toString().slice(-4)}`;
              const newProfile: UserProfile = {
                uid: currentUser.uid,
                email: currentUser.email || '',
                displayName: currentUser.displayName || 'Student',
                fullName: currentUser.displayName || '',
                photoURL: currentUser.photoURL || '',
                role: isAdminEmail ? 'admin' : 'student',
                createdAt: new Date().toISOString(),
                savedNotes: [],
                watchedVideos: [],
                studentId,
                profileCompleted: false,
                blocked: false,
                isPremium: false
              };
              try {
                await setDoc(docRef, newProfile);
                setProfile(newProfile);
              } catch (err) {
                handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}`);
              }
            }
            setLoading(false);
          },
          (error) => {
            handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
            setLoading(false);
          }
        );
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      isAdmin: profile?.role === 'admin', 
      isBlocked,
      isPremium: profile?.isPremium || profile?.role === 'admin',
      isContentUnlocked: (contentId: string) => {
        if (profile?.role === 'admin' || profile?.isPremium) return true;
        return profile?.unlockedContent?.includes(contentId) || false;
      }
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
