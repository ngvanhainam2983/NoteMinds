import { useState, useEffect, useCallback } from 'react';
import {
  FileText, Loader2, AlertCircle, Eye, MessageSquare, Pencil,
  BrainCircuit, Clock, ArrowLeft, Map, CreditCard, MessageCircle,
  Lock, Link2
} from 'lucide-react';
import {
  validateShareToken, getSharedDocumentContent,
  shareGenerateMindmap, shareGenerateFlashcards, shareChatWithDocument
} from '../api';
import MindmapView from './MindmapView';
import FlashcardView from './FlashcardView';
import ChatView from './ChatView';

const PERMISSION_INFO = {
  view: { label: 'Chỉ xem', icon: Eye, color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  comment: { label: 'Bình luận', icon: MessageSquare, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  edit: { label: 'Chỉnh sửa', icon: Pencil, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
};

const TABS = [
  { id: 'mindmap', label: 'Sơ đồ tư duy', icon: Map },
  { id: 'flashcard', label: 'Flashcard', icon: CreditCard },
  { id: 'chat', label: 'Hỏi đáp AI', icon: MessageCircle },
];

const WELCOME_MESSAGE = {
  role: 'assistant',
  content: 'Xin chào! Mình là trợ lý học tập NoteMinds 🧠\n\nĐây là tài liệu được chia sẻ. Hãy hỏi mình bất kỳ điều gì về nội dung nhé! Ví dụ:\n- "Tóm tắt nội dung chính"\n- "Giải thích khái niệm X"\n- "So sánh A và B"'
};

export default function SharedDocViewer({ shareToken, onBack }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shareInfo, setShareInfo] = useState(null);
  const [content, setContent] = useState(null);

  // Dashboard-like state
  const [activeTab, setActiveTab] = useState('mindmap');
  const [mindmapData, setMindmapData] = useState(null);
  const [flashcardData, setFlashcardData] = useState(null);
  const [chatMessages, setChatMessages] = useState([WELCOME_MESSAGE]);
  const [tabLoading, setTabLoading] = useState({ mindmap: false, flashcard: false });
  const [tabErrors, setTabErrors] = useState({});

  const isViewOnly = (shareInfo?.shareType || 'view') === 'view';

  // ── SSE: live-update from owner/other editors ──
  useEffect(() => {
    if (!shareToken || !content) return;

    const evtSource = new EventSource(`/api/shared/${shareToken}/events`);

    evtSource.addEventListener('mindmap', (e) => {
      try {
        const data = JSON.parse(e.data);
        setMindmapData(data);
      } catch {}
    });

    evtSource.addEventListener('flashcards', (e) => {
      try {
        const data = JSON.parse(e.data);
        setFlashcardData(data);
      } catch {}
    });

    evtSource.addEventListener('chat', (e) => {
      try {
        const msgs = JSON.parse(e.data);
        if (Array.isArray(msgs) && msgs.length > 0) {
          setChatMessages([WELCOME_MESSAGE, ...msgs.map(m => ({ role: m.role, content: m.content }))]);
        }
      } catch {}
    });

    evtSource.onerror = () => {
      // Browser will auto-reconnect for SSE
    };

    return () => evtSource.close();
  }, [shareToken, content]);

  useEffect(() => {
    if (!shareToken) return;
    setLoading(true);
    setError(null);

    validateShareToken(shareToken)
      .then(data => {
        if (data.valid) {
          setShareInfo(data);
          return getSharedDocumentContent(shareToken);
        } else {
          throw new Error(data.error || 'Link không hợp lệ');
        }
      })
      .then(data => {
        if (data) {
          setContent(data);
          // Load pre-existing session data from the owner
          if (data.sessions) {
            if (data.sessions.mindmap) setMindmapData(data.sessions.mindmap);
            if (data.sessions.flashcards) setFlashcardData(data.sessions.flashcards);
            if (data.sessions.chat && data.sessions.chat.length > 0) {
              setChatMessages([WELCOME_MESSAGE, ...data.sessions.chat.map(m => ({ role: m.role, content: m.content }))]);
            }
          }
        }
      })
      .catch(err => {
        setError(err.response?.data?.error || err.message || 'Link chia sẻ không hợp lệ hoặc đã hết hạn');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [shareToken]);

  const handleGenerateMindmap = useCallback(async () => {
    if (mindmapData || isViewOnly) return;
    setTabLoading(prev => ({ ...prev, mindmap: true }));
    setTabErrors(prev => ({ ...prev, mindmap: null }));
    try {
      const data = await shareGenerateMindmap(shareToken);
      setMindmapData(data);
    } catch (err) {
      setTabErrors(prev => ({ ...prev, mindmap: err.response?.data?.error || err.message }));
    } finally {
      setTabLoading(prev => ({ ...prev, mindmap: false }));
    }
  }, [shareToken, mindmapData, isViewOnly]);

  const handleGenerateFlashcards = useCallback(async () => {
    if (flashcardData || isViewOnly) return;
    setTabLoading(prev => ({ ...prev, flashcard: true }));
    setTabErrors(prev => ({ ...prev, flashcard: null }));
    try {
      const data = await shareGenerateFlashcards(shareToken);
      setFlashcardData(data);
    } catch (err) {
      setTabErrors(prev => ({ ...prev, flashcard: err.response?.data?.error || err.message }));
    } finally {
      setTabLoading(prev => ({ ...prev, flashcard: false }));
    }
  }, [shareToken, flashcardData, isViewOnly]);

  const shareChatFn = useCallback(async (message, history) => {
    return await shareChatWithDocument(shareToken, message, history);
  }, [shareToken]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="text-primary-400 animate-spin mx-auto mb-4" />
          <p className="text-muted text-sm">Đang tải tài liệu chia sẻ...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-red-400" />
          </div>
          <h2 className="text-xl font-bold mb-2">Link không hợp lệ</h2>
          <p className="text-muted text-sm mb-6">{error}</p>
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

  // View-only empty state component
  const ViewOnlyEmpty = ({ icon: Icon, label }) => (
    <div className="flex flex-col items-center justify-center h-[500px] gap-4">
      <div className="relative">
        <Icon size={48} className="text-line" />
        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-surface border border-line rounded-full flex items-center justify-center">
          <Lock size={12} className="text-muted" />
        </div>
      </div>
      <p className="text-muted">{label}</p>
      <p className="text-xs text-muted/60 max-w-xs text-center">
        Người chia sẻ chưa tạo nội dung này. Bạn đang ở chế độ chỉ xem.
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="sticky top-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 rounded-lg hover:bg-surface-2 transition-colors" title="Về trang chủ">
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
              <span className="flex items-center gap-1 text-[10px] text-muted">
                <Clock size={11} />
                Hết hạn: {new Date(shareInfo.expiresAt).toLocaleDateString('vi')}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main content — Dashboard-like layout */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Document info bar */}
        <div className="flex items-center gap-3 mb-4 bg-surface border border-line rounded-xl px-5 py-3">
          <FileText size={18} className="text-primary-400 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">
              {content?.fileName || shareInfo?.documentName || 'Tài liệu được chia sẻ'}
            </p>
            <p className="text-xs text-muted">
              {content?.text ? `${(content.text.length / 1000).toFixed(1)}k ký tự` : 'Đã xử lý'}
              {' • '}Tài liệu được chia sẻ
              {shareInfo?.shareType && ` • ${permInfo.label}`}
            </p>
          </div>
          {/* Share link display */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-surface-2 border border-line rounded-lg">
            <Link2 size={12} className="text-muted" />
            <span className="text-[10px] text-muted truncate max-w-[200px]">
              {window.location.origin}/share/{shareToken.slice(0, 12)}...
            </span>
          </div>
        </div>

        {/* View-only notice */}
        {isViewOnly && (
          <div className="flex items-center gap-2 mb-4 px-4 py-2.5 bg-blue-500/5 border border-blue-500/20 rounded-xl">
            <Lock size={14} className="text-blue-400 shrink-0" />
            <p className="text-xs text-blue-300">
              Chế độ chỉ xem — bạn chỉ có thể xem nội dung đã được tạo bởi người chia sẻ.
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-surface border border-line rounded-xl p-1.5">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            // Show indicator if data exists for this tab
            const hasData = (tab.id === 'mindmap' && mindmapData) ||
                           (tab.id === 'flashcard' && flashcardData) ||
                           (tab.id === 'chat' && chatMessages.length > 1);
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative
                  ${isActive
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/25'
                    : 'text-muted hover:text-txt hover:bg-surface-2'
                  }
                `}
              >
                <Icon size={16} />
                <span className="hidden sm:inline">{tab.label}</span>
                {hasData && !isActive && (
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full absolute top-2 right-2" />
                )}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="bg-surface border border-line rounded-2xl min-h-[500px] overflow-hidden">
          {activeTab === 'mindmap' && (
            isViewOnly && !mindmapData ? (
              <ViewOnlyEmpty icon={Map} label="Chưa có sơ đồ tư duy" />
            ) : (
              <MindmapView
                data={mindmapData}
                loading={tabLoading.mindmap}
                error={tabErrors.mindmap}
                onGenerate={isViewOnly ? undefined : handleGenerateMindmap}
              />
            )
          )}
          {activeTab === 'flashcard' && (
            isViewOnly && !flashcardData ? (
              <ViewOnlyEmpty icon={CreditCard} label="Chưa có Flashcard" />
            ) : (
              <FlashcardView
                data={flashcardData}
                loading={tabLoading.flashcard}
                error={tabErrors.flashcard}
                onGenerate={isViewOnly ? undefined : handleGenerateFlashcards}
                docId={null}
              />
            )
          )}
          {activeTab === 'chat' && (
            isViewOnly ? (
              chatMessages.length > 1 ? (
                <ChatView
                  docId={null}
                  messages={chatMessages}
                  setMessages={setChatMessages}
                  chatLimit={0}
                  chatFn={shareChatFn}
                  shareMode
                  readOnly
                />
              ) : (
                <ViewOnlyEmpty icon={MessageCircle} label="Chưa có hội thoại AI" />
              )
            ) : (
              <ChatView
                docId={null}
                messages={chatMessages}
                setMessages={setChatMessages}
                chatLimit={20}
                chatFn={shareChatFn}
                shareMode
              />
            )
          )}
        </div>
      </div>
    </div>
  );
}
