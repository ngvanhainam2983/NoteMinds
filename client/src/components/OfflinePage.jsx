import { useState, useMemo } from 'react';
import {
  WifiOff, FileText, Clock, CheckCircle2, AlertTriangle, Loader2,
  Search, Folder, RefreshCw, CloudOff, History, ArrowLeft
} from 'lucide-react';

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  if (days < 7) return `${days} ngày trước`;
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const statusIcon = (doc) => {
  if (doc.status === 'ready') return <CheckCircle2 size={12} className="text-emerald-400" />;
  if (doc.status === 'error') return <AlertTriangle size={12} className="text-red-400" />;
  return <Loader2 size={12} className="text-amber-400" />;
};

export default function OfflinePage({ onBack, onRetry, onDisable }) {
  const [search, setSearch] = useState('');

  // Load cached data from localStorage
  const cachedDocs = useMemo(() => {
    try {
      const raw = localStorage.getItem('notemind_history_cache');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }, []);

  const cachedFolders = useMemo(() => {
    try {
      const raw = localStorage.getItem('notemind_folders_cache');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }, []);

  const cacheTime = useMemo(() => {
    try {
      const raw = localStorage.getItem('notemind_history_cache_time');
      return raw ? formatDate(raw) : null;
    } catch { return null; }
  }, []);

  const filteredDocs = useMemo(() => {
    if (!search.trim()) return cachedDocs;
    const q = search.toLowerCase();
    return cachedDocs.filter(doc =>
      (doc.original_name || '').toLowerCase().includes(q)
    );
  }, [cachedDocs, search]);

  const getFolderName = (folderId) => {
    const f = cachedFolders.find(f => f.id === folderId);
    return f ? f.name : null;
  };

  const getFolderColor = (folderId) => {
    const f = cachedFolders.find(f => f.id === folderId);
    return f ? f.color : '#6b7280';
  };

  return (
    <div className="min-h-screen bg-bg">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 bg-bg/80 backdrop-blur-xl border-b border-line">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 -ml-2 rounded-xl text-muted hover:text-txt hover:bg-surface transition-colors"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                <WifiOff size={16} className="text-amber-400" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-txt leading-tight">Chế độ ngoại tuyến</h1>
                <p className="text-[10px] text-muted leading-tight">Xem lịch sử đã lưu trên thiết bị</p>
              </div>
            </div>
          </div>
          {(onRetry || onDisable) && (
            <div className="flex items-center gap-2">
              {onDisable && (
                <button
                  onClick={onDisable}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted hover:text-txt hover:bg-surface border border-line transition-colors"
                >
                  <ArrowLeft size={13} />
                  Quay lại
                </button>
              )}
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-primary-400 hover:bg-primary-600/10 border border-primary-500/20 transition-colors"
                >
                  <RefreshCw size={13} />
                  Thử kết nối lại
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {/* Offline Banner */}
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 flex items-start gap-4">
          <div className="w-12 h-12 shrink-0 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center">
            <CloudOff size={22} className="text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-txt mb-1">Không có kết nối mạng</h2>
            <p className="text-xs text-muted leading-relaxed">
              Bạn đang ở chế độ ngoại tuyến. Dưới đây là lịch sử tài liệu đã được lưu trên thiết bị của bạn.
              Khi có kết nối lại, dữ liệu sẽ được đồng bộ tự động.
            </p>
            {cacheTime && (
              <p className="text-[11px] text-muted/70 mt-1.5 flex items-center gap-1">
                <Clock size={11} />
                Cập nhật lần cuối: {cacheTime}
              </p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-surface border border-line rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText size={14} className="text-primary-400" />
              <span className="text-[11px] text-muted font-medium">Tài liệu đã lưu</span>
            </div>
            <p className="text-xl font-extrabold text-txt">{cachedDocs.length}</p>
          </div>
          <div className="bg-surface border border-line rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Folder size={14} className="text-accent-400" />
              <span className="text-[11px] text-muted font-medium">Thư mục</span>
            </div>
            <p className="text-xl font-extrabold text-txt">{cachedFolders.length}</p>
          </div>
          <div className="bg-surface border border-line rounded-xl p-4 hidden sm:block">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 size={14} className="text-emerald-400" />
              <span className="text-[11px] text-muted font-medium">Hoàn thành</span>
            </div>
            <p className="text-xl font-extrabold text-txt">
              {cachedDocs.filter(d => d.status === 'ready').length}
            </p>
          </div>
        </div>

        {/* Search */}
        {cachedDocs.length > 0 && (
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm tài liệu đã lưu..."
              className="w-full bg-surface border border-line rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary-500/50 text-txt placeholder-muted/60"
            />
          </div>
        )}

        {/* Document List */}
        {cachedDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-2xl bg-surface border border-line flex items-center justify-center mb-5">
              <History size={32} className="text-muted/40" />
            </div>
            <h3 className="text-lg font-bold text-txt mb-2">Chưa có dữ liệu được lưu</h3>
            <p className="text-sm text-muted max-w-sm leading-relaxed">
              Khi bạn sử dụng NoteMind, lịch sử tài liệu sẽ được lưu tự động để bạn có thể xem lại khi ngoại tuyến.
            </p>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search size={28} className="text-muted/40 mb-3" />
            <p className="text-sm text-muted">Không tìm thấy tài liệu phù hợp</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1 mb-1">
              <span className="text-xs font-medium text-muted">
                {filteredDocs.length} tài liệu {search && `• "${search}"`}
              </span>
            </div>
            {filteredDocs.map((doc) => {
              const expired = !!doc.deleted_at;
              return (
                <div
                  key={doc.id}
                  className={`flex items-center gap-4 rounded-xl px-5 py-4 transition-all border ${
                    expired
                      ? 'bg-bg/50 border-line/50 opacity-60'
                      : 'bg-surface-2/40 border-line/50 hover:border-line hover:bg-surface-2'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    expired ? 'bg-surface border border-line' : 'bg-primary-600/10 border border-primary-500/15'
                  }`}>
                    <FileText size={18} className={expired ? 'text-muted/60' : 'text-primary-400'} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-medium truncate ${
                        expired ? 'text-muted/60 line-through' : 'text-txt'
                      }`}>
                        {doc.original_name || 'Tài liệu không tên'}
                      </p>
                      {!expired && doc.folder_id && getFolderName(doc.folder_id) && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-md border flex items-center gap-1 shrink-0"
                          style={{
                            borderColor: getFolderColor(doc.folder_id) + '40',
                            color: getFolderColor(doc.folder_id)
                          }}
                        >
                          <Folder size={10} />
                          {getFolderName(doc.folder_id)}
                        </span>
                      )}
                      {expired && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 font-medium shrink-0">
                          Hết hạn
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className={`flex items-center gap-1 text-[11px] ${expired ? 'text-muted/60' : 'text-muted'}`}>
                        {statusIcon(doc)}
                        {doc.status === 'ready' ? 'Hoàn thành' : doc.status === 'error' ? 'Lỗi' : 'Đang xử lý'}
                      </span>
                      {doc.text_length > 0 && (
                        <span className="text-[11px] text-muted/60">{(doc.text_length / 1000).toFixed(1)}k ký tự</span>
                      )}
                      <span className="text-[11px] text-muted/60 flex items-center gap-1">
                        <Clock size={11} />
                        {formatDate(doc.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Offline badge */}
                  <div className="shrink-0">
                    <span className="text-[10px] px-2 py-1 rounded-lg bg-surface border border-line text-muted font-medium flex items-center gap-1">
                      <WifiOff size={10} />
                      Đã lưu
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tip */}
        <div className="bg-surface border border-line rounded-xl p-4 flex items-start gap-3 mt-4">
          <div className="w-6 h-6 shrink-0 rounded-md bg-primary-600/10 flex items-center justify-center mt-0.5">
            <span className="text-xs">💡</span>
          </div>
          <div>
            <p className="text-xs font-medium text-txt mb-0.5">Mẹo</p>
            <p className="text-[11px] text-muted leading-relaxed">
              Lịch sử tài liệu được tự động lưu mỗi khi bạn truy cập trang lịch sử khi có kết nối mạng.
              Hãy mở trang lịch sử thường xuyên để cập nhật dữ liệu ngoại tuyến.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
