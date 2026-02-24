import { useState, useEffect, useCallback } from 'react';
import {
  Shield, Users, ArrowLeft, Search, Loader2, CheckCircle2, AlertCircle,
  RefreshCw, Ban, ShieldCheck, Globe, Trash2, Plus,
  UserX, UserCheck, Clock, Wifi,
} from 'lucide-react';
import {
  adminGetUsers, adminSetPlan, adminSetRole, adminGetPlans,
  adminBanUser, adminUnbanUser, adminGetBannedIps, adminBanIp, adminUnbanIp,
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
    <div className="min-h-screen bg-[#0f1117]">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 rounded-lg bg-[#1a1d27] hover:bg-[#242736] transition-colors">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-xl font-bold font-display flex items-center gap-2">
                <Shield size={20} className="text-primary-400" /> Bảng điều khiển Admin
              </h1>
              <p className="text-xs text-[#9496a1]">Quản lý người dùng, gói dịch vụ & bảo mật</p>
            </div>
          </div>
          <button onClick={load} disabled={loading} className="p-2 rounded-lg bg-[#1a1d27] hover:bg-[#242736] transition-colors" title="Làm mới">
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
        <div className="flex gap-1 mb-4 bg-[#1a1d27] p-1 rounded-xl w-fit">
          <TabBtn active={tab === 'users'} onClick={() => setTab('users')} icon={<Users size={14} />} label={`Người dùng (${totalUsers})`} />
          <TabBtn active={tab === 'ips'} onClick={() => setTab('ips')} icon={<Globe size={14} />} label={`IP bị chặn (${bannedIps.length})`} />
        </div>

        {tab === 'users' && (
          <>
            <div className="relative mb-4">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9496a1]" />
              <input
                placeholder="Tìm user, email hoặc IP..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#1a1d27] border border-[#2e3144] rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary-500/50"
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 size={28} className="animate-spin text-primary-400" />
              </div>
            ) : (
              <div className="bg-[#1a1d27] border border-[#2e3144] rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#2e3144] text-[#9496a1] text-xs uppercase tracking-wider">
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
                          <td colSpan={5} className="text-center py-8 text-[#9496a1]">
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
    <div className="bg-[#1a1d27] border border-[#2e3144] rounded-xl p-3">
      <div className="flex items-center gap-2 mb-1">
        <span style={{ color }}>{icon}</span>
        <span className="text-xs text-[#9496a1]">{label}</span>
      </div>
      <p className="text-xl font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${active ? 'bg-primary-600 text-white' : 'text-[#9496a1] hover:text-white hover:bg-[#242736]'}`}
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
      <tr className={`border-b border-[#2e3144] last:border-b-0 transition-colors ${user.isBanned ? 'bg-red-500/5' : 'hover:bg-[#242736]/50'}`}>
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
              <p className="text-xs text-[#9496a1] truncate">@{user.username} · {user.email}</p>
            </div>
          </div>
        </td>

        <td className="py-3 px-4">
          <select
            value={user.plan}
            onChange={(e) => onSetPlan(user.id, e.target.value)}
            className="bg-[#0f1117] border border-[#2e3144] rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-primary-500/50 cursor-pointer"
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
            className="bg-[#0f1117] border border-[#2e3144] rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-primary-500/50 cursor-pointer"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </td>

        <td className="py-3 px-4 hidden lg:table-cell">
          <div className="space-y-0.5">
            {user.lastIp && (
              <div className="flex items-center gap-1.5 text-xs text-[#9496a1]">
                <Wifi size={11} />
                <span className="font-mono">{user.lastIp}</span>
                <button
                  onClick={() => onBanIp(user.lastIp, `Liên kết với user @${user.username}`)}
                  className="p-0.5 rounded hover:bg-red-500/20 text-[#9496a1] hover:text-red-400 transition-colors"
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
              <span className="text-xs text-[#555]">Chưa đăng nhập</span>
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
                className="flex-1 bg-[#0f1117] border border-red-500/30 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-red-500/50"
                onKeyDown={(e) => e.key === 'Enter' && confirmBan()}
              />
              <button onClick={confirmBan} className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-xs font-medium transition-colors">
                Xác nhận khóa
              </button>
              <button onClick={() => setShowBanInput(false)} className="px-3 py-1.5 rounded-lg bg-[#242736] hover:bg-[#2e3144] text-xs transition-colors">
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
      <div className="bg-[#1a1d27] border border-[#2e3144] rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Plus size={14} className="text-primary-400" /> Chặn IP mới
        </h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={newIp}
            onChange={(e) => setNewIp(e.target.value)}
            placeholder="Nhập địa chỉ IP (vd: 192.168.1.100)"
            className="flex-1 bg-[#0f1117] border border-[#2e3144] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500/50 font-mono"
          />
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Lý do (tuỳ chọn)"
            className="flex-1 bg-[#0f1117] border border-[#2e3144] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500/50"
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

      <div className="bg-[#1a1d27] border border-[#2e3144] rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 size={24} className="animate-spin text-primary-400" />
          </div>
        ) : bannedIps.length === 0 ? (
          <div className="text-center py-10 text-[#9496a1]">
            <ShieldCheck size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">Chưa có IP nào bị chặn</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2e3144] text-[#9496a1] text-xs uppercase tracking-wider">
                <th className="text-left py-3 px-4">IP</th>
                <th className="text-left py-3 px-4">Lý do</th>
                <th className="text-left py-3 px-4 hidden sm:table-cell">Ngày chặn</th>
                <th className="text-left py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {bannedIps.map((b) => (
                <tr key={b.id} className="border-b border-[#2e3144] last:border-b-0 hover:bg-[#242736]/50">
                  <td className="py-3 px-4 font-mono text-red-400">
                    <div className="flex items-center gap-2">
                      <Globe size={14} /> {b.ip_address}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-[#9496a1]">{b.reason || '—'}</td>
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
