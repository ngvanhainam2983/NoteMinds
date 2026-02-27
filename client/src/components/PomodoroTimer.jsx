import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, X, Focus } from 'lucide-react';

export default function PomodoroTimer({ onClose }) {
    const [mode, setMode] = useState('focus'); // 'focus', 'shortBreak', 'longBreak'
    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const [isActive, setIsActive] = useState(false);
    const [cycles, setCycles] = useState(0);
    const timerRef = useRef(null);

    const MODES = {
        focus: { label: 'Tập trung', time: 25 * 60, color: 'text-primary-400', bg: 'bg-primary-500/10' },
        shortBreak: { label: 'Nghỉ ngắn', time: 5 * 60, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        longBreak: { label: 'Nghỉ dài', time: 15 * 60, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    };

    useEffect(() => {
        if (isActive && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            handleComplete();
        }
        return () => clearInterval(timerRef.current);
    }, [isActive, timeLeft]);

    const handleComplete = () => {
        setIsActive(false);
        clearInterval(timerRef.current);

        // Play sound notification
        try {
            const audio = new Audio('/notification.mp3'); // We'll assume a generic notification sound or use browser beep if not available
            audio.play().catch(() => { });
        } catch (err) { }

        // Auto-switch modes based on Pomodoro technique
        if (mode === 'focus') {
            const newCycles = cycles + 1;
            setCycles(newCycles);
            if (newCycles % 4 === 0) {
                switchMode('longBreak');
            } else {
                switchMode('shortBreak');
            }
        } else {
            switchMode('focus');
        }
    };

    const switchMode = (newMode) => {
        setMode(newMode);
        setTimeLeft(MODES[newMode].time);
        setIsActive(false);
    };

    const toggleTimer = () => setIsActive(!isActive);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const currentMode = MODES[mode];
    const progress = 100 - (timeLeft / currentMode.time) * 100;

    return (
        <div className="fixed bottom-6 right-6 z-50 w-72 bg-[#1a1d27] border border-[#2e3144] rounded-2xl shadow-xl shadow-black/40 overflow-hidden animate-in slide-in-from-bottom-5">
            {/* Top Bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#2e3144] bg-[#0f1117]/50">
                <div className="flex items-center gap-2">
                    <Focus size={16} className={currentMode.color} />
                    <span className="text-sm font-semibold">Focus Mode</span>
                </div>
                <button onClick={onClose} className="p-1 hover:bg-[#242736] rounded text-[#9496a1] hover:text-white transition-colors">
                    <X size={16} />
                </button>
            </div>

            {/* Main Content */}
            <div className="p-5">
                <div className="flex justify-center gap-1 mb-6 bg-[#0f1117] p-1 rounded-lg">
                    {Object.entries(MODES).map(([key, m]) => (
                        <button
                            key={key}
                            onClick={() => switchMode(key)}
                            className={`flex-1 py-1.5 text-[11px] font-medium rounded transition-colors ${mode === key ? `${m.bg} ${m.color}` : 'text-[#9496a1] hover:text-white'
                                }`}
                        >
                            {m.label}
                        </button>
                    ))}
                </div>

                <div className="text-center mb-6 relative">
                    {/* Progress Ring Background */}
                    <div className="absolute inset-0 flex items-center justify-center -z-10 opacity-10">
                        <svg viewBox="0 0 100 100" className="w-32 h-32 -rotate-90">
                            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="4" />
                            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="4"
                                strokeDasharray="283" strokeDashoffset={283 - (283 * progress) / 100}
                                className={currentMode.color} style={{ transition: 'stroke-dashoffset 1s linear' }} />
                        </svg>
                    </div>

                    <div className={`text-5xl font-bold font-mono tracking-wider ${currentMode.color}`}>
                        {formatTime(timeLeft)}
                    </div>
                    <p className="text-xs text-[#9496a1] mt-2">
                        {cycles > 0 && `Đã hoàn thành: ${cycles} chu kỳ`}
                    </p>
                </div>

                <div className="flex items-center justify-center gap-4">
                    <button
                        onClick={() => {
                            setIsActive(false);
                            setTimeLeft(currentMode.time);
                        }}
                        className="p-2.5 rounded-xl bg-[#2e3144] hover:bg-[#3e4154] text-white transition-colors"
                        title="Đặt lại"
                    >
                        <RotateCcw size={18} />
                    </button>
                    <button
                        onClick={toggleTimer}
                        className={`flex items-center justify-center w-14 h-14 rounded-2xl text-white shadow-lg transition-transform active:scale-95 ${isActive ? 'bg-[#2e3144] hover:bg-[#3e4154]' : 'bg-primary-600 hover:bg-primary-700'
                            }`}
                    >
                        {isActive ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
                    </button>
                </div>
            </div>
        </div>
    );
}
