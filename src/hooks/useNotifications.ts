import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './useAuth';
import { AppNotification } from '../types';

export function useNotifications() {
  const { user, isAdmin } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    // Notifications for specific user, for 'all' (system-wide), or for 'admin' if current user is admin
    const notificationTargets = [user.uid, 'all'];
    if (isAdmin) {
      notificationTargets.push('admin');
    }

    const q = query(
      collection(db, 'notifications'),
      where('userId', 'in', notificationTargets),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AppNotification[];
      
      setNotifications(notes);
      setUnreadCount(notes.filter(n => !n.read).length);
      setLoading(false);
    }, (error) => {
      console.error('Notifications snapshot error:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, isAdmin]);

  const markAsRead = async (notificationId: string) => {
    try {
      const noteRef = doc(db, 'notifications', notificationId);
      await updateDoc(noteRef, { read: true });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    const unreadNotes = notifications.filter(n => !n.read);
    if (unreadNotes.length === 0) return;

    try {
      const batch = writeBatch(db);
      unreadNotes.forEach(note => {
        const noteRef = doc(db, 'notifications', note.id);
        batch.update(noteRef, { read: true });
      });
      await batch.commit();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead };
}
