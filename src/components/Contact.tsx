import { Instagram, Send, Mail, Phone, ExternalLink, MessageCircle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { ContactSettings } from '../types';

export default function Contact() {
  const [settings, setSettings] = useState<ContactSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'contact'), (snap) => {
      if (snap.exists()) {
        setSettings(snap.data() as ContactSettings);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/contact');
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const contacts = [
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      color: 'bg-green-500',
      description: 'Quick support and doubt solving',
      link: settings?.whatsapp || 'https://wa.me/yournumber',
      action: 'Chat on WhatsApp'
    },
    {
      name: 'Instagram',
      icon: Instagram,
      color: 'bg-pink-600',
      description: 'Daily updates and motivation',
      link: settings?.instagram || 'https://instagram.com/yourprofile',
      action: 'Follow on Instagram'
    },
    {
      name: 'Telegram',
      icon: Send,
      color: 'bg-blue-500',
      description: 'Join our study group channel',
      link: settings?.telegram || 'https://t.me/yourchannel',
      action: 'Join Telegram'
    },
    {
      name: 'Email',
      icon: Mail,
      color: 'bg-neutral-900',
      description: 'For business and formal queries',
      link: settings?.email ? `mailto:${settings.email}` : 'mailto:kunalkaruan1997@gmail.com',
      action: 'Send an Email'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <header className="text-center">
        <h1 className="text-4xl font-bold text-neutral-900 dark:text-white">Get in Touch</h1>
        <p className="text-neutral-500 dark:text-neutral-400 mt-4 text-lg">Have questions? We're here to help you succeed.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {contacts.map((contact, idx) => (
          <motion.a
            key={contact.name}
            href={contact.link}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="group bg-white dark:bg-neutral-900 p-8 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-xl dark:hover:shadow-blue-900/10 hover:border-blue-200 dark:hover:border-blue-900 transition-all flex flex-col items-center text-center"
          >
            <div className={`w-16 h-16 ${contact.color} rounded-2xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform`}>
              <contact.icon className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">{contact.name}</h3>
            <p className="text-neutral-500 dark:text-neutral-400 mb-8">{contact.description}</p>
            <div className="mt-auto w-full py-3 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl font-bold group-hover:bg-blue-600 dark:group-hover:bg-blue-600 group-hover:text-white transition-all flex items-center justify-center gap-2">
              {contact.action}
              <ExternalLink className="w-4 h-4" />
            </div>
          </motion.a>
        ))}
      </div>

      <div className="bg-blue-600 dark:bg-blue-700 rounded-3xl p-10 text-white text-center">
        <h2 className="text-2xl font-bold mb-4">Join our Newsletter</h2>
        <p className="text-blue-100 dark:text-blue-50 mb-8">Get weekly study tips and new course announcements directly in your inbox.</p>
        <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <input 
            type="email" 
            placeholder="Enter your email" 
            className="flex-1 px-6 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-blue-200 outline-none focus:bg-white/20 transition-all"
          />
          <button className="px-8 py-3 bg-white text-blue-600 dark:text-blue-700 rounded-xl font-bold hover:bg-blue-50 transition-colors">
            Subscribe
          </button>
        </div>
      </div>
    </div>
  );
}
