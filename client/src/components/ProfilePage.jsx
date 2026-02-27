import { useState, useEffect } from 'react';
import {
    ArrowLeft, User, Mail, Shield, ShieldCheck, Crown, Calendar, Clock,
    Globe, CheckCircle2, XCircle, Fingerprint, KeyRound, Loader2, Edit3,
    Save, X, Camera,
} from 'lucide-react';
import { updateProfile, get2FAStatus, getPasskeyList } from '../api';

export default function ProfilePage({ user, onBack, onUserUpdate, onOpenAuth }) {
    const [loading, setLoading] = useState(true);
    const [twoFAStatus, setTwoFAStatus] = useState(null);
    const [passkeys, setPasskeys] = useState([]);
    const [editing, setEditing] = useState(false);
    const [displayName, setDisplayName] = useState(user?.displayName || '');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

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

    if (!user) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#1a1d27] border border-[#2e3144] flex items-center justify-center">
                        <User size={36} className="text-[#9496a1]" />
                    </div>
                    <h2 className="text-xl font-bold mb-2">Chưa đăng nhập</h2>
                    <p className="text-sm text-[#9496a1] mb-6">Đăng nhập để xem thông tin tài khoản</p>
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

    const handleSave = async () => {
        setError(''); setSuccess('');
        try {
            const result = await updateProfile({ displayName });
            onUserUpdate?.(result.user);
            setSuccess('Đã cập nhật thành công!');
            setEditing(false);
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.error || err.message);
        }
    };

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
            {/* Back button */}
            <button
                onClick={onBack}
                className="flex items-center gap-2 text-sm text-[#9496a1] hover:text-white transition-colors mb-6 group"
            >
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                Quay lại
            </button>

            {/* ── Profile Header Card ── */}
            <div className="relative bg-[#1a1d27] border border-[#2e3144] rounded-2xl overflow-hidden mb-6">
                {/* Banner gradient */}
                <div className="h-32 bg-gradient-to-r from-primary-600/30 via-primary-500/20 to-purple-600/30 relative">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDE4YzMuMzEgMCA2LTIuNjkgNi02cy0yLjY5LTYtNi02LTYgMi42OS02IDYgMi42OSA2IDYgNnptMTIgMGMzLjMxIDAgNi0yLjY5IDYtNnMtMi42OS02LTYtNi02IDIuNjktNiA2IDIuNjkgNiA2IDZ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
                </div>

                {/* Avatar + Info */}
                <div className="px-6 pb-6 -mt-12 relative">
                    <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
                        {/* Avatar */}
                        <div className="relative group">
                            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-3xl font-bold border-4 border-[#1a1d27] shadow-xl">
                                {initials}
                            </div>
                            {/* Plan badge */}
                            <div className={`absolute -bottom-1 -right-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r ${planColors[user.plan] || planColors.free} shadow-lg`}>
                                {user.planBadge || user.plan}
                            </div>
                        </div>

                        {/* Name + Meta */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                {editing ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={displayName}
                                            onChange={(e) => setDisplayName(e.target.value)}
                                            className="bg-[#0f1117] border border-[#2e3144] rounded-lg px-3 py-1.5 text-lg font-bold focus:outline-none focus:border-primary-500 transition-colors"
                                            autoFocus
                                        />
                                        <button onClick={handleSave} className="p-1.5 bg-green-500/20 hover:bg-green-500/30 rounded-lg text-green-400 transition-colors">
                                            <Save size={16} />
                                        </button>
                                        <button onClick={() => { setEditing(false); setDisplayName(user.displayName || ''); }} className="p-1.5 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400 transition-colors">
                                            <X size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <h1 className="text-2xl font-bold truncate">{user.displayName || user.username}</h1>
                                        <button onClick={() => setEditing(true)} className="p-1.5 hover:bg-[#242736] rounded-lg text-[#9496a1] hover:text-white transition-colors">
                                            <Edit3 size={14} />
                                        </button>
                                    </>
                                )}
                                {user.role === 'admin' && (
                                    <span className="px-2 py-0.5 bg-purple-500/20 border border-purple-500/30 rounded-md text-[10px] font-bold text-purple-400 uppercase">Admin</span>
                                )}
                            </div>
                            <p className="text-sm text-[#9496a1] mt-0.5">@{user.username}</p>
                            <div className="flex items-center gap-3 mt-2 flex-wrap text-xs text-[#9496a1]">
                                <span className="flex items-center gap-1">
                                    <Mail size={12} />
                                    {user.email}
                                    {user.emailVerified ? (
                                        <CheckCircle2 size={12} className="text-green-400" />
                                    ) : (
                                        <XCircle size={12} className="text-amber-400" />
                                    )}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Calendar size={12} />
                                    Tham gia {memberSince}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Notifications */}
                    {error && (
                        <div className="mt-4 px-4 py-2.5 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">{error}</div>
                    )}
                    {success && (
                        <div className="mt-4 px-4 py-2.5 bg-green-500/10 border border-green-500/30 rounded-lg text-sm text-green-400">{success}</div>
                    )}
                </div>
            </div>

            {/* ── Stats Grid ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {/* Plan Card */}
                <div className="bg-[#1a1d27] border border-[#2e3144] rounded-xl p-5 hover:border-primary-500/30 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-[#9496a1] uppercase tracking-wider font-medium">Gói hiện tại</span>
                        <Crown size={16} className="text-amber-400" />
                    </div>
                    <p className={`text-2xl font-bold bg-gradient-to-r ${planColors[user.plan] || planColors.free} bg-clip-text text-transparent`}>
                        {user.planLabel || 'Free'}
                    </p>
                    {user.planExpiresAt && (
                        <p className="text-[11px] text-[#9496a1] mt-1">
                            Hết hạn: {new Date(user.planExpiresAt).toLocaleDateString('vi-VN')}
                        </p>
                    )}
                </div>

                {/* Security Card */}
                <div className="bg-[#1a1d27] border border-[#2e3144] rounded-xl p-5 hover:border-primary-500/30 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-[#9496a1] uppercase tracking-wider font-medium">Bảo mật</span>
                        <Shield size={16} className="text-primary-400" />
                    </div>
                    {loading ? (
                        <Loader2 size={20} className="text-[#9496a1] animate-spin" />
                    ) : (
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-[#9496a1]">2FA (TOTP)</span>
                                {twoFAStatus?.enabled ? (
                                    <span className="flex items-center gap-1 text-xs text-green-400"><ShieldCheck size={12} /> Bật</span>
                                ) : (
                                    <span className="flex items-center gap-1 text-xs text-[#9496a1]"><XCircle size={12} /> Tắt</span>
                                )}
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-[#9496a1]">Passkey</span>
                                {passkeys.length > 0 ? (
                                    <span className="flex items-center gap-1 text-xs text-green-400"><Fingerprint size={12} /> {passkeys.length}</span>
                                ) : (
                                    <span className="flex items-center gap-1 text-xs text-[#9496a1]"><XCircle size={12} /> Chưa có</span>
                                )}
                            </div>
                            {twoFAStatus?.enabled && (
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-[#9496a1]">Mã khôi phục</span>
                                    <span className={`text-xs ${twoFAStatus.recoveryCodesRemaining > 3 ? 'text-green-400' : twoFAStatus.recoveryCodesRemaining > 0 ? 'text-amber-400' : 'text-red-400'}`}>
                                        {twoFAStatus.recoveryCodesRemaining} còn lại
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Activity Card */}
                <div className="bg-[#1a1d27] border border-[#2e3144] rounded-xl p-5 hover:border-primary-500/30 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-[#9496a1] uppercase tracking-wider font-medium">Hoạt động</span>
                        <Clock size={16} className="text-primary-400" />
                    </div>
                    <div className="space-y-2">
                        <div>
                            <p className="text-[11px] text-[#9496a1] mb-0.5">Đăng nhập lần cuối</p>
                            <p className="text-sm font-medium">{lastLogin}</p>
                        </div>
                        {user.lastIp && (
                            <div>
                                <p className="text-[11px] text-[#9496a1] mb-0.5">IP gần nhất</p>
                                <p className="text-sm font-medium font-mono">{user.lastIp}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Passkeys List ── */}
            {passkeys.length > 0 && (
                <div className="bg-[#1a1d27] border border-[#2e3144] rounded-xl p-5 mb-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Fingerprint size={16} className="text-primary-400" />
                        <h3 className="text-sm font-semibold">Passkeys đã đăng ký</h3>
                    </div>
                    <div className="space-y-2">
                        {passkeys.map(pk => (
                            <div key={pk.id} className="flex items-center gap-3 bg-[#0f1117] border border-[#2e3144] rounded-lg px-4 py-3">
                                <Fingerprint size={16} className="text-primary-400 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{pk.name}</p>
                                    <p className="text-[11px] text-[#9496a1]">
                                        {pk.deviceType === 'multiDevice' ? 'Đa thiết bị' : 'Đơn thiết bị'}
                                        {pk.backedUp ? ' • Đã sao lưu' : ''}
                                        {pk.createdAt ? ` • ${new Date(pk.createdAt).toLocaleDateString('vi-VN')}` : ''}
                                    </p>
                                </div>
                                <div className="px-2 py-1 bg-green-500/10 rounded-md">
                                    <CheckCircle2 size={14} className="text-green-400" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Account Details ── */}
            <div className="bg-[#1a1d27] border border-[#2e3144] rounded-xl p-5">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <User size={16} className="text-primary-400" />
                    Thông tin tài khoản
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InfoRow label="ID" value={`#${user.id}`} />
                    <InfoRow label="Username" value={`@${user.username}`} />
                    <InfoRow label="Email" value={user.email} verified={user.emailVerified} />
                    <InfoRow label="Tên hiển thị" value={user.displayName || '—'} />
                    <InfoRow label="Vai trò" value={user.role === 'admin' ? '👑 Admin' : '👤 User'} />
                    <InfoRow label="Gói" value={`${user.planBadge || ''} ${user.planLabel || 'Free'}`} />
                </div>
            </div>
        </div>
    );
}

function InfoRow({ label, value, verified }) {
    return (
        <div className="bg-[#0f1117] border border-[#2e3144]/50 rounded-lg px-4 py-3">
            <p className="text-[11px] text-[#9496a1] uppercase tracking-wider mb-1">{label}</p>
            <p className="text-sm font-medium flex items-center gap-1.5 truncate">
                {value}
                {verified !== undefined && (
                    verified ? <CheckCircle2 size={13} className="text-green-400 shrink-0" /> : <XCircle size={13} className="text-amber-400 shrink-0" />
                )}
            </p>
        </div>
    );
}
