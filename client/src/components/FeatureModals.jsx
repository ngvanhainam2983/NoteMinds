import { useState, useEffect } from 'react';
import {
  X, Search, BarChart3, Share2, Tag, BookOpen, Settings,
  Star, Loader2, Copy, Check, Trash2, Plus, Clock, TrendingUp,
  MessageSquare, FileText, CreditCard, ExternalLink, Download
} from 'lucide-react';
import {
  searchDocuments, getAnalytics, createShareLink, getSharedDocuments, deleteShareLink,
  getUserTags, createTag, addTagToDocument, removeTagFromDocument, getDocumentTags,
  getLearningPaths, generateLearningPath, completeLearningPath, getSuggestedDocuments,
  getPreferences, setPreference, exportFlashcardsCSV, addFavorite, removeFavorite,
  checkFavorite, getFlashcardStats
} from '../api';

// ── Modal Wrapper ────────────────────────────────────
function Modal({ isOpen, onClose, title, icon: Icon, children, wide }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className={`relative bg-[#1a1d27] border border-[#2e3144] rounded-2xl shadow-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[85vh] flex flex-col`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2e3144]">
          <div className="flex items-center gap-3">
            {Icon && <Icon size={20} className="text-primary-400" />}
            <h3 className="text-lg font-semibold">{title}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-[#2e3144] rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Search Panel ─────────────────────────────────────
export function SearchModal({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await searchDocuments(query.trim());
      setResults(data);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tìm kiếm" icon={Search}>
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Tìm tài liệu, hội thoại..."
          className="flex-1 bg-[#0f1117] border border-[#2e3144] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary-500"
          autoFocus
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-4 py-2.5 bg-primary-600 rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
        </button>
      </div>
      {results && (
        <div className="space-y-3">
          {results.documents?.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-[#9496a1] mb-2 flex items-center gap-2">
                <FileText size={14} /> Tài liệu ({results.documents.length})
              </h4>
              {results.documents.map((doc, i) => (
                <div key={i} className="bg-[#0f1117] border border-[#2e3144] rounded-lg p-3 mb-2">
                  <p className="text-sm font-medium">{doc.title || doc.filename}</p>
                  {doc.excerpt && <p className="text-xs text-[#9496a1] mt-1 line-clamp-2">{doc.excerpt}</p>}
                </div>
              ))}
            </div>
          )}
          {results.conversations?.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-[#9496a1] mb-2 flex items-center gap-2">
                <MessageSquare size={14} /> Hội thoại ({results.conversations.length})
              </h4>
              {results.conversations.map((conv, i) => (
                <div key={i} className="bg-[#0f1117] border border-[#2e3144] rounded-lg p-3 mb-2">
                  <p className="text-sm font-medium">{conv.title || 'Hội thoại'}</p>
                  {conv.excerpt && <p className="text-xs text-[#9496a1] mt-1 line-clamp-2">{conv.excerpt}</p>}
                </div>
              ))}
            </div>
          )}
          {(!results.documents?.length && !results.conversations?.length) && (
            <p className="text-center text-[#9496a1] text-sm py-8">Không tìm thấy kết quả cho "{query}"</p>
          )}
        </div>
      )}
      {!results && !loading && (
        <p className="text-center text-[#9496a1] text-sm py-8">Nhập từ khóa để tìm kiếm trong tài liệu và hội thoại</p>
      )}
    </Modal>
  );
}

// ── Analytics Panel ──────────────────────────────────
export function AnalyticsModal({ isOpen, onClose }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    getAnalytics(days)
      .then(data => setAnalytics(data))
      .catch(() => setAnalytics(null))
      .finally(() => setLoading(false));
  }, [isOpen, days]);

  const statCards = analytics ? [
    { label: 'Tài liệu đã xem', value: analytics.documentsViewed ?? 0, icon: FileText, color: 'text-blue-400' },
    { label: 'Tin nhắn chat', value: analytics.chatInteractions ?? 0, icon: MessageSquare, color: 'text-green-400' },
    { label: 'Flashcard đã ôn', value: analytics.flashcardsReviewed ?? 0, icon: CreditCard, color: 'text-purple-400' },
    { label: 'Tổng hoạt động', value: analytics.totalActions ?? 0, icon: TrendingUp, color: 'text-amber-400' },
  ] : [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Phân tích học tập" icon={BarChart3} wide>
      <div className="flex gap-2 mb-6">
        {[7, 14, 30].map(d => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              days === d ? 'bg-primary-600 text-white' : 'bg-[#0f1117] border border-[#2e3144] text-[#9496a1] hover:text-white'
            }`}
          >
            {d} ngày
          </button>
        ))}
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={32} className="text-primary-400 animate-spin" />
        </div>
      ) : analytics ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {statCards.map((s, i) => (
              <div key={i} className="bg-[#0f1117] border border-[#2e3144] rounded-xl p-4 text-center">
                <s.icon size={20} className={`${s.color} mx-auto mb-2`} />
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-[#9496a1] mt-1">{s.label}</p>
              </div>
            ))}
          </div>
          {analytics.topDocuments?.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Star size={14} className="text-amber-400" /> Tài liệu hàng đầu
              </h4>
              <div className="space-y-2">
                {analytics.topDocuments.map((doc, i) => (
                  <div key={i} className="flex items-center justify-between bg-[#0f1117] border border-[#2e3144] rounded-lg px-4 py-2.5">
                    <span className="text-sm truncate">{doc.title || doc.filename}</span>
                    <span className="text-xs text-primary-400 font-medium">{doc.interactions} lượt</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {analytics.weeklyActivity?.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Clock size={14} className="text-blue-400" /> Hoạt động theo ngày
              </h4>
              <div className="flex items-end gap-1 h-32 bg-[#0f1117] border border-[#2e3144] rounded-xl p-4">
                {analytics.weeklyActivity.map((day, i) => {
                  const max = Math.max(...analytics.weeklyActivity.map(d => d.interactions || d.count || 0), 1);
                  const val = day.interactions || day.count || 0;
                  const height = Math.max((val / max) * 100, 4);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-primary-600/60 rounded-t" style={{ height: `${height}%` }} title={`${val} hoạt động`} />
                      <span className="text-[10px] text-[#9496a1]">{(day.day || '').slice(0, 2)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-center text-[#9496a1] text-sm py-8">Chưa có dữ liệu phân tích</p>
      )}
    </Modal>
  );
}

// ── Share Modal ──────────────────────────────────────
const SHARE_PERMISSIONS = [
  { value: 'view', label: 'Chỉ xem', icon: '👁️', desc: 'Chỉ xem nội dung, không chỉnh sửa' },
  { value: 'comment', label: 'Bình luận', icon: '💬', desc: 'Xem và bình luận' },
  { value: 'edit', label: 'Chỉnh sửa', icon: '✏️', desc: 'Xem, bình luận và chỉnh sửa' },
];

const PERMISSION_BADGE = {
  view: { label: 'Xem', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  comment: { label: 'Bình luận', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  edit: { label: 'Sửa', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
};

export function ShareModal({ isOpen, onClose, documentId }) {
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(null);
  const [expiresIn, setExpiresIn] = useState(7);
  const [shareType, setShareType] = useState('view');

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    getSharedDocuments(documentId || null)
      .then(s => setShares(s || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen, documentId]);

  const handleCreate = async () => {
    if (!documentId) return;
    setCreating(true);
    try {
      const result = await createShareLink(documentId, shareType, expiresIn);
      if (result.success !== false) {
        const updated = await getSharedDocuments();
        setShares(updated || []);
      }
    } catch (err) {
      console.error('Share failed:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (shareId) => {
    try {
      await deleteShareLink(shareId);
      setShares(prev => prev.filter(s => s.id !== shareId));
    } catch (err) {
      console.error('Delete share failed:', err);
    }
  };

  const copyLink = (token) => {
    const url = `${window.location.origin}/share/${token}`;
    navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Chia sẻ tài liệu" icon={Share2}>
      {documentId && (
        <div className="bg-[#0f1117] border border-[#2e3144] rounded-xl p-4 mb-6">
          <p className="text-sm font-medium mb-3">Tạo link chia sẻ mới</p>

          {/* Permission selector */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {SHARE_PERMISSIONS.map(perm => (
              <button
                key={perm.value}
                onClick={() => setShareType(perm.value)}
                className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg border text-xs font-medium transition-all ${
                  shareType === perm.value
                    ? 'border-primary-500/50 bg-primary-600/10 text-primary-400'
                    : 'border-[#2e3144] text-[#9496a1] hover:border-[#3e4154] hover:text-white'
                }`}
              >
                <span className="text-base">{perm.icon}</span>
                <span>{perm.label}</span>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-[#666] mb-3">
            {SHARE_PERMISSIONS.find(p => p.value === shareType)?.desc}
          </p>

          <div className="flex items-center gap-3">
            <select
              value={expiresIn}
              onChange={e => setExpiresIn(Number(e.target.value))}
              className="bg-[#1a1d27] border border-[#2e3144] rounded-lg px-3 py-2 text-sm focus:outline-none"
            >
              <option value={1}>1 ngày</option>
              <option value={7}>7 ngày</option>
              <option value={30}>30 ngày</option>
            </select>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Tạo link
            </button>
          </div>
        </div>
      )}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 size={24} className="text-primary-400 animate-spin" /></div>
      ) : shares.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-[#9496a1] mb-3">Các link đã tạo</p>
          {shares.map(s => {
            const badge = PERMISSION_BADGE[s.share_type] || PERMISSION_BADGE.view;
            const shareUrl = `${window.location.origin}/share/${s.share_token}`;
            return (
              <div key={s.id} className="bg-[#0f1117] border border-[#2e3144] rounded-lg px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <ExternalLink size={14} className="text-primary-400 shrink-0" />
                  <span className="text-xs truncate flex-1 text-[#c8c9cf]" title={shareUrl}>
                    {shareUrl.length > 50 ? shareUrl.slice(0, 50) + '...' : shareUrl}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${badge.color}`}>
                    {badge.label}
                  </span>
                  <span className="text-[10px] text-[#9496a1]">
                    {s.expires_at ? new Date(s.expires_at).toLocaleDateString('vi') : '∞'}
                  </span>
                  <button onClick={() => copyLink(s.share_token)} className="p-1 hover:bg-[#2e3144] rounded transition-colors">
                    {copied === s.share_token ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                  </button>
                  <button onClick={() => handleDelete(s.id)} className="p-1 hover:bg-red-500/20 rounded transition-colors">
                    <Trash2 size={14} className="text-red-400" />
                  </button>
                </div>
                {s.original_name && (
                  <p className="text-[10px] text-[#666] mt-1 pl-6 truncate">
                    {s.original_name} • {s.access_count || 0} lượt xem
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-center text-[#9496a1] text-sm py-8">Chưa có link chia sẻ nào</p>
      )}
    </Modal>
  );
}

// ── Tags Modal ───────────────────────────────────────
const TAG_COLORS = [
  { name: 'Đỏ', value: '#ef4444' },
  { name: 'Cam', value: '#f97316' },
  { name: 'Vàng', value: '#eab308' },
  { name: 'Xanh lá', value: '#22c55e' },
  { name: 'Xanh dương', value: '#3b82f6' },
  { name: 'Tím', value: '#a855f7' },
];

export function TagsModal({ isOpen, onClose, documentId }) {
  const [allTags, setAllTags] = useState([]);
  const [docTags, setDocTags] = useState([]);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3b82f6');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    Promise.all([
      getUserTags().catch(() => []),
      documentId ? getDocumentTags(documentId).catch(() => []) : Promise.resolve([])
    ]).then(([tags, dTags]) => {
      setAllTags(tags || []);
      setDocTags(dTags || []);
    }).finally(() => setLoading(false));
  }, [isOpen, documentId]);

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    try {
      const result = await createTag(newTagName.trim(), newTagColor);
      if (result) {
        setAllTags(prev => [...prev, result]);
        setNewTagName('');
      }
    } catch (err) {
      console.error('Create tag failed:', err);
    }
  };

  const handleToggleTag = async (tag) => {
    if (!documentId) return;
    const isAttached = docTags.some(t => t.id === tag.id);
    try {
      if (isAttached) {
        await removeTagFromDocument(documentId, tag.id);
        setDocTags(prev => prev.filter(t => t.id !== tag.id));
      } else {
        await addTagToDocument(documentId, tag.id);
        setDocTags(prev => [...prev, tag]);
      }
    } catch (err) {
      console.error('Toggle tag failed:', err);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Quản lý nhãn" icon={Tag}>
      {/* Create new tag */}
      <div className="bg-[#0f1117] border border-[#2e3144] rounded-xl p-4 mb-6">
        <p className="text-sm font-medium mb-3">Tạo nhãn mới</p>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newTagName}
            onChange={e => setNewTagName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreateTag()}
            placeholder="Tên nhãn..."
            className="flex-1 bg-[#1a1d27] border border-[#2e3144] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500"
          />
          <button
            onClick={handleCreateTag}
            className="px-3 py-2 bg-primary-600 rounded-lg text-sm hover:bg-primary-700 transition-colors"
          >
            <Plus size={14} />
          </button>
        </div>
        <div className="flex gap-2">
          {TAG_COLORS.map(c => (
            <button
              key={c.value}
              onClick={() => setNewTagColor(c.value)}
              className={`w-7 h-7 rounded-full border-2 transition-all ${
                newTagColor === c.value ? 'border-white scale-110' : 'border-transparent'
              }`}
              style={{ backgroundColor: c.value }}
              title={c.name}
            />
          ))}
        </div>
      </div>
      {/* Existing tags */}
      {loading ? (
        <div className="flex justify-center py-6"><Loader2 size={24} className="text-primary-400 animate-spin" /></div>
      ) : allTags.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-[#9496a1] mb-2">
            {documentId ? 'Nhấn để gắn/gỡ nhãn cho tài liệu' : 'Tất cả nhãn của bạn'}
          </p>
          <div className="flex flex-wrap gap-2">
            {allTags.map(tag => {
              const isAttached = docTags.some(t => t.id === tag.id);
              return (
                <button
                  key={tag.id}
                  onClick={() => handleToggleTag(tag)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                    isAttached ? 'border-white/40 ring-2 ring-white/20' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: `${tag.color}20`, color: tag.color, borderColor: isAttached ? tag.color : 'transparent' }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                  {tag.name}
                  {isAttached && <Check size={12} />}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="text-center text-[#9496a1] text-sm py-8">Chưa có nhãn nào. Tạo nhãn mới ở trên!</p>
      )}
    </Modal>
  );
}

// ── Learning Paths Modal ─────────────────────────────
export function LearningPathsModal({ isOpen, onClose }) {
  const [paths, setPaths] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    Promise.all([
      getLearningPaths().catch(() => []),
      getSuggestedDocuments().catch(() => [])
    ]).then(([p, s]) => {
      setPaths(p || []);
      setSuggestions(s || []);
    }).finally(() => setLoading(false));
  }, [isOpen]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await generateLearningPath();
      const updated = await getLearningPaths();
      setPaths(updated || []);
    } catch (err) {
      console.error('Generate path failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleComplete = async (pathId) => {
    try {
      await completeLearningPath(pathId);
      setPaths(prev => prev.map(p => p.id === pathId ? { ...p, completed: true } : p));
    } catch (err) {
      console.error('Complete path failed:', err);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Lộ trình học tập AI" icon={BookOpen} wide>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-[#9496a1]">AI đề xuất lộ trình học tập tối ưu dựa trên hoạt động của bạn</p>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 shrink-0"
        >
          {generating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Tạo lộ trình mới
        </button>
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={32} className="text-primary-400 animate-spin" /></div>
      ) : (
        <div className="space-y-6">
          {paths.length > 0 ? (
            <div className="space-y-3">
              {paths.map(path => (
                <div key={path.id} className={`bg-[#0f1117] border rounded-xl p-4 ${path.completed ? 'border-green-500/30' : 'border-[#2e3144]'}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium flex items-center gap-2">
                        {path.title}
                        {path.completed && <Check size={14} className="text-green-400" />}
                      </h4>
                      {path.description && <p className="text-xs text-[#9496a1] mt-1">{path.description}</p>}
                      {path.estimatedDays && (
                        <p className="text-xs text-primary-400 mt-1 flex items-center gap-1">
                          <Clock size={12} /> ~{path.estimatedDays} ngày
                        </p>
                      )}
                    </div>
                    {!path.completed && (
                      <button
                        onClick={() => handleComplete(path.id)}
                        className="px-3 py-1.5 bg-green-600/20 border border-green-500/30 rounded-lg text-xs text-green-400 hover:bg-green-600/30 transition-colors"
                      >
                        Hoàn thành
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-[#9496a1] text-sm py-4">Chưa có lộ trình. Nhấn "Tạo lộ trình mới" để AI đề xuất!</p>
          )}
          {suggestions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Star size={14} className="text-amber-400" /> Tài liệu gợi ý
              </h4>
              <div className="space-y-2">
                {suggestions.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 bg-[#0f1117] border border-[#2e3144] rounded-lg px-4 py-2.5">
                    <FileText size={14} className="text-primary-400 shrink-0" />
                    <span className="text-sm truncate">{s.title || s.filename}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

// ── Preferences Modal ────────────────────────────────
export function PreferencesModal({ isOpen, onClose }) {
  const [prefs, setPrefs] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    getPreferences()
      .then(data => setPrefs(data || {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen]);

  const handleChange = async (key, value) => {
    setPrefs(prev => ({ ...prev, [key]: value }));
    try {
      await setPreference(key, value);
    } catch (err) {
      console.error('Save preference failed:', err);
    }
  };

  const toggleItems = [
    { key: 'offlineModeEnabled', label: 'Chế độ offline', desc: 'Lưu cache để dùng khi mất mạng' },
    { key: 'notifications', label: 'Thông báo', desc: 'Nhận thông báo nhắc ôn bài' },
    { key: 'emailUpdates', label: 'Email cập nhật', desc: 'Nhận email về tính năng mới' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cài đặt" icon={Settings}>
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="text-primary-400 animate-spin" /></div>
      ) : (
        <div className="space-y-4">
          {toggleItems.map(item => (
            <div key={item.key} className="flex items-center justify-between bg-[#0f1117] border border-[#2e3144] rounded-xl px-4 py-3">
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-[#9496a1]">{item.desc}</p>
              </div>
              <button
                onClick={() => handleChange(item.key, !prefs[item.key])}
                className={`w-11 h-6 rounded-full transition-colors relative ${
                  prefs[item.key] ? 'bg-primary-600' : 'bg-[#2e3144]'
                }`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  prefs[item.key] ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

// ── Favorite Button ──────────────────────────────────
export function FavoriteButton({ documentId }) {
  const [isFav, setIsFav] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!documentId) return;
    checkFavorite(documentId).then(setIsFav).catch(() => {});
  }, [documentId]);

  const toggle = async () => {
    if (loading) return;
    setLoading(true);
    try {
      if (isFav) {
        await removeFavorite(documentId);
        setIsFav(false);
      } else {
        await addFavorite(documentId);
        setIsFav(true);
      }
    } catch (err) {
      console.error('Favorite toggle failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`p-2 rounded-lg transition-all ${
        isFav ? 'text-amber-400 bg-amber-400/10' : 'text-[#9496a1] hover:text-amber-400 hover:bg-amber-400/10'
      }`}
      title={isFav ? 'Bỏ yêu thích' : 'Yêu thích'}
    >
      <Star size={16} fill={isFav ? 'currentColor' : 'none'} />
    </button>
  );
}

// ── Export Button ────────────────────────────────────
export function ExportButton({ documentId, type = 'flashcards' }) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await exportFlashcardsCSV(documentId);
      if (result.csv) {
        const blob = new Blob([result.csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `flashcards_${documentId}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#242736] border border-[#2e3144] rounded-lg hover:bg-[#2e3144] transition-colors disabled:opacity-50"
      title="Xuất CSV"
    >
      {loading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
      Xuất CSV
    </button>
  );
}
