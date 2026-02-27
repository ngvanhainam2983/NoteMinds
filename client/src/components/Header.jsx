import { useState } from 'react';
import { BrainCircuit, ArrowLeft, LogIn, Menu, X, Palette, CheckCircle2, History } from 'lucide-react';
import UserDropdown from './UserDropdown';
import { useTheme, THEMES } from '../ThemeContext';

const NAV_ITEMS = [
  { label: 'Tại sao NoteMinds?', target: 'why' },
  { label: 'Tính năng', target: 'features' },
  { label: 'Bảng giá', target: 'pricing' },
  { label: 'Lịch sử', target: 'history', icon: History, requireAuth: true },
];

export default function Header({ onBackHome, showBack, user, onLoginClick, onLogout, onOpenAdmin, onOpenPricing, onUserUpdate, onOpenDocument, onOpenHistory, onOpenProfile, currentView }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [themePicker, setThemePicker] = useState(false);
  const { theme: currentTheme, setTheme } = useTheme();

  const handleNav = (target) => {
    setMobileOpen(false);
    if (target === 'pricing') {
      onOpenPricing?.();
      return;
    }
    if (target === 'history') {
      onOpenHistory?.();
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
              className="p-2 rounded-lg hover:bg-[#242736] transition-colors mr-2"
              title="Về trang chủ"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <button onClick={onBackHome} className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center">
              <BrainCircuit size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold font-display">
              Note<span className="text-primary-400">Minds</span>
            </span>
          </button>
        </div>

        {/* Center: Nav links (desktop) */}
        {!showBack && (
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.filter(item => !item.requireAuth || user).map((item) => {
              const Icon = item.icon;
              const isActive = (item.target === 'pricing' && currentView === 'pricing') ||
                (item.target === 'history' && currentView === 'history-list');
              return (
                <button
                  key={item.target}
                  onClick={() => handleNav(item.target)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                      ? 'text-primary-400 bg-primary-600/10'
                      : 'text-[#9496a1] hover:text-white hover:bg-[#242736]'
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
          {/* Theme picker button */}
          <div className="relative">
            <button
              onClick={() => setThemePicker(!themePicker)}
              className="p-2 rounded-lg hover:bg-[#242736] transition-colors text-[#9496a1] hover:text-primary-400"
              title="Đổi giao diện"
            >
              <Palette size={18} />
            </button>
            {themePicker && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setThemePicker(false)} />
                <div className="absolute right-0 top-full mt-2 z-50 bg-[#1a1d27] border border-[#2e3144] rounded-xl p-3 shadow-2xl w-52 animate-fade-in">
                  <p className="text-[10px] text-[#9496a1] mb-2 font-medium uppercase tracking-wider">Giao diện</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {Object.entries(THEMES).map(([key, t]) => (
                      <button
                        key={key}
                        onClick={() => { setTheme(key); setThemePicker(false); }}
                        className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${currentTheme === key
                            ? 'bg-primary-600/15 text-primary-400 ring-1 ring-primary-500/40'
                            : 'text-[#9496a1] hover:bg-[#242736] hover:text-white'
                          }`}
                      >
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: t.primary['500'] }} />
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <span className="hidden lg:inline text-xs text-[#9496a1] bg-[#242736] px-3 py-1.5 rounded-full">
            Bài dự thi của đội Đèn Giao Thông
          </span>

          {user ? (
            <UserDropdown
              user={user}
              onLogout={onLogout}
              onOpenAdmin={onOpenAdmin}
              onOpenPricing={onOpenPricing}
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
              className="md:hidden p-2 rounded-lg hover:bg-[#242736] transition-colors"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile nav dropdown */}
      {mobileOpen && !showBack && (
        <div className="md:hidden border-t border-[#2e3144] bg-[#1a1d27]/95 backdrop-blur-lg animate-fade-in">
          <nav className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-1">
            {NAV_ITEMS.filter(item => !item.requireAuth || user).map((item) => {
              const Icon = item.icon;
              const isActive = (item.target === 'pricing' && currentView === 'pricing') ||
                (item.target === 'history' && currentView === 'history-list');
              return (
                <button
                  key={item.target}
                  onClick={() => handleNav(item.target)}
                  className={`flex items-center gap-1.5 text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                      ? 'text-primary-400 bg-primary-600/10'
                      : 'text-[#9496a1] hover:text-white hover:bg-[#242736]'
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
