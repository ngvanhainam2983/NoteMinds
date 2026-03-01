import { Sparkles, ArrowDown, Brain, CreditCard, MessageCircle, Zap } from 'lucide-react';

export default function Hero() {
  const scrollToUpload = () => {
    document.getElementById('upload')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-primary-600/8 rounded-full blur-[100px] animate-float" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-accent-500/8 rounded-full blur-[100px] animate-float" style={{ animationDelay: '3s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 pt-24 pb-12 text-center z-10">
        {/* Badge */}
        <div className="inline-flex items-center gap-2.5 bg-surface/60 backdrop-blur-xl border border-line/50 rounded-full px-5 py-2.5 mb-10 shadow-xl shadow-primary-900/10 hover:shadow-primary-900/20 transition-shadow">
          <div className="relative">
            <div className="w-2 h-2 rounded-full bg-primary-400" />
            <div className="absolute inset-0 w-2 h-2 rounded-full bg-primary-400 animate-ping" />
          </div>
          <span className="text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-accent-400">Trợ lý học tập AI tự động 100%</span>
        </div>

        {/* Heading */}
        <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold font-display leading-[1.08] mb-7 tracking-tight">
          Biến tài liệu thành{' '}
          <span className="relative inline-block">
            <span className="absolute -inset-2 rounded-xl bg-gradient-to-r from-primary-600 to-accent-600 opacity-20 blur-2xl animate-pulse"></span>
            <span className="relative gradient-text">kiến thức</span>
          </span>
          <br />chỉ trong vài phút
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-muted max-w-2xl mx-auto mb-10 leading-relaxed">
          Upload bài giảng PDF hoặc file dạng text — NoteMinds sẽ tự động tạo
          <strong className="text-txt font-medium"> Sơ đồ tư duy</strong>,{' '}
          <strong className="text-txt font-medium">Flashcard</strong> và cho phép bạn{' '}
          <strong className="text-txt font-medium">hỏi đáp trực tiếp</strong> với tài liệu một cách chuẩn xác.
        </p>

        {/* CTA Button */}
        <button
          onClick={scrollToUpload}
          className="group inline-flex items-center gap-2.5 px-8 py-4 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white rounded-2xl text-base font-semibold shadow-xl shadow-primary-600/25 hover:shadow-2xl hover:shadow-primary-600/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 mb-12"
        >
          <Zap size={20} className="group-hover:animate-pulse" />
          Bắt đầu ngay — Miễn phí
          <ArrowDown size={18} className="group-hover:translate-y-1 transition-transform" />
        </button>

        {/* Feature Pills */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {[
            { icon: Brain, label: 'Sơ đồ tư duy AI', color: 'primary' },
            { icon: CreditCard, label: 'Flashcard thông minh', color: 'accent' },
            { icon: MessageCircle, label: 'Chat với tài liệu', color: 'primary' },
          ].map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-2 bg-surface/50 backdrop-blur-sm border border-line/50 rounded-xl px-4 py-2.5 text-sm text-muted hover:text-txt hover:border-primary-500/30 transition-all"
            >
              <item.icon size={16} className={item.color === 'primary' ? 'text-primary-400' : 'text-accent-400'} />
              {item.label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
