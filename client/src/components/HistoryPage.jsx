import { useState, useEffect } from 'react';
import {
  History, FileText, Clock, CheckCircle2, AlertTriangle, Loader2, Search, Filter
} from 'lucide-react';
import { getDocumentHistory } from '../api';

export default function HistoryPage({ onOpenDocument }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'active' | 'expired'

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

  const filtered = docs.filter(doc => {
    if (filter === 'active' && isExpired(doc)) return false;
    if (filter === 'expired' && !isExpired(doc)) return false;
    if (search) {
      return (doc.original_name || '').toLowerCase().includes(search.toLowerCase());
    }
    return true;
  });

  const activeCount = docs.filter(d => !isExpired(d)).length;
  const expiredCount = docs.filter(d => isExpired(d)).length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-primary-600/15 border border-primary-500/30 rounded-xl flex items-center justify-center">
          <History size={20} className="text-primary-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold font-display">Lịch sử tài liệu</h1>
          <p className="text-xs text-[#9496a1]">
            {docs.length} tài liệu • {activeCount} đang hoạt động • {expiredCount} đã xoá
          </p>
        </div>
      </div>

      {/* Search & filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9496a1]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm tài liệu..."
            className="w-full bg-[#1a1d27] border border-[#2e3144] rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary-500/50 placeholder-[#555]"
          />
        </div>
        <div className="flex gap-1 bg-[#1a1d27] border border-[#2e3144] rounded-xl p-1">
          {[
            { id: 'all', label: 'Tất cả', count: docs.length },
            { id: 'active', label: 'Hoạt động', count: activeCount },
            { id: 'expired', label: 'Đã xoá', count: expiredCount },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === f.id
                  ? 'bg-primary-600 text-white'
                  : 'text-[#9496a1] hover:text-white hover:bg-[#242736]'
              }`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>
      </div>

      {/* Document list */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={28} className="text-primary-400 animate-spin" />
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((doc) => {
            const expired = isExpired(doc);
            const ttl = timeRemaining(doc);
            return (
              <div
                key={doc.id}
                onClick={() => onOpenDocument?.(doc)}
                className={`flex items-start gap-4 rounded-xl px-5 py-4 transition-all border cursor-pointer group ${
                  expired
                    ? 'bg-[#0f1117]/50 border-[#1e2030] opacity-60 hover:opacity-80 hover:border-[#3e4154]'
                    : 'bg-[#1a1d27] border-[#2e3144] hover:border-primary-500/30 hover:shadow-lg hover:shadow-primary-600/5'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  expired ? 'bg-[#1a1d27] border border-[#2e3144]' : 'bg-primary-600/10 border border-primary-500/20'
                }`}>
                  <FileText size={18} className={expired ? 'text-[#444]' : 'text-primary-400'} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium truncate ${expired ? 'text-[#555] line-through' : 'group-hover:text-primary-400 transition-colors'}`}>
                      {doc.original_name || 'Tài liệu không tên'}
                    </p>
                    {expired && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 font-medium shrink-0">
                        Hết hạn
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className={`flex items-center gap-1 text-xs ${expired ? 'text-[#555]' : 'text-[#9496a1]'}`}>
                      {statusIcon(doc)}
                      {statusLabel(doc)}
                    </span>
                    {doc.text_length > 0 && (
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
                    {expired && doc.deleted_at && (
                      <span className="text-[10px] text-[#555] ml-2">• Đã xoá {formatDate(doc.deleted_at)}</span>
                    )}
                  </div>
                </div>
                <div className="hidden sm:flex items-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs text-primary-400 font-medium">Xem →</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20">
          <FileText size={48} className="text-[#2e3144] mx-auto mb-4" />
          {search || filter !== 'all' ? (
            <>
              <p className="text-sm text-[#9496a1]">Không tìm thấy tài liệu</p>
              <p className="text-xs text-[#666] mt-1">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
            </>
          ) : (
            <>
              <p className="text-sm text-[#9496a1]">Chưa có tài liệu nào</p>
              <p className="text-xs text-[#666] mt-1">Upload tài liệu để bắt đầu học tập</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
