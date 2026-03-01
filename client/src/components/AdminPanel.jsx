import { useState, useEffect, useCallback } from 'react';
import {
  Shield, Users, ArrowLeft, Search, Loader2, CheckCircle2, AlertCircle,
  RefreshCw, Ban, ShieldCheck, Globe, Trash2, Plus,
  UserX, UserCheck, Clock, Wifi, BarChart3, FileText, Megaphone,
  ScrollText, Eye, EyeOff, Edit3, Save, X, TrendingUp,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import {
  adminGetUsers, adminSetPlan, adminSetRole, adminGetPlans,
  adminBanUser, adminUnbanUser, adminGetBannedIps, adminBanIp, adminUnbanIp,
  adminGetStats, adminGetDocuments, adminDeleteDocument, adminToggleDocPublic,
  getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement,
  adminGetAuditLogs,
} from '../api';
import ConfirmModal from './ConfirmModal';

const PLAN_STYLES = {
  free:      { badge: '📦', label: 'Free',      color: '#9496a1' },
  basic:     { badge: '⭐', label: 'Basic',     color: '#fbbf24' },
  pro:       { badge: '💎', label: 'Pro',        color: '#818cf8' },
  unlimited: { badge: '👑', label: 'Unlimited',  color: 'var(--color-primary-500)' },
};

export default function AdminPanel({ onBack }) {
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [bannedIps, setBannedIps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null); // { title, message, variant, onConfirm }

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
          <TabBtn active={tab === 'users'} onClick={() => setTab('users')} icon={<Users size={14} />} label={`Users (${totalUsers})`} />
          <TabBtn active={tab === 'ips'} onClick={() => setTab('ips')} icon={<Globe size={14} />} label={`IP (${bannedIps.length})`} />
          <TabBtn active={tab === 'stats'} onClick={() => setTab('stats')} icon={<BarChart3 size={14} />} label="Thống kê" />
          <TabBtn active={tab === 'docs'} onClick={() => setTab('docs')} icon={<FileText size={14} />} label="Tài liệu" />
          <TabBtn active={tab === 'announcements'} onClick={() => setTab('announcements')} icon={<Megaphone size={14} />} label="Thông báo" />
          <TabBtn active={tab === 'audit'} onClick={() => setTab('audit')} icon={<ScrollText size={14} />} label="Nhật ký" />
        </div>

        {tab === 'users' && (
          <>
            <div className="relative mb-4">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                placeholder="Tìm user, email hoặc IP..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-surface border border-line rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary-500/50"
              />
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
                          onSetPlan={handleSetPlan}
                          onSetRole={handleSetRole}
                          onBan={handleBanUser}
                          onUnban={handleUnbanUser}
                          onBanIp={handleBanIp}
                        />
                      ))}
                      {filtered.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center py-8 text-muted">
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

        {tab === 'stats' && <AdminStatsPanel />}
        {tab === 'docs' && <AdminDocsPanel showToast={showToast} askConfirm={askConfirm} />}
        {tab === 'announcements' && <AdminAnnouncementsPanel showToast={showToast} askConfirm={askConfirm} />}
        {tab === 'audit' && <AdminAuditPanel />}
      </div>

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

function UserRow({ user, onSetPlan, onSetRole, onBan, onUnban, onBanIp }) {
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
        <td className="py-3 px-4">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${user.isBanned ? 'bg-red-500/20 text-red-400' : 'bg-primary-600/20 text-primary-400'}`}>
              {(user.displayName || user.username).charAt(0).toUpperCase()}
            </div>
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