import { useState, useEffect, useCallback } from 'react';
import {
  Map, CreditCard, MessageCircle, FileText, Loader2, Upload,
  Search, BarChart3, Share2, Tag, Settings, Star, Download, Focus
} from 'lucide-react';
import MindmapView from './MindmapView';
import FlashcardView from './FlashcardView';
import ChatView from './ChatView';
import QuizView from './QuizView';
import PomodoroTimer from './PomodoroTimer';
import {
  SearchModal, AnalyticsModal, ShareModal, TagsModal,
  PreferencesModal, FavoriteButton
} from './FeatureModals';
import { generateMindmap, generateFlashcards, generateQuiz, getRateLimit, getDocumentSessions, downloadDocument } from '../api';

const TABS = [
  { id: 'mindmap', label: 'Sơ đồ tư duy', icon: Map },
  { id: 'flashcard', label: 'Flashcard', icon: CreditCard },
  { id: 'quiz', label: 'Kiểm tra', icon: FileText },
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
  const [quizData, setQuizData] = useState(null);
  const [chatMessages, setChatMessages] = useState([WELCOME_MESSAGE]);
  const [tabLoading, setTabLoading] = useState({ mindmap: false, flashcard: false, quiz: false });
  const [sessionLoading, setSessionLoading] = useState(true);
  const [tabErrors, setTabErrors] = useState({});
  const [isDownloading, setIsDownloading] = useState(false);
  const [showPomodoro, setShowPomodoro] = useState(false);
  const [rateLimit, setRateLimit] = useState({ uploadLimit: 10, uploadsRemaining: 10, resetIn: 0, chatLimit: 10 });

  // Feature modals state
  const [showSearch, setShowSearch] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);

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

  // Load saved sessions on mount
  useEffect(() => {
    if (!doc?.docId) { setSessionLoading(false); return; }
    setSessionLoading(true);
    getDocumentSessions(doc.docId)
      .then(({ sessions }) => {
        if (sessions?.mindmap) setMindmapData(sessions.mindmap);
        if (sessions?.flashcards) setFlashcardData(sessions.flashcards);
        if (sessions?.quiz) setQuizData(sessions.quiz);
        if (sessions?.chat && sessions.chat.length > 0) setChatMessages(sessions.chat);
      })
      .catch(() => { /* no saved sessions, start fresh */ })
      .finally(() => setSessionLoading(false));
  }, [doc?.docId]);

  const handleRateLimitError = (err) => {
    if (err.response?.status === 429) {
      fetchRateLimit();
      return err.response.data.error;
    }
    return err.response?.data?.error || err.message;
  };

  const handleGenerateMindmap = async () => {
    if (mindmapData) return;
    setTabLoading(prev => ({ ...prev, mindmap: true }));
    setTabErrors(prev => ({ ...prev, mindmap: null }));
    try {
      const data = await generateMindmap(doc.docId);
      setMindmapData(data);
    } catch (err) {
      setTabErrors(prev => ({ ...prev, mindmap: handleRateLimitError(err) }));
    } finally {
      setTabLoading(prev => ({ ...prev, mindmap: false }));
    }
  };

  const handleGenerateFlashcards = async () => {
    if (flashcardData) return;
    setTabLoading(prev => ({ ...prev, flashcard: true }));
    setTabErrors(prev => ({ ...prev, flashcard: null }));
    try {
      const data = await generateFlashcards(doc.docId);
      setFlashcardData(data);
    } catch (err) {
      setTabErrors(prev => ({ ...prev, flashcard: handleRateLimitError(err) }));
    } finally {
      setTabLoading(prev => ({ ...prev, flashcard: false }));
    }
  };

  const handleGenerateQuiz = async () => {
    if (quizData) return;
    setTabLoading(prev => ({ ...prev, quiz: true }));
    setTabErrors(prev => ({ ...prev, quiz: null }));
    try {
      const data = await generateQuiz(doc.docId);
      setQuizData(data);
    } catch (err) {
      setTabErrors(prev => ({ ...prev, quiz: handleRateLimitError(err) }));
    } finally {
      setTabLoading(prev => ({ ...prev, quiz: false }));
    }
  };

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
  };

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const { blob, filename } = await downloadDocument(doc.docId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.response?.data?.error || 'Lỗi khi tải xuống tài liệu');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Document info bar */}
      <div className="flex items-center gap-3 mb-4 bg-[#1a1d27] border border-[#2e3144] rounded-xl px-5 py-3">
        <FileText size={18} className="text-primary-400 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{doc.fileName}</p>
          <p className="text-xs text-[#9496a1]">
            {doc.textLength ? `${(doc.textLength / 1000).toFixed(1)}k ký tự` : 'Đã xử lý'}
          </p>
        </div>
        {sessionLoading && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary-600/10 border border-primary-500/20 rounded-lg">
            <Loader2 size={12} className="text-primary-400 animate-spin" />
            <span className="text-[10px] text-primary-400 font-medium">Đang tải dữ liệu...</span>
          </div>
        )}
        <FavoriteButton documentId={doc.docId} />
        <button
          onClick={() => setShowPomodoro(!showPomodoro)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-lg transition-colors ${showPomodoro
              ? 'bg-primary-500/10 border-primary-500/30 text-primary-400'
              : 'bg-[#242736] border-[#2e3144] hover:bg-[#2e3144]'
            }`}
          title="Focus Mode (Pomodoro)"
        >
          <Focus size={14} />
          <span className="hidden sm:inline">Tập trung</span>
        </button>
      </div>

      {/* Feature toolbar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-primary-600/10 border border-primary-500/30 rounded-lg text-primary-400 hover:bg-primary-600/20 transition-all disabled:opacity-50"
        >
          {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          <span className="hidden sm:inline">{isDownloading ? 'Đang tải...' : 'Tải file gốc'}</span>
        </button>

        <div className="w-px h-6 bg-[#2e3144] mx-1 hidden sm:block"></div>

        {[
          { icon: Search, label: 'Tìm kiếm', onClick: () => setShowSearch(true) },
          { icon: BarChart3, label: 'Phân tích', onClick: () => setShowAnalytics(true) },
          { icon: Share2, label: 'Chia sẻ', onClick: () => setShowShare(true) },
          { icon: Tag, label: 'Nhãn', onClick: () => setShowTags(true) },
          { icon: Settings, label: 'Cài đặt', onClick: () => setShowPreferences(true) },
        ].map((btn, i) => (
          <button
            key={i}
            onClick={btn.onClick}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-[#1a1d27] border border-[#2e3144] rounded-lg text-[#9496a1] hover:text-white hover:border-primary-500/40 transition-all"
          >
            <btn.icon size={14} />
            <span className="hidden sm:inline">{btn.label}</span>
          </button>
        ))}
      </div>

      {/* Upload quota badge */}
      <div className="flex items-center gap-2 mb-4">
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${rateLimit.uploadsRemaining > 0
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

      {/* Pomodoro Overlay */}
      {showPomodoro && <PomodoroTimer onClose={() => setShowPomodoro(false)} />}

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
            loading={tabLoading.mindmap}
            error={tabErrors.mindmap}
            onGenerate={handleGenerateMindmap}
          />
        )}
        {activeTab === 'flashcard' && (
          <FlashcardView
            data={flashcardData}
            loading={tabLoading.flashcard}
            error={tabErrors.flashcard}
            onGenerate={handleGenerateFlashcards}
            docId={doc?.docId}
          />
        )}
        {activeTab === 'quiz' && (
          <QuizView
            data={quizData}
            loading={tabLoading.quiz}
            error={tabErrors.quiz}
            onGenerate={handleGenerateQuiz}
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

      {/* Feature Modals */}
      <SearchModal isOpen={showSearch} onClose={() => setShowSearch(false)} />
      <AnalyticsModal isOpen={showAnalytics} onClose={() => setShowAnalytics(false)} />
      <ShareModal isOpen={showShare} onClose={() => setShowShare(false)} documentId={doc.docId} />
      <TagsModal isOpen={showTags} onClose={() => setShowTags(false)} documentId={doc.docId} />
      <PreferencesModal isOpen={showPreferences} onClose={() => setShowPreferences(false)} />
    </div>
  );
}
