import { useState, useEffect } from 'react';
import {
  FileText, Loader2, AlertCircle, ArrowLeft, Map, CreditCard, MessageCircle,
  Lock, Clock, BrainCircuit, History
} from 'lucide-react';
import MindmapView from './MindmapView';
import FlashcardView from './FlashcardView';
import ChatView from './ChatView';
import { getDocumentSessions, generateMindmap, generateFlashcards } from '../api';

const TABS = [
  { id: 'mindmap', label: 'Sơ đồ tư duy', icon: Map },
  { id: 'flashcard', label: 'Flashcard', icon: CreditCard },
  { id: 'chat', label: 'Hỏi đáp AI', icon: MessageCircle },
];

const WELCOME_MESSAGE = {
  role: 'assistant',
  content: 'Xin chào! Mình là trợ lý học tập NoteMinds 🧠\n\nHãy hỏi mình bất kỳ điều gì về tài liệu bạn vừa upload nhé!'
};

export default function HistoryViewer({ docId, docName, onBack }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [docInfo, setDocInfo] = useState(null);
  const [isLocked, setIsLocked] = useState(false);

  const [activeTab, setActiveTab] = useState('mindmap');
  const [mindmapData, setMindmapData] = useState(null);
  const [flashcardData, setFlashcardData] = useState(null);
  const [chatMessages, setChatMessages] = useState([WELCOME_MESSAGE]);
  const [tabLoading, setTabLoading] = useState({ mindmap: false, flashcard: false });
  const [tabErrors, setTabErrors] = useState({});

  // Load sessions from server
  useEffect(() => {
    if (!docId) return;
    setLoading(true);
    setError(null);
    getDocumentSessions(docId)
      .then(({ document, sessions }) => {
        setDocInfo(document);
        setIsLocked(document.isFileDeleted);
        if (sessions.mindmap) setMindmapData(sessions.mindmap);
        if (sessions.flashcards) setFlashcardData(sessions.flashcards);
        if (sessions.chat && sessions.chat.length > 0) {
          setChatMessages(sessions.chat);
        }
      })
      .catch(err => {
        setError(err.response?.data?.error || 'Không thể tải dữ liệu tài liệu');
      })
      .finally(() => setLoading(false));
  }, [docId]);

  // Generate handlers (only when not locked)
  const handleGenerateMindmap = async () => {
    if (mindmapData || isLocked) return;
    setTabLoading(prev => ({ ...prev, mindmap: true }));
    setTabErrors(prev => ({ ...prev, mindmap: null }));
    try {
      const data = await generateMindmap(docId);
      setMindmapData(data);
    } catch (err) {
      setTabErrors(prev => ({ ...prev, mindmap: err.response?.data?.error || err.message }));
    } finally {
      setTabLoading(prev => ({ ...prev, mindmap: false }));
    }
  };

  const handleGenerateFlashcards = async () => {
    if (flashcardData || isLocked) return;
    setTabLoading(prev => ({ ...prev, flashcard: true }));
    setTabErrors(prev => ({ ...prev, flashcard: null }));
    try {
      const data = await generateFlashcards(docId);
      setFlashcardData(data);
    } catch (err) {
      setTabErrors(prev => ({ ...prev, flashcard: err.response?.data?.error || err.message }));
    } finally {
      setTabLoading(prev => ({ ...prev, flashcard: false }));
    }
  };

  // Locked empty state component
  const LockedEmpty = ({ icon: Icon, label }) => (
    <div className="flex flex-col items-center justify-center h-[500px] gap-4">
      <div className="relative">
        <Icon size={48} className="text-[#2e3144]" />
        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#1a1d27] border border-[#2e3144] rounded-full flex items-center justify-center">
          <Lock size={12} className="text-[#9496a1]" />
        </div>
      </div>
      <p className="text-[#9496a1]">{label}</p>
      <p className="text-xs text-[#9496a1]/60 max-w-xs text-center">
        Tài liệu đã hết hạn — không thể tạo nội dung mới.
      </p>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="text-primary-400 animate-spin" />
          <p className="text-sm text-[#9496a1]">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 max-w-md text-center">
          <AlertCircle size={40} className="text-red-400" />
          <p className="text-red-400 font-medium">{error}</p>
          <button onClick={onBack} className="mt-2 px-4 py-2 bg-[#242736] hover:bg-[#2e3144] rounded-lg text-sm transition-colors">
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  const displayName = docInfo?.originalName || docName || 'Tài liệu';

  return (
    <div className="min-h-screen bg-[#0f1117]">
      {/* Header */}
      <header className="sticky top-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 rounded-lg hover:bg-[#242736] transition-colors" title="Quay lại">
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
            <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border text-amber-400 bg-amber-500/10 border-amber-500/30">
              <History size={12} />
              Lịch sử
            </span>
            {isLocked && (
              <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border text-red-400 bg-red-500/10 border-red-500/30">
                <Lock size={12} />
                Đã hết hạn
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Document info bar */}
        <div className="flex items-center gap-3 mb-4 bg-[#1a1d27] border border-[#2e3144] rounded-xl px-5 py-3">
          <FileText size={18} className={`shrink-0 ${isLocked ? 'text-[#555]' : 'text-primary-400'}`} />
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-medium truncate ${isLocked ? 'text-[#888]' : ''}`}>
              {displayName}
            </p>
            <p className="text-xs text-[#9496a1]">
              {docInfo?.textLength ? `${(docInfo.textLength / 1000).toFixed(1)}k ký tự` : 'Đã xử lý'}
              {docInfo?.createdAt && (
                <> • {new Date(docInfo.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</>
              )}
            </p>
          </div>
        </div>

        {/* Locked notice */}
        {isLocked && (
          <div className="flex items-center gap-2 mb-4 px-4 py-2.5 bg-red-500/5 border border-red-500/20 rounded-xl">
            <Lock size={14} className="text-red-400 shrink-0" />
            <p className="text-xs text-red-300">
              Tài liệu đã hết hạn và bị xoá — bạn chỉ có thể xem nội dung đã được tạo trước đó. Không thể tạo mới hoặc chat.
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-[#1a1d27] border border-[#2e3144] rounded-xl p-1.5">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
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
                    : 'text-[#9496a1] hover:text-white hover:bg-[#242736]'
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
        <div className="bg-[#1a1d27] border border-[#2e3144] rounded-2xl min-h-[500px] overflow-hidden">
          {activeTab === 'mindmap' && (
            isLocked && !mindmapData ? (
              <LockedEmpty icon={Map} label="Chưa có sơ đồ tư duy" />
            ) : (
              <MindmapView
                data={mindmapData}
                loading={tabLoading.mindmap}
                error={tabErrors.mindmap}
                onGenerate={isLocked ? undefined : handleGenerateMindmap}
              />
            )
          )}
          {activeTab === 'flashcard' && (
            isLocked && !flashcardData ? (
              <LockedEmpty icon={CreditCard} label="Chưa có Flashcard" />
            ) : (
              <FlashcardView
                data={flashcardData}
                loading={tabLoading.flashcard}
                error={tabErrors.flashcard}
                onGenerate={isLocked ? undefined : handleGenerateFlashcards}
                docId={isLocked ? null : docId}
              />
            )
          )}
          {activeTab === 'chat' && (
            isLocked ? (
              chatMessages.length > 1 ? (
                <ChatView
                  docId={null}
                  messages={chatMessages}
                  setMessages={setChatMessages}
                  chatLimit={0}
                  readOnly
                />
              ) : (
                <LockedEmpty icon={MessageCircle} label="Chưa có hội thoại AI" />
              )
            ) : (
              <ChatView
                docId={docId}
                messages={chatMessages}
                setMessages={setChatMessages}
                chatLimit={10}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
}
