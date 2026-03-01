import { useState } from 'react';
import { BrainCircuit, ArrowLeft, LogIn, Menu, X, History, Globe } from 'lucide-react';
import UserDropdown from './UserDropdown';

const NAV_ITEMS = [
  { label: 'Tại sao NoteMinds?', target: 'why' },
  { label: 'Tính năng', target: 'features' },
  { label: 'Bảng giá', target: 'pricing' },
  { label: 'Cộng đồng', target: 'community', icon: Globe, requireAuth: false },
  { label: 'Lịch sử', target: 'history', icon: History, requireAuth: true },
];

export default function Header({ onBackHome, showBack, user, onLoginClick, onLogout, onOpenAdmin, onOpenPricing, onUserUpdate, onOpenDocument, onOpenHistory, onOpenProfile, currentView }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (target) => {
    setMobileOpen(false);
    if (target === 'history') {
      onOpenHistory?.();
      return;
    }
    if (target === 'community') {
      window.history.pushState({}, '', '/community');
      window.dispatchEvent(new Event('popstate'));
      // Note: we can't easily instruct App.jsx from here without a prop, so we trigger a popstate, 
      // or we can just use window.location.href = '/community' for simplicity since it's an SPA.
      window.location.href = '/community';
      return;
    }
    // If not on home view, go home first then scroll
    if (currentView !== 'home') {
      onBackHome?.();
      setTimeout(() => {
        document.getElementById(target)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      document.getElementById(target)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Left: Logo */}
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              onClick={onBackHome}
              className="p-2 rounded-xl hover:bg-surface-2 transition-colors mr-1"
              title="Về trang chủ"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <button onClick={onBackHome} className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-gradient-to-br from-primary-600 to-primary-500 rounded-xl flex items-center justify-center shadow-md shadow-primary-600/20 group-hover:shadow-lg group-hover:shadow-primary-600/30 transition-shadow">
              <BrainCircuit size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold font-display">
              Note<span className="gradient-text">Minds</span>
            </span>
          </button>
        </div>

        {/* Center: Nav links (desktop) */}
        {!showBack && (
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.filter(item => !item.requireAuth || user).map((item) => {
              const Icon = item.icon;
              const isActive = (item.target === 'history' && currentView === 'history-list');
              return (
                <button
                  key={item.target}
                  onClick={() => handleNav(item.target)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                    ? 'text-primary-400 bg-primary-600/10'
                    : 'text-muted hover:text-txt hover:bg-surface-2'
                    }`}
                >
                  {Icon && <Icon size={15} />}
                  {item.label}
                </button>
              );
            })}
          </nav>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          <span className="hidden lg:inline text-xs text-muted bg-surface-2 px-3 py-1.5 rounded-full">
            Bài dự thi của đội Đèn Giao Thông
          </span>

          {user ? (
            <UserDropdown
              user={user}
              onLogout={onLogout}
              onOpenAdmin={onOpenAdmin}
              onOpenPricing={() => handleNav('pricing')}
              onUserUpdate={onUserUpdate}
              onOpenDocument={onOpenDocument}
              onOpenProfile={onOpenProfile}
            />
          ) : (
            <button
              onClick={onLoginClick}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-primary-600/25"
            >
              <LogIn size={15} />
              <span className="hidden sm:inline">Đăng nhập</span>
            </button>
          )}

          {/* Mobile hamburger (only when nav is relevant) */}
          {!showBack && (
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-surface-2 transition-colors"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile nav dropdown */}
      {mobileOpen && !showBack && (
        <div className="md:hidden border-t border-line bg-surface/95 backdrop-blur-lg animate-fade-in">
          <nav className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-1">
            {NAV_ITEMS.filter(item => !item.requireAuth || user).map((item) => {
              const Icon = item.icon;
              const isActive = (item.target === 'history' && currentView === 'history-list');
              return (
                <button
                  key={item.target}
                  onClick={() => handleNav(item.target)}
                  className={`flex items-center gap-1.5 text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                    ? 'text-primary-400 bg-primary-600/10'
                    : 'text-muted hover:text-txt hover:bg-surface-2'
                    }`}
                >
                  {Icon && <Icon size={15} />}
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
