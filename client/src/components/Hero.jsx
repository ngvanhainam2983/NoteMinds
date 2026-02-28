import { Sparkles, ArrowDown } from 'lucide-react';

export default function Hero() {
  const scrollToUpload = () => {
    document.getElementById('upload')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 pt-20 pb-8 text-center z-10">
        <div className="inline-flex items-center gap-2 bg-[#1a1d27]/80 backdrop-blur-md border border-[#2e3144] rounded-full px-4 py-2 mb-8 animate-in fade-in slide-in-from-top-4 duration-700 shadow-xl shadow-primary-900/20">
          <div className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
          <span className="text-sm font-medium text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-accent-400">Trợ lý học tập AI tự động 100%</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold font-display leading-[1.1] mb-6 animate-in zoom-in-95 fade-in duration-700 delay-150">
          Biến tài liệu thành{' '}
          <span className="relative">
            <span className="absolute -inset-1 rounded-lg bg-gradient-to-r from-primary-600 to-accent-600 opacity-30 blur-lg animate-pulse"></span>
            <span className="relative text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-accent-400">kiến thức</span>
          </span>
          <br />chỉ trong vài phút
        </h1>

        <p className="text-base sm:text-lg text-[#9496a1] max-w-2xl mx-auto mb-10 animate-in slide-in-from-bottom-6 fade-in duration-700 delay-300">
          Upload bài giảng PDF hoặc file dạng text — NoteMinds sẽ tự động tạo
          <strong className="text-white font-medium"> Sơ đồ tư duy</strong>,{' '}
          <strong className="text-white font-medium">Flashcard</strong> và cho phép bạn{' '}
          <strong className="text-white font-medium">hỏi đáp trực tiếp</strong> với tài liệu một cách chuẩn xác.
        </p>

        <div className="flex items-center justify-center gap-4 animate-in slide-in-from-bottom-8 fade-in duration-700 delay-500">
          <button
            onClick={scrollToUpload}
            className="group relative inline-flex items-center justify-center gap-2.5 px-7 py-3.5 text-base font-semibold text-white transition-all duration-300 bg-primary-600 font-display rounded-2xl hover:bg-primary-500 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 focus:ring-offset-[#0f1117] overflow-hidden"
          >
            {/* Glossy gradient overlay */}
            <div className="absolute inset-0 w-full h-full bg-gradient-to-tr from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-out" />

            <Sparkles size={20} className="animate-pulse" />
            Trải nghiệm ngay
            <ArrowDown size={18} className="group-hover:translate-y-1 transition-transform" />

            {/* Outer Glow */}
            <div className="absolute inset-0 rounded-2xl ring-2 ring-primary-500/50 ring-offset-2 ring-offset-transparent group-hover:ring-primary-400 transition-all duration-300" />
          </button>
        </div>
      </div>
    </section>
  );
}
