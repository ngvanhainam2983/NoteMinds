import { useState, useEffect } from 'react';
import {
  FileText, Loader2, AlertCircle, Eye, MessageSquare, Pencil,
  BrainCircuit, Clock, ArrowLeft, Copy, Check
} from 'lucide-react';
import { validateShareToken, getSharedDocumentContent } from '../api';
import MarkdownRenderer from './MarkdownRenderer';

const PERMISSION_INFO = {
  view: { label: 'Chỉ xem', icon: Eye, color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  comment: { label: 'Bình luận', icon: MessageSquare, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  edit: { label: 'Chỉnh sửa', icon: Pencil, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
};

export default function SharedDocViewer({ shareToken, onBack }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shareInfo, setShareInfo] = useState(null);
  const [content, setContent] = useState(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!shareToken) return;
    setLoading(true);
    setError(null);

    validateShareToken(shareToken)
      .then(data => {
        if (data.valid) {
          setShareInfo(data);
          // Auto-load content
          setLoadingContent(true);
          return getSharedDocumentContent(shareToken);
        } else {
          throw new Error(data.error || 'Link không hợp lệ');
        }
      })
      .then(data => {
        if (data) setContent(data);
      })
      .catch(err => {
        setError(err.response?.data?.error || err.message || 'Link chia sẻ không hợp lệ hoặc đã hết hạn');
      })
      .finally(() => {
        setLoading(false);
        setLoadingContent(false);
      });
  }, [shareToken]);

  const handleCopyText = () => {
    if (content?.text) {
      navigator.clipboard.writeText(content.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="text-primary-400 animate-spin mx-auto mb-4" />
          <p className="text-[#9496a1] text-sm">Đang tải tài liệu chia sẻ...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4">
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-red-400" />
          </div>
          <h2 className="text-xl font-bold mb-2">Link không hợp lệ</h2>
          <p className="text-[#9496a1] text-sm mb-6">{error}</p>
          <button
            onClick={onBack}
            className="flex items-center gap-2 mx-auto px-5 py-2.5 bg-primary-600 hover:bg-primary-700 rounded-lg text-sm font-medium transition-colors"
          >
            <ArrowLeft size={16} />
            Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  const permInfo = PERMISSION_INFO[shareInfo?.shareType] || PERMISSION_INFO.view;
  const PermIcon = permInfo.icon;

  return (
    <div className="min-h-screen bg-[#0f1117]">
      {/* Header */}
      <header className="sticky top-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 rounded-lg hover:bg-[#242736] transition-colors" title="Về trang chủ">
              <ArrowLeft size={18} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <BrainCircuit size={16} className="text-white" />
              </div>
              <span className="text-sm font-bold font-display">
                Note<span className="text-primary-400">Minds</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border ${permInfo.color}`}>
              <PermIcon size={12} />
              {permInfo.label}
            </span>
            {shareInfo?.expiresAt && (
              <span className="flex items-center gap-1 text-[10px] text-[#9496a1]">
                <Clock size={11} />
                Hết hạn: {new Date(shareInfo.expiresAt).toLocaleDateString('vi')}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Document */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Doc info bar */}
        <div className="flex items-center gap-3 mb-6 bg-[#1a1d27] border border-[#2e3144] rounded-xl px-5 py-4">
          <FileText size={20} className="text-primary-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold truncate">
              {content?.fileName || shareInfo?.documentName || 'Tài liệu được chia sẻ'}
            </h1>
            <p className="text-xs text-[#9496a1] mt-0.5">
              {content?.text ? `${(content.text.length / 1000).toFixed(1)}k ký tự` : ''}
              {shareInfo?.shareType && ` • Quyền: ${permInfo.label}`}
            </p>
          </div>
          {content?.text && shareInfo?.shareType !== 'view' && (
            <button
              onClick={handleCopyText}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#242736] border border-[#2e3144] rounded-lg hover:border-primary-500/40 transition-colors"
            >
              {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
              {copied ? 'Đã sao chép' : 'Sao chép'}
            </button>
          )}
        </div>

        {/* Content */}
        {loadingContent ? (
          <div className="flex justify-center py-20">
            <Loader2 size={28} className="text-primary-400 animate-spin" />
          </div>
        ) : content?.text ? (
          <div className="bg-[#1a1d27] border border-[#2e3144] rounded-2xl px-6 py-5">
            <div className="prose prose-invert max-w-none text-sm leading-relaxed text-[#c8c9cf] whitespace-pre-wrap">
              {content.text}
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <FileText size={48} className="text-[#2e3144] mx-auto mb-3" />
            <p className="text-[#9496a1] text-sm">Không có nội dung để hiển thị</p>
          </div>
        )}
      </div>
    </div>
  );
}
