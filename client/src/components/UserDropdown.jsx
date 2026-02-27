import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  User, Settings, Shield, LogOut, ChevronDown,
  Lock, Mail, CheckCircle2, Loader2, X, AlertCircle, Crown, Palette, History,
  FileText, Clock, AlertTriangle, ShieldCheck, ShieldOff, Copy, RefreshCw, KeyRound,
  Fingerprint, Plus, Trash2,
} from 'lucide-react';
import {
  updateProfile, changePassword, getDocumentHistory,
  setup2FA, enable2FA, disable2FA, get2FAStatus, regenerateRecoveryCodes,
  getPasskeyRegisterOptions, verifyPasskeyRegistration, getPasskeyList, deletePasskey,
} from '../api';
import { startRegistration } from '@simplewebauthn/browser';
import ConfirmModal from './ConfirmModal';
import { useTheme, THEMES } from '../ThemeContext';

export default function UserDropdown({ user, onLogout, onOpenAdmin, onOpenPricing, onUserUpdate, onOpenDocument, onOpenProfile }) {
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
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
                icon={<User size={15} />}
                label="Hồ sơ cá nhân"
                onClick={() => { setOpen(false); onOpenProfile?.(); }}
              />
              <DropdownItem
                icon={<Settings size={15} />}
                label="Cài đặt tài khoản"
                onClick={() => { setOpen(false); setShowSettings(true); }}
              />
              <DropdownItem
                icon={<History size={15} />}
                label="Lịch sử tài liệu"
                onClick={() => { setOpen(false); setShowHistory(true); }}
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

      {/* History modal */}
      {showHistory && createPortal(
        <HistoryModal onClose={() => setShowHistory(false)} onOpenDocument={(doc) => { setShowHistory(false); onOpenDocument?.(doc); }} />,
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
  const [tab, setTab] = useState('profile'); // 'profile' | 'password' | 'theme' | '2fa'
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [showPwConfirm, setShowPwConfirm] = useState(false);
  const { theme: currentTheme, setTheme } = useTheme();

  // 2FA state
  const [twoFAStatus, setTwoFAStatus] = useState(null);
  const [setupData, setSetupData] = useState(null); // { qrCode, secret }
  const [totpCode, setTotpCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState(null);
  const [disablePassword, setDisablePassword] = useState('');
  const [regenPassword, setRegenPassword] = useState('');
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [twoFAStep, setTwoFAStep] = useState('status');

  // Passkey state
  const [passkeys, setPasskeys] = useState([]);
  const [passkeyName, setPasskeyName] = useState('');
  const [loadingPasskeys, setLoadingPasskeys] = useState(false); // 'status' | 'setup' | 'verify' | 'recovery-codes' | 'disable' | 'regen'

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

  // ── 2FA handlers ──

  const load2FAStatus = async () => {
    try {
      setLoading(true);
      const status = await get2FAStatus();
      setTwoFAStatus(status);
      setTwoFAStep('status');
      loadPasskeys();
    } catch (err) {
      setTwoFAStatus({ enabled: false, recoveryCodesRemaining: 0 });
    } finally { setLoading(false); }
  };

  const handleSetup2FA = async () => {
    setLoading(true); setError('');
    try {
      const data = await setup2FA();
      setSetupData(data);
      setTwoFAStep('setup');
      setTotpCode('');
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally { setLoading(false); }
  };

  const handleEnable2FA = async () => {
    setLoading(true); setError('');
    try {
      const result = await enable2FA(totpCode);
      setRecoveryCodes(result.recoveryCodes);
      setTwoFAStep('recovery-codes');
      setSetupData(null);
      setTotpCode('');
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally { setLoading(false); }
  };

  const handleDisable2FA = async () => {
    setLoading(true); setError('');
    try {
      const result = await disable2FA(disablePassword);
      setTwoFAStatus({ enabled: false, recoveryCodesRemaining: 0 });
      setTwoFAStep('status');
      setDisablePassword('');
      setSuccess('2FA đã được tắt');
      onUserUpdate?.(result.user);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally { setLoading(false); }
  };

  const handleRegenCodes = async () => {
    setLoading(true); setError('');
    try {
      const result = await regenerateRecoveryCodes(regenPassword);
      setRecoveryCodes(result.recoveryCodes);
      setTwoFAStep('recovery-codes');
      setRegenPassword('');
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally { setLoading(false); }
  };

  // ── Passkey handlers ──

  const loadPasskeys = async () => {
    setLoadingPasskeys(true);
    try {
      const data = await getPasskeyList();
      setPasskeys(data.passkeys || []);
    } catch {
      setPasskeys([]);
    } finally { setLoadingPasskeys(false); }
  };

  const handleRegisterPasskey = async () => {
    setLoading(true); setError('');
    try {
      const options = await getPasskeyRegisterOptions();
      const regResponse = await startRegistration({ optionsJSON: options });
      await verifyPasskeyRegistration(regResponse, passkeyName || 'Passkey');
      setSuccess('Passkey đã được thêm thành công!');
      setPasskeyName('');
      loadPasskeys();
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('Đăng ký passkey bị hủy');
      } else {
        setError(err.response?.data?.error || err.message || 'Đăng ký passkey thất bại');
      }
    } finally { setLoading(false); }
  };

  const handleDeletePasskey = async (id) => {
    setLoading(true); setError('');
    try {
      await deletePasskey(id);
      setSuccess('Passkey đã được xóa');
      loadPasskeys();
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
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all ${tab === 'profile' ? 'bg-primary-600 text-white' : 'text-[#9496a1] hover:text-white'}`}
          >
            <User size={13} /> Hồ sơ
          </button>
          <button
            onClick={() => { setTab('password'); setError(''); setSuccess(''); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all ${tab === 'password' ? 'bg-primary-600 text-white' : 'text-[#9496a1] hover:text-white'}`}
          >
            <Lock size={13} /> Mật khẩu
          </button>
          <button
            onClick={() => { setTab('2fa'); setError(''); setSuccess(''); load2FAStatus(); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all ${tab === '2fa' ? 'bg-primary-600 text-white' : 'text-[#9496a1] hover:text-white'}`}
          >
            <ShieldCheck size={13} /> 2FA
          </button>
          <button
            onClick={() => { setTab('theme'); setError(''); setSuccess(''); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all ${tab === 'theme' ? 'bg-primary-600 text-white' : 'text-[#9496a1] hover:text-white'}`}
          >
            <Palette size={13} /> Theme
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
                  className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all hover:scale-105 ${currentTheme === key
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

        {/* 2FA Tab */}
        {tab === '2fa' && (
          <div className="px-6 pb-6">
            {loading && !setupData ? (
              <div className="flex justify-center py-8">
                <Loader2 size={24} className="text-primary-400 animate-spin" />
              </div>
            ) : twoFAStep === 'status' && (
              <div className="space-y-4">
                {/* Current status */}
                <div className={`flex items-center gap-3 p-4 rounded-xl border ${twoFAStatus?.enabled
                  ? 'bg-emerald-500/5 border-emerald-500/20'
                  : 'bg-[#0f1117] border-[#2e3144]'
                  }`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${twoFAStatus?.enabled ? 'bg-emerald-500/20' : 'bg-[#242736]'
                    }`}>
                    {twoFAStatus?.enabled
                      ? <ShieldCheck size={20} className="text-emerald-400" />
                      : <ShieldOff size={20} className="text-[#9496a1]" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {twoFAStatus?.enabled ? 'Đã bật xác thực hai bước' : 'Chưa bật xác thực hai bước'}
                    </p>
                    <p className="text-xs text-[#9496a1]">
                      {twoFAStatus?.enabled
                        ? `Còn ${twoFAStatus.recoveryCodesRemaining} mã khôi phục`
                        : 'Bảo mật tài khoản với ứng dụng xác thực'}
                    </p>
                  </div>
                </div>

                {twoFAStatus?.enabled ? (
                  <div className="space-y-2">
                    <button
                      onClick={() => { setTwoFAStep('regen'); setError(''); setSuccess(''); setRegenPassword(''); }}
                      className="w-full py-2.5 bg-[#242736] hover:bg-[#2e3144] rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <RefreshCw size={14} /> Tạo lại mã khôi phục
                    </button>
                    <button
                      onClick={() => { setTwoFAStep('disable'); setError(''); setSuccess(''); setDisablePassword(''); }}
                      className="w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-sm font-medium text-red-400 transition-colors flex items-center justify-center gap-2"
                    >
                      <ShieldOff size={14} /> Tắt 2FA
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleSetup2FA}
                    disabled={loading}
                    className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                    Bật xác thực hai bước
                  </button>
                )}
              </div>
            )}

            {/* Passkey Management Section (always visible in status) */}
            {twoFAStep === 'status' && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Fingerprint size={16} className="text-primary-400" />
                  <span className="text-sm font-medium">Passkey</span>
                  <span className="text-xs text-[#9496a1]">({passkeys.length})</span>
                </div>

                {/* Existing passkeys */}
                {loadingPasskeys ? (
                  <div className="flex justify-center py-3">
                    <Loader2 size={16} className="text-[#9496a1] animate-spin" />
                  </div>
                ) : passkeys.length > 0 ? (
                  <div className="space-y-1.5">
                    {passkeys.map(pk => (
                      <div key={pk.id} className="flex items-center gap-2 bg-[#0f1117] border border-[#2e3144] rounded-lg px-3 py-2">
                        <Fingerprint size={14} className="text-primary-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{pk.name}</p>
                          <p className="text-[10px] text-[#9496a1]">
                            {pk.deviceType === 'multiDevice' ? 'Đa thiết bị' : 'Đơn thiết bị'}
                            {pk.backedUp ? ' • Đã sao lưu' : ''}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeletePasskey(pk.id)}
                          className="p-1 hover:bg-red-500/10 rounded text-[#9496a1] hover:text-red-400 transition-colors shrink-0"
                          title="Xóa passkey"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#9496a1] text-center py-2">Chưa có passkey nào</p>
                )}

                {/* Register new passkey */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={passkeyName}
                    onChange={(e) => setPasskeyName(e.target.value)}
                    placeholder="Tên passkey (VD: MacBook)"
                    className="flex-1 bg-[#0f1117] border border-[#2e3144] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary-500 transition-colors placeholder:text-[#9496a1]/50"
                  />
                  <button
                    onClick={handleRegisterPasskey}
                    disabled={loading}
                    className="px-3 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                  >
                    {loading ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                    Thêm
                  </button>
                </div>
              </div>
            )}

            {/* QR Code Setup Step */}
            {twoFAStep === 'setup' && setupData && (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-sm font-medium mb-1">Quét mã QR bằng ứng dụng xác thực</p>
                  <p className="text-xs text-[#9496a1]">Google Authenticator, Authy, hoặc tương tự</p>
                </div>

                <div className="flex justify-center">
                  <div className="bg-white p-3 rounded-xl">
                    <img src={setupData.qrCode} alt="QR Code" className="w-48 h-48" />
                  </div>
                </div>

                <div className="bg-[#0f1117] border border-[#2e3144] rounded-xl p-3">
                  <p className="text-[10px] text-[#9496a1] mb-1">Hoặc nhập mã thủ công:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs font-mono text-primary-400 break-all">{setupData.secret}</code>
                    <button
                      onClick={() => { navigator.clipboard.writeText(setupData.secret); setSuccess('Đã copy!'); setTimeout(() => setSuccess(''), 2000); }}
                      className="p-1.5 hover:bg-[#242736] rounded-lg transition-colors text-[#9496a1] hover:text-white shrink-0"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-[#9496a1] mb-1 block">Nhập mã 6 chữ số từ ứng dụng để xác nhận</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => { setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                    placeholder="000000"
                    className="w-full bg-[#0f1117] border border-[#2e3144] rounded-xl px-4 py-3 text-center text-lg font-mono tracking-[0.5em] focus:outline-none focus:border-primary-500 transition-colors placeholder:text-[#9496a1]/30"
                    autoFocus
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => { setTwoFAStep('status'); setSetupData(null); setTotpCode(''); setError(''); }}
                    className="flex-1 py-2.5 bg-[#242736] hover:bg-[#2e3144] rounded-xl text-sm font-medium transition-colors"
                  >
                    Huỷ
                  </button>
                  <button
                    onClick={handleEnable2FA}
                    disabled={loading || totpCode.length !== 6}
                    className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    Xác nhận
                  </button>
                </div>
              </div>
            )}

            {/* Recovery Codes Display */}
            {twoFAStep === 'recovery-codes' && recoveryCodes && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <ShieldCheck size={28} className="text-emerald-400" />
                  </div>
                  <p className="text-sm font-bold text-emerald-400">2FA đã được bật thành công!</p>
                  <p className="text-xs text-[#9496a1] mt-1">Lưu các mã khôi phục này ở nơi an toàn</p>
                </div>

                <div className="bg-[#0f1117] border border-amber-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <KeyRound size={14} className="text-amber-400" />
                    <span className="text-xs font-medium text-amber-400">Mã khôi phục (dùng 1 lần)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {recoveryCodes.map((code, i) => (
                      <code key={i} className="text-sm font-mono text-center py-1.5 bg-[#1a1d27] rounded-lg border border-[#2e3144]">
                        {code}
                      </code>
                    ))}
                  </div>
                  <button
                    onClick={() => { navigator.clipboard.writeText(recoveryCodes.join('\n')); setSuccess('Đã copy tất cả mã!'); setTimeout(() => setSuccess(''), 2000); }}
                    className="w-full mt-3 py-2 bg-[#242736] hover:bg-[#2e3144] rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Copy size={12} /> Copy tất cả
                  </button>
                </div>

                <p className="text-[10px] text-red-400/70 text-center">⚠️ Mã này sẽ không hiển thị lại. Hãy lưu ngay!</p>

                <button
                  onClick={() => { setTwoFAStep('status'); setRecoveryCodes(null); load2FAStatus(); }}
                  className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 rounded-xl text-sm font-semibold transition-colors"
                >
                  Đã lưu, đóng
                </button>
              </div>
            )}

            {/* Disable 2FA */}
            {twoFAStep === 'disable' && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-red-500/20 flex items-center justify-center">
                    <ShieldOff size={28} className="text-red-400" />
                  </div>
                  <p className="text-sm font-bold">Tắt xác thực hai bước</p>
                  <p className="text-xs text-[#9496a1] mt-1">Nhập mật khẩu để xác nhận</p>
                </div>

                <div>
                  <input
                    type="password"
                    value={disablePassword}
                    onChange={(e) => { setDisablePassword(e.target.value); setError(''); }}
                    placeholder="Nhập mật khẩu"
                    className="w-full bg-[#0f1117] border border-[#2e3144] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500 transition-colors"
                    autoFocus
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => { setTwoFAStep('status'); setDisablePassword(''); setError(''); }}
                    className="flex-1 py-2.5 bg-[#242736] hover:bg-[#2e3144] rounded-xl text-sm font-medium transition-colors"
                  >
                    Huỷ
                  </button>
                  <button
                    onClick={handleDisable2FA}
                    disabled={loading || !disablePassword}
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <ShieldOff size={14} />}
                    Tắt 2FA
                  </button>
                </div>
              </div>
            )}

            {/* Regenerate Recovery Codes */}
            {twoFAStep === 'regen' && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <RefreshCw size={28} className="text-amber-400" />
                  </div>
                  <p className="text-sm font-bold">Tạo lại mã khôi phục</p>
                  <p className="text-xs text-[#9496a1] mt-1">Các mã cũ sẽ bị vô hiệu hoá. Nhập mật khẩu để xác nhận.</p>
                </div>

                <div>
                  <input
                    type="password"
                    value={regenPassword}
                    onChange={(e) => { setRegenPassword(e.target.value); setError(''); }}
                    placeholder="Nhập mật khẩu"
                    className="w-full bg-[#0f1117] border border-[#2e3144] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500 transition-colors"
                    autoFocus
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => { setTwoFAStep('status'); setRegenPassword(''); setError(''); }}
                    className="flex-1 py-2.5 bg-[#242736] hover:bg-[#2e3144] rounded-xl text-sm font-medium transition-colors"
                  >
                    Huỷ
                  </button>
                  <button
                    onClick={handleRegenCodes}
                    disabled={loading || !regenPassword}
                    className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    Tạo mới
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {tab !== 'theme' && tab !== '2fa' && <form onSubmit={tab === 'profile' ? handleSaveProfile : handleChangePassword} className="px-6 pb-6 space-y-3">
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

function HistoryModal({ onClose, onOpenDocument }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocumentHistory()
      .then(d => setDocs(d || []))
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
  }, []);

  const isExpired = (doc) => !!doc.deleted_at;

  const statusIcon = (doc) => {
    if (isExpired(doc)) return <Clock size={14} className="text-[#555]" />;
    if (doc.status === 'ready') return <CheckCircle2 size={14} className="text-emerald-400" />;
    if (doc.status === 'error') return <AlertTriangle size={14} className="text-red-400" />;
    return <Loader2 size={14} className="text-yellow-400 animate-spin" />;
  };

  const statusLabel = (doc) => {
    if (isExpired(doc)) return 'Đã xoá';
    if (doc.status === 'ready') return 'Hoàn thành';
    if (doc.status === 'error') return 'Lỗi';
    return 'Đang xử lý';
  };

  const timeRemaining = (doc) => {
    if (isExpired(doc)) return null;
    const created = new Date(doc.created_at).getTime();
    const expiresAt = created + 24 * 60 * 60 * 1000;
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) return 'Sắp xoá';
    const hours = Math.floor(remaining / (60 * 60 * 1000));
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    if (hours > 0) return `Còn ${hours}h${minutes}m`;
    return `Còn ${minutes} phút`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[80vh] flex flex-col bg-[#1a1d27] border border-[#2e3144] rounded-2xl shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <History size={20} className="text-primary-400" />
            <h2 className="text-lg font-bold font-display">Lịch sử tài liệu</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#242736] text-[#9496a1] hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={24} className="text-primary-400 animate-spin" />
            </div>
          ) : docs.length > 0 ? (
            <div className="space-y-2">
              {docs.map((doc) => {
                const expired = isExpired(doc);
                const ttl = timeRemaining(doc);
                return (
                  <div key={doc.id}
                    onClick={() => onOpenDocument?.(doc)}
                    className={`flex items-start gap-3 rounded-xl px-4 py-3 transition-colors border cursor-pointer ${expired
                      ? 'bg-[#0f1117]/50 border-[#1e2030] opacity-60 hover:opacity-80 hover:border-[#3e4154]'
                      : 'bg-[#0f1117] border-[#2e3144] hover:border-primary-500/30'
                      }`}>
                    <FileText size={18} className={`shrink-0 mt-0.5 ${expired ? 'text-[#444]' : 'text-primary-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${expired ? 'text-[#555] line-through' : ''}`}>
                        {doc.original_name || 'Tài liệu không tên'}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`flex items-center gap-1 text-xs ${expired ? 'text-[#555]' : 'text-[#9496a1]'}`}>
                          {statusIcon(doc)}
                          {statusLabel(doc)}
                        </span>
                        {doc.text_length > 0 && !expired && (
                          <span className="text-xs text-[#9496a1]">
                            {(doc.text_length / 1000).toFixed(1)}k ký tự
                          </span>
                        )}
                        {ttl && (
                          <span className="text-[10px] text-amber-400/70 font-medium">
                            ⏳ {ttl}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <Clock size={11} className="text-[#666]" />
                        <span className="text-[11px] text-[#666]">{formatDate(doc.created_at)}</span>
                        {expired && (
                          <span className="text-[10px] text-[#555] ml-2">• Đã xoá {formatDate(doc.deleted_at)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText size={40} className="text-[#2e3144] mx-auto mb-3" />
              <p className="text-sm text-[#9496a1]">Chưa có tài liệu nào</p>
              <p className="text-xs text-[#666] mt-1">Upload tài liệu để bắt đầu</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
