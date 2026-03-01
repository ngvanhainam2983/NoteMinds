import { useState, useMemo, useEffect, useCallback } from 'react';
import {
    Loader2, AlertCircle, CheckCircle2, XCircle, RefreshCw,
    Presentation, ChevronLeft, ChevronRight, Trophy, Target,
    Sparkles, Award, RotateCcw, Eye, ListChecks, Clock, Zap
} from 'lucide-react';
import confetti from 'canvas-confetti';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export default function QuizView({ data, loading, error, onGenerate }) {
    const [currentIdx, setCurrentIdx] = useState(0);
    const [answers, setAnswers] = useState({});
    const [submitted, setSubmitted] = useState(false);
    const [view, setView] = useState('quiz'); // 'quiz' | 'summary' | 'review'
    const [animating, setAnimating] = useState(false);
    const [timer, setTimer] = useState(0);
    const [timerActive, setTimerActive] = useState(false);

    const qLen = data?.questions?.length || 0;

    // Timer
    useEffect(() => {
        if (!timerActive || submitted) return;
        const id = setInterval(() => setTimer(t => t + 1), 1000);
        return () => clearInterval(id);
    }, [timerActive, submitted]);

    // Start timer when quiz data loads
    useEffect(() => {
        if (data?.questions?.length && !submitted) {
            setTimerActive(true);
        }
    }, [data?.questions?.length, submitted]);

    const formatTime = (s) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    const score = useMemo(() => {
        if (!data?.questions) return 0;
        return data.questions.reduce((acc, q, i) => acc + (answers[i] === q.correctAnswerIndex ? 1 : 0), 0);
    }, [answers, data?.questions]);

    const percent = qLen > 0 ? Math.round((score / qLen) * 100) : 0;
    const answeredCount = Object.keys(answers).length;

    // Confetti on high score
    useEffect(() => {
        if (view === 'summary' && percent >= 80) {
            const count = percent === 100 ? 200 : 100;
            confetti({ particleCount: count, spread: 80, origin: { y: 0.6 }, colors: ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'] });
        }
    }, [view, percent]);

    const goTo = useCallback((idx) => {
        if (idx === currentIdx || idx < 0 || idx >= qLen) return;
        setAnimating(true);
        setTimeout(() => {
            setCurrentIdx(idx);
            setAnimating(false);
        }, 150);
    }, [currentIdx, qLen]);

    const handleSelect = (optIdx) => {
        if (submitted) return;
        setAnswers(prev => ({ ...prev, [currentIdx]: optIdx }));
    };

    const handleSubmit = () => {
        if (answeredCount < qLen && !confirm(`Bạn mới trả lời ${answeredCount}/${qLen} câu. Nộp bài ngay?`)) return;
        setSubmitted(true);
        setTimerActive(false);
        setView('summary');
    };

    const resetQuiz = () => {
        setAnswers({});
        setSubmitted(false);
        setView('quiz');
        setCurrentIdx(0);
        setTimer(0);
        setTimerActive(true);
    };

    // ── Loading Text Cycle ───
    const [loadingText, setLoadingText] = useState("Đang đọc nội dung tài liệu...");
    useEffect(() => {
        if (!loading) return;
        const texts = ["Đang đọc nội dung tài liệu...", "Tìm kiếm các chi tiết quan trọng...", "Đang tạo ngân hàng câu hỏi...", "Phân tích các đáp án gây nhiễu..."];
        let i = 0;
        const id = setInterval(() => { i = (i + 1) % texts.length; setLoadingText(texts[i]); }, 2500);
        return () => clearInterval(id);
    }, [loading]);

    // ── Loading ───
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] gap-6">
                <div className="w-full max-w-xl">
                    <div className="bg-surface border border-line rounded-2xl p-6 space-y-4 opacity-50">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-6 bg-line rounded-lg animate-pulse" />
                            <div className="h-5 bg-line rounded-full flex-1 animate-pulse" />
                        </div>
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-14 bg-surface-2 border border-line rounded-xl animate-pulse" style={{ animationDelay: `${i * 120}ms` }} />
                        ))}
                    </div>
                </div>
                <div className="flex flex-col items-center gap-3">
                    <Loader2 size={22} className="animate-spin text-primary-400" />
                    <p className="text-sm font-medium text-primary-400 text-center min-w-[250px]">{loadingText}</p>
                </div>
            </div>
        );
    }

    // ── Error / Empty ───
    if (error || !data?.questions) {
        return (
            <div className="flex flex-col items-center justify-center h-[400px] gap-5 animate-fade-in">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${error ? 'bg-red-500/10' : 'bg-surface-2'}`}>
                    {error ? <AlertCircle size={28} className="text-red-400" /> : <Presentation size={28} className="text-muted" />}
                </div>
                <div className="text-center">
                    <p className={`font-semibold text-lg mb-1 ${error ? 'text-red-400' : 'text-txt'}`}>{error ? "Lỗi tạo bài tập" : "Chưa có bài kiểm tra"}</p>
                    <p className="text-sm text-muted">{error ? "Vui lòng thử lại sau" : "Tạo bài kiểm tra từ nội dung tài liệu"}</p>
                </div>
                <button onClick={onGenerate} className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 rounded-xl hover:bg-primary-700 transition-all shadow-lg shadow-primary-600/20 active:scale-95 font-medium text-white">
                    <RefreshCw size={15} /> {error ? "Thử lại" : "Tạo Bài Kiểm Tra"}
                </button>
            </div>
        );
    }

    // ── Summary View ───
    if (view === 'summary') {
        const gradeColor = percent >= 80 ? 'emerald' : percent >= 50 ? 'amber' : 'red';
        const gradeMsg = percent === 100 ? 'Hoàn hảo!' : percent >= 80 ? 'Xuất sắc!' : percent >= 50 ? 'Khá tốt!' : 'Cần ôn thêm!';
        const gradeEmoji = percent === 100 ? '🏆' : percent >= 80 ? '🎉' : percent >= 50 ? '👍' : '💪';
        const unansweredCount = qLen - answeredCount;

        return (
            <div className="max-w-2xl mx-auto py-6 px-4 animate-fade-in">
                {/* Hero Section */}
                <div className={`relative rounded-2xl overflow-hidden mb-5 bg-gradient-to-br ${
                    gradeColor === 'emerald' ? 'from-emerald-600/20 via-emerald-500/5 to-transparent' :
                    gradeColor === 'amber' ? 'from-amber-600/20 via-amber-500/5 to-transparent' :
                    'from-red-600/20 via-red-500/5 to-transparent'
                } border border-line`}>
                    {/* Decorative circles */}
                    <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-primary-500/5" />
                    <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-primary-500/5" />

                    <div className="relative p-8 flex flex-col md:flex-row items-center gap-8">
                        {/* Circular Score */}
                        <div className="relative shrink-0">
                            <svg className="w-40 h-40 -rotate-90" viewBox="0 0 128 128">
                                <circle cx="64" cy="64" r="54" className="stroke-line" strokeWidth="6" fill="none" />
                                <circle
                                    cx="64" cy="64" r="54"
                                    className={`${gradeColor === 'emerald' ? 'stroke-emerald-500' : gradeColor === 'amber' ? 'stroke-amber-500' : 'stroke-red-500'}`}
                                    strokeWidth="6" fill="none"
                                    strokeDasharray={339} strokeDashoffset={339 - (percent / 100) * 339}
                                    strokeLinecap="round"
                                    style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-5xl font-black tracking-tight">{percent}<span className="text-2xl text-muted">%</span></span>
                            </div>
                        </div>

                        {/* Grade Info */}
                        <div className="flex-1 text-center md:text-left">
                            <p className="text-3xl font-extrabold mb-1">{gradeEmoji} {gradeMsg}</p>
                            <p className="text-muted mb-4">{data.title}</p>

                            {/* Stats pills */}
                            <div className="flex flex-wrap items-center gap-2 justify-center md:justify-start">
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    <CheckCircle2 size={13} /> {score} đúng
                                </span>
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                                    <XCircle size={13} /> {qLen - score - unansweredCount} sai
                                </span>
                                {unansweredCount > 0 && (
                                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-surface-2 text-muted border border-line">
                                        <Target size={13} /> {unansweredCount} bỏ qua
                                    </span>
                                )}
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-surface-2 text-muted border border-line">
                                    <Clock size={13} /> {formatTime(timer)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Score breakdown bar */}
                <div className="bg-surface border border-line rounded-xl p-4 mb-5">
                    <div className="flex items-center justify-between text-xs font-medium text-muted mb-2.5">
                        <span>Tỉ lệ trả lời</span>
                        <span>{score}/{qLen} câu đúng</span>
                    </div>
                    <div className="h-3 bg-surface-2 rounded-full overflow-hidden flex">
                        {score > 0 && (
                            <div className="h-full bg-emerald-500 transition-all duration-700 rounded-l-full" style={{ width: `${(score / qLen) * 100}%` }} />
                        )}
                        {(qLen - score - unansweredCount) > 0 && (
                            <div className="h-full bg-red-500 transition-all duration-700" style={{ width: `${((qLen - score - unansweredCount) / qLen) * 100}%` }} />
                        )}
                        {unansweredCount > 0 && (
                            <div className="h-full bg-line transition-all duration-700 rounded-r-full" style={{ width: `${(unansweredCount / qLen) * 100}%` }} />
                        )}
                    </div>
                    <div className="flex items-center gap-4 mt-2.5 text-[11px] font-medium">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Đúng</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Sai</span>
                        {unansweredCount > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-line" /> Bỏ qua</span>}
                    </div>
                </div>

                {/* Question Grid */}
                <div className="bg-surface border border-line rounded-xl p-4 mb-5">
                    <p className="text-xs text-muted font-semibold uppercase tracking-wider mb-3">Chi tiết từng câu</p>
                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                        {data.questions.map((q, i) => {
                            const correct = answers[i] === q.correctAnswerIndex;
                            const unanswered = answers[i] === undefined;
                            return (
                                <button
                                    key={i}
                                    onClick={() => { setView('review'); setCurrentIdx(i); }}
                                    title={`Câu ${i + 1}: ${unanswered ? 'Bỏ qua' : correct ? 'Đúng' : 'Sai'}`}
                                    className={`aspect-square rounded-lg text-xs font-bold transition-all hover:scale-110 hover:shadow-md flex items-center justify-center ${
                                        unanswered ? 'bg-surface-2 text-muted border border-line'
                                        : correct ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                        : 'bg-red-500/15 text-red-400 border border-red-500/30'
                                    }`}
                                >
                                    {unanswered ? <span className="opacity-40">{i + 1}</span> : correct ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button onClick={() => { setView('review'); setCurrentIdx(0); }} className="flex-1 py-3.5 rounded-xl border border-line hover:bg-surface-2 font-medium transition-all active:scale-[0.97] flex items-center justify-center gap-2 text-sm">
                        <Eye size={16} /> Xem lại đáp án
                    </button>
                    <button onClick={resetQuiz} className="flex-1 py-3.5 rounded-xl bg-primary-600 hover:bg-primary-700 font-medium transition-all active:scale-[0.97] shadow-lg shadow-primary-600/20 flex items-center justify-center gap-2 text-sm text-white">
                        <RotateCcw size={16} /> Làm lại
                    </button>
                </div>
            </div>
        );
    }

    // ── Quiz & Review View ───
    const currentQ = data.questions[currentIdx];
    const selectedOpt = answers[currentIdx];
    const isReview = view === 'review';

    return (
        <div className="h-full flex flex-col max-w-3xl mx-auto px-4 py-4">
            {/* Top Bar */}
            <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold truncate">{data.title || "Bài Kiểm Tra"}</h2>
                    {isReview && <p className="text-xs font-medium text-primary-400 mt-0.5">Chế độ xem lại — {score}/{qLen} đúng</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {!submitted && (
                        <span className="text-sm font-mono text-muted bg-surface-2 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                            <Clock size={13} /> {formatTime(timer)}
                        </span>
                    )}
                    <span className="text-sm font-medium text-muted bg-surface-2 px-2.5 py-1 rounded-lg">
                        {answeredCount}/{qLen}
                    </span>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="h-1.5 bg-surface-2 rounded-full mb-5 overflow-hidden">
                <div
                    className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-400 transition-all duration-500 ease-out"
                    style={{ width: `${((currentIdx + 1) / qLen) * 100}%` }}
                />
            </div>

            {/* Question Nav Pills */}
            <div className="flex flex-wrap gap-1.5 mb-5">
                {data.questions.map((q, i) => {
                    const isCurrent = i === currentIdx;
                    const correct = submitted && answers[i] === q.correctAnswerIndex;
                    const wrong = submitted && answers[i] !== undefined && answers[i] !== q.correctAnswerIndex;
                    const answered = answers[i] !== undefined;

                    let cls = 'w-8 h-8 rounded-lg text-[11px] font-bold transition-all ';
                    if (isCurrent) cls += 'bg-primary-600 text-white shadow-md shadow-primary-600/30 scale-105';
                    else if (correct) cls += 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25';
                    else if (wrong) cls += 'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25';
                    else if (answered) cls += 'bg-primary-500/15 text-primary-400 border border-primary-500/25 hover:bg-primary-500/25';
                    else cls += 'bg-surface-2 text-muted hover:bg-line';

                    return <button key={i} onClick={() => goTo(i)} className={cls}>{i + 1}</button>;
                })}
            </div>

            {/* Question Card */}
            <div className={`flex-1 overflow-y-auto pb-4 transition-opacity duration-150 ${animating ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'}`}>
                <div className="bg-surface border border-line rounded-2xl p-6 shadow-sm">
                    {/* Question */}
                    <div className="flex gap-3 mb-6">
                        <span className="shrink-0 w-10 h-10 rounded-xl bg-primary-500/10 text-primary-400 flex items-center justify-center font-bold text-sm">
                            {currentIdx + 1}
                        </span>
                        <p className="text-[16px] font-medium leading-relaxed pt-1.5">{currentQ.question}</p>
                    </div>

                    {/* Options */}
                    <div className="space-y-2.5">
                        {currentQ.options.map((opt, i) => {
                            const selected = selectedOpt === i;
                            const correct = i === currentQ.correctAnswerIndex;
                            const showResult = submitted || isReview;

                            let base = 'w-full text-left px-4 py-3.5 rounded-xl border-2 transition-all duration-200 flex items-center gap-3 group ';

                            if (!showResult) {
                                base += selected
                                    ? 'border-primary-500 bg-primary-500/10 shadow-sm shadow-primary-500/10'
                                    : 'border-line bg-surface-2 hover:border-primary-500/40 hover:bg-primary-500/5';
                            } else {
                                if (correct) base += 'border-emerald-500/50 bg-emerald-500/10';
                                else if (selected) base += 'border-red-500/50 bg-red-500/10';
                                else base += 'border-line bg-surface-2 opacity-40';
                            }

                            return (
                                <button key={i} onClick={() => handleSelect(i)} disabled={submitted} className={base}>
                                    {/* Letter badge */}
                                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                                        !showResult
                                            ? selected ? 'bg-primary-500 text-white' : 'bg-bg text-muted group-hover:text-primary-400'
                                            : correct ? 'bg-emerald-500 text-white' : selected ? 'bg-red-500 text-white' : 'bg-bg text-muted'
                                    }`}>
                                        {OPTION_LETTERS[i]}
                                    </span>

                                    <span className="flex-1 text-[15px]">{opt}</span>

                                    {/* Result icon */}
                                    {showResult && correct && <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />}
                                    {showResult && selected && !correct && <XCircle size={18} className="text-red-500 shrink-0" />}
                                </button>
                            );
                        })}
                    </div>

                    {/* Explanation */}
                    {(submitted || isReview) && currentQ.explanation && (
                        <div className={`mt-5 p-4 rounded-xl border text-sm ${selectedOpt === currentQ.correctAnswerIndex ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
                            <div className="flex items-center gap-2 mb-2">
                                <Sparkles size={14} className={selectedOpt === currentQ.correctAnswerIndex ? 'text-emerald-400' : 'text-amber-400'} />
                                <span className={`text-xs font-bold uppercase tracking-wider ${selectedOpt === currentQ.correctAnswerIndex ? 'text-emerald-400' : 'text-amber-400'}`}>
                                    Giải thích
                                </span>
                            </div>
                            <p className="leading-relaxed text-muted">{currentQ.explanation}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Nav */}
            <div className="flex items-center justify-between pt-4 border-t border-line mt-2">
                <button
                    onClick={() => goTo(currentIdx - 1)}
                    disabled={currentIdx === 0}
                    className="px-4 py-2.5 rounded-xl font-medium disabled:opacity-20 hover:bg-surface-2 transition-colors flex items-center gap-1.5 text-sm"
                >
                    <ChevronLeft size={16} /> Trước
                </button>

                {/* Center actions */}
                {isReview ? (
                    <button onClick={() => setView('summary')} className="px-5 py-2.5 bg-surface-2 border border-line rounded-xl text-sm font-medium hover:bg-line transition-all flex items-center gap-2">
                        <ListChecks size={15} /> Tổng kết
                    </button>
                ) : !submitted ? (
                    currentIdx === qLen - 1 ? (
                        <button onClick={handleSubmit} className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-xl font-bold shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-sm text-white flex items-center gap-2">
                            <Zap size={15} /> Nộp bài
                        </button>
                    ) : (
                        <span className="text-xs text-muted font-medium">{answeredCount} / {qLen} đã trả lời</span>
                    )
                ) : (
                    <button onClick={() => setView('summary')} className="px-5 py-2.5 bg-surface-2 border border-line rounded-xl text-sm font-medium hover:bg-line transition-all flex items-center gap-2">
                        <ListChecks size={15} /> Tổng kết
                    </button>
                )}

                <button
                    onClick={() => goTo(currentIdx + 1)}
                    disabled={currentIdx === qLen - 1}
                    className="px-4 py-2.5 rounded-xl font-medium disabled:opacity-20 hover:bg-surface-2 transition-colors flex items-center gap-1.5 text-sm"
                >
                    Tiếp <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
}