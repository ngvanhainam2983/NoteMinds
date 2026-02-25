import { useState, useEffect } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import FileUpload from './components/FileUpload';
import Dashboard from './components/Dashboard';
import AuthModal from './components/AuthModal';
import AdminPanel from './components/AdminPanel';
import PricingPage from './components/PricingPage';
import SharedDocViewer from './components/SharedDocViewer';
import HistoryViewer from './components/HistoryViewer';
import { getStoredUser, logout as apiLogout, getMe } from './api';

export default function App() {
  const [currentDoc, setCurrentDoc] = useState(null);
  const [view, setView] = useState('home'); // 'home' | 'dashboard' | 'admin' | 'pricing' | 'shared' | 'history'
  const [historyDoc, setHistoryDoc] = useState(null);
  const [user, setUser] = useState(getStoredUser);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalTab, setAuthModalTab] = useState('login');
  const [shareToken, setShareToken] = useState(null);

  // Detect /share/:token URL on mount
  useEffect(() => {
    const match = window.location.pathname.match(/^\/share\/([a-f0-9]+)$/i);
    if (match) {
      setShareToken(match[1]);
      setView('shared');
    }
  }, []);

  // Verify stored token on mount
  useEffect(() => {
    if (user) {
      getMe().then(u => setUser(u)).catch(() => {
        apiLogout();
        setUser(null);
      });
    }
  }, []);

  // Documents are auto-deleted after 24h on the server — no instant cleanup needed

  const handleUploadComplete = (docInfo) => {
    setCurrentDoc(docInfo);
    setView('dashboard');
  };

  const handleBackHome = () => {
    setView('home');
    setCurrentDoc(null);
    setShareToken(null);
    setHistoryDoc(null);
    // Clean up URL if on a share page
    if (window.location.pathname.startsWith('/share/')) {
      window.history.pushState({}, '', '/');
    }
  };

  const handleOpenDocument = (doc) => {
    setHistoryDoc({ docId: doc.id, docName: doc.original_name });
    setView('history');
  };

  const handleLogout = () => {
    apiLogout();
    setUser(null);
  };

  const openAuthModal = (tab = 'login') => {
    setAuthModalTab(tab);
    setShowAuthModal(true);
  };

  const handleAuthSuccess = (userData) => {
    setUser(userData);
  };

  return (
    <div className="min-h-screen bg-[#0f1117]">
      {view === 'shared' && shareToken ? (
        <SharedDocViewer shareToken={shareToken} onBack={handleBackHome} />
      ) : view === 'history' && historyDoc ? (
        <HistoryViewer docId={historyDoc.docId} docName={historyDoc.docName} onBack={handleBackHome} />
      ) : (
        <>
          {view !== 'admin' && view !== 'pricing' && (
            <Header
              onBackHome={handleBackHome}
              showBack={view === 'dashboard'}
              user={user}
              onLoginClick={() => openAuthModal('login')}
              onLogout={handleLogout}
              onOpenAdmin={() => setView('admin')}
              onOpenPricing={() => setView('pricing')}
              onUserUpdate={(updated) => setUser(updated)}
              onOpenDocument={handleOpenDocument}
              currentView={view}
            />
          )}

          {view === 'home' && (
            <main>
              <Hero />
              <section id="why">
                <WhySection />
              </section>
              <section id="upload">
                <FileUpload
                  onUploadComplete={handleUploadComplete}
                  user={user}
                  onAuthRequired={() => openAuthModal('register')}
                />
              </section>
              <section id="features">
                <Features />
              </section>
            </main>
          )}

          {view === 'dashboard' && currentDoc && (
            <Dashboard doc={currentDoc} user={user} />
          )}

          {view === 'admin' && (
            <AdminPanel onBack={handleBackHome} />
          )}

          {view === 'pricing' && (
            <PricingPage
              onBack={handleBackHome}
              user={user}
              onLoginClick={() => openAuthModal('login')}
            />
          )}

          <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
            onAuthSuccess={handleAuthSuccess}
            defaultTab={authModalTab}
          />
        </>
      )}
    </div>
  );
}

function Features() {
  const features = [
    {
      icon: '🧠',
      title: 'Sơ đồ tư duy AI',
      desc: 'Tự động chuyển đổi tài liệu dài thành sơ đồ tư duy trực quan, dễ hiểu chỉ trong vài phút.'
    },
    {
      icon: '📇',
      title: 'Flashcard thông minh',
      desc: 'Tạo bộ thẻ ghi nhớ Active Recall từ các khái niệm quan trọng, hỗ trợ xuất Anki & Quizlet.'
    },
    {
      icon: '💬',
      title: 'Hỏi đáp với tài liệu',
      desc: 'Chat trực tiếp với AI để giải thích sâu hơn bất kỳ khái niệm nào trong bài giảng.'
    },
    {
      icon: '📄',
      title: 'Đa định dạng',
      desc: 'Hỗ trợ PDF, file text, và cả file ghi âm bài giảng MP3, WAV, M4A.'
    },
  ];

  return (
    <section className="max-w-6xl mx-auto px-4 py-20">
      <h2 className="text-3xl font-bold text-center mb-4 font-display">
        Tính năng <span className="gradient-text">nổi bật</span>
      </h2>
      <p className="text-center text-[#9496a1] mb-12 max-w-2xl mx-auto">
        NoteMinds sử dụng NoteMindAI để tự động hóa khâu chuẩn bị tài liệu, 
        giúp bạn tập trung 100% vào việc hiểu và ghi nhớ
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((f, i) => (
          <div
            key={i}
            className="bg-[#1a1d27] border border-[#2e3144] rounded-2xl p-6 hover:border-primary-500/50 transition-all duration-300 hover:-translate-y-1"
          >
            <div className="text-4xl mb-4">{f.icon}</div>
            <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
            <p className="text-sm text-[#9496a1] leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function WhySection() {
  const reasons = [
    {
      icon: '⏰',
      title: 'Tiết kiệm 80% thời gian',
      desc: 'Thay vì mất hàng giờ đọc và tóm tắt, AI xử lý tài liệu trong vài giây. Bạn chỉ cần tập trung học.',
    },
    {
      icon: '🎯',
      title: 'Học đúng trọng tâm',
      desc: 'AI phân tích và trích xuất các khái niệm quan trọng nhất, giúp bạn tập trung vào điều thực sự cần nhớ.',
    },
    {
      icon: '🧪',
      title: 'Phương pháp khoa học',
      desc: 'Active Recall + Spaced Repetition qua Flashcard — hai phương pháp được chứng minh hiệu quả nhất.',
    },
    {
      icon: '🌐',
      title: 'Đa định dạng linh hoạt',
      desc: 'Upload PDF, Word, text hay thậm chí file ghi âm bài giảng — NoteMinds xử lý được tất cả.',
    },
    {
      icon: '💡',
      title: 'Hiểu sâu hơn với AI Chat',
      desc: 'Không chỉ tóm tắt — bạn có thể hỏi đáp trực tiếp với AI để giải thích bất kỳ khái niệm nào.',
    },
    {
      icon: '🚀',
      title: 'Sẵn sàng mọi lúc',
      desc: 'Truy cập từ mọi thiết bị, không cần cài đặt. Chỉ cần trình duyệt và bạn đã sẵn sàng học.',
    },
  ];

  return (
    <section className="max-w-6xl mx-auto px-4 py-20">
      <h2 className="text-3xl font-bold text-center mb-4 font-display">
        Tại sao chọn <span className="gradient-text">NoteMinds</span>?
      </h2>
      <p className="text-center text-[#9496a1] mb-12 max-w-2xl mx-auto">
        NoteMinds không chỉ là công cụ tóm tắt — đây là trợ lý học tập AI toàn diện, 
        giúp bạn biến mọi tài liệu thành kiến thức thực sự
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reasons.map((r, i) => (
          <div
            key={i}
            className="bg-[#1a1d27] border border-[#2e3144] rounded-2xl p-6 hover:border-primary-500/50 transition-all duration-300 group"
          >
            <div className="w-12 h-12 bg-primary-600/10 border border-primary-500/20 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
              {r.icon}
            </div>
            <h3 className="text-lg font-semibold mb-2">{r.title}</h3>
            <p className="text-sm text-[#9496a1] leading-relaxed">{r.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
