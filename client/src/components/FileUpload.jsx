import { useState, useRef } from 'react';
import { Upload, FileText, Mic, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { uploadFile, getDocumentStatus, getRateLimit } from '../api';

export default function FileUpload({ onUploadComplete, user, onAuthRequired }) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [status, setStatus] = useState(null); // 'uploading' | 'processing' | 'ready' | 'error'
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files?.[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file) => {
    // Check upload quota before uploading
    try {
      const rl = await getRateLimit();
      if (rl.uploadsRemaining <= 0) {
        if (rl.isGuest) {
          // Guest hit limit — prompt to register
          setStatus('error');
          setError('Bạn đã dùng hết lượt upload miễn phí. Đăng ký tài khoản để có 5 lượt/ngày!');
          setUploading(false);
          return;
        }
        setStatus('error');
        setError(`Đã dùng hết ${rl.uploadLimit} lượt upload hôm nay. Thử lại vào ngày mai.`);
        return;
      }
    } catch { /* proceed anyway */ }

    setUploading(true);
    setStatus('uploading');
    setError('');
    setUploadProgress(0);

    try {
      // Upload file
      const result = await uploadFile(file, (progress) => {
        setUploadProgress(progress);
      });

      setStatus('processing');

      // Poll for processing status
      const docId = result.docId;
      let attempts = 0;
      const maxAttempts = 60; // 60 seconds max

      const pollStatus = async () => {
        attempts++;
        try {
          const statusResult = await getDocumentStatus(docId);
          if (statusResult.status === 'ready') {
            setStatus('ready');
            setUploading(false);
            onUploadComplete({
              docId,
              fileName: result.fileName,
              textLength: statusResult.textLength
            });
          } else if (statusResult.status === 'error') {
            setStatus('error');
            setError(statusResult.error || 'Processing failed');
            setUploading(false);
          } else if (attempts < maxAttempts) {
            setTimeout(pollStatus, 1000);
          } else {
            setStatus('error');
            setError('Processing timeout');
            setUploading(false);
          }
        } catch (err) {
          if (attempts < maxAttempts) {
            setTimeout(pollStatus, 1000);
          } else {
            setStatus('error');
            setError('Connection error');
            setUploading(false);
          }
        }
      };

      setTimeout(pollStatus, 1000);
    } catch (err) {
      setStatus('error');
      // If server says auth required, show register prompt
      if (err.response?.status === 429 && err.response?.data?.requireAuth) {
        setError('Bạn đã dùng hết lượt upload miễn phí. Đăng ký tài khoản để có 5 lượt/ngày!');
      } else {
        setError(err.response?.data?.error || err.message);
      }
      setUploading(false);
    }
  };

  return (
    <section className="max-w-2xl mx-auto px-4 pb-16 animate-slide-up" style={{ animationDelay: '0.2s' }}>
      <div
        className={`
          relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer
          ${dragActive
            ? 'border-primary-400 bg-primary-600/10'
            : 'border-[#2e3144] bg-[#1a1d27]/50 hover:border-primary-600/50 hover:bg-[#1a1d27]'
          }
          ${uploading ? 'pointer-events-none' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.docx,.doc,.pptx,.xlsx,.csv,.txt,.md,.mp3,.wav,.m4a,.ogg,.webm"
          onChange={handleFileInput}
        />

        {!uploading && !status && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 bg-primary-600/10 rounded-2xl flex items-center justify-center">
              <Upload size={28} className="text-primary-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              Kéo thả file vào đây hoặc <span className="text-primary-400">chọn file</span>
            </h3>
            <p className="text-sm text-[#9496a1] mb-4">
              Hỗ trợ PDF, DOCX, PPTX, XLSX, TXT, MD, MP3, WAV (tối đa 50MB)
            </p>
            <div className="flex items-center justify-center gap-6 text-xs text-[#9496a1]">
              <span className="flex items-center gap-1.5">
                <FileText size={14} /> Tài liệu PDF
              </span>
              <span className="flex items-center gap-1.5">
                <Mic size={14} /> Ghi âm bài giảng
              </span>
            </div>
          </>
        )}

        {status === 'uploading' && (
          <div className="space-y-4">
            <Loader2 size={32} className="mx-auto text-primary-400 animate-spin" />
            <p className="font-medium">Đang tải lên... {uploadProgress}%</p>
            <div className="w-full max-w-xs mx-auto bg-[#242736] rounded-full h-2">
              <div
                className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {status === 'processing' && (
          <div className="space-y-4">
            <Loader2 size={32} className="mx-auto text-accent-400 animate-spin" />
            <p className="font-medium">Đang xử lý tài liệu<span className="loading-dots"></span></p>
            <p className="text-sm text-[#9496a1]">AI đang trích xuất nội dung</p>
          </div>
        )}

        {status === 'ready' && (
          <div className="space-y-4">
            <CheckCircle2 size={32} className="mx-auto text-green-400" />
            <p className="font-medium text-green-400">Tài liệu đã sẵn sàng!</p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <AlertCircle size={32} className="mx-auto text-red-400" />
            <p className="font-medium text-red-400">Lỗi xử lý</p>
            <p className="text-sm text-[#9496a1]">{error}</p>
            <div className="flex items-center justify-center gap-3">
              {!user && error.includes('Đăng ký') && onAuthRequired && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAuthRequired();
                  }}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-primary-600/25"
                >
                  Đăng ký ngay
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setStatus(null);
                  setUploading(false);
                  setError('');
                }}
                className="text-sm text-primary-400 underline"
              >
                Thử lại
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
