import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  User, Settings, Shield, LogOut, ChevronDown,
  Lock, Mail, CheckCircle2, Loader2, X, AlertCircle, Crown, Palette,
} from 'lucide-react';
import { updateProfile, changePassword } from '../api';
import ConfirmModal from './ConfirmModal';
import { useTheme, THEMES } from '../ThemeContext';

export default function UserDropdown({ user, onLogout, onOpenAdmin, onOpenPricing, onUserUpdate }) {
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const ref = useRef(null);

  // Close on click outside
  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const planBadge = user.planBadge;
  const planColor = user.planColor;

  return (
    <>
      <div className="relative" ref={ref}>
        {/* User button */}
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 bg-[#242736] hover:bg-[#2e3144] px-3 py-1.5 rounded-full transition-colors"
        >
          <User size={14} className="text-primary-400" />
          <span className="text-sm font-medium max-w-[120px] truncate">
            {user.displayName || user.username}
          </span>
          {planBadge && (
            <span
              className="text-xs px-1.5 py-0.5 rounded-md font-semibold"
              style={{ backgroundColor: `${planColor}20`, color: planColor }}
            >
              {planBadge} {user.planLabel}
            </span>
          )}
          <ChevronDown size={14} className={`text-[#9496a1] transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown menu */}
        {open && (
          <div className="absolute right-0 top-full mt-2 w-56 bg-[#1a1d27] border border-[#2e3144] rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in">
            {/* User info header */}
            <div className="px-4 py-3 border-b border-[#2e3144]">
              <p className="text-sm font-medium truncate">{user.displayName || user.username}</p>
              <p className="text-xs text-[#9496a1] truncate">{user.email}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: planColor ? `${planColor}15` : '#242736',
                    color: planColor || '#9496a1',
                    border: `1px solid ${planColor ? `${planColor}30` : '#2e3144'}`,
                  }}
                >
                  {planBadge || '📦'} Gói {user.planLabel || 'Free'}
                </span>
              </div>
            </div>

            {/* Menu items */}
            <div className="py-1">
              <DropdownItem
                icon={<Settings size={15} />}
                label="Cài đặt tài khoản"
                onClick={() => { setOpen(false); setShowSettings(true); }}
              />
              <DropdownItem
                icon={<Crown size={15} />}
                label="Nâng cấp gói"
                onClick={() => { setOpen(false); onOpenPricing?.(); }}
              />
              {user.role === 'admin' && (
                <DropdownItem
                  icon={<Shield size={15} />}
                  label="Quản trị Admin"
                  onClick={() => { setOpen(false); onOpenAdmin?.(); }}
                  accent
                />
              )}
              <div className="border-t border-[#2e3144] my-1" />
              <DropdownItem
                icon={<LogOut size={15} />}
                label="Đăng xuất"
                onClick={() => { setOpen(false); setShowLogoutConfirm(true); }}
                danger
              />
            </div>
          </div>
        )}
      </div>

      {/* Settings modal — portal to body to escape header stacking context */}
      {showSettings && createPortal(
        <SettingsModal
          user={user}
          onClose={() => setShowSettings(false)}
          onUserUpdate={onUserUpdate}
        />,
        document.body
      )}

      <ConfirmModal
        open={showLogoutConfirm}
        title="Đăng xuất"
        message="Bạn có chắc chắn muốn đăng xuất khỏi tài khoản?"
        confirmLabel="Đăng xuất"
        variant="warning"
        onConfirm={() => { setShowLogoutConfirm(false); onLogout(); }}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </>
  );
}

function DropdownItem({ icon, label, onClick, accent, danger }) {
  let colorClass = 'text-[#e4e5e9] hover:bg-[#242736]';
  if (accent) colorClass = 'text-primary-400 hover:bg-primary-600/10';
  if (danger) colorClass = 'text-red-400 hover:bg-red-500/10';

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${colorClass}`}
    >
      {icon}
      {label}
    </button>
  );
}

function SettingsModal({ user, onClose, onUserUpdate }) {
  const [tab, setTab] = useState('profile'); // 'profile' | 'password' | 'theme'
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [showPwConfirm, setShowPwConfirm] = useState(false);
  const { theme: currentTheme, setTheme } = useTheme();

  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [email, setEmail] = useState(user.email || '');
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    try {
      const updated = await updateProfile(displayName, email);
      onUserUpdate?.(updated);
      setSuccess('Đã cập nhật thành công!');
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally { setLoading(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPw !== confirmPw) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    if (newPw.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }
    setShowPwConfirm(true);
  };

  const executeChangePassword = async () => {
    setShowPwConfirm(false);
    setLoading(true); setError(''); setSuccess('');
    try {
      await changePassword(oldPw, newPw);
      setSuccess('Đổi mật khẩu thành công!');
      setOldPw(''); setNewPw(''); setConfirmPw('');
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-[#1a1d27] border border-[#2e3144] rounded-2xl shadow-2xl animate-fade-in">
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-[#242736] text-[#9496a1] hover:text-white">
          <X size={18} />
        </button>

        <div className="px-6 pt-6 pb-3">
          <h2 className="text-xl font-bold font-display">Cài đặt tài khoản</h2>
        </div>

        {/* Tabs */}
        <div className="flex mx-6 mb-4 bg-[#0f1117] rounded-lg p-1">
          <button
            onClick={() => { setTab('profile'); setError(''); setSuccess(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${tab === 'profile' ? 'bg-primary-600 text-white' : 'text-[#9496a1] hover:text-white'}`}
          >
            <User size={14} /> Hồ sơ
          </button>
          <button
            onClick={() => { setTab('password'); setError(''); setSuccess(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${tab === 'password' ? 'bg-primary-600 text-white' : 'text-[#9496a1] hover:text-white'}`}
          >
            <Lock size={14} /> Mật khẩu
          </button>
          <button
            onClick={() => { setTab('theme'); setError(''); setSuccess(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${tab === 'theme' ? 'bg-primary-600 text-white' : 'text-[#9496a1] hover:text-white'}`}
          >
            <Palette size={14} /> Giao diện
          </button>
        </div>

        {error && (
          <div className="mx-6 mb-3 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400 flex items-center gap-2">
            <AlertCircle size={14} /> {error}
          </div>
        )}
        {success && (
          <div className="mx-6 mb-3 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-sm text-emerald-400 flex items-center gap-2">
            <CheckCircle2 size={14} /> {success}
          </div>
        )}

        {tab === 'theme' && (
          <div className="px-6 pb-6">
            <p className="text-xs text-[#9496a1] mb-3">Chọn màu chủ đề yêu thích</p>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(THEMES).map(([key, t]) => (
                <button
                  key={key}
                  onClick={() => setTheme(key)}
                  className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all hover:scale-105 ${
                    currentTheme === key
                      ? 'border-primary-500 bg-primary-600/10'
                      : 'border-[#2e3144] bg-[#0f1117] hover:border-[#3e4154]'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <div className="w-5 h-5 rounded-full" style={{ background: t.primary['500'] }} />
                    <div className="w-3 h-3 rounded-full" style={{ background: t.primary['400'] }} />
                    <div className="w-3 h-3 rounded-full" style={{ background: t.accent['400'] }} />
                  </div>
                  <span className="text-xs font-medium">{t.emoji} {t.label}</span>
                  {currentTheme === key && (
                    <div className="absolute top-1.5 right-1.5">
                      <CheckCircle2 size={14} className="text-primary-400" />
                    </div>
                  )}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-[#666] mt-3 text-center">Giao diện được lưu tự động trên trình duyệt của bạn</p>
          </div>
        )}

        {tab !== 'theme' && <form onSubmit={tab === 'profile' ? handleSaveProfile : handleChangePassword} className="px-6 pb-6 space-y-3">
          {tab === 'profile' ? (
            <>
              <div>
                <label className="text-xs text-[#9496a1] mb-1 block">Tên hiển thị</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-[#9496a1]"><User size={15} /></span>
                  <input value={displayName} onChange={e => setDisplayName(e.target.value)}
                    className="w-full bg-[#0f1117] border border-[#2e3144] rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary-500/50" />
                </div>
              </div>
              <div>
                <label className="text-xs text-[#9496a1] mb-1 block">Email</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-[#9496a1]"><Mail size={15} /></span>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full bg-[#0f1117] border border-[#2e3144] rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary-500/50" />
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="text-xs text-[#9496a1] mb-1 block">Mật khẩu cũ</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-[#9496a1]"><Lock size={15} /></span>
                  <input type="password" value={oldPw} onChange={e => setOldPw(e.target.value)}
                    placeholder="Nhập mật khẩu hiện tại"
                    className="w-full bg-[#0f1117] border border-[#2e3144] rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary-500/50" />
                </div>
              </div>
              <div>
                <label className="text-xs text-[#9496a1] mb-1 block">Mật khẩu mới</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-[#9496a1]"><Lock size={15} /></span>
                  <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
                    placeholder="Ít nhất 6 ký tự"
                    className="w-full bg-[#0f1117] border border-[#2e3144] rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary-500/50" />
                </div>
              </div>
              <div>
                <label className="text-xs text-[#9496a1] mb-1 block">Xác nhận mật khẩu mới</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-[#9496a1]"><Lock size={15} /></span>
                  <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                    className="w-full bg-[#0f1117] border border-[#2e3144] rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary-500/50" />
                </div>
              </div>
            </>
          )}
          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-2">
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {tab === 'profile' ? 'Lưu thay đổi' : 'Đổi mật khẩu'}
          </button>
        </form>}
      </div>

      <ConfirmModal
        open={showPwConfirm}
        title="Đổi mật khẩu"
        message="Bạn có chắc chắn muốn đổi mật khẩu? Bạn sẽ cần dùng mật khẩu mới để đăng nhập lần sau."
        confirmLabel="Đổi mật khẩu"
        variant="warning"
        onConfirm={executeChangePassword}
        onCancel={() => setShowPwConfirm(false)}
      />
    </div>
  );
}
