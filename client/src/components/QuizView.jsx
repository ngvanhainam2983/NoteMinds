import { useState, useMemo, useEffect } from 'react';
import { Loader2, AlertCircle, CheckCircle2, XCircle, RefreshCw, Presentation, ChevronLeft, ChevronRight, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function QuizView({ data, loading, error, onGenerate }) {
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState({});
    const [showResults, setShowResults] = useState(false);
    const [viewingSummary, setViewingSummary] = useState(false);

    const [shakeIdx, setShakeIdx] = useState(null);

    // Calculate score only when answers change or results are triggered
    const score = useMemo(() => {
        if (!data?.questions) return 0;
        return data.questions.reduce((acc, q, idx) => {
            return selectedAnswers[idx] === q.correctAnswerIndex ? acc + 1 : acc;
        }, 0);
    }, [selectedAnswers, data?.questions]);

    const qLen = data?.questions?.length || 0;
    const percent = qLen > 0 ? Math.round((score / qLen) * 100) : 0;

    // Trigger confetti on perfect score
    useEffect(() => {
        if (viewingSummary && percent === 100) {
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899']
            });
        }
    }, [viewingSummary, percent]);

    // --- Actions ---
    const handleOptionSelect = (idx) => {
        if (showResults) return;
        setSelectedAnswers(prev => ({ ...prev, [currentQuestionIdx]: idx }));
    };

    const handleNextQuestion = () => {
        // If they click Next without answering, or answered incorrectly, we could shake
        if (selectedAnswers[currentQuestionIdx] !== data.questions[currentQuestionIdx].correctAnswerIndex && showResults) {
            // Already showing results, just move
            setCurrentQuestionIdx(p => p + 1);
        } else if (selectedAnswers[currentQuestionIdx] !== undefined) {
            setCurrentQuestionIdx(p => p + 1);
        }
    };

    const resetQuiz = () => {
        setSelectedAnswers({});
        setShowResults(false);
        setViewingSummary(false);
        setCurrentQuestionIdx(0);
    };

    // --- Views ---

    const [loadingText, setLoadingText] = useState("Đang đọc nội dung tài liệu...");

    useEffect(() => {
        if (!loading) return;
        const texts = [
            "Đang đọc nội dung tài liệu...",
            "Tìm kiếm các chi tiết quan trọng...",
            "Đang tạo ngân hàng câu hỏi...",
            "Phân tích các đáp án gây nhiễu..."
        ];
        let i = 0;
        const interval = setInterval(() => {
            i = (i + 1) % texts.length;
            setLoadingText(texts[i]);
        }, 2500);
        return () => clearInterval(interval);
    }, [loading]);

    // --- Loading & Error States ---
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] h-full gap-8 relative overflow-hidden bg-[#1a1d27]">
                {/* Quiz Skeleton */}
                <div className="w-full max-w-2xl bg-[#242736] border border-[#2e3144] rounded-3xl p-8 relative overflow-hidden mt-8 opacity-60 pointer-events-none">
                    <div className="absolute top-0 left-0 w-full h-1 bg-[#2e3144]">
                        <div className="h-full bg-primary-600/50 w-1/3 animate-pulse" />
                    </div>
                    {/* Skeleton Question Title */}
                    <div className="flex items-center gap-4 mb-8 mt-2">
                        <div className="w-16 h-8 bg-[#2e3144] rounded-lg animate-pulse" />
                        <div className="flex-1 h-6 bg-[#2e3144] rounded-full animate-pulse delay-75" />
                    </div>
                    {/* Skeleton Options */}
                    <div className="space-y-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="w-full h-16 bg-[#1a1d27] border border-[#2e3144] rounded-2xl flex items-center px-6 animate-pulse" style={{ animationDelay: `${i * 100}ms` }}>
                                <div className="w-3/4 h-4 bg-[#2e3144] rounded-full" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Progress Text */}
                <div className="relative z-20 flex flex-col items-center mb-8">
                    <div className="flex items-center gap-3 mb-4 text-primary-400">
                        <Loader2 size={24} className="animate-spin" />
                    </div>
                    <p className="font-medium bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-primary-600 transition-all duration-500 text-center w-72 min-h-[40px] flex items-center justify-center">
                        {loadingText}
                    </p>
                    <div className="w-48 bg-[#2e3144] h-1 rounded-full mt-4 overflow-hidden">
                        <div className="h-full bg-primary-500 rounded-full w-1/3 animate-[slide_2s_ease-in-out_infinite_alternate]" />
                    </div>
                </div>
            </div>
        );
    }

    if (error || !data?.questions) {
        return (
            <div className="flex flex-col items-center justify-center h-[500px] gap-4 animate-fade-in">
                {error ? <AlertCircle size={40} className="text-red-400" /> : <Presentation size={48} className="text-[#2e3144]" />}
                <p className={error ? "text-red-400" : "text-[#9496a1]"}>{error ? "Lỗi tạo bài tập" : "Chưa có bài kiểm tra"}</p>
                <button onClick={onGenerate} className="flex items-center gap-2 px-6 py-2 bg-primary-600 rounded-xl hover:bg-primary-700 transition-all shadow-lg hover:shadow-primary-600/20 active:scale-95">
                    <RefreshCw size={14} /> {error ? "Thử lại" : "Tạo Bài Kiểm Tra"}
                </button>
            </div>
        );
    }

    const currentQuestion = data.questions[currentQuestionIdx];
    const selectedOptionIndex = selectedAnswers[currentQuestionIdx];

    // Final Summary View
    if (viewingSummary) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] gap-6 max-w-lg mx-auto p-8 bg-[#1a1d27] rounded-3xl border border-[#2e3144] animate-in fade-in zoom-in duration-500 shadow-2xl relative overflow-hidden">
                {percent === 100 && <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent pointer-events-none" />}
                <div className="relative">
                    <svg className="w-32 h-32 transform -rotate-90 drop-shadow-lg">
                        <circle cx="64" cy="64" r="60" stroke="#2e3144" strokeWidth="8" fill="transparent" />
                        <circle
                            cx="64" cy="64" r="60" stroke={percent >= 80 ? "#22c55e" : percent >= 50 ? "#eab308" : "#ef4444"}
                            strokeWidth="8" fill="transparent" strokeDasharray="377"
                            strokeDashoffset={377 - (percent / 100) * 377} strokeLinecap="round"
                            className="transition-all duration-1000 ease-out"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center animate-in zoom-in slide-in-from-bottom-2 duration-700 delay-300">
                        {percent === 100 ? <Trophy size={32} className="text-yellow-400 drop-shadow-md mb-1" /> : null}
                        <span className="text-3xl font-bold">{score}/{qLen}</span>
                    </div>
                </div>

                <div className="text-center animate-in slide-in-from-bottom-4 duration-500 delay-150">
                    <h3 className="text-2xl font-semibold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-[#9496a1]">
                        {percent === 100 ? 'Tuyệt đỉnh! 🏆' : percent >= 80 ? 'Xuất sắc! 🎉' : percent >= 50 ? 'Khá Tốt! 👍' : 'Cần cố gắng hơn 💪'}
                    </h3>
                    <p className="text-[#9496a1]">{data.title}</p>
                </div>

                <div className="flex gap-4 w-full mt-4 animate-in slide-in-from-bottom-4 duration-500 delay-300">
                    <button onClick={() => setViewingSummary(false)} className="flex-1 py-3 px-4 rounded-xl border border-[#2e3144] hover:bg-[#2e3144]/50 hover:text-white transition-all font-medium active:scale-95">
                        Xem lại đáp án
                    </button>
                    <button onClick={resetQuiz} className="flex-1 py-3 px-4 rounded-xl bg-primary-600 hover:bg-primary-700 transition-all font-medium shadow-lg hover:shadow-primary-600/20 active:scale-95">
                        Làm lại
                    </button>
                </div>
            </div>
        );
    }

    // Main Quiz / Review View
    return (
        <div className="h-full flex flex-col max-w-4xl mx-auto px-4 py-6">
            {/* Header & Progress Dots */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-primary-600">
                        {data.title || "Bài Kiểm Tra"}
                    </h2>
                    {showResults && <p className="text-sm font-medium mt-1 text-emerald-400 animate-fade-in">Kết quả: {score}/{qLen} câu đúng</p>}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {data.questions.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrentQuestionIdx(idx)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${idx === currentQuestionIdx
                                ? 'bg-primary-600 text-white ring-4 ring-primary-600/20 scale-110 shadow-lg'
                                : showResults
                                    ? (selectedAnswers[idx] === data.questions[idx].correctAnswerIndex
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                        : 'bg-red-500/20 text-red-400 border border-red-500/40')
                                    : selectedAnswers[idx] !== undefined
                                        ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30'
                                        : 'bg-[#242736] text-[#9496a1] border border-transparent hover:bg-[#2e3144]'
                                }`}
                        >
                            {idx + 1}
                        </button>
                    ))}
                </div>
            </div>

            {/* Question Card */}
            <div className="flex-1 overflow-y-auto pb-20">
                <div className="bg-[#1a1d27] rounded-3xl p-8 border border-[#2e3144] shadow-xl relative overflow-hidden min-h-[400px] transition-all duration-300 animate-in fade-in slide-in-from-bottom-4">
                    <div className="absolute top-0 left-0 w-full h-1 bg-[#2e3144]">
                        <div className="h-full bg-gradient-to-r from-primary-600 to-primary-400 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{ width: `${((currentQuestionIdx + 1) / qLen) * 100}%` }} />
                    </div>

                    <h3 className="text-xl font-medium mb-8 leading-relaxed mt-2">
                        <span className="text-primary-400 font-bold mr-3">Câu {currentQuestionIdx + 1}.</span>
                        {currentQuestion.question}
                    </h3>

                    <div className="space-y-3">
                        {currentQuestion.options.map((option, idx) => {
                            const isSelected = selectedOptionIndex === idx;
                            const isCorrect = idx === currentQuestion.correctAnswerIndex;

                            let btnStyle = "w-full text-left p-5 rounded-2xl border-2 transition-all flex items-center justify-between ";
                            if (!showResults) {
                                btnStyle += isSelected ? "bg-primary-600/10 border-primary-500 text-white" : "bg-[#242736] border-transparent hover:border-[#2e3144] text-[#e4e5e9]";
                            } else {
                                if (isCorrect) btnStyle += "bg-emerald-500/10 border-emerald-500/50 text-emerald-100";
                                else if (isSelected) btnStyle += "bg-red-500/10 border-red-500/50 text-red-100";
                                else btnStyle += "bg-[#242736] border-transparent opacity-50";
                            }

                            return (
                                <button key={idx} onClick={() => handleOptionSelect(idx)} className={btnStyle} disabled={showResults}>
                                    <span className="text-base">{option}</span>
                                    {showResults && isCorrect && <CheckCircle2 size={20} className="text-emerald-500 shrink-0 ml-4" />}
                                    {showResults && isSelected && !isCorrect && <XCircle size={20} className="text-red-500 shrink-0 ml-4" />}
                                </button>
                            );
                        })}
                    </div>

                    {showResults && currentQuestion.explanation && (
                        <div className={`mt-8 p-5 rounded-2xl border ${selectedOptionIndex === currentQuestion.correctAnswerIndex ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                            <h4 className={`font-bold text-sm uppercase tracking-wider mb-2 ${selectedOptionIndex === currentQuestion.correctAnswerIndex ? 'text-emerald-400' : 'text-red-400'}`}>
                                Giải thích:
                            </h4>
                            <p className="text-sm leading-relaxed text-[#9496a1] italic">
                                {currentQuestion.explanation}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer Navigation */}
                <div className="flex justify-between items-center mt-8">
                    <button
                        onClick={() => setCurrentQuestionIdx(p => Math.max(0, p - 1))}
                        disabled={currentQuestionIdx === 0}
                        className="px-5 py-3 rounded-xl font-medium disabled:opacity-20 hover:bg-[#2e3144] transition-colors flex items-center gap-2"
                    >
                        <ChevronLeft size={18} /> Câu trước
                    </button>

                    {!showResults ? (
                        currentQuestionIdx === qLen - 1 ? (
                            <button
                                onClick={() => {
                                    if (Object.keys(selectedAnswers).length < qLen && !confirm('Bạn chưa hoàn thành tất cả câu hỏi. Bạn có chắc chắn muốn nộp bài?')) return;
                                    setShowResults(true);
                                    setViewingSummary(true);
                                }}
                                className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-xl font-bold shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-white"
                            >
                                Nộp bài & Kết quả
                            </button>
                        ) : (
                            <button
                                onClick={() => setCurrentQuestionIdx(p => p + 1)}
                                className="px-8 py-3 bg-primary-600/10 text-primary-400 border border-primary-600/20 rounded-xl font-medium hover:bg-primary-600/20 transition-all flex items-center gap-2"
                            >
                                Câu tiếp <ChevronRight size={18} />
                            </button>
                        )
                    ) : (
                        currentQuestionIdx === qLen - 1 ? (
                            <button
                                onClick={() => setViewingSummary(true)}
                                className="px-8 py-3 bg-[#242736] border border-[#2e3144] rounded-xl font-medium hover:bg-[#2e3144] transition-all"
                            >
                                Xem tổng kết điểm
                            </button>
                        ) : (
                            <button
                                onClick={handleNextQuestion}
                                className="px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-all flex items-center gap-2 active:scale-95 shadow-lg"
                            >
                                Câu tiếp theo <ChevronRight size={18} />
                            </button>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}