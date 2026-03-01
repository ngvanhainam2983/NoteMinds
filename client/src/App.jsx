import { useState, useEffect } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import FileUpload from './components/FileUpload';
import Dashboard from './components/Dashboard';
import AuthModal from './components/AuthModal';
import AdminPanel from './components/AdminPanel';
import PricingPage from './components/PricingPage';
import SharedDocViewer from './components/SharedDocViewer';
import HistoryPage from './components/HistoryPage';
import ProfilePage from './components/ProfilePage';
import CommunityFeed from './components/CommunityFeed';
import PublicDocViewer from './components/PublicDocViewer';
import PublicProfilePage from './components/PublicProfilePage';
import LeaderboardPage from './components/LeaderboardPage';
import StatsPage from './components/StatsPage';
import AnnouncementBanner from './components/AnnouncementBanner';
import OfflinePage from './components/OfflinePage';
import { getStoredUser, logout as apiLogout, getMe, verifyEmailToken, resetPassword, getSystemSettings } from './api';
import { CheckCircle2, XCircle, Loader2, Lock, Eye, EyeOff, ArrowLeft, Wrench, WifiOff } from 'lucide-react';

export default function App() {
  const [currentDoc, setCurrentDoc] = useState(null);
  const [view, setView] = useState('home'); // 'home' | 'dashboard' | 'admin' | 'pricing' | 'shared' | 'history' | 'history-list' | 'verify-email' | 'reset-password' | 'leaderboard' | 'stats'
  const [historyDoc, setHistoryDoc] = useState(null);
  const [user, setUser] = useState(getStoredUser);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalTab, setAuthModalTab] = useState('login');
  const [shareToken, setShareToken] = useState(null);
  const [emailToken, setEmailToken] = useState(null);
  const [publicUsername, setPublicUsername] = useState(null);
  const [maintenance, setMaintenance] = useState(null);
  const [maintenanceChecked, setMaintenanceChecked] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Online/Offline detection
  useEffect(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Detect /share/:token, /history, /history/:docId, /session/:docId, or /price URL on mount
  useEffect(() => {
    const path = window.location.pathname;
    const search = new URLSearchParams(window.location.search);
    const shareMatch = path.match(/^\/share\/([a-f0-9]+)$/i);
    const historyDocMatch = path.match(/^\/history\/([a-f0-9-]+)$/i);
    const sessionMatch = path.match(/^\/session\/([a-f0-9-]+)$/i);
    const publicDocMatch = path.match(/^\/public\/([a-f0-9-]+)$/i);
    const publicProfileMatch = path.match(/^\/profile\/@([a-zA-Z0-9_.-]+)$/i);
    if (shareMatch) {
      setShareToken(shareMatch[1]);
      setView('shared');
    } else if (publicDocMatch) {
      setCurrentDoc({ docId: publicDocMatch[1], fileName: 'Tài liệu công khai' });
      setView('public');
    } else if (historyDocMatch) {
      setCurrentDoc({ docId: historyDocMatch[1], fileName: 'Tài liệu đã lưu' });
      setView('dashboard');
    } else if (path === '/history') {
      setView('history-list');
    } else if (sessionMatch) {
      setCurrentDoc({ docId: sessionMatch[1], fileName: 'Phiên học mới' });
      setView('dashboard');
    } else if (path === '/price') {
      setView('home');
      setTimeout(() => {
        document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
      }, 500);
    } else if (path === '/verify-email' && search.get('token')) {
      setEmailToken(search.get('token'));
      setView('verify-email');
    } else if (path === '/reset-password' && search.get('token')) {
      setEmailToken(search.get('token'));
      setView('reset-password');
    } else if (path === '/profile') {
      setView('profile');
    } else if (publicProfileMatch) {
      setPublicUsername(publicProfileMatch[1]);
      setView('public-profile');
    } else if (path === '/community') {
      setView('community');
    } else if (path === '/admin') {
      setView('admin');
    } else if (path === '/leaderboard') {
      setView('leaderboard');
    } else if (path === '/stats') {
      setView('stats');
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

  // Check maintenance mode
  useEffect(() => {
    getSystemSettings().then(s => {
      if (s.maintenance_mode) {
        setMaintenance(s.maintenance_message || 'Hệ thống đang bảo trì. Vui lòng quay lại sau.');
      } else {
        setMaintenance(null);
      }
    }).catch(() => {}).finally(() => setMaintenanceChecked(true));
  }, []);

  // Documents are auto-deleted after 7 days on the server — no instant cleanup needed

  const handleUploadComplete = (docInfo) => {
    setCurrentDoc(docInfo);
    setView('dashboard');
    window.history.pushState({}, '', `/session/${docInfo.docId}`);
  };

  const handleBackHome = () => {
    setView('home');
    setCurrentDoc(null);
    setShareToken(null);
    setHistoryDoc(null);
    setPublicUsername(null);
    // Clean up URL if on a share or history page
    if (window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
    }
  };

  const handleOpenDocument = (doc) => {
    setCurrentDoc({
      docId: doc.id,
      fileName: doc.original_name || doc.title || 'Tài liệu đã lưu',
      textLength: doc.text_length || 0,
      is_public: !!doc.is_public
    });
    setView('dashboard');
    window.history.pushState({}, '', `/history/${doc.id}`);
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

  // Block rendering until maintenance check completes (prevents flash)
  if (!maintenanceChecked && !isOffline) {
    return <div className="min-h-screen bg-bg" />;
  }

  // Show offline UI when no network
  if (isOffline) {
    const offlineEnabled = (() => { try { return localStorage.getItem('notemind_offline_page_enabled') === 'true'; } catch { return false; } })();
    if (offlineEnabled) {
      return (
        <OfflinePage
          onBack={null}
          onRetry={() => {
            if (navigator.onLine) setIsOffline(false);
            else window.location.reload();
          }}
          onDisable={() => {
            try { localStorage.removeItem('notemind_offline_page_enabled'); } catch {}
            setIsOffline(prev => !prev);
            setTimeout(() => setIsOffline(true), 0);
          }}
        />
      );
    }
    // Simple offline banner
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-surface border border-line rounded-2xl p-10 space-y-6">
            <div className="w-20 h-20 mx-auto bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center">
              <WifiOff size={36} className="text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight mb-2">Bạn đang offline</h1>
              <p className="text-muted text-sm leading-relaxed">Không có kết nối mạng. Hãy kiểm tra lại kết nối và thử lại.</p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => { if (navigator.onLine) setIsOffline(false); else window.location.reload(); }}
                className="w-full py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-sm font-semibold transition-colors"
              >
                Thử kết nối lại
              </button>
              <button
                onClick={() => {
                  try { localStorage.setItem('notemind_offline_page_enabled', 'true'); } catch {}
                  setIsOffline(prev => !prev); // force re-render
                  setTimeout(() => setIsOffline(true), 0);
                }}
                className="w-full py-2.5 rounded-xl bg-surface-2 hover:bg-line border border-line text-txt text-sm font-medium transition-colors"
              >
                Xem lịch sử đã lưu
              </button>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-muted">
              <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              Đang chờ kết nối mạng
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show maintenance screen for non-admin users
  if (maintenance && (!user || user.role !== 'admin')) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-surface border border-line rounded-2xl p-10 space-y-6">
            <div className="w-20 h-20 mx-auto bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center">
              <Wrench size={36} className="text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight mb-2">Đang bảo trì</h1>
              <p className="text-muted text-sm leading-relaxed">{maintenance}</p>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-muted">
              <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              Hệ thống sẽ sớm hoạt động trở lại
            </div>
          </div>
          <button
            onClick={() => openAuthModal('login')}
            className="mt-4 text-xs text-muted hover:text-txt transition-colors"
          >
            Đăng nhập Admin
          </button>
          <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
            onAuthSuccess={handleAuthSuccess}
            defaultTab={authModalTab}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      {view === 'shared' && shareToken ? (
        <SharedDocViewer shareToken={shareToken} onBack={handleBackHome} />
      ) : (
        <>
          {view !== 'admin' && view !== 'profile' && view !== 'public-profile' && (
            <Header
              onBackHome={handleBackHome}
              showBack={view === 'dashboard' || view === 'history-list'}
              user={user}
              onLoginClick={() => openAuthModal('login')}
              onLogout={handleLogout}
              onOpenAdmin={() => { setView('admin'); window.history.pushState({}, '', '/admin'); }}
              onUserUpdate={(updated) => setUser(updated)}
              onOpenDocument={handleOpenDocument}
              onOpenHistory={() => { setView('history-list'); window.history.pushState({}, '', '/history'); }}
              onOpenProfile={() => { setView('profile'); window.history.pushState({}, '', '/profile'); }}
              onOpenLeaderboard={() => { setView('leaderboard'); window.history.pushState({}, '', '/leaderboard'); }}
              onOpenStats={() => { setView('stats'); window.history.pushState({}, '', '/stats'); }}
              currentView={view}
            />
          )}

          {/* Announcement Banner (show on major views) */}
          {user && ['home', 'dashboard', 'history-list', 'community'].includes(view) && (
            <div className="max-w-7xl mx-auto px-4 pt-3">
              <AnnouncementBanner user={user} />
            </div>
          )}

          {view === 'home' && (
            <main>
              <Hero />
              <section id="upload" className="relative z-20 -mt-8">
                <FileUpload
                  onUploadComplete={handleUploadComplete}
                  user={user}
                  onAuthRequired={() => openAuthModal('register')}
                />
              </section>
              <section id="why">
                <WhySection />
              </section>
              <section id="features">
                <Features />
              </section>
              <PricingPage user={user} onLoginClick={() => openAuthModal('login')} />
            </main>
          )}

          {view === 'dashboard' && currentDoc && (
            <Dashboard doc={currentDoc} user={user} />
          )}

          {view === 'history-list' && (
            <HistoryPage onOpenDocument={handleOpenDocument} />
          )}

          {view === 'admin' && (
            <AdminPanel onBack={handleBackHome} />
          )}

          {view === 'verify-email' && emailToken && (
            <VerifyEmailPage token={emailToken} onGoHome={handleBackHome} onUserUpdate={setUser} />
          )}

          {view === 'reset-password' && emailToken && (
            <ResetPasswordPage token={emailToken} onGoHome={handleBackHome} />
          )}

          {view === 'profile' && (
            <ProfilePage
              user={user}
              onBack={handleBackHome}
              onUserUpdate={(updated) => setUser(updated)}
              onOpenAuth={(tab) => openAuthModal(tab)}
            />
          )}

          {view === 'community' && (
            <CommunityFeed user={user} />
          )}

          {view === 'leaderboard' && (
            <LeaderboardPage onBack={handleBackHome} />
          )}

          {view === 'stats' && (
            <StatsPage onBack={handleBackHome} user={user} />
          )}

          {view === 'public' && currentDoc && (
            <PublicDocViewer documentId={currentDoc.docId} onBack={handleBackHome} />
          )}

          {view === 'public-profile' && publicUsername && (
            <PublicProfilePage username={publicUsername} onBack={handleBackHome} user={user} />
          )}

          <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
            onAuthSuccess={handleAuthSuccess}
            defaultTab={authModalTab}
          />

          {/* Footer */}
          {view === 'home' && (
            <footer className="border-t border-line mt-12">
              <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted">
                <p>&copy; 2026 NoteMind @ Đội Đèn Giao Thông</p>
                <div className="flex items-center gap-4">
                  <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-txt transition-colors">Tính năng</button>
                  <button onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-txt transition-colors">Bảng giá</button>
                </div>
              </div>
            </footer>
          )}
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
      desc: 'Tự động chuyển đổi tài liệu dài thành sơ đồ tư duy trực quan, dễ hiểu chỉ trong vài phút.',
      color: 'from-primary-600/15 to-primary-600/5',
    },
    {
      icon: '📇',
      title: 'Flashcard thông minh',
      desc: 'Tạo bộ thẻ ghi nhớ Active Recall từ các khái niệm quan trọng, hỗ trợ xuất Anki & Quizlet.',
      color: 'from-accent-600/15 to-accent-600/5',
    },
    {
      icon: '💬',
      title: 'Hỏi đáp với tài liệu',
      desc: 'Chat trực tiếp với AI để giải thích sâu hơn bất kỳ khái niệm nào trong bài giảng.',
      color: 'from-blue-600/15 to-blue-600/5',
    },
    {
      icon: '📄',
      title: 'Đa định dạng',
      desc: 'Hỗ trợ PDF, file text, và cả file ghi âm bài giảng MP3, WAV, M4A.',
      color: 'from-emerald-600/15 to-emerald-600/5',
    },
  ];

  return (
    <section className="max-w-6xl mx-auto px-4 py-24">
      <h2 className="text-3xl font-extrabold text-center mb-4 font-display tracking-tight">
        Tính năng <span className="gradient-text">nổi bật</span>
      </h2>
      <p className="text-center text-muted mb-14 max-w-2xl mx-auto">
        NoteMinds sử dụng NoteMindAI để tự động hóa khâu chuẩn bị tài liệu,
        giúp bạn tập trung 100% vào việc hiểu và ghi nhớ
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {features.map((f, i) => (
          <div
            key={i}
            className="group relative bg-surface border border-line rounded-2xl p-7 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-black/10 overflow-hidden"
          >
            {/* Gradient overlay on hover */}
            <div className={`absolute inset-0 bg-gradient-to-br ${f.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

            <div className="relative z-10">
              <div className="w-14 h-14 bg-surface-2 border border-line rounded-2xl flex items-center justify-center text-2xl mb-5 group-hover:scale-110 group-hover:border-primary-500/30 transition-all duration-500">
                {f.icon}
              </div>
              <h3 className="text-lg font-bold mb-2.5 group-hover:text-primary-400 transition-colors duration-300">{f.title}</h3>
              <p className="text-sm text-muted leading-relaxed group-hover:text-txt transition-colors">{f.desc}</p>
            </div>
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
    <section className="max-w-6xl mx-auto px-4 py-24">
      <h2 className="text-3xl font-extrabold text-center mb-4 font-display tracking-tight">
        Tại sao chọn <span className="gradient-text">NoteMinds</span>?
      </h2>
      <p className="text-center text-muted mb-14 max-w-2xl mx-auto">
        NoteMinds không chỉ là công cụ tóm tắt — đây là trợ lý học tập AI toàn diện,
        giúp bạn biến mọi tài liệu thành kiến thức thực sự
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {reasons.map((r, i) => (
          <div
            key={i}
            className="group relative bg-surface border border-line rounded-2xl p-7 hover:-translate-y-1.5 transition-all duration-500 overflow-hidden hover:shadow-xl hover:shadow-black/10"
          >
            {/* Subtle gradient background on hover */}
            <div className="absolute inset-0 bg-gradient-to-tr from-primary-900/5 via-transparent to-accent-900/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative z-10">
              <div className="w-14 h-14 bg-surface-2 border border-line rounded-2xl flex items-center justify-center text-2xl mb-5 group-hover:scale-110 group-hover:border-primary-500/30 transition-all duration-500">
                {r.icon}
              </div>
              <h3 className="text-lg font-bold mb-2.5 group-hover:gradient-text transition-all duration-300">{r.title}</h3>
              <p className="text-sm text-muted leading-relaxed group-hover:text-txt transition-colors">{r.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Verify Email Page ─────────────────────────────────
function VerifyEmailPage({ token, onGoHome, onUserUpdate }) {
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    verifyEmailToken(token)
      .then((data) => {
        setStatus('success');
        setMessage(data.message || 'Email đã được xác minh thành công!');
        if (data.user) {
          onUserUpdate?.(data.user);
        }
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.error || 'Xác minh email thất bại');
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface border border-line rounded-2xl p-8 text-center">
        {status === 'loading' && (
          <>
            <Loader2 size={48} className="mx-auto mb-4 text-primary-400 animate-spin" />
            <h2 className="text-xl font-bold mb-2">Đang xác minh email...</h2>
            <p className="text-sm text-muted">Vui lòng đợi...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 size={32} className="text-green-400" />
            </div>
            <h2 className="text-xl font-bold mb-2">Xác minh thành công!</h2>
            <p className="text-sm text-muted mb-6">{message}</p>
            <button
              onClick={onGoHome}
              className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 rounded-xl text-sm font-semibold transition-colors"
            >
              Về trang chủ
            </button>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
              <XCircle size={32} className="text-red-400" />
            </div>
            <h2 className="text-xl font-bold mb-2">Xác minh thất bại</h2>
            <p className="text-sm text-red-400 mb-6">{message}</p>
            <button
              onClick={onGoHome}
              className="px-6 py-2.5 bg-surface-2 hover:bg-line rounded-xl text-sm font-medium transition-colors"
            >
              Về trang chủ
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Reset Password Page ───────────────────────────────
function ResetPasswordPage({ token, onGoHome }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      return setError('Mật khẩu phải có ít nhất 6 ký tự');
    }
    if (newPassword !== confirmPassword) {
      return setError('Mật khẩu xác nhận không khớp');
    }
    setLoading(true);
    try {
      await resetPassword(token, newPassword);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Đặt lại mật khẩu thất bại');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-surface border border-line rounded-2xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle2 size={32} className="text-green-400" />
          </div>
          <h2 className="text-xl font-bold mb-2">Đặt lại mật khẩu thành công!</h2>
          <p className="text-sm text-muted mb-6">Bạn có thể đăng nhập với mật khẩu mới.</p>
          <button
            onClick={onGoHome}
            className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 rounded-xl text-sm font-semibold transition-colors"
          >
            Về trang chủ để đăng nhập
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface border border-line rounded-2xl p-8">
        <button
          onClick={onGoHome}
          className="flex items-center gap-1 text-sm text-muted hover:text-txt transition-colors mb-4"
        >
          <ArrowLeft size={14} /> Về trang chủ
        </button>
        <h2 className="text-xl font-bold mb-1">Đặt lại mật khẩu</h2>
        <p className="text-sm text-muted mb-6">Nhập mật khẩu mới cho tài khoản của bạn</p>

        {error && (
          <div className="mb-4 px-4 py-2.5 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative flex items-center">
            <span className="absolute left-3 text-muted"><Lock size={16} /></span>
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="Mật khẩu mới (ít nhất 6 ký tự)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-bg border border-line rounded-xl pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:border-primary-500/50 transition-colors placeholder:text-muted/50"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3 text-muted hover:text-txt transition-colors"
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div className="relative flex items-center">
            <span className="absolute left-3 text-muted"><Lock size={16} /></span>
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="Xác nhận mật khẩu mới"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-bg border border-line rounded-xl pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:border-primary-500/50 transition-colors placeholder:text-muted/50"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !newPassword || !confirmPassword}
            className="w-full py-3 bg-primary-600 hover:bg-primary-700 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary-600/25 mt-4"
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> Đang xử lý...</>
            ) : (
              <><Lock size={16} /> Đặt mật khẩu mới</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
