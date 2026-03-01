import { useState, useEffect, useCallback } from 'react';
import {
  Map, CreditCard, MessageCircle, FileText, Loader2, Upload,
  Search, BarChart3, Share2, Tag, Settings, Star, Download, Focus, Globe, Lock, XCircle
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
import { generateMindmap, generateFlashcards, generateQuiz, getRateLimit, getDocumentSessions, downloadDocument, toggleDocumentPublic } from '../api';
import Joyride, { STATUS } from 'react-joyride';

const TABS = [
  { id: 'mindmap', label: 'Sơ đồ tư duy', icon: Map },
  { id: 'flashcard', label: 'Flashcard', icon: CreditCard },
  { id: 'quiz', label: 'Kiểm tra', icon: FileText },
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
  const [docDetails, setDocDetails] = useState({
    fileName: doc?.fileName || 'Tài liệu',
    textLength: doc?.textLength || 0,
    isLocked: false,
  });
  const [isPublic, setIsPublic] = useState(doc?.is_public || false);
  const [isTogglingPublic, setIsTogglingPublic] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [rateLimit, setRateLimit] = useState({ uploadLimit: 10, uploadsRemaining: 10, resetIn: 0, chatLimit: 10 });

  // Tour state
  const [runTour, setRunTour] = useState(false);
  const [tourSteps] = useState([
    {
      target: '.tour-doc-info',
      content: 'Đây là tài liệu của bạn. Tại đây bạn có thể đổi trạng thái Công khai/Riêng tư, Thêm vào Yêu thích, và bật Chế độ Tập trung.',
      disableBeacon: true,
    },
    {
      target: '.tour-tools',
      content: 'Thanh công cụ giúp bạn tải về, tìm kiếm, xem phân tích và tinh chỉnh tài liệu.',
    },
    {
      target: '.tour-tabs',
      content: 'Chuyển đổi giữa Sơ đồ tư duy, hệ thống Flashcard và bài Trắc nghiệm để học một cách hiệu quả nhất!',
    },
    {
      target: '.tour-chat-fab',
      content: 'Tại đây, bạn luôn có một Trợ lý AI sẵn sàng giải đáp và tóm tắt mọi thắc mắc ngay tức thì!',
    }
  ]);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('notemind_dashboard_tour_seen');
    if (!hasSeenTour) {
      // slight delay to let the UI load
      setTimeout(() => setRunTour(true), 500);
    }
  }, []);

  const handleJoyrideCallback = (data) => {
    const { status } = data;
    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];
    if (finishedStatuses.includes(status)) {
      setRunTour(false);
      localStorage.setItem('notemind_dashboard_tour_seen', 'true');
    }
  };

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
      .then(({ document, sessions }) => {
        if (document) {
          setDocDetails({
            fileName: document.original_name || doc.fileName || 'Tài liệu đã lưu',
            textLength: document.text_length || doc.textLength || 0,
            isLocked: !!document.isFileDeleted
          });
          if (document.is_public !== undefined) {
            setIsPublic(!!document.is_public);
          }
        }
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
    if (mindmapData || docDetails.isLocked) return;
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
    if (flashcardData || docDetails.isLocked) return;
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
    if (quizData || docDetails.isLocked) return;
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

  const handleTogglePublic = async () => {
    if (isTogglingPublic || !doc?.docId) return;
    setIsTogglingPublic(true);
    try {
      const data = await toggleDocumentPublic(doc.docId, !isPublic);
      setIsPublic(data.is_public);
    } catch (err) {
      alert(err.response?.data?.error || 'Lỗi khi cập nhật trạng thái');
    } finally {
      setIsTogglingPublic(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <Joyride
        steps={tourSteps}
        run={runTour}
        continuous={true}
        showSkipButton={true}
        showProgress={true}
        callback={handleJoyrideCallback}
        styles={{
          options: {
            primaryColor: '#6366f1',
            backgroundColor: '#1a1d27',
            textColor: '#e4e5e9',
            arrowColor: '#1a1d27',
            overlayColor: 'rgba(0, 0, 0, 0.75)',
            zIndex: 1000,
          },
          tooltipContainer: { textAlign: 'left' },
          buttonNext: { backgroundColor: '#6366f1', borderRadius: '8px' },
          buttonBack: { color: '#9496a1', marginRight: 10 }
        }}
        locale={{ back: 'Quay lại', close: 'Đóng', last: 'Hoàn tất', next: 'Tiếp theo', skip: 'Bỏ qua' }}
      />

      {/* Document info bar */}
      <div className="tour-doc-info flex items-center gap-4 mb-5 bg-gradient-to-r from-surface to-surface-2 border border-line rounded-2xl px-6 py-4 shadow-sm">
        <div className="w-10 h-10 bg-primary-600/15 border border-primary-500/20 rounded-xl flex items-center justify-center shrink-0">
          <FileText size={20} className="text-primary-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate text-txt">
            {docDetails.fileName}
            {docDetails.isLocked && <span className="ml-2 px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 text-[10px] border border-red-500/20 font-medium">Đã xóa gốc</span>}
          </p>
          <p className="text-xs text-muted mt-0.5">
            {docDetails.textLength ? `${(docDetails.textLength / 1000).toFixed(1)}k ký tự` : 'Đã xử lý'}
            {sessionLoading && <span className="ml-2 text-primary-400">• Đang tải dữ liệu...</span>}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTogglePublic}
            disabled={isTogglingPublic}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium border rounded-xl transition-all ${isPublic
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
              : 'bg-surface border-line hover:bg-line text-muted'
              } disabled:opacity-50`}
            title={isPublic ? "Đang công khai" : "Chỉ mình tôi"}
          >
            {isTogglingPublic ? <Loader2 size={14} className="animate-spin" /> : isPublic ? <Globe size={14} /> : <Lock size={14} />}
            <span className="hidden sm:inline">{isPublic ? 'Công khai' : 'Riêng tư'}</span>
          </button>

          <FavoriteButton documentId={doc.docId} />

          <button
            onClick={() => setShowPomodoro(!showPomodoro)}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium border rounded-xl transition-all ${showPomodoro
              ? 'bg-primary-500/10 border-primary-500/30 text-primary-400'
              : 'bg-surface border-line hover:bg-line text-muted'
              }`}
            title="Focus Mode (Pomodoro)"
          >
            <Focus size={14} />
            <span className="hidden sm:inline">Tập trung</span>
          </button>
        </div>
      </div>

      {/* Feature toolbar + upload quota */}
      <div className="tour-tools flex items-center gap-2 mb-5 flex-wrap">
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-primary-600/10 border border-primary-500/20 rounded-xl text-primary-400 hover:bg-primary-600/20 transition-all disabled:opacity-50"
        >
          {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          <span className="hidden sm:inline">{isDownloading ? 'Đang tải...' : 'Tải file gốc'}</span>
        </button>

        <div className="w-px h-5 bg-line mx-0.5 hidden sm:block"></div>

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
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-surface border border-line rounded-xl text-muted hover:text-txt hover:border-primary-500/30 hover:bg-surface-2 transition-all"
          >
            <btn.icon size={14} />
            <span className="hidden sm:inline">{btn.label}</span>
          </button>
        ))}

        <div className="flex-1" />

        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border ${rateLimit.uploadsRemaining > 0
          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
          : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
          <Upload size={12} />
          <span className="hidden sm:inline">
            {rateLimit.uploadsRemaining > 0
              ? `${rateLimit.uploadsRemaining}/${rateLimit.uploadLimit} lượt upload`
              : rateLimit.isGuest ? 'Hết lượt miễn phí' : 'Hết lượt upload'
            }
          </span>
        </div>
      </div>

      {/* Pomodoro Overlay */}
      {showPomodoro && <PomodoroTimer onClose={() => setShowPomodoro(false)} />}

      {/* Tabs */}
      <div className="tour-tabs flex gap-1 mb-6 bg-surface/80 backdrop-blur-sm border border-line rounded-2xl p-1.5">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`
                flex-1 flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200
                ${isActive
                  ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-600/20'
                  : 'text-muted hover:text-txt hover:bg-surface-2'
                }
              `}
            >
              <Icon size={17} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="bg-surface border border-line rounded-2xl min-h-[500px] overflow-hidden shadow-sm">
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
      </div>

      {/* Floating Chatbox */}
      <div className={`fixed bottom-6 right-6 z-40 transition-all duration-300 ${showChat ? 'w-[420px] h-[620px] max-w-[calc(100vw-3rem)] max-h-[calc(100vh-6rem)] opacity-100 translate-y-0' : 'w-14 h-14 opacity-0 pointer-events-none translate-y-10'}`}>
        <div className="w-full h-full bg-surface border border-line shadow-2xl shadow-black/20 rounded-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-surface-2 to-surface border-b border-line">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-primary-600/20 rounded-lg flex items-center justify-center">
                <MessageCircle size={16} className="text-primary-400" />
              </div>
              <div>
                <span className="font-semibold text-sm block leading-tight">Trợ lý AI</span>
                <span className="text-[10px] text-muted">Hỏi đáp về tài liệu</span>
              </div>
            </div>
            <button onClick={() => setShowChat(false)} className="p-1.5 rounded-lg hover:bg-surface text-muted hover:text-txt transition-colors">
              <XCircle size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <ChatView
              docId={doc.docId}
              messages={chatMessages}
              setMessages={setChatMessages}
              chatLimit={rateLimit.chatLimit}
            />
          </div>
        </div>
      </div>

      {/* Floating Action Button (FAB) for Chat */}
      {!showChat && (
        <button
          onClick={() => setShowChat(true)}
          className="tour-chat-fab fixed bottom-6 right-6 z-30 w-14 h-14 bg-gradient-to-br from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-primary-600/30 hover:scale-105 active:scale-95 transition-all group"
        >
          <MessageCircle size={22} className="group-hover:scale-110 transition-transform" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-accent-500 rounded-full ring-2 ring-bg animate-pulse" />
        </button>
      )}

      {/* Feature Modals */}
      <SearchModal isOpen={showSearch} onClose={() => setShowSearch(false)} />
      <AnalyticsModal isOpen={showAnalytics} onClose={() => setShowAnalytics(false)} />
      <ShareModal isOpen={showShare} onClose={() => setShowShare(false)} documentId={doc.docId} />
      <TagsModal isOpen={showTags} onClose={() => setShowTags(false)} documentId={doc.docId} />
      <PreferencesModal isOpen={showPreferences} onClose={() => setShowPreferences(false)} />
    </div>
  );
}
