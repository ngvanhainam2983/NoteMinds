import { useState, useRef, useEffect } from 'react';
import {
  Loader2, AlertCircle, CreditCard, RefreshCw,
  ChevronLeft, ChevronRight, RotateCw, Download, Tag, Star, Volume2
} from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';
import { reviewFlashcard } from '../api';

const SR_GRADES = [
  { grade: 0, label: 'Quên', color: 'bg-red-600', emoji: '😞' },
  { grade: 1, label: 'Khó', color: 'bg-orange-600', emoji: '😟' },
  { grade: 2, label: 'Nhớ mờ', color: 'bg-amber-600', emoji: '🤔' },
  { grade: 3, label: 'Khá', color: 'bg-yellow-600', emoji: '😐' },
  { grade: 4, label: 'Tốt', color: 'bg-green-600', emoji: '😊' },
  { grade: 5, label: 'Xuất sắc', color: 'bg-emerald-600', emoji: '🤩' },
];

export default function FlashcardView({ data, loading, error, onGenerate, docId }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [viewMode, setViewMode] = useState('card'); // 'card' | 'list'
  const [showGrading, setShowGrading] = useState(false);
  const [reviewResult, setReviewResult] = useState(null);
  const cardStartTime = useRef(Date.now());

  const [loadingText, setLoadingText] = useState("Đang phân tích và chia nhỏ kiến thức...");

  useEffect(() => {
    if (!loading) return;
    const texts = [
      "Đang phân tích và chia nhỏ kiến thức...",
      "Trích xuất các thuật ngữ quan trọng...",
      "Tạo câu hỏi Active Recall...",
      "Thiết kế bộ thẻ ghi nhớ hoàn chỉnh..."
    ];
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % texts.length;
      setLoadingText(texts[i]);
    }, 2500);
    return () => clearInterval(interval);
  }, [loading]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] h-full gap-8 relative overflow-hidden bg-surface">
        {/* Flashcard Skeleton Animation */}
        <div className="relative w-64 h-80 perspective-1000 mt-8">
          {/* Back card 3 */}
          <div className="absolute inset-0 bg-surface-2 border border-line rounded-2xl transform rotate-6 translate-y-4 opacity-30 pointer-events-none" />
          {/* Back card 2 */}
          <div className="absolute inset-0 bg-surface-2 border border-line rounded-2xl transform -rotate-3 translate-y-2 opacity-60 pointer-events-none" />
          {/* Front card */}
          <div className="absolute inset-0 bg-surface border border-line shadow-2xl rounded-2xl flex flex-col items-center justify-center p-6 animate-[flip_3s_ease-in-out_infinite_alternate]">
            <div className="w-12 h-12 rounded-full bg-accent-500/20 flex items-center justify-center mb-6">
              <Loader2 size={24} className="text-accent-400 animate-spin" />
            </div>
            <div className="w-full h-4 bg-line rounded-full animate-pulse mb-3" />
            <div className="w-3/4 h-4 bg-line rounded-full animate-pulse mb-6" />
            <div className="w-1/2 h-2 bg-line rounded-full animate-pulse opacity-50" />
          </div>
        </div>

        {/* Progress Text */}
        <div className="relative z-20 flex flex-col items-center">
          <p className="font-medium bg-clip-text text-transparent bg-gradient-to-r from-accent-400 to-accent-600 transition-all duration-500 text-center w-72 min-h-[40px] flex items-center justify-center">
            {loadingText}
          </p>
          <div className="w-48 bg-line h-1 rounded-full mt-4 overflow-hidden">
            <div className="h-full bg-accent-500 rounded-full w-1/3 animate-[slide_2s_ease-in-out_infinite_alternate]" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] gap-4">
        <AlertCircle size={40} className="text-red-400" />
        <p className="text-red-400">Lỗi tạo Flashcard</p>
        <p className="text-sm text-muted max-w-md text-center">{error}</p>
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
        <CreditCard size={48} className="text-line" />
        <p className="text-muted">Chưa có Flashcard</p>
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
    setShowGrading(false);
    setReviewResult(null);
    cardStartTime.current = Date.now();
    setCurrentIndex((prev) => (prev + 1) % total);
  };

  const goPrev = () => {
    setFlipped(false);
    setShowGrading(false);
    setReviewResult(null);
    cardStartTime.current = Date.now();
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  };

  const handleGrade = async (grade) => {
    if (!currentCard || !docId) return;
    const timeMs = Date.now() - cardStartTime.current;

    // Map numeric grade (0-5) to difficulty string expected by backend
    const difficultyMap = {
      0: 'again',  // Quên
      1: 'hard',   // Khó
      2: 'hard',   // Nhớ mờ
      3: 'good',   // Khá
      4: 'good',   // Tốt
      5: 'easy',   // Xuất sắc
    };
    const difficulty = difficultyMap[grade];

    try {
      const result = await reviewFlashcard(docId, currentIndex, difficulty, timeMs);
      setReviewResult(result);
      setTimeout(() => {
        goNext();
      }, 1200);
    } catch (err) {
      console.error('Review failed:', err);
    }
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

  const speakText = (e, text) => {
    e.stopPropagation(); // Prevent card flip
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop any currently playing speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'vi-VN';
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    } else {
      alert("Trình duyệt của bạn không hỗ trợ tính năng đọc văn bản.");
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold">{data.title || 'Flashcards'}</h3>
          <p className="text-xs text-muted mt-1">{total} thẻ ghi nhớ</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'card' ? 'list' : 'card')}
            className="px-3 py-1.5 text-xs bg-surface-2 border border-line rounded-lg hover:bg-line transition-colors"
          >
            {viewMode === 'card' ? 'Xem danh sách' : 'Xem thẻ'}
          </button>
          <div className="relative group">
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-surface-2 border border-line rounded-lg hover:bg-line transition-colors">
              <Download size={12} /> Xuất
            </button>
            <div className="absolute right-0 top-full mt-1 bg-surface-2 border border-line rounded-lg overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 min-w-[140px]">
              <button
                onClick={exportAnki}
                className="w-full px-4 py-2 text-xs text-left hover:bg-line transition-colors"
              >
                Anki (.txt)
              </button>
              <button
                onClick={exportQuizlet}
                className="w-full px-4 py-2 text-xs text-left hover:bg-line transition-colors"
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
              <div className="flip-card-front bg-gradient-to-br from-surface-2 to-surface border border-line rounded-2xl p-8 flex flex-col items-center justify-center relative">
                <span className="text-xs text-accent-400 font-medium mb-4 flex items-center gap-1">
                  <Tag size={12} /> {currentCard?.tag || 'Câu hỏi'}
                </span>
                <button
                  onClick={(e) => speakText(e, currentCard?.question || '')}
                  className="absolute top-4 right-4 p-2 text-muted hover:text-txt bg-line/50 hover:bg-line rounded-full transition-colors"
                  title="Đọc câu hỏi"
                >
                  <Volume2 size={16} />
                </button>
                <div className="text-lg font-medium text-center leading-relaxed">
                  <MarkdownRenderer content={currentCard?.question || ''} />
                </div>
                <span className="text-xs text-muted mt-6">Nhấn để xem đáp án</span>
              </div>
              {/* Back - Answer */}
              <div className="flip-card-back bg-gradient-to-br from-primary-600/20 to-surface border border-primary-500/30 rounded-2xl p-8 flex flex-col items-center justify-center relative">
                <span className="text-xs text-primary-400 font-medium mb-4">Đáp án</span>
                <button
                  onClick={(e) => speakText(e, currentCard?.answer || '')}
                  className="absolute top-4 right-4 p-2 text-primary-400 hover:text-txt bg-primary-600/20 hover:bg-primary-600/40 rounded-full transition-colors"
                  title="Đọc đáp án"
                >
                  <Volume2 size={16} />
                </button>
                <div className="text-base text-center leading-relaxed">
                  <MarkdownRenderer content={currentCard?.answer || ''} />
                </div>
                <span className="text-xs text-muted mt-6">Nhấn để xem câu hỏi</span>
              </div>
            </div>
          </div>

          {/* Spaced Repetition Grading */}
          {flipped && (
            <div className="w-full max-w-lg mb-4">
              {reviewResult ? (
                <div className="text-center py-2">
                  <p className="text-sm text-green-400">✓ Đã ghi nhận! Ôn lại sau {reviewResult.interval || 1} ngày</p>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-muted text-center mb-2">Bạn nhớ tốt đến đâu?</p>
                  <div className="grid grid-cols-6 gap-1.5">
                    {SR_GRADES.map(g => (
                      <button
                        key={g.grade}
                        onClick={() => handleGrade(g.grade)}
                        className={`${g.color} hover:opacity-80 rounded-lg py-2 text-center transition-all`}
                      >
                        <div className="text-lg">{g.emoji}</div>
                        <div className="text-[10px] font-medium">{g.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-4">
            <button
              onClick={goPrev}
              className="p-3 bg-surface-2 border border-line rounded-xl hover:bg-line transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-sm text-muted min-w-[60px] text-center">
              {currentIndex + 1} / {total}
            </span>
            <button
              onClick={goNext}
              className="p-3 bg-surface-2 border border-line rounded-xl hover:bg-line transition-colors"
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
                className={`w-2 h-2 rounded-full transition-all ${i === currentIndex ? 'bg-primary-400 scale-125' : 'bg-line hover:bg-muted'
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
              className="bg-surface-2 border border-line rounded-xl p-4 hover:border-primary-500/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <span className="text-xs font-medium text-accent-400 shrink-0">#{i + 1}</span>
                {card.tag && (
                  <span className="text-xs text-muted bg-surface px-2 py-0.5 rounded">
                    {card.tag}
                  </span>
                )}
              </div>
              <div className="text-sm font-medium mb-2"><MarkdownRenderer content={card.question} /></div>
              <div className="text-sm text-muted leading-relaxed"><MarkdownRenderer content={card.answer} /></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
