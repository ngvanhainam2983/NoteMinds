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

      <div className="relative max-w-4xl mx-auto px-4 pt-20 pb-8 text-center">
        <div className="inline-flex items-center gap-2 bg-primary-600/10 border border-primary-500/20 rounded-full px-4 py-2 mb-8 animate-fade-in">
          <Sparkles size={16} className="text-primary-400" />
          <span className="text-sm text-primary-300">AI-powered study assistant</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold font-display leading-tight mb-6 animate-slide-up">
          Biến tài liệu thành{' '}
          <span className="gradient-text">kiến thức</span>
          <br />chỉ trong vài phút
        </h1>

        <p className="text-lg text-[#9496a1] max-w-2xl mx-auto mb-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          Upload bài giảng PDF hoặc file ghi âm — NoteMinds sẽ tự động tạo
          <strong className="text-[#e4e5e9]"> Sơ đồ tư duy</strong>,{' '}
          <strong className="text-[#e4e5e9]">Flashcard</strong> và cho phép bạn{' '}
          <strong className="text-[#e4e5e9]">hỏi đáp trực tiếp</strong> với tài liệu.
        </p>

        <div className="flex items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <button
            onClick={scrollToUpload}
            className="group flex items-center gap-2.5 px-7 py-3.5 bg-primary-600 hover:bg-primary-700 rounded-xl text-base font-semibold transition-all shadow-lg shadow-primary-600/25 hover:shadow-primary-600/40 hover:-translate-y-0.5"
          >
            <Sparkles size={18} />
            Trải nghiệm ngay
            <ArrowDown size={16} className="group-hover:translate-y-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </section>
  );
}
