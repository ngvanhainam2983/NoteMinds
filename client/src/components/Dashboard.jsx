import { useState, useEffect, useCallback } from 'react';
import { Map, CreditCard, MessageCircle, FileText, Loader2, Upload } from 'lucide-react';
import MindmapView from './MindmapView';
import FlashcardView from './FlashcardView';
import ChatView from './ChatView';
import { generateMindmap, generateFlashcards, getRateLimit } from '../api';

const TABS = [
  { id: 'mindmap', label: 'Sơ đồ tư duy', icon: Map },
  { id: 'flashcard', label: 'Flashcard', icon: CreditCard },
  { id: 'chat', label: 'Hỏi đáp AI', icon: MessageCircle },
];

const WELCOME_MESSAGE = {
  role: 'assistant',
  content: 'Xin chào! Mình là trợ lý học tập NoteMinds 🧠\n\nHãy hỏi mình bất kỳ điều gì về tài liệu bạn vừa upload nhé! Ví dụ:\n- "Tóm tắt nội dung chính"\n- "Giải thích khái niệm X"\n- "So sánh A và B"'
};

export default function Dashboard({ doc, user }) {
  const [activeTab, setActiveTab] = useState('mindmap');
  const [mindmapData, setMindmapData] = useState(null);
  const [flashcardData, setFlashcardData] = useState(null);
  const [chatMessages, setChatMessages] = useState([WELCOME_MESSAGE]);
  const [loading, setLoading] = useState({ mindmap: false, flashcard: false });
  const [errors, setErrors] = useState({});
  const [rateLimit, setRateLimit] = useState({ uploadLimit: 10, uploadsRemaining: 10, resetIn: 0, chatLimit: 10 });

  const fetchRateLimit = useCallback(async () => {
    try {
      const data = await getRateLimit();
      setRateLimit(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchRateLimit();
    const interval = setInterval(fetchRateLimit, 30000);
    return () => clearInterval(interval);
  }, [fetchRateLimit]);

  const handleRateLimitError = (err) => {
    if (err.response?.status === 429) {
      fetchRateLimit();
      return err.response.data.error;
    }
    return err.response?.data?.error || err.message;
  };

  const handleGenerateMindmap = async () => {
    if (mindmapData) return;
    setLoading(prev => ({ ...prev, mindmap: true }));
    setErrors(prev => ({ ...prev, mindmap: null }));
    try {
      const data = await generateMindmap(doc.docId);
      setMindmapData(data);
    } catch (err) {
      setErrors(prev => ({ ...prev, mindmap: handleRateLimitError(err) }));
    } finally {
      setLoading(prev => ({ ...prev, mindmap: false }));
    }
  };

  const handleGenerateFlashcards = async () => {
    if (flashcardData) return;
    setLoading(prev => ({ ...prev, flashcard: true }));
    setErrors(prev => ({ ...prev, flashcard: null }));
    try {
      const data = await generateFlashcards(doc.docId);
      setFlashcardData(data);
    } catch (err) {
      setErrors(prev => ({ ...prev, flashcard: handleRateLimitError(err) }));
    } finally {
      setLoading(prev => ({ ...prev, flashcard: false }));
    }
  };

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Document info bar */}
      <div className="flex items-center gap-3 mb-6 bg-[#1a1d27] border border-[#2e3144] rounded-xl px-5 py-3">
        <FileText size={18} className="text-primary-400 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{doc.fileName}</p>
          <p className="text-xs text-[#9496a1]">
            {doc.textLength ? `${(doc.textLength / 1000).toFixed(1)}k ký tự` : 'Đã xử lý'}
          </p>
        </div>
      </div>

      {/* Upload quota badge */}
      <div className="flex items-center gap-2 mb-4">
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${
          rateLimit.uploadsRemaining > 0
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          <Upload size={13} />
          <span>
            {rateLimit.uploadsRemaining > 0
              ? `Còn ${rateLimit.uploadsRemaining}/${rateLimit.uploadLimit} lượt upload hôm nay`
              : rateLimit.isGuest
                ? 'Hết lượt miễn phí — đăng ký để có 5 lượt/ngày'
                : 'Hết lượt upload — thử lại vào ngày mai'
            }
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-[#1a1d27] border border-[#2e3144] rounded-xl p-1.5">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`
                flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/25'
                  : 'text-[#9496a1] hover:text-white hover:bg-[#242736]'
                }
              `}
            >
              <Icon size={16} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="bg-[#1a1d27] border border-[#2e3144] rounded-2xl min-h-[500px] overflow-hidden">
        {activeTab === 'mindmap' && (
          <MindmapView
            data={mindmapData}
            loading={loading.mindmap}
            error={errors.mindmap}
            onGenerate={handleGenerateMindmap}
          />
        )}
        {activeTab === 'flashcard' && (
          <FlashcardView
            data={flashcardData}
            loading={loading.flashcard}
            error={errors.flashcard}
            onGenerate={handleGenerateFlashcards}
          />
        )}
        {activeTab === 'chat' && (
          <ChatView
            docId={doc.docId}
            messages={chatMessages}
            setMessages={setChatMessages}
            chatLimit={rateLimit.chatLimit}
          />
        )}
      </div>
    </div>
  );
}
