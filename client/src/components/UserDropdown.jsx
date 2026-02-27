import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  User, Settings, Shield, LogOut, ChevronDown, Crown, History,
  FileText, Clock, AlertTriangle, X
} from 'lucide-react';
import { getDocumentHistory } from '../api';
import ConfirmModal from './ConfirmModal';

export default function UserDropdown({ user, onLogout, onOpenAdmin, onOpenPricing, onUserUpdate, onOpenDocument, onOpenProfile }) {
  const [open, setOpen] = useState(false);
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
                icon={<Settings size={15} />}
                label="Cài đặt & Hồ sơ"
                onClick={() => { setOpen(false); onOpenProfile?.(); }}
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
