import { useState, useRef } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Upload, X, Check, AlertCircle, File as FileIcon, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface FileUploadProps {
  onUploadComplete: (url: string) => void;
  accept: string;
  label: string;
  folder: string;
  useBase64?: boolean;
}

export default function FileUpload({ onUploadComplete, accept, label, folder, useBase64 = false }: FileUploadProps) {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [uploadedUrl, setUploadedUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      console.log('File selected:', {
        name: selectedFile.name,
        size: `${(selectedFile.size / 1024).toFixed(2)} KB`,
        type: selectedFile.type
      });
      
      setFile(selectedFile);
      setError('');
      setUploadedUrl('');
      setProgress(0);
      
      if (useBase64) {
        processBase64(selectedFile);
      } else {
        startUpload(selectedFile);
      }
    }
  };

  const processBase64 = (file: File) => {
    setUploading(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        // Simple canvas compression if image is large
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Max dimensions for base64 to keep it under ~800KB
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.width > 0 ? canvas.getContext('2d') : null;
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Use lower quality for base64 to save space
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
          console.log('Image compressed for Base64. New size approx:', Math.round(compressedBase64.length * 0.75 / 1024), 'KB');
          
          if (compressedBase64.length > 1024 * 1024) {
            setError('Image is still too large after compression. Please use a smaller screenshot.');
            toast.error('Image too large');
            setUploading(false);
            return;
          }
          
          setUploadedUrl(compressedBase64);
          onUploadComplete(compressedBase64);
          setUploading(false);
          setProgress(100);
        } else {
          // Fallback to original if canvas fails
          const base64String = event.target?.result as string;
          setUploadedUrl(base64String);
          onUploadComplete(base64String);
          setUploading(false);
          setProgress(100);
        }
      };
    };
    reader.onerror = (err) => {
      console.error('FileReader error:', err);
      setError('Error reading file');
      toast.error('Error reading file');
      setUploading(false);
    };
  };

  const startUpload = async (fileToUpload: File) => {
    if (!user) {
      setError('You must be logged in to upload files.');
      toast.error('Please login first');
      return;
    }

    setUploading(true);
    setError('');
    setProgress(0);

    try {
      // Include userId in path for better security rules compatibility
      const path = `${folder}/${user.uid}/${Date.now()}_${fileToUpload.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      console.log('Starting upload to path:', path);
      
      const storageRef = ref(storage, path);
      const uploadTask = uploadBytesResumable(storageRef, fileToUpload);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setProgress(progress);
          console.log(`Upload progress: ${progress.toFixed(2)}%`);
        },
        (err) => {
          console.error('Storage upload error:', err);
          
          // Check for specific error codes
          let msg = 'Upload failed: ' + err.message;
          if (err.code === 'storage/unauthorized') {
            msg = 'Permission denied. Please check your account or try again.';
          } else if (err.code === 'storage/quota-exceeded') {
            msg = 'Storage quota exceeded. Please contact support.';
          } else if (err.code === 'storage/canceled') {
            msg = 'Upload canceled.';
          }

          // If storage fails, try base64 as fallback for small images or PDFs
          const isSupportedFallback = (fileToUpload.type.startsWith('image/') || fileToUpload.type === 'application/pdf');
          if (isSupportedFallback && fileToUpload.size < 800 * 1024) {
            setError('Storage upload failed. Attempting local upload fallback...');
            toast.info('Storage failed, using local fallback...');
            processBase64(fileToUpload);
          } else {
            const finalMsg = fileToUpload.size >= 800 * 1024 
              ? `${msg} (File too large for fallback. Please use a smaller image < 800KB).`
              : msg;
            setError(finalMsg);
            toast.error(finalMsg);
            setUploading(false);
          }
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.log('Upload successful, download URL obtained');
            setUploadedUrl(downloadURL);
            onUploadComplete(downloadURL);
            setUploading(false);
          } catch (urlErr: any) {
            console.error('Error getting download URL:', urlErr);
            setError('Failed to get download URL: ' + urlErr.message);
            setUploading(false);
          }
        }
      );
    } catch (err: any) {
      console.error('Upload initialization error:', err);
      setError('Upload initialization failed: ' + err.message);
      toast.error('Upload failed to start');
      setUploading(false);
    }
  };

  const handleUpload = () => {
    if (file) startUpload(file);
  };

  const clearFile = () => {
    setFile(null);
    setProgress(0);
    setUploadedUrl('');
    onUploadComplete('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    console.log('File cleared');
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">{label}</label>
      
      {!file && !uploadedUrl && (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-blue-500 transition-colors bg-neutral-50 dark:bg-neutral-900/50 group"
        >
          <div className="w-12 h-12 bg-white dark:bg-neutral-800 rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
            <Upload className="w-6 h-6 text-blue-600" />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300">Click to upload screenshot</p>
            <p className="text-[10px] text-neutral-500 mt-1">JPG, PNG or WEBP (Max 2MB)</p>
          </div>
          <button 
            type="button"
            className="mt-2 px-4 py-2 bg-blue-600 text-white text-[10px] font-bold rounded-lg shadow-md hover:bg-blue-700 transition-colors"
          >
            Select File
          </button>
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            accept={accept}
            className="hidden"
          />
        </div>
      )}

      {file && !uploadedUrl && (
        <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600">
            <FileIcon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-neutral-900 dark:text-white truncate">{file.name}</p>
            <p className="text-xs text-neutral-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
          </div>
          {!uploading ? (
            <div className="flex items-center gap-2">
              <button 
                onClick={clearFile}
                className="p-2 text-neutral-400 hover:text-red-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="w-24 h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-600 transition-all duration-300" 
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {uploadedUrl && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-100 dark:border-green-900/30 flex items-center gap-4">
          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center text-green-600">
            <Check className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-green-700 dark:text-green-400 truncate">Upload Complete</p>
            <p className="text-xs text-green-600/70 dark:text-green-400/70 truncate">{uploadedUrl}</p>
          </div>
          <button 
            onClick={clearFile}
            className="p-2 text-green-400 hover:text-red-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-900/30 flex items-center gap-3 text-red-700 dark:text-red-400 text-xs">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
    </div>
  );
}
