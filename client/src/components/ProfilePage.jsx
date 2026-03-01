import { useState, useEffect } from 'react';
import {
    ArrowLeft, User, Mail, Shield, ShieldCheck, Crown, Calendar, Clock,
    CheckCircle2, XCircle, Fingerprint, KeyRound, Loader2, Edit3,
    Save, X, Lock, ShieldOff, RefreshCw, Copy, Palette, AlertCircle, Plus, Trash2, Download, Moon, Sun, Monitor, Camera
} from 'lucide-react';
import {
    updateProfile, get2FAStatus, getPasskeyList, changePassword,
    setup2FA, enable2FA, disable2FA, regenerateRecoveryCodes,
    getPasskeyRegisterOptions, verifyPasskeyRegistration, deletePasskey
} from '../api';
import { useTheme, THEMES } from '../ThemeContext';
import ConfirmModal from './ConfirmModal';
import { startRegistration } from '@simplewebauthn/browser';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function ProfilePage({ user, onBack, onUserUpdate, onOpenAuth }) {
    const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'security' | 'theme'

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Profile editing
    const [editing, setEditing] = useState(false);
    const [displayName, setDisplayName] = useState(user?.displayName || '');
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [avatarUploading, setAvatarUploading] = useState(false);

    // Password
    const [oldPw, setOldPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [showPwConfirm, setShowPwConfirm] = useState(false);

    // 2FA
    const [twoFAStatus, setTwoFAStatus] = useState(null);
    const [twoFAStep, setTwoFAStep] = useState('status'); // 'status' | 'setup' | 'recovery-codes' | 'disable' | 'regen'
    const [setupData, setSetupData] = useState(null);
    const [totpCode, setTotpCode] = useState('');
    const [recoveryCodes, setRecoveryCodes] = useState(null);
    const [disablePassword, setDisablePassword] = useState('');
    const [regenPassword, setRegenPassword] = useState('');

    // Passkeys
    const [passkeys, setPasskeys] = useState([]);
    const [passkeyName, setPasskeyName] = useState('');
    const [loadingPasskeys, setLoadingPasskeys] = useState(false);

    // Theme
    const { theme: currentTheme, setTheme, mode, setMode } = useTheme();

    useEffect(() => {
        if (!user) return;
        setLoading(true);
        Promise.all([
            get2FAStatus().catch(() => ({ enabled: false, recoveryCodesRemaining: 0 })),
            getPasskeyList().catch(() => ({ passkeys: [] })),
        ]).then(([status, pkData]) => {
            setTwoFAStatus(status);
            setPasskeys(pkData.passkeys || []);
        }).finally(() => setLoading(false));
    }, [user]);

    const load2FAStatus = async () => {
        try {
            const status = await get2FAStatus();
            setTwoFAStatus(status);
        } catch {
            setTwoFAStatus({ enabled: false, recoveryCodesRemaining: 0 });
        }
    };

    const loadPasskeys = async () => {
        setLoadingPasskeys(true);
        try {
            const data = await getPasskeyList();
            setPasskeys(data.passkeys || []);
        } catch {
            setPasskeys([]);
        } finally {
            setLoadingPasskeys(false);
        }
    };

    const handleSaveProfile = async () => {
        setError(''); setSuccess('');
        try {
            // Need to handle both regular profile and avatar uploads.
            // For now, we'll build a standard updateProfile call, assuming backend handles avatar separately or via multipart.
            // Let's implement an avatar upload endpoint if needed, or assume updateProfile handles multipart.
            // Given the original api.js, updateProfile sends JSON. Let's create an uploadAvatar api call.

            if (avatarFile) {
                const formData = new FormData();
                formData.append('avatar', avatarFile);
                const token = localStorage.getItem('notemind_token');
                const response = await fetch(`${API_URL}/api/users/profile/avatar`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Lỗi khi tải lên ảnh đại diện');
                }
                const data = await response.json();
                onUserUpdate?.(data.user);
            }

            if (displayName !== user?.displayName) {
                const result = await updateProfile({ displayName });
                onUserUpdate?.(result.user);
            }

            setSuccess('Đã cập nhật thông tin thành công!');
            setEditing(false);
            setAvatarFile(null);
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.error || err.message);
        }
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) return setError('Ảnh đại diện không được vượt quá 2MB');
            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const handleQuickAvatarUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) return setError('Ảnh đại diện không được vượt quá 2MB');
        setAvatarUploading(true);
        setError('');
        try {
            const formData = new FormData();
            formData.append('avatar', file);
            const token = localStorage.getItem('notemind_token');
            const response = await fetch(`${API_URL}/api/users/profile/avatar`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Lỗi khi tải lên ảnh đại diện');
            }
            const data = await response.json();
            onUserUpdate?.(data.user);
            setSuccess('Đã cập nhật ảnh đại diện!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.message);
        } finally {
            setAvatarUploading(false);
            e.target.value = '';
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setError(''); setSuccess('');
        if (newPw !== confirmPw) return setError('Mật khẩu xác nhận không khớp');
        if (newPw.length < 6) return setError('Mật khẩu mới phải có ít nhất 6 ký tự');
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

    // 2FA Handlers
    const handleSetup2FA = async () => {
        setLoading(true); setError(''); setSuccess('');
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
        setLoading(true); setError(''); setSuccess('');
        try {
            const result = await enable2FA(totpCode);
            setRecoveryCodes(result.recoveryCodes);
            setTwoFAStep('recovery-codes');
            setSetupData(null);
            setTotpCode('');
            load2FAStatus(); // refresh status in background
        } catch (err) {
            setError(err.response?.data?.error || err.message);
        } finally { setLoading(false); }
    };

    const handleDisable2FA = async () => {
        setLoading(true); setError(''); setSuccess('');
        try {
            const result = await disable2FA(disablePassword);
            setTwoFAStatus({ enabled: false, recoveryCodesRemaining: 0 });
            setTwoFAStep('status');
            setDisablePassword('');
            setSuccess('Đã tắt xác thực hai bước');
            onUserUpdate?.(result.user);
        } catch (err) {
            setError(err.response?.data?.error || err.message);
        } finally { setLoading(false); }
    };

    const handleRegenCodes = async () => {
        setLoading(true); setError(''); setSuccess('');
        try {
            const result = await regenerateRecoveryCodes(regenPassword);
            setRecoveryCodes(result.recoveryCodes);
            setTwoFAStep('recovery-codes');
            setRegenPassword('');
            load2FAStatus();
        } catch (err) {
            setError(err.response?.data?.error || err.message);
        } finally { setLoading(false); }
    };

    // Passkey Handlers
    const handleRegisterPasskey = async () => {
        setLoading(true); setError(''); setSuccess('');
        try {
            const options = await getPasskeyRegisterOptions();
            const regResponse = await startRegistration({ optionsJSON: options });
            await verifyPasskeyRegistration(regResponse, passkeyName || 'Passkey');
            setSuccess('Đã thêm Passkey thành công!');
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
        setLoading(true); setError(''); setSuccess('');
        try {
            await deletePasskey(id);
            setSuccess('Đã xóa Passkey');
            loadPasskeys();
        } catch (err) {
            setError(err.response?.data?.error || err.message);
        } finally { setLoading(false); }
    };

    if (!user) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-surface border border-line flex items-center justify-center">
                        <User size={36} className="text-muted" />
                    </div>
                    <h2 className="text-xl font-bold mb-2">Chưa đăng nhập</h2>
                    <p className="text-sm text-muted mb-6">Đăng nhập để xem thông tin tài khoản</p>
                    <button
                        onClick={() => onOpenAuth?.('login')}
                        className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 rounded-xl text-sm font-semibold transition-colors"
                    >
                        Đăng nhập
                    </button>
                </div>
            </div>
        );
    }

    const initials = (user.displayName || user.username || '?').slice(0, 2).toUpperCase();
    const memberSince = user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';
    const lastLogin = user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('vi-VN') : 'N/A';
    const planColors = {
        free: 'from-gray-400 to-gray-500',
        pro: 'from-blue-400 to-blue-600',
        premium: 'from-amber-400 to-orange-500',
        admin: 'from-purple-400 to-purple-600',
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
            <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted hover:text-txt transition-colors mb-6 group">
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                Quay lại
            </button>

            {/* ── Profile Header ── */}
            <div className="relative bg-surface border border-line rounded-2xl overflow-hidden mb-6">
                <div className={`h-32 bg-gradient-to-r relative ${user.plan === 'premium' || user.plan === 'pro' ? 'from-amber-500/30 via-primary-500/20 to-purple-600/30' : 'from-primary-600/30 via-primary-500/20 to-purple-600/30'}`}>
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDE4YzMuMzEgMCA2LTIuNjkgNi02cy0yLjY5LTYtNi02LTYgMi42OS02IDYgMi42OSA2IDYgNnptMTIgMGMzLjMxIDAgNi0yLjY5IDYtNnMtMi42OS02LTYtNi02IDIuNjktNiA2IDIuNjkgNiA2IDZ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
                </div>
                <div className="px-6 pb-6 -mt-12 relative">
                    <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
                        <div className="relative group">
                            <div className={`w-24 h-24 rounded-2xl flex items-center justify-center text-3xl font-bold border-4 border-surface shadow-xl overflow-hidden ${user.plan === 'premium' || user.plan === 'pro' ? 'bg-gradient-to-br from-amber-400 to-primary-600 shadow-amber-500/20' : 'bg-gradient-to-br from-primary-500 to-purple-600'}`}>
                                {avatarPreview || user.avatar_url ? (
                                    <img src={avatarPreview || (user.avatar_url.startsWith('http') ? user.avatar_url : `${API_URL}${user.avatar_url}`)} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    initials
                                )}
                            </div>

                            {/* Quick avatar upload button */}
                            <label className="absolute -top-1 -right-1 w-7 h-7 bg-primary-600 hover:bg-primary-700 rounded-full flex items-center justify-center cursor-pointer shadow-lg transition-colors z-10" title="Đổi ảnh đại diện">
                                {avatarUploading ? <Loader2 size={14} className="text-white animate-spin" /> : <Camera size={14} className="text-white" />}
                                <input type="file" accept="image/png, image/jpeg, image/jpg, image/webp" className="hidden" onChange={handleQuickAvatarUpload} disabled={avatarUploading} />
                            </label>

                            {editing && (
                                <label className="absolute inset-0 bg-black/60 rounded-2xl flex flex-col items-center justify-center text-white cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Edit3 size={20} className="mb-1" />
                                    <span className="text-[10px] uppercase font-bold tracking-wider">Đổi ảnh</span>
                                    <input type="file" accept="image/png, image/jpeg, image/jpg" className="hidden" onChange={handleAvatarChange} />
                                </label>
                            )}

                            <div className={`absolute -bottom-1 -right-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r flex items-center gap-1 ${planColors[user.plan] || planColors.free} shadow-lg`}>
                                {(user.plan === 'premium' || user.plan === 'pro' || user.plan === 'admin') && <Crown size={10} />}
                                {user.planBadge || user.plan}
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                {editing ? (
                                    <div className="flex items-center gap-2">
                                        <input autoFocus type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                                            className="bg-bg border border-line rounded-lg px-3 py-1.5 text-lg font-bold focus:outline-none focus:border-primary-500" />
                                        <button onClick={handleSaveProfile} className="p-1.5 bg-green-500/20 hover:bg-green-500/30 rounded-lg text-green-400"><Save size={16} /></button>
                                        <button onClick={() => { setEditing(false); setDisplayName(user.displayName || ''); }} className="p-1.5 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400"><X size={16} /></button>
                                    </div>
                                ) : (
                                    <>
                                        <h1 className="text-2xl font-bold truncate">{user.displayName || user.username}</h1>
                                        <button onClick={() => setEditing(true)} className="p-1.5 hover:bg-surface-2 rounded-lg text-muted hover:text-txt"><Edit3 size={14} /></button>
                                    </>
                                )}
                                {user.role === 'admin' && <span className="px-2 py-0.5 bg-purple-500/20 border border-purple-500/30 rounded-md text-[10px] font-bold text-purple-400 uppercase">Admin</span>}
                            </div>
                            <p className="text-sm text-muted mt-0.5">@{user.username}</p>
                            <div className="flex items-center gap-3 mt-2 flex-wrap text-xs text-muted">
                                <span className="flex items-center gap-1"><Mail size={12} /> {user.email} {user.emailVerified ? <CheckCircle2 size={12} className="text-green-400" /> : <XCircle size={12} className="text-amber-400" />}</span>
                                <span className="flex items-center gap-1"><Calendar size={12} /> Tham gia {memberSince}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Global Notifications */}
            {error && <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400 flex items-center gap-2"><AlertCircle size={16} /> {error}</div>}
            {success && <div className="mb-6 px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-sm text-emerald-400 flex items-center gap-2"><CheckCircle2 size={16} /> {success}</div>}

            {/* ── Tabs ── */}
            <div className="flex border-b border-line mb-6 overflow-x-auto hide-scrollbar">
                <button onClick={() => { setActiveTab('overview'); setError(''); setSuccess(''); }}
                    className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === 'overview' ? 'border-primary-500 text-primary-400' : 'border-transparent text-muted hover:text-txt'}`}>
                    <User size={16} /> Tổng quan
                </button>
                <button onClick={() => { setActiveTab('security'); setError(''); setSuccess(''); setTwoFAStep('status'); }}
                    className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === 'security' ? 'border-primary-500 text-primary-400' : 'border-transparent text-muted hover:text-txt'}`}>
                    <Shield size={16} /> Bảo mật & Đăng nhập
                </button>
                <button onClick={() => { setActiveTab('theme'); setError(''); setSuccess(''); }}
                    className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === 'theme' ? 'border-primary-500 text-primary-400' : 'border-transparent text-muted hover:text-txt'}`}>
                    <Palette size={16} /> Giao diện
                </button>
            </div>

            {/* ── Tab Content: Overview ── */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="bg-surface border border-line rounded-xl p-5 hover:border-primary-500/30 transition-colors">
                            <div className="flex items-center justify-between mb-3"><span className="text-xs text-muted uppercase tracking-wider font-medium">Gói hiện tại</span><Crown size={16} className="text-amber-400" /></div>
                            <p className={`text-2xl font-bold bg-gradient-to-r ${planColors[user.plan] || planColors.free} bg-clip-text text-transparent`}>{user.planLabel || 'Free'}</p>
                            {user.planExpiresAt && <p className="text-[11px] text-muted mt-1">Hết hạn: {new Date(user.planExpiresAt).toLocaleDateString('vi-VN')}</p>}
                        </div>
                        <div className="bg-surface border border-line rounded-xl p-5 hover:border-primary-500/30 transition-colors">
                            <div className="flex items-center justify-between mb-3"><span className="text-xs text-muted uppercase tracking-wider font-medium">Bảo mật</span><Shield size={16} className="text-primary-400" /></div>
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted">2FA (TOTP)</span>
                                    {twoFAStatus?.enabled ? <span className="flex items-center gap-1 text-xs text-green-400"><ShieldCheck size={12} /> Bật</span> : <span className="flex items-center gap-1 text-xs text-muted"><XCircle size={12} /> Tắt</span>}
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted">Passkey</span>
                                    {passkeys.length > 0 ? <span className="flex items-center gap-1 text-xs text-green-400"><Fingerprint size={12} /> {passkeys.length}</span> : <span className="flex items-center gap-1 text-xs text-muted"><XCircle size={12} /> Chưa có</span>}
                                </div>
                            </div>
                        </div>
                        <div className="bg-surface border border-line rounded-xl p-5 hover:border-primary-500/30 transition-colors">
                            <div className="flex items-center justify-between mb-3"><span className="text-xs text-muted uppercase tracking-wider font-medium">Hoạt động</span><Clock size={16} className="text-primary-400" /></div>
                            <div className="space-y-2">
                                <div><p className="text-[11px] text-muted mb-0.5">Đăng nhập lần cuối</p><p className="text-sm font-medium">{lastLogin}</p></div>
                                {user.lastIp && <div><p className="text-[11px] text-muted mb-0.5">IP gần nhất</p><p className="text-sm font-medium font-mono">{user.lastIp}</p></div>}
                            </div>
                        </div>
                    </div>
                    <div className="bg-surface border border-line rounded-xl p-5">
                        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><User size={16} className="text-primary-400" /> Thông tin tài khoản</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <InfoRow label="ID" value={`#${user.id}`} />
                            <InfoRow label="Username" value={`@${user.username}`} />
                            <InfoRow label="Email" value={user.email} verified={user.emailVerified} />
                            <InfoRow label="Tên hiển thị" value={user.displayName || '—'} />
                        </div>
                    </div>
                </div>
            )}

            {/* ── Tab Content: Security & 2FA ── */}
            {activeTab === 'security' && (
                <div className="space-y-6">
                    {/* Change Password */}
                    <div className="bg-surface border border-line rounded-xl p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Lock size={18} className="text-primary-400" /> Đổi mật khẩu</h3>
                        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                            <div>
                                <label className="text-xs text-muted mb-1.5 block">Mật khẩu hiện tại</label>
                                <div className="relative flex items-center">
                                    <span className="absolute left-3 text-muted"><Lock size={16} /></span>
                                    <input type="password" value={oldPw} onChange={e => setOldPw(e.target.value)}
                                        className="w-full bg-bg border border-line rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary-500" required />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-muted mb-1.5 block">Mật khẩu mới</label>
                                <div className="relative flex items-center">
                                    <span className="absolute left-3 text-muted"><Lock size={16} /></span>
                                    <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Ít nhất 6 ký tự"
                                        className="w-full bg-bg border border-line rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary-500" required />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-muted mb-1.5 block">Xác nhận mật khẩu mới</label>
                                <div className="relative flex items-center">
                                    <span className="absolute left-3 text-muted"><Lock size={16} /></span>
                                    <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                                        className="w-full bg-bg border border-line rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary-500" required />
                                </div>
                            </div>
                            <button type="submit" disabled={loading} className="py-2.5 px-6 bg-primary-600 hover:bg-primary-700 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Cập nhật mật khẩu
                            </button>
                        </form>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* TOTP 2FA */}
                        <div className="bg-surface border border-line rounded-xl p-6">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><ShieldCheck size={18} className="text-primary-400" /> Xác thực ứng dụng (TOTP)</h3>

                            {twoFAStep === 'status' && (
                                <div className="space-y-4">
                                    <div className={`flex items-center gap-3 p-4 rounded-xl border ${twoFAStatus?.enabled ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-bg border-line'}`}>
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${twoFAStatus?.enabled ? 'bg-emerald-500/20' : 'bg-surface-2'}`}>
                                            {twoFAStatus?.enabled ? <ShieldCheck size={20} className="text-emerald-400" /> : <ShieldOff size={20} className="text-muted" />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">{twoFAStatus?.enabled ? 'Đã bật' : 'Chưa bật'}</p>
                                            <p className="text-xs text-muted">{twoFAStatus?.enabled ? `Còn ${twoFAStatus.recoveryCodesRemaining} mã khôi phục` : 'Dùng Google Auth/Authy'}</p>
                                        </div>
                                    </div>

                                    {twoFAStatus?.enabled ? (
                                        <div className="flex gap-2">
                                            <button onClick={() => { setTwoFAStep('regen'); setRegenPassword(''); }} className="flex-1 py-2bg-surface-2 bg-line hover:bg-surface-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1">
                                                <RefreshCw size={14} /> Mã phục hồi
                                            </button>
                                            <button onClick={() => { setTwoFAStep('disable'); setDisablePassword(''); }} className="flex-1 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1">
                                                <ShieldOff size={14} /> Tắt 2FA
                                            </button>
                                        </div>
                                    ) : (
                                        <button onClick={handleSetup2FA} disabled={loading} className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
                                            Thiết lập 2FA
                                        </button>
                                    )}
                                </div>
                            )}

                            {twoFAStep === 'setup' && setupData && (
                                <div className="space-y-4">
                                    <div className="bg-white p-3 rounded-xl mx-auto w-max"><img src={setupData.qrCode} alt="QR Code" className="w-40 h-40" /></div>
                                    <div className="bg-bg border border-line rounded-xl p-3 flex items-center gap-2">
                                        <code className="flex-1 text-xs font-mono text-primary-400 break-all">{setupData.secret}</code>
                                        <button onClick={() => navigator.clipboard.writeText(setupData.secret)} className="p-1.5 hover:bg-surface-2 rounded-lg text-muted"><Copy size={14} /></button>
                                    </div>
                                    <input type="text" maxLength={6} value={totpCode} onChange={e => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000"
                                        className="w-full bg-bg border border-line rounded-xl px-4 py-3 text-center text-lg font-mono tracking-[0.5em] focus:outline-none focus:border-primary-500" autoFocus />
                                    <div className="flex gap-2">
                                        <button onClick={() => { setTwoFAStep('status'); setSetupData(null); }} className="flex-1 py-2 bg-surface-2 hover:bg-line rounded-xl text-sm font-medium">Huỷ</button>
                                        <button onClick={handleEnable2FA} disabled={loading || totpCode.length !== 6} className="flex-1 py-2 bg-primary-600 hover:bg-primary-700 rounded-xl text-sm font-semibold">Xác nhận</button>
                                    </div>
                                </div>
                            )}

                            {twoFAStep === 'recovery-codes' && recoveryCodes && (
                                <div className="space-y-4">
                                    <div className="text-center">
                                        <p className="text-sm font-bold text-emerald-400">Lưu mã khôi phục mới</p>
                                        <p className="text-xs text-muted mt-1">Lưu các mã này ở nơi an toàn. Bạn sẽ <strong className="text-red-400">KHÔNG</strong> thể xem lại chúng sau khi đóng.</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        {recoveryCodes.map((code, i) => <code key={i} className="text-sm tracking-wider font-mono text-center py-2 bg-bg border border-line rounded-lg">{code}</code>)}
                                    </div>

                                    <div className="flex gap-2 pt-2">
                                        <button
                                            onClick={() => {
                                                const blob = new Blob([recoveryCodes.join('\n')], { type: 'text/plain' });
                                                const url = URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.href = url;
                                                a.download = 'notemind-recovery-codes.txt';
                                                a.click();
                                                URL.revokeObjectURL(url);
                                                setSuccess('Đã tải xuống mã khôi phục!');
                                                setTimeout(() => setSuccess(''), 3000);
                                            }}
                                            className="flex-1 py-2.5 bg-surface-2 hover:bg-line rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors border border-line"
                                        >
                                            <Download size={15} /> Tải .txt
                                        </button>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(recoveryCodes.join('\n'));
                                                setSuccess('Đã sao chép vào bộ nhớ tạm!');
                                                setTimeout(() => setSuccess(''), 3000);
                                            }}
                                            className="flex-1 py-2.5 bg-surface-2 hover:bg-line rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors border border-line"
                                        >
                                            <Copy size={15} /> Sao chép
                                        </button>
                                    </div>

                                    <button onClick={() => { setTwoFAStep('status'); load2FAStatus(); setRecoveryCodes(null); }} className="w-full py-2.5 hover:opacity-90 transition-opacity bg-primary-600 rounded-xl text-sm font-bold text-white shadow-lg shadow-primary-500/20">
                                        Đã lưu, đóng cửa sổ
                                    </button>
                                </div>
                            )}

                            {twoFAStep === 'disable' && (
                                <div className="space-y-3">
                                    <p className="text-sm font-bold text-red-400">Tắt 2FA</p>
                                    <input type="password" value={disablePassword} onChange={e => setDisablePassword(e.target.value)} placeholder="Nhập mật khẩu" className="w-full bg-bg border border-line rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-500" />
                                    <div className="flex gap-2">
                                        <button onClick={() => { setTwoFAStep('status'); setDisablePassword(''); }} className="flex-1 py-2 bg-surface-2 rounded-xl text-sm font-medium">Huỷ</button>
                                        <button onClick={handleDisable2FA} disabled={!disablePassword} className="flex-1 py-2 bg-red-600 hover:bg-red-700 rounded-xl text-sm font-semibold">Xác nhận tắt</button>
                                    </div>
                                </div>
                            )}

                            {twoFAStep === 'regen' && (
                                <div className="space-y-3">
                                    <p className="text-sm font-bold text-amber-400">Tạo lại mã khôi phục</p>
                                    <input type="password" value={regenPassword} onChange={e => setRegenPassword(e.target.value)} placeholder="Nhập mật khẩu" className="w-full bg-bg border border-line rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500" />
                                    <div className="flex gap-2">
                                        <button onClick={() => { setTwoFAStep('status'); setRegenPassword(''); }} className="flex-1 py-2 bg-surface-2 rounded-xl text-sm font-medium">Huỷ</button>
                                        <button onClick={handleRegenCodes} disabled={!regenPassword} className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 rounded-xl text-sm font-semibold">Tạo mới</button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Passkeys */}
                        <div className="bg-surface border border-line rounded-xl p-6">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Fingerprint size={18} className="text-primary-400" /> Xác thực phần cứng (Passkey)</h3>

                            <div className="space-y-3 mb-4">
                                {passkeys.length === 0 ? (
                                    <p className="text-sm text-muted">Chưa có passkey nào. Thêm passkey để đăng nhập nhanh qua vân tay, khuôn mặt hoặc USB token.</p>
                                ) : (
                                    passkeys.map(pk => (
                                        <div key={pk.id} className="flex items-center gap-3 bg-bg border border-line rounded-lg px-3 py-2.5">
                                            <Fingerprint size={16} className="text-primary-400 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{pk.name}</p>
                                                <p className="text-[10px] text-muted truncate">{pk.deviceType === 'multiDevice' ? 'Đa thiết bị' : 'Đơn thiết bị'}</p>
                                            </div>
                                            <button onClick={() => handleDeletePasskey(pk.id)} className="p-1.5 hover:bg-red-500/10 rounded-md text-muted hover:text-red-400"><Trash2 size={14} /></button>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="flex gap-2">
                                <input type="text" value={passkeyName} onChange={e => setPasskeyName(e.target.value)} placeholder="Tên (VD: MacBook)"
                                    className="flex-1 bg-bg border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500" />
                                <button onClick={handleRegisterPasskey} disabled={loading} className="px-4 py-2 bg-surface-2 hover:bg-line rounded-lg text-sm font-medium flex items-center gap-1.5 border border-line">
                                    {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Thêm
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Tab Content: Theme ── */}
            {activeTab === 'theme' && (
                <div className="bg-surface border border-line rounded-xl p-6">
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><Palette size={18} className="text-primary-400" /> Giao diện hiển thị</h3>

                    <div className="mb-8 p-4 bg-bg border border-line rounded-xl flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <h4 className="text-sm font-medium">Chế độ hiển thị</h4>
                            <p className="text-xs text-muted">Chọn chế độ tối, sáng hoặc theo hệ thống.</p>
                        </div>
                        <div className="flex bg-surface border border-line rounded-lg p-1">
                            <button
                                onClick={() => setMode('light')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === 'light' ? 'bg-primary-600 text-white shadow-sm' : 'text-muted hover:text-txt hover:bg-surface-2'}`}
                            >
                                <Sun size={14} /> Sáng
                            </button>
                            <button
                                onClick={() => setMode('dark')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === 'dark' ? 'bg-primary-600 text-white shadow-sm' : 'text-muted hover:text-txt hover:bg-surface-2'}`}
                            >
                                <Moon size={14} /> Tối
                            </button>
                            <button
                                onClick={() => setMode('auto')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === 'auto' ? 'bg-primary-600 text-white shadow-sm' : 'text-muted hover:text-txt hover:bg-surface-2'}`}
                            >
                                <Monitor size={14} /> Tự động
                            </button>
                        </div>
                    </div>

                    <h4 className="text-sm font-medium mb-1">Màu chủ đạo (Accent Color)</h4>
                    <p className="text-xs text-muted mb-4">Lựa chọn màu nhấn cho NoteMinds. Giao diện được lưu trực tiếp trên trình duyệt của bạn.</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {Object.entries(THEMES).map(([key, t]) => (
                            <button
                                key={key}
                                onClick={() => setTheme(key)}
                                className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all hover:scale-105 ${currentTheme === key ? 'border-primary-500 bg-primary-600/10 shadow-lg shadow-primary-500/10' : 'border-line bg-bg hover:border-line'}`}
                            >
                                <div className="flex gap-1">
                                    <div className="w-5 h-5 rounded-full shadow-sm" style={{ background: t.primary['500'] }} />
                                    <div className="w-3 h-3 rounded-full opacity-70" style={{ background: t.primary['400'] }} />
                                </div>
                                <span className="text-sm font-medium flex items-center gap-1.5">{t.emoji} {t.label}</span>
                                {currentTheme === key && <CheckCircle2 size={14} className="text-primary-400 absolute top-2 right-2" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <ConfirmModal
                open={showPwConfirm}
                title="Đổi mật khẩu"
                message="Bạn có chắc chắn muốn đổi mật khẩu? Bạn sẽ dùng mật khẩu mới này cho lần đăng nhập sau."
                confirmLabel="Đổi mật khẩu"
                variant="warning"
                onConfirm={executeChangePassword}
                onCancel={() => setShowPwConfirm(false)}
            />
        </div>
    );
}

function InfoRow({ label, value, verified }) {
    return (
        <div className="bg-bg border border-line/50 rounded-lg px-4 py-3">
            <p className="text-[11px] text-muted uppercase tracking-wider mb-1">{label}</p>
            <p className="text-sm font-medium flex items-center gap-1.5 truncate">
                {value}
                {verified !== undefined && (verified ? <CheckCircle2 size={14} className="text-green-400 shrink-0" /> : <XCircle size={14} className="text-amber-400 shrink-0" />)}
            </p>
        </div>
    );
}
