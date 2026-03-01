import { useState, useEffect, useCallback } from 'react';
import {
  Shield, Users, ArrowLeft, Search, Loader2, CheckCircle2, AlertCircle,
  RefreshCw, Ban, ShieldCheck, Globe, Trash2, Plus,
  UserX, UserCheck, Clock, Wifi, BarChart3, FileText, Megaphone,
  ScrollText, Eye, EyeOff, Edit3, Save, X, TrendingUp,
  ChevronLeft, ChevronRight, Activity, Cpu, HardDrive, Mail, ToggleLeft,
  ToggleRight, Download, MapPin, Wrench, AlertOctagon, Flag,
  Zap, Server, Database, Brain, Send, CheckSquare, Square,
  Info, ArrowRight,
} from 'lucide-react';
import {
  adminGetUsers, adminSetPlan, adminSetRole, adminGetPlans,
  adminBanUser, adminUnbanUser, adminGetBannedIps, adminBanIp, adminUnbanIp,
  adminGetStats, adminGetDocuments, adminDeleteDocument, adminToggleDocPublic,
  getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement,
  adminGetAuditLogs,
  adminGetRealtime, adminBulkSetPlan, adminBulkBanUsers, adminBulkDeleteDocs,
  adminBulkTogglePublicDocs, adminGetUserDetail, adminGetAiUsage,
  adminGetReports, adminReviewReport, adminGetSystemHealth,
  adminSendEmailBlast, adminGetEmailBlasts,
  adminGetFeatureFlags, adminCreateFeatureFlag, adminUpdateFeatureFlag, adminDeleteFeatureFlag,
  adminExportUsers, adminExportDocuments, adminExportActivity,
  adminGetLoginActivity, adminUpdateSystemSetting, getSystemSettings,
} from '../api';
import ConfirmModal from './ConfirmModal';

const PLAN_STYLES = {
  free:      { badge: '📦', label: 'Free',      color: '#9496a1' },
  basic:     { badge: '⭐', label: 'Basic',     color: '#fbbf24' },
  pro:       { badge: '💎', label: 'Pro',        color: '#818cf8' },
  unlimited: { badge: '👑', label: 'Unlimited',  color: 'var(--color-primary-500)' },
};

export default function AdminPanel({ onBack }) {
  const [tab, setTab] = useState('realtime');
  const [users, setUsers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [bannedIps, setBannedIps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [selectedUserIds, setSelectedUserIds] = useState(new Set());
  const [userDetailId, setUserDetailId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [u, p, ips] = await Promise.all([adminGetUsers(), adminGetPlans(), adminGetBannedIps()]);
      setUsers(u);
      setPlans(p);
      setBannedIps(ips);
    } catch { setToast({ type: 'error', msg: 'Không thể tải dữ liệu' }); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); } }, [toast]);

  const showToast = (type, msg) => setToast({ type, msg });

  const askConfirm = useCallback((title, message, variant, onConfirm) => {
    setConfirm({ title, message, variant, action: onConfirm });
  }, []);

  const executeConfirm = async () => {
    if (!confirm?.action) return;
    await confirm.action();
    setConfirm(null);
  };

  const handleSetPlan = (userId, plan) => {
    const user = users.find((u) => u.id === userId);
    const planLabel = PLAN_STYLES[plan]?.label || plan;
    askConfirm(
      'Thay đổi gói dịch vụ',
      `Bạn có chắc muốn chuyển gói của @${user?.username || userId} sang ${planLabel}?`,
      'info',
      async () => {
        try {
          const updated = await adminSetPlan(userId, plan);
          setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...updated } : u)));
          showToast('success', `Đã cập nhật gói → ${planLabel}`);
        } catch { showToast('error', 'Lỗi cập nhật gói'); }
      }
    );
  };

  const handleSetRole = (userId, role) => {
    const user = users.find((u) => u.id === userId);
    askConfirm(
      'Thay đổi quyền',
      `Bạn có chắc muốn đổi quyền của @${user?.username || userId} thành ${role}?`,
      role === 'admin' ? 'warning' : 'info',
      async () => {
        try {
          const updated = await adminSetRole(userId, role);
          setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...updated } : u)));
          showToast('success', `Đã cập nhật quyền → ${role}`);
        } catch { showToast('error', 'Lỗi cập nhật quyền'); }
      }
    );
  };

  const handleBanUser = (userId, reason) => {
    const user = users.find((u) => u.id === userId);
    askConfirm(
      'Khóa tài khoản',
      `Bạn có chắc muốn khóa tài khoản @${user?.username || userId}?${reason ? ` Lý do: ${reason}` : ''}`,
      'danger',
      async () => {
        try {
          const updated = await adminBanUser(userId, reason);
          setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...updated } : u)));
          showToast('success', 'Đã khóa tài khoản');
        } catch { showToast('error', 'Lỗi khóa tài khoản'); }
      }
    );
  };

  const handleUnbanUser = (userId) => {
    const user = users.find((u) => u.id === userId);
    askConfirm(
      'Mở khóa tài khoản',
      `Bạn có chắc muốn mở khóa tài khoản @${user?.username || userId}?`,
      'info',
      async () => {
        try {
          const updated = await adminUnbanUser(userId);
          setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...updated } : u)));
          showToast('success', 'Đã mở khóa tài khoản');
        } catch { showToast('error', 'Lỗi mở khóa'); }
      }
    );
  };

  const handleBanIp = (ip, reason) => {
    askConfirm(
      'Chặn địa chỉ IP',
      `Bạn có chắc muốn chặn IP ${ip}?${reason ? ` Lý do: ${reason}` : ''} Tất cả truy cập từ IP này sẽ bị từ chối.`,
      'danger',
      async () => {
        try {
          await adminBanIp(ip, reason);
          await load();
          showToast('success', `Đã chặn IP ${ip}`);
        } catch (err) { showToast('error', err.response?.data?.error || 'Lỗi chặn IP'); }
      }
    );
  };

  const handleUnbanIp = (ip) => {
    askConfirm(
      'Bỏ chặn IP',
      `Bạn có chắc muốn bỏ chặn IP ${ip}?`,
      'info',
      async () => {
        try {
          await adminUnbanIp(ip);
          setBannedIps((prev) => prev.filter((b) => b.ip_address !== ip));
          showToast('success', `Đã bỏ chặn IP ${ip}`);
        } catch { showToast('error', 'Lỗi bỏ chặn IP'); }
      }
    );
  };

  const filtered = users.filter(
    (u) =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      (u.displayName || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.lastIp || '').includes(search)
  );

  // Bulk actions
  const toggleSelectUser = (userId) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId); else next.add(userId);
      return next;
    });
  };
  const selectAllUsers = () => {
    if (selectedUserIds.size === filtered.length) setSelectedUserIds(new Set());
    else setSelectedUserIds(new Set(filtered.map(u => u.id)));
  };
  const handleBulkSetPlan = (plan) => {
    askConfirm('Bulk Set Plan', `Chuyển ${selectedUserIds.size} users sang ${plan}?`, 'warning', async () => {
      try {
        await adminBulkSetPlan([...selectedUserIds], plan);
        showToast('success', `Đã cập nhật ${selectedUserIds.size} users`);
        setSelectedUserIds(new Set());
        load();
      } catch { showToast('error', 'Lỗi bulk update'); }
    });
  };
  const handleBulkBan = () => {
    askConfirm('Bulk Ban', `Khóa ${selectedUserIds.size} tài khoản?`, 'danger', async () => {
      try {
        await adminBulkBanUsers([...selectedUserIds], 'Bulk ban');
        showToast('success', `Đã khóa ${selectedUserIds.size} users`);
        setSelectedUserIds(new Set());
        load();
      } catch { showToast('error', 'Lỗi bulk ban'); }
    });
  };

  const totalUsers = users.length;
  const bannedUsers = users.filter((u) => u.isBanned).length;

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 rounded-lg bg-surface hover:bg-surface-2 transition-colors">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-xl font-bold font-display flex items-center gap-2">
                <Shield size={20} className="text-primary-400" /> Bảng điều khiển Admin
              </h1>
              <p className="text-xs text-muted">Quản lý người dùng, gói dịch vụ & bảo mật</p>
            </div>
          </div>
          <button onClick={load} disabled={loading} className="p-2 rounded-lg bg-surface hover:bg-surface-2 transition-colors" title="Làm mới">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <StatCard icon={<Users size={16} />} label="Tổng users" value={totalUsers} color="#60a5fa" />
          <StatCard icon={<UserX size={16} />} label="Bị khóa" value={bannedUsers} color="#f87171" />
          <StatCard icon={<Ban size={16} />} label="IP bị chặn" value={bannedIps.length} color="#fb923c" />
          {Object.entries(PLAN_STYLES).slice(1).map(([key, { badge, label, color }]) => (
            <StatCard key={key} icon={<span className="text-sm">{badge}</span>} label={label} value={users.filter((u) => u.plan === key).length} color={color} />
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-surface p-1 rounded-xl w-fit flex-wrap">
          <TabBtn active={tab === 'realtime'} onClick={() => setTab('realtime')} icon={<Activity size={14} />} label="Dashboard" />
          <TabBtn active={tab === 'users'} onClick={() => setTab('users')} icon={<Users size={14} />} label={`Users (${totalUsers})`} />
          <TabBtn active={tab === 'ips'} onClick={() => setTab('ips')} icon={<Globe size={14} />} label={`IP (${bannedIps.length})`} />
          <TabBtn active={tab === 'stats'} onClick={() => setTab('stats')} icon={<BarChart3 size={14} />} label="Thống kê" />
          <TabBtn active={tab === 'docs'} onClick={() => setTab('docs')} icon={<FileText size={14} />} label="Tài liệu" />
          <TabBtn active={tab === 'ai'} onClick={() => setTab('ai')} icon={<Brain size={14} />} label="AI Usage" />
          <TabBtn active={tab === 'moderation'} onClick={() => setTab('moderation')} icon={<Flag size={14} />} label="Kiểm duyệt" />
          <TabBtn active={tab === 'health'} onClick={() => setTab('health')} icon={<Server size={14} />} label="Hệ thống" />
          <TabBtn active={tab === 'email'} onClick={() => setTab('email')} icon={<Mail size={14} />} label="Email" />
          <TabBtn active={tab === 'flags'} onClick={() => setTab('flags')} icon={<ToggleLeft size={14} />} label="Feature Flags" />
          <TabBtn active={tab === 'export'} onClick={() => setTab('export')} icon={<Download size={14} />} label="Export" />
          <TabBtn active={tab === 'announcements'} onClick={() => setTab('announcements')} icon={<Megaphone size={14} />} label="Thông báo" />
          <TabBtn active={tab === 'logins'} onClick={() => setTab('logins')} icon={<MapPin size={14} />} label="Login Activity" />
          <TabBtn active={tab === 'maintenance'} onClick={() => setTab('maintenance')} icon={<Wrench size={14} />} label="Bảo trì" />
          <TabBtn active={tab === 'audit'} onClick={() => setTab('audit')} icon={<ScrollText size={14} />} label="Nhật ký" />
        </div>

        {tab === 'users' && (
          <>
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  placeholder="Tìm user, email hoặc IP..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-surface border border-line rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary-500/50"
                />
              </div>
              {selectedUserIds.size > 0 && (
                <div className="flex items-center gap-2 bg-primary-600/10 border border-primary-500/20 rounded-xl px-3 py-2">
                  <span className="text-xs font-medium text-primary-400">{selectedUserIds.size} đã chọn</span>
                  <select onChange={(e) => e.target.value && handleBulkSetPlan(e.target.value)} className="bg-bg border border-line rounded-lg px-2 py-1 text-xs cursor-pointer">
                    <option value="">Set Plan...</option>
                    {Object.entries(PLAN_STYLES).map(([k, { label }]) => <option key={k} value={k}>{label}</option>)}
                  </select>
                  <button onClick={handleBulkBan} className="px-2 py-1 bg-red-500/10 text-red-400 rounded-lg text-xs hover:bg-red-500/20">Ban</button>
                  <button onClick={() => setSelectedUserIds(new Set())} className="p-1 hover:bg-surface-2 rounded-lg text-muted"><X size={12} /></button>
                </div>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 size={28} className="animate-spin text-primary-400" />
              </div>
            ) : (
              <div className="bg-surface border border-line rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line text-muted text-xs uppercase tracking-wider">
                        <th className="py-3 px-2 w-8"><button onClick={selectAllUsers} className="text-muted hover:text-txt">{selectedUserIds.size === filtered.length && filtered.length > 0 ? <CheckSquare size={14} /> : <Square size={14} />}</button></th>
                        <th className="text-left py-3 px-4">User</th>
                        <th className="text-left py-3 px-4">Gói</th>
                        <th className="text-left py-3 px-4">Quyền</th>
                        <th className="text-left py-3 px-4 hidden lg:table-cell">IP / Hoạt động</th>
                        <th className="text-left py-3 px-4">Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((u) => (
                        <UserRow
                          key={u.id}
                          user={u}
                          selected={selectedUserIds.has(u.id)}
                          onToggleSelect={() => toggleSelectUser(u.id)}
                          onSetPlan={handleSetPlan}
                          onSetRole={handleSetRole}
                          onBan={handleBanUser}
                          onUnban={handleUnbanUser}
                          onBanIp={handleBanIp}
                          onOpenDetail={() => setUserDetailId(u.id)}
                        />
                      ))}
                      {filtered.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-muted">
                            <Users size={28} className="mx-auto mb-2 opacity-50" />
                            <p>Không tìm thấy user</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'ips' && (
          <IpBanPanel bannedIps={bannedIps} onBanIp={handleBanIp} onUnbanIp={handleUnbanIp} loading={loading} />
        )}

        {tab === 'realtime' && <RealtimeDashboard />}
        {tab === 'stats' && <AdminStatsPanel />}
        {tab === 'docs' && <AdminDocsPanel showToast={showToast} askConfirm={askConfirm} />}
        {tab === 'ai' && <AiUsagePanel />}
        {tab === 'moderation' && <ModerationPanel showToast={showToast} askConfirm={askConfirm} />}
        {tab === 'health' && <SystemHealthPanel />}
        {tab === 'email' && <EmailBlastPanel showToast={showToast} />}
        {tab === 'flags' && <FeatureFlagsPanel showToast={showToast} askConfirm={askConfirm} />}
        {tab === 'export' && <ExportDataPanel showToast={showToast} />}
        {tab === 'announcements' && <AdminAnnouncementsPanel showToast={showToast} askConfirm={askConfirm} />}
        {tab === 'logins' && <LoginActivityPanel />}
        {tab === 'maintenance' && <MaintenanceModePanel showToast={showToast} />}
        {tab === 'audit' && <AdminAuditPanel />}
      </div>

      {userDetailId && <UserDetailDrawer userId={userDetailId} onClose={() => setUserDetailId(null)} />}

      {toast && (
        <div className={`fixed bottom-6 right-6 z-[200] px-4 py-3 rounded-xl border flex items-center gap-2 text-sm shadow-xl animate-fade-in ${toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      <ConfirmModal
        open={!!confirm}
        title={confirm?.title}
        message={confirm?.message}
        variant={confirm?.variant}
        onConfirm={executeConfirm}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <div className="bg-surface border border-line rounded-xl p-3">
      <div className="flex items-center gap-2 mb-1">
        <span style={{ color }}>{icon}</span>
        <span className="text-xs text-muted">{label}</span>
      </div>
      <p className="text-xl font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${active ? 'bg-primary-600 text-white' : 'text-muted hover:text-txt hover:bg-surface-2'}`}
    >
      {icon} {label}
    </button>
  );
}

function UserRow({ user, selected, onToggleSelect, onSetPlan, onSetRole, onBan, onUnban, onBanIp, onOpenDetail }) {
  const [showBanInput, setShowBanInput] = useState(false);
  const [banReason, setBanReason] = useState('');
  const style = PLAN_STYLES[user.plan] || PLAN_STYLES.free;

  const confirmBan = () => {
    onBan(user.id, banReason || undefined);
    setShowBanInput(false);
    setBanReason('');
  };

  return (
    <>
      <tr className={`border-b border-line last:border-b-0 transition-colors ${user.isBanned ? 'bg-red-500/5' : 'hover:bg-surface-2/50'}`}>
        <td className="py-3 px-2 w-8">
          <button onClick={onToggleSelect} className="text-muted hover:text-txt">
            {selected ? <CheckSquare size={14} className="text-primary-400" /> : <Square size={14} />}
          </button>
        </td>
        <td className="py-3 px-4">
          <div className="flex items-center gap-3">
            <button onClick={onOpenDetail} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs hover:ring-2 ring-primary-500/50 transition-all ${user.isBanned ? 'bg-red-500/20 text-red-400' : 'bg-primary-600/20 text-primary-400'}`}>
              {(user.displayName || user.username).charAt(0).toUpperCase()}
            </button>
            <div className="min-w-0">
              <p className="font-medium text-sm flex items-center gap-1.5 flex-wrap">
                <span className="truncate">{user.displayName || user.username}</span>
                {user.role === 'admin' && (
                  <span className="px-1.5 py-0.5 bg-primary-600/20 text-primary-400 text-[10px] rounded-md font-bold shrink-0">ADMIN</span>
                )}
                {user.isBanned && (
                  <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[10px] rounded-md font-bold shrink-0">BỊ KHÓA</span>
                )}
              </p>
              <p className="text-xs text-muted truncate">@{user.username} · {user.email}</p>
            </div>
          </div>
        </td>

        <td className="py-3 px-4">
          <select
            value={user.plan}
            onChange={(e) => onSetPlan(user.id, e.target.value)}
            className="bg-bg border border-line rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-primary-500/50 cursor-pointer"
            style={{ color: style.color }}
          >
            {Object.entries(PLAN_STYLES).map(([key, { badge, label }]) => (
              <option key={key} value={key}>{badge} {label}</option>
            ))}
          </select>
        </td>

        <td className="py-3 px-4">
          <select
            value={user.role}
            onChange={(e) => onSetRole(user.id, e.target.value)}
            className="bg-bg border border-line rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-primary-500/50 cursor-pointer"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </td>

        <td className="py-3 px-4 hidden lg:table-cell">
          <div className="space-y-0.5">
            {user.lastIp && (
              <div className="flex items-center gap-1.5 text-xs text-muted">
                <Wifi size={11} />
                <span className="font-mono">{user.lastIp}</span>
                <button
                  onClick={() => onBanIp(user.lastIp, `Liên kết với user @${user.username}`)}
                  className="p-0.5 rounded hover:bg-red-500/20 text-muted hover:text-red-400 transition-colors"
                  title="Chặn IP này"
                >
                  <Ban size={11} />
                </button>
              </div>
            )}
            {user.lastLoginAt && (
              <div className="flex items-center gap-1.5 text-xs text-[#666]">
                <Clock size={11} />
                {new Date(user.lastLoginAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
            {!user.lastIp && !user.lastLoginAt && (
              <span className="text-xs text-muted/60">Chưa đăng nhập</span>
            )}
          </div>
        </td>

        <td className="py-3 px-4">
          {user.isBanned ? (
            <button
              onClick={() => onUnban(user.id)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs transition-colors"
            >
              <UserCheck size={13} /> Mở khóa
            </button>
          ) : (
            <button
              onClick={() => setShowBanInput(!showBanInput)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs transition-colors"
            >
              <UserX size={13} /> Khóa
            </button>
          )}
        </td>
      </tr>
      {showBanInput && (
        <tr className="bg-red-500/5">
          <td colSpan={5} className="px-4 py-2">
            <div className="flex items-center gap-2">
              <input
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Lý do khóa (tuỳ chọn)..."
                className="flex-1 bg-bg border border-red-500/30 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-red-500/50"
                onKeyDown={(e) => e.key === 'Enter' && confirmBan()}
              />
              <button onClick={confirmBan} className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-xs font-medium transition-colors">
                Xác nhận khóa
              </button>
              <button onClick={() => setShowBanInput(false)} className="px-3 py-1.5 rounded-lg bg-surface-2 hover:bg-line text-xs transition-colors">
                Hủy
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function IpBanPanel({ bannedIps, onBanIp, onUnbanIp, loading }) {
  const [newIp, setNewIp] = useState('');
  const [reason, setReason] = useState('');

  const handleAdd = () => {
    if (!newIp.trim()) return;
    onBanIp(newIp.trim(), reason.trim() || undefined);
    setNewIp('');
    setReason('');
  };

  return (
    <div className="space-y-4">
      <div className="bg-surface border border-line rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Plus size={14} className="text-primary-400" /> Chặn IP mới
        </h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={newIp}
            onChange={(e) => setNewIp(e.target.value)}
            placeholder="Nhập địa chỉ IP (vd: 192.168.1.100)"
            className="flex-1 bg-bg border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500/50 font-mono"
          />
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Lý do (tuỳ chọn)"
            className="flex-1 bg-bg border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500/50"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <button
            onClick={handleAdd}
            disabled={!newIp.trim()}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
          >
            <Ban size={14} /> Chặn
          </button>
        </div>
      </div>

      <div className="bg-surface border border-line rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 size={24} className="animate-spin text-primary-400" />
          </div>
        ) : bannedIps.length === 0 ? (
          <div className="text-center py-10 text-muted">
            <ShieldCheck size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">Chưa có IP nào bị chặn</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-muted text-xs uppercase tracking-wider">
                <th className="text-left py-3 px-4">IP</th>
                <th className="text-left py-3 px-4">Lý do</th>
                <th className="text-left py-3 px-4 hidden sm:table-cell">Ngày chặn</th>
                <th className="text-left py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {bannedIps.map((b) => (
                <tr key={b.id} className="border-b border-line last:border-b-0 hover:bg-surface-2/50">
                  <td className="py-3 px-4 font-mono text-red-400">
                    <div className="flex items-center gap-2">
                      <Globe size={14} /> {b.ip_address}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-muted">{b.reason || '—'}</td>
                  <td className="py-3 px-4 text-xs text-[#666] hidden sm:table-cell">
                    {b.created_at ? new Date(b.created_at).toLocaleString('vi-VN') : '—'}
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => onUnbanIp(b.ip_address)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs transition-colors"
                    >
                      <Trash2 size={12} /> Bỏ chặn
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
// ── Admin Stats Panel ─────────────────────────────────
function AdminStatsPanel() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminGetStats().then(setStats).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-primary-400" /></div>;
  if (!stats) return <div className="text-center py-8 text-muted">Không thể tải dữ liệu thống kê</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Users size={16} />} label="Tổng user" value={stats.totalUsers} color="#60a5fa" />
        <StatCard icon={<TrendingUp size={16} />} label="User mới hôm nay" value={stats.newUsersToday} color="#34d399" />
        <StatCard icon={<TrendingUp size={16} />} label="User mới tuần" value={stats.newUsersThisWeek} color="#a78bfa" />
        <StatCard icon={<FileText size={16} />} label="Tổng tài liệu" value={stats.totalDocuments} color="#fbbf24" />
      </div>

      {stats.planDistribution && (
        <div className="bg-surface border border-line rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3">Phân bổ gói dịch vụ</h3>
          <div className="space-y-2">
            {stats.planDistribution.map(p => (
              <div key={p.plan} className="flex items-center gap-3">
                <span className="w-20 text-xs font-medium">{p.plan || 'free'}</span>
                <div className="flex-1 h-3 bg-surface-2 rounded-full overflow-hidden">
                  <div className="h-full bg-primary-500 rounded-full" style={{ width: `${stats.totalUsers > 0 ? (p.count / stats.totalUsers) * 100 : 0}%` }} />
                </div>
                <span className="text-xs text-muted w-10 text-right">{p.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.registrationTrend && stats.registrationTrend.length > 0 && (
        <div className="bg-surface border border-line rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3">Đăng ký 7 ngày qua</h3>
          <div className="flex items-end gap-2 h-32">
            {stats.registrationTrend.map((d, i) => {
              const max = Math.max(1, ...stats.registrationTrend.map(x => x.count || 0));
              const height = ((d.count || 0) / max) * 100;
              const dateStr = d.date || d.day || '';
              return (
                <div key={dateStr || i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-muted">{d.count || 0}</span>
                  <div className="w-full bg-primary-500/20 rounded-t-lg relative" style={{ height: `${Math.max(4, height)}%` }}>
                    <div className="absolute inset-0 bg-primary-500 rounded-t-lg" style={{ height: `${height}%` }} />
                  </div>
                  <span className="text-[9px] text-muted">{dateStr.slice(5)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {stats.topUsers && stats.topUsers.length > 0 && (
        <div className="bg-surface border border-line rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3">Top users (theo tài liệu)</h3>
          <div className="space-y-2">
            {stats.topUsers.map((u, i) => (
              <div key={u.id} className="flex items-center gap-3 text-sm">
                <span className="w-6 text-center font-bold text-muted">{i + 1}</span>
                <span className="flex-1 truncate">{u.display_name || u.username}</span>
                <span className="text-primary-400 font-medium">{u.doc_count} tài liệu</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Admin Documents Panel ─────────────────────────────
function AdminDocsPanel({ showToast, askConfirm }) {
  const [docs, setDocs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const data = await adminGetDocuments({ page, limit: 20, search, filter });
      setDocs(data.documents || []);
      setTotal(data.total || 0);
    } catch { showToast('error', 'Lỗi tải tài liệu'); }
    setLoading(false);
  };

  useEffect(() => { fetchDocs(); }, [page, filter]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchDocs();
  };

  const handleDelete = (docId, title) => {
    askConfirm('Xóa tài liệu', `Bạn có chắc muốn xóa "${title}"?`, 'danger', async () => {
      try {
        await adminDeleteDocument(docId);
        showToast('success', 'Đã xóa tài liệu');
        fetchDocs();
      } catch { showToast('error', 'Lỗi xóa tài liệu'); }
    });
  };

  const handleTogglePublic = async (docId) => {
    try {
      const result = await adminToggleDocPublic(docId);
      setDocs(prev => prev.map(d => d.id === docId ? { ...d, is_public: result.is_public } : d));
      showToast('success', result.is_public ? 'Đã công khai' : 'Đã ẩn');
    } catch { showToast('error', 'Lỗi cập nhật'); }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm tài liệu..."
            className="w-full bg-surface border border-line rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-primary-500/50"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => { setFilter(e.target.value); setPage(1); }}
          className="bg-surface border border-line rounded-xl px-3 py-2 text-sm focus:outline-none cursor-pointer"
        >
          <option value="all">Tất cả</option>
          <option value="public">Công khai</option>
          <option value="private">Riêng tư</option>
        </select>
      </form>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-primary-400" /></div>
      ) : (
        <div className="bg-surface border border-line rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-muted text-xs uppercase tracking-wider">
                <th className="text-left py-3 px-4">Tài liệu</th>
                <th className="text-left py-3 px-4 hidden sm:table-cell">Tác giả</th>
                <th className="text-center py-3 px-4">Trạng thái</th>
                <th className="text-left py-3 px-4">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {docs.map(d => (
                <tr key={d.id} className="border-b border-line last:border-b-0 hover:bg-surface-2/50">
                  <td className="py-3 px-4">
                    <p className="font-medium text-sm truncate max-w-xs">{d.original_name || d.title || 'Không rõ'}</p>
                    <p className="text-[11px] text-muted">{new Date(d.created_at).toLocaleDateString('vi-VN')}</p>
                  </td>
                  <td className="py-3 px-4 hidden sm:table-cell text-muted text-xs">{d.username || '?'}</td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleTogglePublic(d.id)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${d.is_public ? 'bg-emerald-500/10 text-emerald-400' : 'bg-surface-2 text-muted'}`}
                    >
                      {d.is_public ? <><Eye size={11} /> Công khai</> : <><EyeOff size={11} /> Riêng tư</>}
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => handleDelete(d.id, d.original_name || d.title)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs transition-colors"
                    >
                      <Trash2 size={11} /> Xóa
                    </button>
                  </td>
                </tr>
              ))}
              {docs.length === 0 && (
                <tr><td colSpan={4} className="text-center py-8 text-muted">Không tìm thấy tài liệu</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="p-1.5 rounded-lg bg-surface hover:bg-surface-2 disabled:opacity-40 transition-colors"><ChevronLeft size={16} /></button>
          <span className="text-sm text-muted">Trang {page}/{totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-1.5 rounded-lg bg-surface hover:bg-surface-2 disabled:opacity-40 transition-colors"><ChevronRight size={16} /></button>
        </div>
      )}
    </div>
  );
}

// ── Admin Announcements Panel ─────────────────────────
function AdminAnnouncementsPanel({ showToast, askConfirm }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | 'new' | announcementObj
  const [form, setForm] = useState({ title: '', content: '', type: 'info', is_active: 1, expires_at: '' });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const data = await getAnnouncements();
      setAnnouncements(data || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const startNew = () => {
    setForm({ title: '', content: '', type: 'info', is_active: 1, expires_at: '' });
    setEditing('new');
  };

  const startEdit = (a) => {
    setForm({ title: a.title, content: a.content || '', type: a.type || 'info', is_active: a.is_active, expires_at: a.expires_at || '' });
    setEditing(a);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    try {
      if (editing === 'new') {
        const a = await createAnnouncement(form);
        setAnnouncements(prev => [a, ...prev]);
        showToast('success', 'Đã tạo thông báo');
      } else {
        const a = await updateAnnouncement(editing.id, form);
        setAnnouncements(prev => prev.map(x => x.id === editing.id ? a : x));
        showToast('success', 'Đã cập nhật');
      }
      setEditing(null);
    } catch { showToast('error', 'Lỗi lưu thông báo'); }
  };

  const handleDelete = (id) => {
    askConfirm('Xóa thông báo', 'Bạn có chắc muốn xóa thông báo này?', 'danger', async () => {
      try {
        await deleteAnnouncement(id);
        setAnnouncements(prev => prev.filter(a => a.id !== id));
        showToast('success', 'Đã xóa');
      } catch { showToast('error', 'Lỗi xóa'); }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Megaphone size={14} className="text-primary-400" /> Quản lý thông báo</h3>
        <button onClick={startNew} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 rounded-lg text-xs font-medium transition-colors">
          <Plus size={12} /> Tạo mới
        </button>
      </div>

      {editing && (
        <div className="bg-surface border border-primary-500/30 rounded-xl p-4 space-y-3">
          <input
            value={form.title}
            onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))}
            placeholder="Tiêu đề thông báo..."
            className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500/50"
          />
          <textarea
            value={form.content}
            onChange={(e) => setForm(p => ({ ...p, content: e.target.value }))}
            placeholder="Nội dung (tùy chọn)..."
            rows={2}
            className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-primary-500/50"
          />
          <div className="flex flex-wrap gap-2">
            <select
              value={form.type}
              onChange={(e) => setForm(p => ({ ...p, type: e.target.value }))}
              className="bg-bg border border-line rounded-lg px-2 py-1.5 text-xs focus:outline-none cursor-pointer"
            >
              <option value="info">Thông tin</option>
              <option value="warning">Cảnh báo</option>
              <option value="update">Cập nhật</option>
              <option value="important">Quan trọng</option>
            </select>
            <label className="flex items-center gap-1.5 text-xs">
              <input type="checkbox" checked={!!form.is_active} onChange={(e) => setForm(p => ({ ...p, is_active: e.target.checked ? 1 : 0 }))} />
              Đang hoạt động
            </label>
            <input
              type="datetime-local"
              value={form.expires_at}
              onChange={(e) => setForm(p => ({ ...p, expires_at: e.target.value }))}
              className="bg-bg border border-line rounded-lg px-2 py-1.5 text-xs focus:outline-none"
              title="Hết hạn (tùy chọn)"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="flex items-center gap-1 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 rounded-lg text-xs font-medium transition-colors">
              <Save size={12} /> Lưu
            </button>
            <button onClick={() => setEditing(null)} className="px-3 py-1.5 bg-surface-2 hover:bg-line rounded-lg text-xs transition-colors">
              Hủy
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-primary-400" /></div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-8 text-muted">
          <Megaphone size={28} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">Chưa có thông báo nào</p>
        </div>
      ) : (
        <div className="space-y-2">
          {announcements.map(a => (
            <div key={a.id} className="bg-surface border border-line rounded-xl p-4 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm">{a.title}</p>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${a.is_active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-surface-2 text-muted'}`}>
                    {a.is_active ? 'Đang hiển thị' : 'Đã ẩn'}
                  </span>
                  <span className="px-1.5 py-0.5 bg-surface-2 rounded text-[10px] text-muted font-medium">{a.type}</span>
                </div>
                {a.content && <p className="text-xs text-muted mt-1 line-clamp-2">{a.content}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => startEdit(a)} className="p-1.5 rounded-lg hover:bg-surface-2 text-muted hover:text-txt transition-colors"><Edit3 size={13} /></button>
                <button onClick={() => handleDelete(a.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Admin Audit Log Panel ─────────────────────────────
function AdminAuditPanel() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await adminGetAuditLogs(page, 30);
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const totalPages = Math.ceil(total / 30);

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-primary-400" /></div>
      ) : logs.length === 0 ? (
        <div className="text-center py-8 text-muted">
          <ScrollText size={28} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">Chưa có nhật ký hoạt động</p>
        </div>
      ) : (
        <div className="bg-surface border border-line rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-muted text-xs uppercase tracking-wider">
                <th className="text-left py-3 px-4">Thời gian</th>
                <th className="text-left py-3 px-4">Admin</th>
                <th className="text-left py-3 px-4">Hành động</th>
                <th className="text-left py-3 px-4 hidden sm:table-cell">Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="border-b border-line last:border-b-0 hover:bg-surface-2/50">
                  <td className="py-2.5 px-4 text-xs text-muted whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-2.5 px-4 text-xs font-medium">{log.admin_username || 'System'}</td>
                  <td className="py-2.5 px-4">
                    <span className="px-2 py-0.5 bg-primary-500/10 text-primary-400 rounded text-[11px] font-medium">{log.action}</span>
                  </td>
                  <td className="py-2.5 px-4 text-xs text-muted hidden sm:table-cell truncate max-w-xs">
                    {log.target_type && `[${log.target_type}] `}{log.details || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="p-1.5 rounded-lg bg-surface hover:bg-surface-2 disabled:opacity-40 transition-colors"><ChevronLeft size={16} /></button>
          <span className="text-sm text-muted">Trang {page}/{totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-1.5 rounded-lg bg-surface hover:bg-surface-2 disabled:opacity-40 transition-colors"><ChevronRight size={16} /></button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// 1. REAL-TIME DASHBOARD
// ═══════════════════════════════════════════════════════

function RealtimeDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const d = await adminGetRealtime();
      setData(d);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-primary-400" /></div>;
  if (!data) return <div className="text-center py-8 text-muted">Không thể tải dữ liệu</div>;

  const uptimeStr = data.uptime ? `${Math.floor(data.uptime / 3600000)}h ${Math.floor((data.uptime % 3600000) / 60000)}m` : '—';
  const sparkMax = Math.max(1, ...(data.sparkline || []));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-2 text-xs text-muted">
        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
        Tự động cập nhật mỗi 10 giây · Uptime: {uptimeStr}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={<Users size={16} />} label="Users hôm nay" value={data.activeUsersToday} color="#60a5fa" />
        <StatCard icon={<TrendingUp size={16} />} label="Uploads/giờ" value={data.uploadsLastHour} color="#34d399" />
        <StatCard icon={<Brain size={16} />} label="AI calls/giờ" value={data.aiCallsLastHour} color="#a78bfa" />
        <StatCard icon={<AlertOctagon size={16} />} label="AI errors/giờ" value={data.aiErrorsLastHour} color="#f87171" />
        <StatCard icon={<Zap size={16} />} label="Chat msgs/giờ" value={data.chatMsgsLastHour} color="#fbbf24" />
      </div>

      {/* Sparkline — AI calls last 12 hours */}
      {data.sparkline?.length > 0 && (
        <div className="bg-surface border border-line rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Activity size={14} className="text-primary-400" /> AI Calls - 12 giờ qua</h3>
          <div className="flex items-end gap-1 h-20">
            {data.sparkline.map((v, i) => {
              const h = Math.max(4, (v / sparkMax) * 100);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${v} calls`}>
                  <div className="w-full bg-primary-500/60 rounded-t transition-all" style={{ height: `${h}%` }} />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[9px] text-muted mt-1">
            <span>-12h</span>
            <span>-6h</span>
            <span>Now</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// 3. USER DETAIL DRAWER
// ═══════════════════════════════════════════════════════

function UserDetailDrawer({ userId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminGetUserDetail(userId).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [userId]);

  return (
    <div className="fixed inset-0 z-[100] flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative w-full max-w-lg bg-bg border-l border-line h-full overflow-y-auto animate-slide-in-right" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-bg/80 backdrop-blur-md border-b border-line px-5 py-4 flex items-center justify-between z-10">
          <h2 className="font-bold flex items-center gap-2"><Users size={16} className="text-primary-400" /> Chi tiết User</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-2"><X size={16} /></button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-primary-400" /></div>
        ) : !data ? (
          <div className="text-center py-12 text-muted">Không tìm thấy dữ liệu</div>
        ) : (
          <div className="p-5 space-y-6">
            {/* User info */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-xl font-bold text-white">
                {(data.user.display_name || data.user.username || '?').charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-lg">{data.user.display_name || data.user.username}</p>
                <p className="text-xs text-muted">@{data.user.username} · {data.user.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-primary-600/15 text-primary-400">{data.user.plan}</span>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-surface-2 text-muted">{data.user.role}</span>
                  {data.user.is_banned && <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-red-500/15 text-red-400">BANNED</span>}
                </div>
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-surface border border-line rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-primary-400">{data.totalDocs}</p>
                <p className="text-[10px] text-muted">Tài liệu</p>
              </div>
              <div className="bg-surface border border-line rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-emerald-400">{data.streak?.current_streak || 0}</p>
                <p className="text-[10px] text-muted">Streak</p>
              </div>
              <div className="bg-surface border border-line rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-purple-400">{data.aiUsage?.count || 0}</p>
                <p className="text-[10px] text-muted">AI Calls</p>
              </div>
            </div>

            {/* Account info */}
            <div className="bg-surface border border-line rounded-xl p-4 space-y-2">
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Thông tin</h3>
              <div className="flex justify-between text-xs"><span className="text-muted">Đăng ký</span><span>{new Date(data.user.created_at).toLocaleDateString('vi-VN')}</span></div>
              <div className="flex justify-between text-xs"><span className="text-muted">Email verified</span><span>{data.user.email_verified ? '✓' : '✗'}</span></div>
              <div className="flex justify-between text-xs"><span className="text-muted">AI Tokens used</span><span>{(data.aiUsage?.tokens || 0).toLocaleString()}</span></div>
              {data.user.plan_expires_at && <div className="flex justify-between text-xs"><span className="text-muted">Plan hết hạn</span><span>{new Date(data.user.plan_expires_at).toLocaleDateString('vi-VN')}</span></div>}
            </div>

            {/* Recent Documents */}
            {data.documents?.length > 0 && (
              <div className="bg-surface border border-line rounded-xl p-4">
                <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Tài liệu gần đây ({data.documents.length})</h3>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {data.documents.slice(0, 10).map(d => (
                    <div key={d.id} className="flex items-center justify-between text-xs">
                      <span className="truncate flex-1 mr-2">{d.original_name || 'Untitled'}</span>
                      <span className="text-muted shrink-0">{new Date(d.created_at).toLocaleDateString('vi-VN')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Login History */}
            {data.loginHistory?.length > 0 && (
              <div className="bg-surface border border-line rounded-xl p-4">
                <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Lịch sử đăng nhập</h3>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {data.loginHistory.map((l, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="font-mono text-muted">{l.ip_address || '?'}</span>
                      <span className="text-muted">{new Date(l.created_at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Activity timeline */}
            {data.recentActivity?.length > 0 && (
              <div className="bg-surface border border-line rounded-xl p-4">
                <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Hoạt động gần đây</h3>
                <div className="flex items-end gap-1 h-16">
                  {data.recentActivity.slice(0, 14).reverse().map((a, i) => {
                    const total = (a.flashcards_reviewed || 0) + (a.quizzes_completed || 0) + (a.documents_uploaded || 0) + (a.chat_messages || 0);
                    const max = Math.max(1, ...data.recentActivity.map(x => (x.flashcards_reviewed || 0) + (x.quizzes_completed || 0) + (x.documents_uploaded || 0) + (x.chat_messages || 0)));
                    return <div key={i} className="flex-1 bg-primary-500/60 rounded-t" style={{ height: `${Math.max(4, (total / max) * 100)}%` }} title={`${a.activity_date}: ${total}`} />;
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// 4. AI USAGE MONITORING
// ═══════════════════════════════════════════════════════

function AiUsagePanel() {
  const [data, setData] = useState(null);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    adminGetAiUsage(days).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [days]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-primary-400" /></div>;
  if (!data) return <div className="text-center py-8 text-muted">Không thể tải dữ liệu</div>;

  const dailyMax = Math.max(1, ...(data.daily || []).map(d => d.calls || 0));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Brain size={14} className="text-primary-400" /> AI Usage Monitoring</h3>
        <div className="flex gap-1 bg-surface p-1 rounded-xl">
          {[7, 14, 30].map(d => (
            <button key={d} onClick={() => setDays(d)} className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${days === d ? 'bg-primary-600 text-white' : 'text-muted hover:text-txt'}`}>{d}d</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Zap size={16} />} label="Tổng calls" value={data.totalCalls} color="#a78bfa" />
        <StatCard icon={<Database size={16} />} label="Tổng tokens" value={(data.totalTokens || 0).toLocaleString()} color="#60a5fa" />
        <StatCard icon={<Clock size={16} />} label="Avg latency" value={`${data.avgLatency}ms`} color="#34d399" />
        <StatCard icon={<AlertOctagon size={16} />} label="Errors" value={data.errorRate} color="#f87171" />
      </div>

      {/* Daily chart */}
      {data.daily?.length > 0 && (
        <div className="bg-surface border border-line rounded-xl p-4">
          <h4 className="text-xs font-semibold mb-3">Calls theo ngày</h4>
          <div className="flex items-end gap-1 h-24">
            {data.daily.map(d => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] text-muted">{d.calls}</span>
                <div className="w-full bg-primary-500/60 rounded-t" style={{ height: `${Math.max(4, (d.calls / dailyMax) * 100)}%` }} />
                <span className="text-[8px] text-muted">{(d.date || '').slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* By action */}
      {data.byAction?.length > 0 && (
        <div className="bg-surface border border-line rounded-xl p-4">
          <h4 className="text-xs font-semibold mb-3">Theo hành động</h4>
          <div className="space-y-2">
            {data.byAction.map(a => (
              <div key={a.action} className="flex items-center gap-3 text-xs">
                <span className="w-28 font-medium truncate">{a.action}</span>
                <div className="flex-1 h-2.5 bg-surface-2 rounded-full overflow-hidden">
                  <div className="h-full bg-primary-500/70 rounded-full" style={{ width: `${data.totalCalls > 0 ? (a.count / data.totalCalls) * 100 : 0}%` }} />
                </div>
                <span className="text-muted w-12 text-right">{a.count}</span>
                <span className="text-muted w-16 text-right">{Math.round(a.avg_latency || 0)}ms</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top users */}
      {data.topUsers?.length > 0 && (
        <div className="bg-surface border border-line rounded-xl p-4">
          <h4 className="text-xs font-semibold mb-3">Top Users (AI calls)</h4>
          <div className="space-y-2">
            {data.topUsers.map((u, i) => (
              <div key={u.id} className="flex items-center gap-3 text-xs">
                <span className="w-5 text-center font-bold text-muted">{i + 1}</span>
                <span className="flex-1 truncate">{u.display_name || u.username}</span>
                <span className="text-primary-400 font-medium">{u.calls} calls</span>
                <span className="text-muted">{(u.tokens || 0).toLocaleString()} tokens</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// 5. CONTENT MODERATION
// ═══════════════════════════════════════════════════════

function ModerationPanel({ showToast, askConfirm }) {
  const [reports, setReports] = useState([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await adminGetReports(statusFilter, page);
      setReports(data.reports || []);
      setTotal(data.total || 0);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchReports(); }, [statusFilter, page]);

  const handleReview = (reportId, status, label) => {
    askConfirm('Xem xét báo cáo', `Đánh dấu báo cáo là "${label}"?`, status === 'approved' ? 'danger' : 'info', async () => {
      try {
        await adminReviewReport(reportId, status);
        showToast('success', `Đã ${label}`);
        fetchReports();
      } catch { showToast('error', 'Lỗi xử lý'); }
    });
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Flag size={14} className="text-primary-400" /> Kiểm duyệt nội dung</h3>
        <div className="flex gap-1 bg-surface p-1 rounded-xl">
          {['pending', 'approved', 'rejected'].map(s => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }} className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${statusFilter === s ? 'bg-primary-600 text-white' : 'text-muted hover:text-txt'}`}>
              {s === 'pending' ? 'Chờ duyệt' : s === 'approved' ? 'Đã duyệt' : 'Từ chối'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-primary-400" /></div>
      ) : reports.length === 0 ? (
        <div className="bg-surface border border-line rounded-xl p-12 text-center text-muted">
          <Flag size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">Không có báo cáo nào</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(r => (
            <div key={r.id} className="bg-surface border border-line rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded text-[10px] font-bold">{r.target_type}</span>
                    <span className="text-xs text-muted">bởi {r.reporter_name || r.reporter_username}</span>
                    <span className="text-[10px] text-muted">{new Date(r.created_at).toLocaleDateString('vi-VN')}</span>
                  </div>
                  <p className="text-sm font-medium mb-1">Lý do: {r.reason}</p>
                  {r.details && <p className="text-xs text-muted">{r.details}</p>}
                  <p className="text-[10px] text-muted mt-1">Target ID: {r.target_id}</p>
                </div>
                {r.status === 'pending' && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => handleReview(r.id, 'approved', 'Chấp nhận & xóa nội dung')} className="px-2.5 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg text-xs transition-colors">Chấp nhận</button>
                    <button onClick={() => handleReview(r.id, 'rejected', 'Từ chối')} className="px-2.5 py-1.5 bg-surface-2 text-muted hover:text-txt rounded-lg text-xs transition-colors">Từ chối</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="p-1.5 rounded-lg bg-surface hover:bg-surface-2 disabled:opacity-40"><ChevronLeft size={16} /></button>
          <span className="text-sm text-muted">{page}/{totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-1.5 rounded-lg bg-surface hover:bg-surface-2 disabled:opacity-40"><ChevronRight size={16} /></button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// 6. SYSTEM HEALTH PANEL
// ═══════════════════════════════════════════════════════

function SystemHealthPanel() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    try { setHealth(await adminGetSystemHealth()); } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchHealth(); const i = setInterval(fetchHealth, 15000); return () => clearInterval(i); }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-primary-400" /></div>;
  if (!health) return <div className="text-center py-8 text-muted">Không thể tải</div>;

  const fmt = (bytes) => bytes > 1073741824 ? `${(bytes / 1073741824).toFixed(1)} GB` : `${(bytes / 1048576).toFixed(1)} MB`;
  const memPct = Math.round((1 - (health.system?.freeMem || 0) / (health.system?.totalMem || 1)) * 100);
  const uptimeStr = `${Math.floor((health.uptime || 0) / 3600)}h ${Math.floor(((health.uptime || 0) % 3600) / 60)}m`;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-2 text-xs text-muted">
        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" /> Cập nhật mỗi 15s
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Clock size={16} />} label="Uptime" value={uptimeStr} color="#34d399" />
        <StatCard icon={<Cpu size={16} />} label="CPU cores" value={health.system?.cpuCount} color="#60a5fa" />
        <StatCard icon={<HardDrive size={16} />} label="RAM used" value={`${memPct}%`} color={memPct > 85 ? '#f87171' : '#a78bfa'} />
        <StatCard icon={<Database size={16} />} label="DB size" value={fmt(health.storage?.dbSize || 0)} color="#fbbf24" />
      </div>

      {/* Memory breakdown */}
      <div className="bg-surface border border-line rounded-xl p-4">
        <h4 className="text-xs font-semibold mb-3">Memory</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div><span className="text-muted">RSS</span><p className="font-medium">{fmt(health.memory?.rss || 0)}</p></div>
          <div><span className="text-muted">Heap Used</span><p className="font-medium">{fmt(health.memory?.heapUsed || 0)}</p></div>
          <div><span className="text-muted">Heap Total</span><p className="font-medium">{fmt(health.memory?.heapTotal || 0)}</p></div>
          <div><span className="text-muted">System Free</span><p className="font-medium">{fmt(health.system?.freeMem || 0)}</p></div>
        </div>
        <div className="mt-3 h-3 bg-surface-2 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${memPct > 85 ? 'bg-red-500' : memPct > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${memPct}%` }} />
        </div>
        <p className="text-[10px] text-muted mt-1">{fmt((health.system?.totalMem || 0) - (health.system?.freeMem || 0))} / {fmt(health.system?.totalMem || 0)}</p>
      </div>

      {/* System info */}
      <div className="bg-surface border border-line rounded-xl p-4">
        <h4 className="text-xs font-semibold mb-3">System Info</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between"><span className="text-muted">Platform</span><span>{health.system?.platform}</span></div>
          <div className="flex justify-between"><span className="text-muted">Node.js</span><span>{health.system?.nodeVersion}</span></div>
          <div className="flex justify-between"><span className="text-muted">CPU</span><span className="truncate ml-2">{health.system?.cpuModel}</span></div>
          <div className="flex justify-between"><span className="text-muted">Uploads</span><span>{fmt(health.storage?.uploadsSize || 0)}</span></div>
          <div className="flex justify-between"><span className="text-muted">Load avg</span><span>{(health.system?.loadAvg || []).map(l => l.toFixed(2)).join(' / ')}</span></div>
        </div>
      </div>

      {/* API errors */}
      <div className="bg-surface border border-line rounded-xl p-4">
        <h4 className="text-xs font-semibold mb-3">API Health (24h)</h4>
        <div className="grid grid-cols-3 gap-4 text-xs mb-3">
          <div><span className="text-muted">Total calls</span><p className="font-medium">{health.errors?.totalCalls24h}</p></div>
          <div><span className="text-muted">Errors</span><p className="font-medium text-red-400">{health.errors?.totalErrors24h}</p></div>
          <div><span className="text-muted">Avg response</span><p className="font-medium">{health.errors?.avgResponseTime}ms</p></div>
        </div>
        {health.errors?.recentErrors?.length > 0 && (
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {health.errors.recentErrors.map((e, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="text-red-400 shrink-0">✗</span>
                <span className="text-muted shrink-0">{e.action}</span>
                <span className="truncate text-muted/70">{e.error_message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// 7. EMAIL BLAST
// ═══════════════════════════════════════════════════════

function EmailBlastPanel({ showToast }) {
  const [blasts, setBlasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ subject: '', content: '', targetFilter: 'all' });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    adminGetEmailBlasts().then(d => setBlasts(d.blasts || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSend = async () => {
    if (!form.subject.trim() || !form.content.trim()) return;
    setSending(true);
    try {
      const result = await adminSendEmailBlast(form.subject, form.content, form.targetFilter);
      showToast('success', `Đang gửi đến ${result.totalRecipients} người`);
      setShowForm(false);
      setForm({ subject: '', content: '', targetFilter: 'all' });
      setTimeout(() => adminGetEmailBlasts().then(d => setBlasts(d.blasts || [])).catch(() => {}), 2000);
    } catch { showToast('error', 'Lỗi gửi email'); }
    setSending(false);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Mail size={14} className="text-primary-400" /> Email Blast</h3>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 rounded-lg text-xs font-medium transition-colors">
          <Send size={12} /> Tạo email mới
        </button>
      </div>

      {showForm && (
        <div className="bg-surface border border-primary-500/30 rounded-xl p-4 space-y-3">
          <input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="Tiêu đề email..." className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500/50" />
          <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} placeholder="Nội dung email..." rows={4} className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-primary-500/50" />
          <div className="flex items-center gap-3">
            <select value={form.targetFilter} onChange={e => setForm(p => ({ ...p, targetFilter: e.target.value }))} className="bg-bg border border-line rounded-lg px-2 py-1.5 text-xs cursor-pointer">
              <option value="all">Tất cả users</option>
              <option value="active">Hoạt động (7 ngày)</option>
              <option value="inactive">Không hoạt động (30 ngày)</option>
              <option value="plan:free">Free users</option>
              <option value="plan:basic">Basic users</option>
              <option value="plan:pro">Pro users</option>
              <option value="plan:unlimited">Unlimited users</option>
            </select>
            <button onClick={handleSend} disabled={sending} className="flex items-center gap-1 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 rounded-lg text-xs font-medium transition-colors disabled:opacity-50">
              {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Gửi
            </button>
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 bg-surface-2 rounded-lg text-xs hover:bg-line transition-colors">Hủy</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-primary-400" /></div>
      ) : blasts.length === 0 ? (
        <div className="bg-surface border border-line rounded-xl p-12 text-center text-muted">
          <Mail size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">Chưa gửi email nào</p>
        </div>
      ) : (
        <div className="space-y-2">
          {blasts.map(b => (
            <div key={b.id} className="bg-surface border border-line rounded-xl p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{b.subject}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted">
                  <span>{b.sender_name || b.sender_username}</span>
                  <span>·</span>
                  <span>{new Date(b.created_at).toLocaleDateString('vi-VN')}</span>
                  <span>·</span>
                  <span>Target: {b.target_filter}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${b.status === 'completed' ? 'bg-emerald-500/15 text-emerald-400' : b.status === 'sending' ? 'bg-amber-500/15 text-amber-400' : 'bg-surface-2 text-muted'}`}>
                  {b.status}
                </span>
                <p className="text-xs text-muted mt-1">{b.sent_count}/{b.total_recipients} sent</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// 8. FEATURE FLAGS
// ═══════════════════════════════════════════════════════

function FeatureFlagsPanel({ showToast, askConfirm }) {
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', enabled: true, plans: ['free', 'basic', 'pro', 'unlimited'] });

  const ALL_PLANS = ['free', 'basic', 'pro', 'unlimited'];

  useEffect(() => {
    adminGetFeatureFlags().then(d => setFlags(d.flags || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const startNew = () => { setForm({ name: '', description: '', enabled: true, plans: [...ALL_PLANS] }); setEditing('new'); };
  const startEdit = (f) => {
    let plans = ALL_PLANS;
    try { plans = JSON.parse(f.plans); } catch {}
    setForm({ name: f.name, description: f.description || '', enabled: !!f.enabled, plans });
    setEditing(f);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    try {
      if (editing === 'new') {
        const d = await adminCreateFeatureFlag(form);
        setFlags(prev => [...prev, d.flag]);
        showToast('success', 'Đã tạo feature flag');
      } else {
        const d = await adminUpdateFeatureFlag(editing.id, form);
        setFlags(prev => prev.map(f => f.id === editing.id ? d.flag : f));
        showToast('success', 'Đã cập nhật');
      }
      setEditing(null);
    } catch { showToast('error', 'Lỗi'); }
  };

  const handleToggle = async (flag) => {
    try {
      const d = await adminUpdateFeatureFlag(flag.id, { enabled: !flag.enabled });
      setFlags(prev => prev.map(f => f.id === flag.id ? d.flag : f));
    } catch { showToast('error', 'Lỗi cập nhật'); }
  };

  const handleDelete = (id) => {
    askConfirm('Xóa Feature Flag', 'Bạn có chắc?', 'danger', async () => {
      try {
        await adminDeleteFeatureFlag(id);
        setFlags(prev => prev.filter(f => f.id !== id));
        showToast('success', 'Đã xóa');
      } catch { showToast('error', 'Lỗi'); }
    });
  };

  const togglePlan = (plan) => {
    setForm(p => ({
      ...p,
      plans: p.plans.includes(plan) ? p.plans.filter(pp => pp !== plan) : [...p.plans, plan]
    }));
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2"><ToggleLeft size={14} className="text-primary-400" /> Feature Flags</h3>
        <button onClick={startNew} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 rounded-lg text-xs font-medium transition-colors">
          <Plus size={12} /> Thêm mới
        </button>
      </div>

      {editing && (
        <div className="bg-surface border border-primary-500/30 rounded-xl p-4 space-y-3">
          <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Tên feature (vd: community_likes)..." className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500/50 font-mono" />
          <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Mô tả..." className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500/50" />
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-1.5 text-xs">
              <input type="checkbox" checked={form.enabled} onChange={e => setForm(p => ({ ...p, enabled: e.target.checked }))} /> Bật
            </label>
            <span className="text-xs text-muted">Plans:</span>
            {ALL_PLANS.map(p => (
              <label key={p} className="flex items-center gap-1 text-xs">
                <input type="checkbox" checked={form.plans.includes(p)} onChange={() => togglePlan(p)} /> {p}
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="flex items-center gap-1 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 rounded-lg text-xs font-medium"><Save size={12} /> Lưu</button>
            <button onClick={() => setEditing(null)} className="px-3 py-1.5 bg-surface-2 rounded-lg text-xs hover:bg-line">Hủy</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-primary-400" /></div>
      ) : flags.length === 0 ? (
        <div className="bg-surface border border-line rounded-xl p-12 text-center text-muted">
          <ToggleLeft size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">Chưa có feature flag nào</p>
        </div>
      ) : (
        <div className="space-y-2">
          {flags.map(f => {
            let plans = [];
            try { plans = JSON.parse(f.plans); } catch {}
            return (
              <div key={f.id} className="bg-surface border border-line rounded-xl p-4 flex items-center gap-4">
                <button onClick={() => handleToggle(f)} className="shrink-0">
                  {f.enabled ? <ToggleRight size={28} className="text-emerald-400" /> : <ToggleLeft size={28} className="text-muted" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm font-mono">{f.name}</p>
                  {f.description && <p className="text-xs text-muted mt-0.5">{f.description}</p>}
                  <div className="flex items-center gap-1 mt-1">
                    {plans.map(p => <span key={p} className="px-1.5 py-0.5 bg-surface-2 rounded text-[9px] text-muted">{p}</span>)}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => startEdit(f)} className="p-1.5 rounded-lg hover:bg-surface-2 text-muted hover:text-txt"><Edit3 size={13} /></button>
                  <button onClick={() => handleDelete(f.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted hover:text-red-400"><Trash2 size={13} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// 9. EXPORT DATA (CSV)
// ═══════════════════════════════════════════════════════

function ExportDataPanel({ showToast }) {
  const [exporting, setExporting] = useState('');

  const downloadCSV = (csv, filename) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = async (type) => {
    setExporting(type);
    try {
      let data;
      if (type === 'users') data = await adminExportUsers();
      else if (type === 'documents') data = await adminExportDocuments();
      else data = await adminExportActivity();
      downloadCSV(data.csv, data.filename);
      showToast('success', `Đã xuất ${data.count} bản ghi`);
    } catch { showToast('error', 'Lỗi xuất dữ liệu'); }
    setExporting('');
  };

  const exports = [
    { type: 'users', label: 'Danh sách Users', desc: 'Username, email, plan, role, trạng thái', icon: Users, color: '#60a5fa' },
    { type: 'documents', label: 'Danh sách Tài liệu', desc: 'ID, tiêu đề, trạng thái, tác giả', icon: FileText, color: '#34d399' },
    { type: 'activity', label: 'Hoạt động Users', desc: 'Flashcards, quiz, uploads theo ngày', icon: Activity, color: '#a78bfa' },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <h3 className="text-sm font-semibold flex items-center gap-2"><Download size={14} className="text-primary-400" /> Xuất dữ liệu (CSV)</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {exports.map(exp => {
          const Icon = exp.icon;
          const isLoading = exporting === exp.type;
          return (
            <div key={exp.type} className="bg-surface border border-line rounded-xl p-5 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: `${exp.color}15` }}>
                <Icon size={22} style={{ color: exp.color }} />
              </div>
              <p className="font-medium text-sm mb-1">{exp.label}</p>
              <p className="text-xs text-muted mb-4">{exp.desc}</p>
              <button
                onClick={() => handleExport(exp.type)}
                disabled={!!exporting}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
              >
                {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                Xuất CSV
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// 11. LOGIN ACTIVITY
// ═══════════════════════════════════════════════════════

function LoginActivityPanel() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    adminGetLoginActivity(page).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [page]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-primary-400" /></div>;
  if (!data) return <div className="text-center py-8 text-muted">Không thể tải</div>;

  const totalPages = data.totalPages || 1;

  return (
    <div className="space-y-6 animate-fade-in">
      <h3 className="text-sm font-semibold flex items-center gap-2"><MapPin size={14} className="text-primary-400" /> Login Activity</h3>

      {/* IP Summary */}
      {data.ipSummary?.length > 0 && (
        <div className="bg-surface border border-line rounded-xl p-4">
          <h4 className="text-xs font-semibold mb-3">Top IPs</h4>
          <div className="space-y-1.5">
            {data.ipSummary.slice(0, 10).map((ip, i) => (
              <div key={i} className="flex items-center gap-3 text-xs">
                <span className="font-mono text-muted w-32 truncate">{ip.ip_address}</span>
                <div className="flex-1 h-2 bg-surface-2 rounded-full overflow-hidden">
                  <div className="h-full bg-primary-500/60 rounded-full" style={{ width: `${Math.min(100, (ip.count / (data.ipSummary[0]?.count || 1)) * 100)}%` }} />
                </div>
                <span className="text-muted w-8 text-right">{ip.count}</span>
                <span className="text-muted w-10 text-right">{ip.unique_users}u</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Login log table */}
      <div className="bg-surface border border-line rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-muted text-xs uppercase tracking-wider">
              <th className="text-left py-3 px-4">Thời gian</th>
              <th className="text-left py-3 px-4">User</th>
              <th className="text-left py-3 px-4">IP</th>
              <th className="text-left py-3 px-4 hidden md:table-cell">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {(data.logs || []).map((l, i) => (
              <tr key={i} className="border-b border-line last:border-b-0 hover:bg-surface-2/50">
                <td className="py-2.5 px-4 text-xs text-muted whitespace-nowrap">
                  {new Date(l.created_at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="py-2.5 px-4 text-xs font-medium">{l.display_name || l.username}</td>
                <td className="py-2.5 px-4 text-xs font-mono text-muted">{l.ip_address}</td>
                <td className="py-2.5 px-4 hidden md:table-cell">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${l.success ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                    {l.success ? 'OK' : 'FAIL'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="p-1.5 rounded-lg bg-surface hover:bg-surface-2 disabled:opacity-40"><ChevronLeft size={16} /></button>
          <span className="text-sm text-muted">{page}/{totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-1.5 rounded-lg bg-surface hover:bg-surface-2 disabled:opacity-40"><ChevronRight size={16} /></button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// 12. MAINTENANCE MODE
// ═══════════════════════════════════════════════════════

function MaintenanceModePanel({ showToast }) {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState('');
  const [maintenanceActive, setMaintenanceActive] = useState(false);

  useEffect(() => {
    getSystemSettings().then(s => {
      setSettings(s);
      setMaintenanceActive(!!s.maintenance_mode);
      setMaintenanceMsg(s.maintenance_message || 'Hệ thống đang bảo trì. Vui lòng quay lại sau.');
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminUpdateSystemSetting('maintenance_mode', maintenanceActive);
      await adminUpdateSystemSetting('maintenance_message', maintenanceMsg);
      showToast('success', maintenanceActive ? 'Đã bật chế độ bảo trì' : 'Đã tắt chế độ bảo trì');
    } catch { showToast('error', 'Lỗi cập nhật'); }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-primary-400" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <h3 className="text-sm font-semibold flex items-center gap-2"><Wrench size={14} className="text-primary-400" /> Chế độ bảo trì</h3>

      <div className="bg-surface border border-line rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-medium text-sm">Maintenance Mode</p>
            <p className="text-xs text-muted mt-0.5">Khi bật, người dùng sẽ thấy thông báo bảo trì</p>
          </div>
          <button onClick={() => setMaintenanceActive(!maintenanceActive)} className="shrink-0">
            {maintenanceActive ? <ToggleRight size={36} className="text-amber-400" /> : <ToggleLeft size={36} className="text-muted" />}
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted mb-1 block">Thông báo bảo trì</label>
            <textarea
              value={maintenanceMsg}
              onChange={e => setMaintenanceMsg(e.target.value)}
              rows={3}
              className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-primary-500/50"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            Lưu cài đặt
          </button>
        </div>
      </div>

      {/* Preview */}
      {maintenanceActive && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <p className="text-xs font-semibold text-amber-400 mb-1 flex items-center gap-2"><AlertOctagon size={14} /> Preview: Người dùng sẽ thấy</p>
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4 mt-2">
            <div className="flex items-center gap-3">
              <Wrench size={20} className="text-amber-400" />
              <div>
                <p className="text-sm font-medium text-amber-400">Đang bảo trì</p>
                <p className="text-xs text-muted mt-0.5">{maintenanceMsg}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}