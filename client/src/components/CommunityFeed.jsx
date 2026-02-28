import { useState, useEffect } from 'react';
import { getCommunityDocuments } from '../api';
import { Globe, FileText, Search, Loader2, Calendar } from 'lucide-react';

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
                    <p className="text-[#9496a1]">Khám phá các tài liệu, flashcards và sơ đồ tư duy được chia sẻ công khai.</p>
                </div>

                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9496a1]" size={18} />
                    <input
                        type="text"
                        placeholder="Tìm kiếm tài liệu..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#1a1d27] border border-[#2e3144] rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-primary-500 transition-colors"
                    />
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-[#9496a1]">
                    <Loader2 size={32} className="animate-spin mb-4 text-primary-500" />
                    <p>Đang tải tài liệu cộng đồng...</p>
                </div>
            ) : filteredDocs.length === 0 ? (
                <div className="bg-[#1a1d27] border border-[#2e3144] rounded-xl p-12 text-center flex flex-col items-center">
                    <Globe size={48} className="text-[#2e3144] mb-4" />
                    <h3 className="text-lg font-medium mb-1">Chưa có tài liệu nào</h3>
                    <p className="text-[#9496a1] text-sm">Chưa có ai chia sẻ tài liệu công khai, hoặc không tìm thấy kết quả phù hợp.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredDocs.map(doc => (
                        <div
                            key={doc.id}
                            className="bg-[#1a1d27] border border-[#2e3144] rounded-xl p-5 hover:border-primary-500/50 hover:shadow-lg hover:shadow-primary-500/5 transition-all cursor-pointer group flex flex-col"
                            // Here we could route them to a read-only viewer, or just the standard /doc route if it handles public viewing safely
                            // For NoteMind's current structure, if they try to access a /doc /:id they don't own, the server will block them unless they use a share link.
                            // To handle this properly, the community feed items need to be accessed via a public view mechanism.
                            // We'll route them to the shared viewer if we have the shared capability, or build a quick public viewer. 
                            // For now, let's assume /shared/:id can handle public docs if we adapt it, but since we just have document IDs here, 
                            // we can redirect to a public read-only page or create a share_token automatically.
                            // For simplicity, let's just make clicking do something basic for the UI state.
                            onClick={() => {
                                alert(`Tính năng đang phát triển: Xem tài liệu công khai của ${doc.author} `);
                            }}
                        >
                            <div className="flex items-start gap-3 mb-4">
                                <div className="p-2.5 bg-primary-500/10 rounded-lg text-primary-400 mt-0.5 group-hover:scale-110 group-hover:bg-primary-500 group-hover:text-white transition-all">
                                    <FileText size={20} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-medium text-[15px] truncate group-hover:text-primary-400 transition-colors" title={doc.title}>
                                        {doc.title}
                                    </h3>
                                    <p className="text-xs text-[#9496a1] mt-1 flex items-center gap-1.5">
                                        <span className="w-4 h-4 rounded-full bg-gradient-to-tr from-primary-500 to-accent-500 flex items-center justify-center text-[8px] text-white font-bold opacity-80">
                                            {doc.author.charAt(0).toUpperCase()}
                                        </span>
                                        <span className="truncate">{doc.author}</span>
                                    </p>
                                </div>
                            </div>

                            <div className="mt-auto pt-4 border-t border-[#2e3144] flex items-center justify-between text-xs text-[#64748b]">
                                <div className="flex items-center gap-1.5">
                                    <Calendar size={12} />
                                    {new Date(doc.created_at).toLocaleDateString('vi-VN')}
                                </div>
                                <span className="px-2 py-0.5 bg-[#242736] rounded-md border border-[#2e3144]">
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
