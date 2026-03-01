import { useState, useEffect } from 'react';
import { getCommunityDocuments } from '../api';
import { Globe, FileText, Search, Loader2, Calendar } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function CommunityFeed() {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const data = await getCommunityDocuments(1, 50); // Fetch latest 50 for now
            setDocuments(data.documents || []);
        } catch (err) {
            setError(err.response?.data?.error || 'Lỗi khi tải dữ liệu cộng đồng');
        } finally {
            setLoading(false);
        }
    };

    const filteredDocs = documents.filter(doc =>
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.author.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
                        <Globe className="text-primary-400" size={32} />
                        Cộng đồng
                    </h1>
                    <p className="text-muted">Khám phá các tài liệu, flashcards và sơ đồ tư duy được chia sẻ công khai.</p>
                </div>

                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                    <input
                        type="text"
                        placeholder="Tìm kiếm tài liệu..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-surface border border-line rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-primary-500 transition-colors"
                    />
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted">
                    <Loader2 size={32} className="animate-spin mb-4 text-primary-500" />
                    <p>Đang tải tài liệu cộng đồng...</p>
                </div>
            ) : filteredDocs.length === 0 ? (
                <div className="bg-surface border border-line rounded-xl p-12 text-center flex flex-col items-center">
                    <Globe size={48} className="text-line mb-4" />
                    <h3 className="text-lg font-medium mb-1">Chưa có tài liệu nào</h3>
                    <p className="text-muted text-sm">Chưa có ai chia sẻ tài liệu công khai, hoặc không tìm thấy kết quả phù hợp.</p>
                </div>
            ) : (
                <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6">
                    {filteredDocs.map(doc => (
                        <div
                            key={doc.id}
                            className="bg-surface border border-line rounded-2xl p-6 hover:border-primary-500/50 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-primary-500/10 transition-all cursor-pointer group flex flex-col break-inside-avoid mb-6"
                            onClick={() => {
                                window.history.pushState({}, '', `/public/${doc.id}`);
                                window.dispatchEvent(new Event('popstate')); // Quick hack to trigger App.jsx re-render or we can just location.href
                                window.location.href = `/public/${doc.id}`;
                            }}
                        >
                            <div className="flex items-start gap-3 mb-4">
                                <div className="p-3 bg-primary-500/10 rounded-xl text-primary-400 mt-0.5 group-hover:scale-110 group-hover:bg-primary-500 group-hover:text-txt transition-all shadow-sm">
                                    <FileText size={22} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-[16px] leading-tight mb-1.5 group-hover:text-primary-400 transition-colors" title={doc.title}>
                                        {doc.title}
                                    </h3>
                                    <p className="text-xs text-muted flex items-center gap-1.5">
                                        {doc.author_avatar ? (
                                            <img
                                                src={doc.author_avatar.startsWith('http') ? doc.author_avatar : `${API_URL}${doc.author_avatar}`}
                                                alt=""
                                                className="w-5 h-5 rounded-full object-cover ring-1 ring-primary-500/30"
                                            />
                                        ) : (
                                            <span className="w-5 h-5 rounded-full bg-gradient-to-tr from-primary-500 to-accent-500 flex items-center justify-center text-[10px] text-white font-bold opacity-90 shadow-sm">
                                                {doc.author.charAt(0).toUpperCase()}
                                            </span>
                                        )}
                                        <span className="truncate">{doc.author}</span>
                                    </p>
                                </div>
                            </div>

                            <div className="mt-2 pt-4 border-t border-line flex items-center justify-between text-xs text-muted">
                                <div className="flex items-center gap-1.5 font-medium">
                                    <Calendar size={13} />
                                    {new Date(doc.created_at).toLocaleDateString('vi-VN')}
                                </div>
                                <span className="px-2.5 py-1 bg-surface-2 rounded-md border border-line font-medium tracking-wide">
                                    Công khai
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
