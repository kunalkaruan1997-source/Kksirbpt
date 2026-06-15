import { useEffect, useState, useRef, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, limit, doc, setDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType } from '../lib/firebase';
import { ChatMessage } from '../types';
import { useAuth } from '../hooks/useAuth';
import { Send, Lock, Unlock, Shield, MessageSquare, Paperclip, FileIcon, ImageIcon, VideoIcon, X, Loader2, Search, MoreVertical, Smile, CheckCheck, Trash2, Phone, Reply as ReplyIcon, Edit2, Share2, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, isSameDay } from 'date-fns';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { toast } from 'sonner';
import { updateDoc, deleteDoc } from 'firebase/firestore';

export default function Chat() {
  const { profile, isAdmin: authIsAdmin } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatEnabled, setChatEnabled] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, message: ChatMessage } | null>(null);
  const [showNotePicker, setShowNotePicker] = useState(false);
  const [notes, setNotes] = useState<any[]>([]);
  const [longPressPos, setLongPressPos] = useState<{ x: number, y: number } | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Fallback check for super admin email
  const isAdmin = authIsAdmin || profile?.email === 'kunalkaruan1997@gmail.com';

  useEffect(() => {
    // Ensure chat settings exist
    const checkSettings = async () => {
      const settingsRef = doc(db, 'settings', 'chat');
      const settingsSnap = await getDoc(settingsRef);
      if (!settingsSnap.exists()) {
        await setDoc(settingsRef, { enabled: true });
      }
    };
    checkSettings();

    const unsub = onSnapshot(doc(db, 'settings', 'chat'), (doc) => {
      if (doc.exists()) {
        setChatEnabled(doc.data().enabled);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/chat');
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, 'global_messages'),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'global_messages');
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (showNotePicker) {
      const q = query(collection(db, 'notes'), orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(q, (snap) => {
        setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      return () => unsub();
    }
  }, [showNotePicker]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    return messages.filter(m => 
      m.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.senderName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [messages, searchQuery]);

  const toggleChat = async () => {
    if (!isAdmin) return;
    try {
      const newStatus = !chatEnabled;
      await setDoc(doc(db, 'settings', 'chat'), { enabled: newStatus });
      toast.success(newStatus ? 'Chat enabled for everyone' : 'Chat locked for students');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/chat');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const getFileType = (file: File | Blob): 'image' | 'video' | 'pdf' | 'other' => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type === 'application/pdf') return 'pdf';
    return 'other';
  };

  const onEmojiClick = (emojiData: any) => {
    setNewMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !profile) return;

    if (!isAdmin && !chatEnabled) {
      toast.error("Chat is currently locked by the teacher.");
      return;
    }

    if (editingMessage) {
      try {
        await updateDoc(doc(db, 'global_messages', editingMessage.id), {
          text: newMessage,
          isEdited: true
        });
        setEditingMessage(null);
        setNewMessage('');
        return;
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, 'global_messages');
        return;
      }
    }

    setIsUploading(true);
    setUploadProgress(0);
    try {
      let attachment = null;

      if (selectedFile) {
        const fileToUpload = selectedFile;
        const fileName = selectedFile.name;
        const fileRef = ref(storage, `chat_attachments/${Date.now()}_${fileName}`);
        
        const uploadTask = uploadBytesResumable(fileRef, fileToUpload);
        
        const url = await new Promise<string>((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
            },
            (error) => reject(error),
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadURL);
            }
          );
        });

        attachment = {
          url,
          type: getFileType(fileToUpload),
          name: fileName,
        };
      }

      await addDoc(collection(db, 'global_messages'), {
        senderId: profile.uid,
        senderName: profile.fullName || profile.displayName,
        senderRole: profile.role,
        text: newMessage,
        channelId: 'global',
        createdAt: new Date().toISOString(),
        attachment,
        replyTo: replyingTo ? {
          id: replyingTo.id,
          text: replyingTo.text,
          senderName: replyingTo.senderName
        } : null,
      });
      setNewMessage('');
      setSelectedFile(null);
      setReplyingTo(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'global_messages');
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditMessage = (msg: ChatMessage) => {
    if (msg.senderId !== profile?.uid) {
      toast.error("You can only edit your own messages.");
      return;
    }
    setEditingMessage(msg);
    setNewMessage(msg.text);
    setContextMenu(null);
  };

  const handleDeleteMessage = async (msg: ChatMessage) => {
    if (msg.senderId !== profile?.uid) {
      toast.error("You can only delete your own messages.");
      return;
    }
    try {
      await updateDoc(doc(db, 'global_messages', msg.id), {
        isDeleted: true,
        text: 'This message was deleted',
        attachment: null
      });
      setContextMenu(null);
      toast.success('Message deleted');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'global_messages');
    }
  };

  const handleLongPressStart = (e: React.MouseEvent | React.TouchEvent, msg: ChatMessage) => {
    // Prevent double trigger if both touch and mouse events fire
    if (longPressTimer.current) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setLongPressPos({ x: clientX, y: clientY });
    
    longPressTimer.current = setTimeout(() => {
      setContextMenu({ x: clientX, y: clientY, message: msg });
      setLongPressPos(null);
    }, 600); // Slightly longer for better feel
  };

  const handleLongPressMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!longPressPos) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const dist = Math.sqrt(Math.pow(clientX - longPressPos.x, 2) + Math.pow(clientY - longPressPos.y, 2));
    if (dist > 10) { // If moved more than 10px, cancel long press
      handleLongPressEnd();
    }
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setLongPressPos(null);
  };

  const handleShareMessage = async (msg: ChatMessage) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'KK Sir bpt Message',
          text: msg.text,
          url: window.location.href
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      await navigator.clipboard.writeText(msg.text);
      toast.success('Message copied to clipboard');
    }
    setContextMenu(null);
  };

  const handleShareNote = async (note: any) => {
    if (!profile) return;
    try {
      await addDoc(collection(db, 'global_messages'), {
        senderId: profile.uid,
        senderName: profile.fullName || profile.displayName,
        senderRole: profile.role,
        text: `Shared a note: ${note.title}`,
        channelId: 'global',
        createdAt: new Date().toISOString(),
        attachment: note.pdfUrl ? {
          url: note.pdfUrl,
          type: 'pdf',
          name: `${note.title}.pdf`
        } : null
      });
      setShowNotePicker(false);
      toast.success('Note shared in chat');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'global_messages');
    }
  };

  return (
    <div className="h-[calc(100vh-10rem)] flex bg-[#f0f2f5] dark:bg-neutral-950 rounded-2xl overflow-hidden shadow-2xl border border-neutral-200 dark:border-neutral-800">
      {/* Sidebar (WhatsApp Style) */}
      <aside className="hidden md:flex w-[400px] flex-col bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800">
        <header className="h-16 px-4 flex items-center justify-between bg-[#f0f2f5] dark:bg-neutral-800/50">
          <div className="w-10 h-10 rounded-full bg-neutral-300 dark:bg-neutral-700 flex items-center justify-center text-neutral-600 dark:text-neutral-400 font-bold overflow-hidden">
            {profile?.photoURL ? (
              <img src={profile.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              profile?.displayName?.[0] || 'U'
            )}
          </div>
          <div className="flex items-center gap-5 text-neutral-500 dark:text-neutral-400">
            <MessageSquare className="w-5 h-5 cursor-pointer" />
            <MoreVertical className="w-5 h-5 cursor-pointer" />
          </div>
        </header>

        <div className="p-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input 
              type="text" 
              placeholder="Search or start new chat"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-1.5 bg-[#f0f2f5] dark:bg-neutral-800 rounded-lg text-sm outline-none placeholder:text-neutral-500 dark:text-white"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center gap-3 px-4 py-3 bg-[#f0f2f5] dark:bg-neutral-800 border-b border-neutral-100 dark:border-neutral-800 cursor-pointer">
            <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <h3 className="font-semibold text-neutral-900 dark:text-white truncate">KK Sir bpt Community</h3>
                <span className="text-[10px] text-neutral-400 font-medium">Official</span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                {messages.length > 0 ? messages[messages.length - 1].text : 'No messages yet'}
              </p>
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="p-4 border-t border-neutral-200 dark:border-neutral-800">
            <button
              onClick={toggleChat}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${
                chatEnabled 
                  ? 'bg-green-600 text-white shadow-lg shadow-green-500/20' 
                  : 'bg-red-600 text-white shadow-lg shadow-red-500/20'
              }`}
            >
              {chatEnabled ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              {chatEnabled ? 'Chat Active' : 'Chat Locked'}
            </button>
          </div>
        )}
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col bg-[#efe7de] dark:bg-neutral-950 relative">
        {/* WhatsApp Background Pattern */}
        <div className="absolute inset-0 opacity-[0.06] dark:opacity-[0.03] pointer-events-none bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat" />

        {/* Chat Header */}
        <header className="h-16 px-4 flex items-center justify-between bg-[#f0f2f5] dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-800 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 dark:text-white leading-tight">KK Sir bpt Community</h3>
              <p className={`text-[11px] font-medium ${chatEnabled ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {chatEnabled ? 'Chat Active' : 'Chat Locked'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 md:gap-6 text-neutral-500 dark:text-neutral-400">
            {isAdmin && (
              <div className="flex items-center gap-2 bg-white dark:bg-neutral-900 px-3 py-1.5 rounded-full border border-neutral-200 dark:border-neutral-800 shadow-sm">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${chatEnabled ? 'text-green-600' : 'text-red-600'}`}>
                  {chatEnabled ? 'Chat ON' : 'Chat OFF'}
                </span>
                <button
                  onClick={toggleChat}
                  className={`relative w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none ${
                    chatEnabled ? 'bg-green-500' : 'bg-red-500'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                      chatEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            )}
            <Search className="w-5 h-5 cursor-pointer hover:text-neutral-700 dark:hover:text-white transition-colors" />
            <MoreVertical className="w-5 h-5 cursor-pointer hover:text-neutral-700 dark:hover:text-white transition-colors" />
          </div>
        </header>

        {/* Messages Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 md:p-8 space-y-2 z-10"
        >
          {filteredMessages.length === 0 && searchQuery && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
              <Search className="w-12 h-12" />
              <p className="text-sm font-medium">No messages matching "{searchQuery}"</p>
            </div>
          )}
          
          {filteredMessages.map((msg, idx) => {
            const isMe = msg.senderId === profile?.uid;
            const isTeacher = msg.senderRole === 'admin';
            const showDate = idx === 0 || !isSameDay(new Date(msg.createdAt), new Date(filteredMessages[idx - 1].createdAt));
            
            return (
              <div key={msg.id} className="space-y-2">
                {showDate && (
                  <div className="flex justify-center my-4">
                    <span className="px-3 py-1 bg-white/80 dark:bg-neutral-800/80 rounded-lg text-[10px] font-bold text-neutral-500 dark:text-neutral-400 shadow-sm uppercase tracking-wider">
                      {format(new Date(msg.createdAt), 'MMMM d, yyyy')}
                    </span>
                  </div>
                )}
                
                <div className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <motion.div
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.2}
                    onDragStart={handleLongPressEnd}
                    onDragEnd={(_, info) => {
                      if (info.offset.x > 80 || info.offset.x < -80) {
                        setReplyingTo(msg);
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({ x: e.clientX, y: e.clientY, message: msg });
                    }}
                    onMouseDown={(e) => handleLongPressStart(e, msg)}
                    onMouseMove={handleLongPressMove}
                    onMouseUp={handleLongPressEnd}
                    onMouseLeave={handleLongPressEnd}
                    onTouchStart={(e) => handleLongPressStart(e, msg)}
                    onTouchMove={handleLongPressMove}
                    onTouchEnd={handleLongPressEnd}
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`relative max-w-[85%] md:max-w-[65%] px-3 py-1.5 rounded-lg shadow-sm group cursor-grab active:cursor-grabbing select-none ${
                      msg.isDeleted 
                        ? 'bg-neutral-100 dark:bg-neutral-800 italic text-neutral-400' 
                        : isMe 
                          ? 'bg-[#dcf8c6] dark:bg-[#005c4b] text-neutral-900 dark:text-white rounded-tr-none' 
                          : 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-tl-none'
                    }`}
                  >
                    {/* Reply Action Button (Visible on Hover) */}
                    {!msg.isDeleted && (
                      <button 
                        onClick={() => setReplyingTo(msg)}
                        className={`absolute top-1/2 -translate-y-1/2 p-2 bg-white dark:bg-neutral-800 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-20 ${
                          isMe ? '-left-12' : '-right-12'
                        }`}
                      >
                        <ReplyIcon className="w-4 h-4 text-neutral-500" />
                      </button>
                    )}

                    {/* Bubble Tail */}
                    <div className={`absolute top-0 w-2 h-2 ${
                      isMe 
                        ? '-right-2 bg-[#dcf8c6] dark:bg-[#005c4b] [clip-path:polygon(0_0,0_100%,100%_0)]' 
                        : '-left-2 bg-white dark:bg-neutral-800 [clip-path:polygon(100%_0,100%_100%,0_0)]'
                    }`} />

                    {!isMe && (
                      <p className={`text-[11px] font-bold mb-0.5 flex items-center gap-1 ${
                        isTeacher ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'
                      }`}>
                        {msg.senderName}
                        {isTeacher && <Shield className="w-2.5 h-2.5" />}
                        {(msg as any).source === 'whatsapp' && <Phone className="w-2.5 h-2.5 text-green-500" />}
                      </p>
                    )}
                    
                    <div className="flex flex-col gap-1">
                      {/* Replied Message Preview */}
                      {msg.replyTo && (
                        <div className={`mb-1 p-2 rounded-lg border-l-4 text-xs ${
                          isMe 
                            ? 'bg-black/5 border-blue-500/50' 
                            : 'bg-neutral-100 dark:bg-neutral-700/50 border-blue-500/50'
                        }`}>
                          <p className="font-bold text-blue-600 dark:text-blue-400 mb-0.5">{msg.replyTo.senderName}</p>
                          <p className="opacity-70 truncate">{msg.replyTo.text}</p>
                        </div>
                      )}

                      {msg.attachment && (
                        <div className="rounded-lg overflow-hidden mb-1">
                          {msg.attachment.type === 'image' && (
                            <img 
                              src={msg.attachment.url} 
                              alt={msg.attachment.name} 
                              className="max-w-full h-auto rounded-sm cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => window.open(msg.attachment?.url, '_blank')}
                              referrerPolicy="no-referrer"
                            />
                          )}
                          {msg.attachment.type === 'video' && (
                            <video src={msg.attachment.url} controls className="max-w-full rounded-sm" />
                          )}
                          {(msg.attachment.type === 'pdf' || msg.attachment.type === 'other') && (
                            <a 
                              href={msg.attachment.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className={`flex items-center gap-3 p-2 rounded-lg border ${
                                isMe 
                                  ? 'bg-black/5 border-black/5' 
                                  : 'bg-neutral-100 dark:bg-neutral-700 border-neutral-200 dark:border-neutral-600'
                              }`}
                            >
                              <FileIcon className="w-5 h-5 text-neutral-500" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold truncate">{msg.attachment.name}</p>
                                <p className="text-[9px] uppercase opacity-50">{msg.attachment.type}</p>
                              </div>
                            </a>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-end gap-2">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words flex-1">
                          {msg.text}
                        </p>
                        <div className="flex items-center gap-1 flex-shrink-0 mb-[-2px]">
                          {msg.isEdited && !msg.isDeleted && (
                            <span className="text-[8px] opacity-40 italic">edited</span>
                          )}
                          <span className="text-[9px] opacity-50 uppercase">
                            {msg.createdAt ? format(new Date(msg.createdAt), 'h:mm a') : '...'}
                          </span>
                          {isMe && <CheckCheck className="w-3 h-3 text-blue-500" />}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            );
          })}
        </div>

        {/* WhatsApp Style Footer */}
        <footer className="p-2 md:p-3 bg-[#f0f2f5] dark:bg-neutral-800 z-10 relative">
          {/* Reply Preview */}
          <AnimatePresence>
            {replyingTo && (
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                className="mb-2 p-3 bg-white dark:bg-neutral-900 rounded-xl border-l-4 border-blue-500 flex items-center gap-3 shadow-sm"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400">{replyingTo.senderName}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{replyingTo.text}</p>
                </div>
                <button onClick={() => setReplyingTo(null)} className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full">
                  <X className="w-4 h-4 text-neutral-500" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Edit Preview */}
          <AnimatePresence>
            {editingMessage && (
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                className="mb-2 p-3 bg-white dark:bg-neutral-900 rounded-xl border-l-4 border-green-500 flex items-center gap-3 shadow-sm"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-green-600 dark:text-green-400">Editing Message</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{editingMessage.text}</p>
                </div>
                <button onClick={() => { setEditingMessage(null); setNewMessage(''); }} className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full">
                  <X className="w-4 h-4 text-neutral-500" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Emoji Picker Overlay */}
          <AnimatePresence>
            {showEmojiPicker && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-full left-0 mb-2 z-50"
              >
                <EmojiPicker 
                  onEmojiClick={onEmojiClick} 
                  theme={Theme.AUTO}
                  width={350}
                  height={400}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {selectedFile && (
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                className="mb-2 p-2 bg-white dark:bg-neutral-900 rounded-xl flex items-center gap-3 border border-neutral-200 dark:border-neutral-700 shadow-sm"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  {getFileType(selectedFile!) === 'image' ? <ImageIcon className="w-5 h-5" /> : 
                   getFileType(selectedFile!) === 'video' ? <VideoIcon className="w-5 h-5" /> : 
                   <FileIcon className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate dark:text-white">
                    {selectedFile.name}
                  </p>
                  <p className="text-[10px] text-neutral-500 uppercase">
                    {`${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`}
                  </p>
                </div>
                <button onClick={() => setSelectedFile(null)} className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full">
                  <X className="w-4 h-4 text-neutral-500" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {!isAdmin && !chatEnabled ? (
            <div className="bg-white dark:bg-neutral-900 px-6 py-3 rounded-xl text-center shadow-sm">
              <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 flex items-center justify-center gap-2">
                <Lock className="w-3.5 h-3.5" />
                THE CHAT IS CURRENTLY LOCKED BY THE TEACHER
              </p>
            </div>
          ) : (
            <div className="max-w-5xl mx-auto flex flex-col gap-2">
              {isAdmin && (
                <div className="flex justify-end px-2">
                  <button 
                    onClick={toggleChat}
                    className={`flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter transition-all ${
                      chatEnabled 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}
                  >
                    {chatEnabled ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                    {chatEnabled ? 'Students can chat' : 'Students are locked'}
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2">
              <div className="flex items-center gap-4 text-neutral-500 dark:text-neutral-400 px-2">
                <Smile 
                  className={`w-6 h-6 cursor-pointer transition-colors ${showEmojiPicker ? 'text-[#00a884]' : 'hover:text-neutral-700 dark:hover:text-white'}`} 
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                />
                <Paperclip 
                  className="w-6 h-6 cursor-pointer hover:text-neutral-700 dark:hover:text-white transition-colors" 
                  onClick={() => fileInputRef.current?.click()}
                />
              </div>
              
              <form onSubmit={handleSendMessage} className="flex-1 flex items-center gap-2">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handleFileSelect}
                  accept="image/*,video/*,.pdf"
                />
                <div className="flex-1 bg-white dark:bg-neutral-900 rounded-xl px-4 py-2 shadow-sm flex items-center gap-3">
                  <textarea
                    rows={1}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e as any);
                      }
                    }}
                    placeholder={editingMessage ? "Edit message..." : selectedFile ? "Add a caption..." : "Type a message"}
                    className="w-full bg-transparent outline-none text-sm dark:text-white py-1 resize-none max-h-32"
                  />
                </div>
                
                <button
                  type={newMessage.trim() || selectedFile || editingMessage ? "submit" : "button"}
                  disabled={!newMessage.trim() && !selectedFile && !editingMessage}
                  className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all bg-[#00a884] hover:bg-[#008f6f] text-white disabled:opacity-50 disabled:grayscale overflow-hidden relative"
                >
                  {isUploading ? (
                    <div className="flex flex-col items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {uploadProgress > 0 && (
                        <span className="text-[8px] font-bold mt-0.5">{Math.round(uploadProgress)}%</span>
                      )}
                    </div>
                  ) : <Send className="w-5 h-5" />}
                  {isUploading && (
                    <div 
                      className="absolute bottom-0 left-0 h-1 bg-white/30 transition-all duration-300" 
                      style={{ width: `${uploadProgress}%` }}
                    />
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </footer>

        {/* Context Menu */}
        <AnimatePresence>
          {contextMenu && (
            <>
              <div 
                className="fixed inset-0 z-[100]" 
                onClick={() => setContextMenu(null)}
                onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                style={{ 
                  left: Math.min(contextMenu.x, window.innerWidth - 160), 
                  top: Math.min(contextMenu.y, window.innerHeight - 200) 
                }}
                className="fixed z-[101] w-40 bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden"
              >
                <div className="py-1">
                  <button 
                    onClick={() => { setReplyingTo(contextMenu.message); setContextMenu(null); }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <ReplyIcon className="w-4 h-4" /> Reply
                  </button>
                  <button 
                    onClick={() => { navigator.clipboard.writeText(contextMenu.message.text); toast.success('Copied to clipboard'); setContextMenu(null); }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <Copy className="w-4 h-4" /> Copy
                  </button>
                  {contextMenu.message.senderId === profile?.uid && !contextMenu.message.isDeleted && (
                    <>
                      <button 
                        onClick={() => handleEditMessage(contextMenu.message)}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" /> Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteMessage(contextMenu.message)}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    </>
                  )}
                  <button 
                    onClick={() => handleShareMessage(contextMenu.message)}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <Share2 className="w-4 h-4" /> Share
                  </button>
                  <button 
                    onClick={() => { setShowNotePicker(true); setContextMenu(null); }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    <FileIcon className="w-4 h-4" /> Share Note
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Note Picker Modal */}
        <AnimatePresence>
          {showNotePicker && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-neutral-900 rounded-3xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]"
              >
                <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                  <h2 className="text-xl font-bold dark:text-white">Select Note to Share</h2>
                  <button onClick={() => setShowNotePicker(false)} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {notes.length === 0 ? (
                    <p className="text-center text-neutral-500 py-8">No notes available to share.</p>
                  ) : (
                    notes.map(note => (
                      <div 
                        key={note.id}
                        onClick={() => handleShareNote(note)}
                        className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700 hover:border-blue-500 cursor-pointer transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                            <FileIcon className="w-6 h-6" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold dark:text-white group-hover:text-blue-600 transition-colors">{note.title}</h3>
                            <p className="text-xs text-neutral-500">{note.subject} • {note.chapter}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
