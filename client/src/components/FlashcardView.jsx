import { useState } from 'react';
import {
  Loader2, AlertCircle, CreditCard, RefreshCw,
  ChevronLeft, ChevronRight, RotateCw, Download, Tag
} from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';

export default function FlashcardView({ data, loading, error, onGenerate }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [viewMode, setViewMode] = useState('card'); // 'card' | 'list'

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] gap-4">
        <Loader2 size={40} className="text-accent-400 animate-spin" />
        <p className="text-[#9496a1]">NoteMindAI đang tạo bộ Flashcard<span className="loading-dots"></span></p>
        <p className="text-xs text-[#9496a1]/60">Quá trình này có thể mất một chút thời gian. Vui lòng đợi.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] gap-4">
        <AlertCircle size={40} className="text-red-400" />
        <p className="text-red-400">Lỗi tạo Flashcard</p>
        <p className="text-sm text-[#9496a1] max-w-md text-center">{error}</p>
        <button
          onClick={onGenerate}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 rounded-lg text-sm hover:bg-primary-700 transition-colors"
        >
          <RefreshCw size={14} /> Thử lại
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] gap-4">
        <CreditCard size={48} className="text-[#2e3144]" />
        <p className="text-[#9496a1]">Chưa có Flashcard</p>
        <button
          onClick={onGenerate}
          className="px-6 py-2.5 bg-accent-600 rounded-xl text-sm font-medium hover:bg-accent-700 transition-colors shadow-lg shadow-accent-600/25"
        >
          Tạo Flashcard
        </button>
      </div>
    );
  }

  const cards = data.cards || [];
  const currentCard = cards[currentIndex];
  const total = cards.length;

  const goNext = () => {
    setFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % total);
  };

  const goPrev = () => {
    setFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  };

  const exportAnki = () => {
    const content = cards.map(c => `${c.question}\t${c.answer}\t${c.tag || ''}`).join('\n');
    downloadFile(content, `${data.title || 'flashcards'}_anki.txt`, 'text/plain');
  };

  const exportQuizlet = () => {
    const content = cards.map(c => `${c.question}\t${c.answer}`).join('\n');
    downloadFile(content, `${data.title || 'flashcards'}_quizlet.txt`, 'text/plain');
  };

  const downloadFile = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold">{data.title || 'Flashcards'}</h3>
          <p className="text-xs text-[#9496a1] mt-1">{total} thẻ ghi nhớ</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'card' ? 'list' : 'card')}
            className="px-3 py-1.5 text-xs bg-[#242736] border border-[#2e3144] rounded-lg hover:bg-[#2e3144] transition-colors"
          >
            {viewMode === 'card' ? 'Xem danh sách' : 'Xem thẻ'}
          </button>
          <div className="relative group">
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#242736] border border-[#2e3144] rounded-lg hover:bg-[#2e3144] transition-colors">
              <Download size={12} /> Xuất
            </button>
            <div className="absolute right-0 top-full mt-1 bg-[#242736] border border-[#2e3144] rounded-lg overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 min-w-[140px]">
              <button
                onClick={exportAnki}
                className="w-full px-4 py-2 text-xs text-left hover:bg-[#2e3144] transition-colors"
              >
                Anki (.txt)
              </button>
              <button
                onClick={exportQuizlet}
                className="w-full px-4 py-2 text-xs text-left hover:bg-[#2e3144] transition-colors"
              >
                Quizlet (.txt)
              </button>
            </div>
          </div>
        </div>
      </div>

      {viewMode === 'card' ? (
        /* Card mode */
        <div className="flex flex-col items-center">
          {/* Flashcard */}
          <div
            className={`flip-card w-full max-w-lg h-72 cursor-pointer mb-6 ${flipped ? 'flipped' : ''}`}
            onClick={() => setFlipped(!flipped)}
          >
            <div className="flip-card-inner">
              {/* Front - Question */}
              <div className="flip-card-front bg-gradient-to-br from-[#242736] to-[#1a1d27] border border-[#2e3144] rounded-2xl p-8 flex flex-col items-center justify-center">
                <span className="text-xs text-accent-400 font-medium mb-4 flex items-center gap-1">
                  <Tag size={12} /> {currentCard?.tag || 'Câu hỏi'}
                </span>
                <div className="text-lg font-medium text-center leading-relaxed">
                  <MarkdownRenderer content={currentCard?.question || ''} />
                </div>
                <span className="text-xs text-[#9496a1] mt-6">Nhấn để xem đáp án</span>
              </div>
              {/* Back - Answer */}
              <div className="flip-card-back bg-gradient-to-br from-primary-600/20 to-[#1a1d27] border border-primary-500/30 rounded-2xl p-8 flex flex-col items-center justify-center">
                <span className="text-xs text-primary-400 font-medium mb-4">Đáp án</span>
                <div className="text-base text-center leading-relaxed">
                  <MarkdownRenderer content={currentCard?.answer || ''} />
                </div>
                <span className="text-xs text-[#9496a1] mt-6">Nhấn để xem câu hỏi</span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4">
            <button
              onClick={goPrev}
              className="p-3 bg-[#242736] border border-[#2e3144] rounded-xl hover:bg-[#2e3144] transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-sm text-[#9496a1] min-w-[60px] text-center">
              {currentIndex + 1} / {total}
            </span>
            <button
              onClick={goNext}
              className="p-3 bg-[#242736] border border-[#2e3144] rounded-xl hover:bg-[#2e3144] transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Progress dots */}
          <div className="flex gap-1.5 mt-4 flex-wrap justify-center max-w-md">
            {cards.map((_, i) => (
              <button
                key={i}
                onClick={() => { setCurrentIndex(i); setFlipped(false); }}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentIndex ? 'bg-primary-400 scale-125' : 'bg-[#2e3144] hover:bg-[#9496a1]'
                }`}
              />
            ))}
          </div>
        </div>
      ) : (
        /* List mode */
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
          {cards.map((card, i) => (
            <div
              key={card.id || i}
              className="bg-[#242736] border border-[#2e3144] rounded-xl p-4 hover:border-primary-500/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <span className="text-xs font-medium text-accent-400 shrink-0">#{i + 1}</span>
                {card.tag && (
                  <span className="text-xs text-[#9496a1] bg-[#1a1d27] px-2 py-0.5 rounded">
                    {card.tag}
                  </span>
                )}
              </div>
              <div className="text-sm font-medium mb-2"><MarkdownRenderer content={card.question} /></div>
              <div className="text-sm text-[#9496a1] leading-relaxed"><MarkdownRenderer content={card.answer} /></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
