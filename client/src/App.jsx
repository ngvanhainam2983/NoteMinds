import { useState, useEffect, useRef } from 'react';
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
import { getStoredUser, logout as apiLogout, getMe, verifyEmailToken, resetPassword, getSystemSettings, getDocumentHistory, getFolders, sendPresenceHeartbeat } from './api';
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
  const heartbeatInFlightRef = useRef(false);

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

  // Auto-cache history for offline access when user is online & logged in
  useEffect(() => {
    if (isOffline || !user) return;
    const cacheHistory = async () => {
      try {
        const [docs, folders] = await Promise.all([getDocumentHistory(), getFolders()]);
        localStorage.setItem('notemind_history_cache', JSON.stringify(docs || []));
        localStorage.setItem('notemind_folders_cache', JSON.stringify(folders || []));
        localStorage.setItem('notemind_history_cache_time', new Date().toISOString());
      } catch { /* offline or error — skip */ }
    };
    cacheHistory();
  }, [isOffline, user]);

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
      // Only allow admin users to access admin panel
      const storedUser = getStoredUser();
      if (storedUser && storedUser.role === 'admin') {
        setView('admin');
      } else {
        setView('home');
      }
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

  // Presence heartbeat: keep online status fresh while user is active
  useEffect(() => {
    if (!user) return;

    const sendHeartbeat = async () => {
      if (heartbeatInFlightRef.current || !navigator.onLine) return;
      heartbeatInFlightRef.current = true;
      try {
        await sendPresenceHeartbeat();
      } catch {
        // Ignore heartbeat failures silently
      } finally {
        heartbeatInFlightRef.current = false;
      }
    };

    sendHeartbeat();
    const intervalId = setInterval(sendHeartbeat, 10 * 1000);
    const onFocus = () => sendHeartbeat();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') sendHeartbeat();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [user]);

  // Check maintenance mode
  useEffect(() => {
    getSystemSettings().then(s => {
      if (s.maintenance_mode) {
        setMaintenance(s.maintenance_message || 'Hệ thống đang bảo trì. Vui lòng quay lại sau.');
      } else {
        setMaintenance(null);
      }
    }).catch((err) => {
      // If fetch failed due to network, mark as offline
      if (!navigator.onLine || (err && err.message && /network|fetch|timeout/i.test(err.message))) {
        setIsOffline(true);
      }
    }).finally(() => setMaintenanceChecked(true));
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
      <div className="min-h-screen bg-bg flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg">
          <div className="bg-surface border border-line rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                MAINTENANCE MODE
              </div>
              <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-center shrink-0">
                <Wrench size={22} className="text-amber-400" />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">NoteMind đang bảo trì</h1>
              <p className="text-muted text-sm leading-relaxed">{maintenance}</p>
              <p className="text-xs text-muted/90">Chúng tôi sẽ mở lại hệ thống ngay khi hoàn tất cập nhật.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-sm font-semibold transition-colors"
              >
                Làm mới trang
              </button>
              <button
                onClick={() => openAuthModal('login')}
                className="w-full py-2.5 rounded-xl bg-surface-2 hover:bg-line border border-line text-txt text-sm font-medium transition-colors"
              >
                Đăng nhập Admin
              </button>
            </div>

            <div className="text-xs text-muted border-t border-line pt-4">
              Nếu tình trạng kéo dài, vui lòng thử lại sau vài phút.
            </div>
          </div>

          <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
            onAuthSuccess={handleAuthSuccess}
            defaultTab={authModalTab}
            loginOnly
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
              onOpenAdmin={() => {
                if (user && user.role === 'admin') {
                  setView('admin');
                  window.history.pushState({}, '', '/admin');
                }
              }}
              onUserUpdate={(updated) => setUser(updated)}
              onOpenDocument={handleOpenDocument}
              onOpenHistory={() => { setView('history-list'); window.history.pushState({}, '', '/history'); }}
              onOpenProfile={() => { setView('profile'); window.history.pushState({}, '', '/profile'); }}
              onOpenLeaderboard={() => { setView('leaderboard'); window.history.pushState({}, '', '/leaderboard'); }}
              onOpenStats={() => { setView('stats'); window.history.pushState({}, '', '/stats'); }}
              currentView={view}
            />
          )}

          {/* Announcement Banner (show on major views for all users) */}
          {['home', 'dashboard', 'history-list', 'community'].includes(view) && (
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

          {view === 'admin' && user && user.role === 'admin' && (
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
            <footer className="border-t border-line mt-16 bg-surface/50">
              <div className="max-w-6xl mx-auto px-4 py-12">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10">
                  {/* Brand */}
                  <div className="col-span-2 sm:col-span-1">
                    <h3 className="text-lg font-extrabold tracking-tight mb-3">
                      <span className="gradient-text">NoteMinds</span>
                    </h3>
                    <p className="text-xs text-muted leading-relaxed">
                      AI trợ lý học tập — biến mọi tài liệu thành kiến thức với Sơ đồ tư duy, Flashcard và Chat AI.
                    </p>
                  </div>

                  {/* Sản phẩm */}
                  <div>
                    <h4 className="text-sm font-bold mb-3 text-txt">Sản phẩm</h4>
                    <ul className="space-y-2 text-xs text-muted">
                      <li><button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-txt transition-colors">Tính năng</button></li>
                      <li><button onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-txt transition-colors">Bảng giá</button></li>
                      <li><button onClick={() => document.getElementById('upload')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-txt transition-colors">Bắt đầu ngay</button></li>
                    </ul>
                  </div>

                  {/* Cộng đồng */}
                  <div>
                    <h4 className="text-sm font-bold mb-3 text-txt">Cộng đồng</h4>
                    <ul className="space-y-2 text-xs text-muted">
                      <li><button onClick={() => { setView('community'); window.history.pushState({}, '', '/community'); }} className="hover:text-txt transition-colors">Bài viết cộng đồng</button></li>
                      <li><button onClick={() => { setView('leaderboard'); window.history.pushState({}, '', '/leaderboard'); }} className="hover:text-txt transition-colors">Bảng xếp hạng</button></li>
                      <li><button onClick={() => { setView('stats'); window.history.pushState({}, '', '/stats'); }} className="hover:text-txt transition-colors">Thống kê hệ thống</button></li>
                    </ul>
                  </div>

                  {/* Liên kết */}
                  <div>
                    <h4 className="text-sm font-bold mb-3 text-txt">Liên kết</h4>
                    <ul className="space-y-2 text-xs text-muted">
                      <li><a href="mailto:admin@notemind.tech" className="hover:text-txt transition-colors">Liên hệ hỗ trợ</a></li>
                      <li><a href="//www.dmca.com/Protection/Status.aspx?ID=ead8dfc7-7685-44c0-a909-f4072ff1ce07&refurl=https://notemind.tech" target="_blank" rel="noopener noreferrer" className="hover:text-txt transition-colors">DMCA Protection</a></li>
                    </ul>
                  </div>
                </div>

                {/* Divider + bottom bar */}
                <div className="border-t border-line pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-xs text-muted">&copy; 2026 NoteMind @ Đội Đèn Giao Thông. All rights reserved.</p>
                  <div className="flex items-center gap-4">
                    <a href="//www.dmca.com/Protection/Status.aspx?ID=ead8dfc7-7685-44c0-a909-f4072ff1ce07&refurl=https://notemind.tech" title="DMCA.com Protection Status" className="dmca-badge" target="_blank" rel="noopener noreferrer">
                      <img src="https://images.dmca.com/Badges/DMCA_badge_trn_60w.png?ID=ead8dfc7-7685-44c0-a909-f4072ff1ce07" alt="DMCA.com Protection Status" className="h-5 opacity-70 hover:opacity-100 transition-opacity" />
                    </a>
                    <button
                      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                      className="text-xs text-muted hover:text-txt transition-colors flex items-center gap-1"
                      title="Lên đầu trang"
                    >
                      ↑ Đầu trang
                    </button>
                  </div>
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
