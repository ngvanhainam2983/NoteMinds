import { useState } from 'react';
import {
  ArrowLeft, Check, Crown, Zap, Star, Package,
  Sparkles, Shield, Loader2, CheckCircle2, AlertCircle,
} from 'lucide-react';

const PLANS = [
  {
    key: 'free',
    name: 'Free',
    badge: '📦',
    price: 'Miễn phí',
    priceNote: 'mãi mãi',
    color: '#9496a1',
    bg: 'from-[#1a1d27] to-[#1a1d27]',
    border: 'border-[#2e3144]',
    popular: false,
    features: [
      '5 lượt upload / ngày',
      'Sơ đồ tư duy AI',
      'Flashcard thông minh',
      'Chat với tài liệu (10 tin/tài liệu)',
      'Hỗ trợ PDF, TXT, MD',
    ],
    limitations: [
      'Không hỗ trợ audio',
      'Giới hạn kích thước 10MB',
    ],
  },
  {
    key: 'basic',
    name: 'Basic',
    badge: '⭐',
    price: '49.000₫',
    priceNote: '/ tháng',
    color: '#fbbf24',
    bg: 'from-yellow-600/10 to-[#1a1d27]',
    border: 'border-yellow-500/30',
    popular: false,
    features: [
      '10 lượt upload / ngày',
      'Tất cả tính năng Free',
      'Chat với tài liệu (25 tin/tài liệu)',
      'Hỗ trợ file audio (MP3, WAV)',
      'Kích thước file lên đến 25MB',
      'Ưu tiên tốc độ xử lý',
    ],
    limitations: [],
  },
  {
    key: 'pro',
    name: 'Pro',
    badge: '💎',
    price: '99.000₫',
    priceNote: '/ tháng',
    color: '#818cf8',
    bg: 'from-indigo-600/10 to-[#1a1d27]',
    border: 'border-indigo-500/30',
    popular: true,
    features: [
      '30 lượt upload / ngày',
      'Tất cả tính năng Basic',
      'Chat với tài liệu (50 tin/tài liệu)',
      'Kích thước file lên đến 50MB',
      'Xử lý ưu tiên cao nhất',
      'Hỗ trợ DOCX, PPTX, XLSX',
      'Xuất Flashcard sang Anki',
    ],
    limitations: [],
  },
  {
    key: 'unlimited',
    name: 'Unlimited',
    badge: '👑',
    price: '199.000₫',
    priceNote: '/ tháng',
    color: 'var(--color-primary-500)',
    bg: 'from-primary-600/10 to-[#1a1d27]',
    border: 'border-primary-500/30',
    popular: false,
    features: [
      'Upload không giới hạn',
      'Tất cả tính năng Pro',
      'Không giới hạn kích thước',
      'Chat không giới hạn tin nhắn',
      'API access (sắp ra mắt)',
      'Hỗ trợ 1-1 ưu tiên',
    ],
    limitations: [],
  },
];

export default function PricingPage({ user, onLoginClick }) {
  const currentPlan = user?.plan || 'free';
  const [contactPlan, setContactPlan] = useState(null);
  const [showContact, setShowContact] = useState(false);

  const handleSelectPlan = (planKey) => {
    if (!user) {
      onLoginClick?.();
      return;
    }
    if (planKey === currentPlan) return;
    setContactPlan(planKey);
    setShowContact(true);
  };

  return (
    <section id="pricing" className="py-20">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold font-display mb-4">
            Bảng giá <span className="gradient-text">NoteMinds</span>
          </h2>
          <p className="text-[#9496a1]">Chọn gói phù hợp để tăng hiệu suất học tập</p>
        </div>

        {/* Current plan badge */}
        {user && (
          <div className="mb-8 flex items-center justify-center gap-2">
            <span className="text-sm text-[#9496a1]">Gói hiện tại:</span>
            <span
              className="px-3 py-1 rounded-full text-sm font-semibold"
              style={{
                backgroundColor: PLANS.find(p => p.key === currentPlan)?.color + '15',
                color: PLANS.find(p => p.key === currentPlan)?.color,
                border: `1px solid ${PLANS.find(p => p.key === currentPlan)?.color}30`,
              }}
            >
              {PLANS.find(p => p.key === currentPlan)?.badge} {PLANS.find(p => p.key === currentPlan)?.name}
            </span>
          </div>
        )}

        {/* Plans grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map((plan) => {
            const isCurrent = plan.key === currentPlan;
            const isDowngrade = PLANS.findIndex(p => p.key === plan.key) < PLANS.findIndex(p => p.key === currentPlan);

            return (
              <div
                key={plan.key}
                className={`relative bg-gradient-to-b ${plan.bg} border ${plan.popular ? plan.border : 'border-[#2e3144]'} rounded-2xl p-5 flex flex-col transition-all hover:scale-[1.02] hover:shadow-xl ${isCurrent ? 'ring-2 ring-primary-500/50' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-full flex items-center gap-1">
                    <Sparkles size={12} /> Phổ biến nhất
                  </div>
                )}

                {isCurrent && (
                  <div className="absolute -top-3 right-4 px-3 py-1 bg-primary-600 text-white text-xs font-bold rounded-full">
                    Đang dùng
                  </div>
                )}

                {/* Plan header */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{plan.badge}</span>
                    <h3 className="text-lg font-bold" style={{ color: plan.color }}>{plan.name}</h3>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold">{plan.price}</span>
                    <span className="text-xs text-[#9496a1]">{plan.priceNote}</span>
                  </div>
                </div>

                {/* Features */}
                <div className="flex-1 space-y-2.5 mb-5">
                  {plan.features.map((feat, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <Check size={15} className="shrink-0 mt-0.5" style={{ color: plan.color }} />
                      <span className="text-[#c8c9ce]">{feat}</span>
                    </div>
                  ))}
                  {plan.limitations.map((lim, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-[#666]">
                      <span className="shrink-0 mt-0.5 w-[15px] text-center">✕</span>
                      <span>{lim}</span>
                    </div>
                  ))}
                </div>

                {/* CTA button */}
                <button
                  onClick={() => handleSelectPlan(plan.key)}
                  disabled={isCurrent}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${isCurrent
                      ? 'bg-[#242736] text-[#9496a1] cursor-default'
                      : isDowngrade
                        ? 'bg-[#242736] text-[#9496a1] hover:bg-[#2e3144]'
                        : plan.popular
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/25'
                          : 'bg-[#242736] hover:bg-[#2e3144] text-white'
                    }`}
                >
                  {isCurrent ? '✓ Đang sử dụng' : !user ? 'Đăng nhập để mua' : isDowngrade ? 'Hạ gói' : 'Nâng cấp'}
                </button>
              </div>
            );
          })}
        </div>

        {/* FAQ / Info */}
        <div className="mt-12 max-w-2xl mx-auto">
          <h3 className="text-lg font-bold font-display text-center mb-6">Câu hỏi thường gặp</h3>
          <div className="space-y-3">
            <FaqItem q="Thanh toán bằng cách nào?" a="Hiện tại NoteMinds hỗ trợ thanh toán qua chuyển khoản ngân hàng, MoMo, ZaloPay. Sau khi thanh toán, admin sẽ kích hoạt gói cho bạn trong vòng 5 phút." />
            <FaqItem q="Có thể hủy gói bất cứ lúc nào không?" a="Có. Bạn có thể liên hệ admin để hủy gói. Gói sẽ hết hiệu lực khi hết thời hạn đã thanh toán." />
            <FaqItem q="Upload không giới hạn nghĩa là gì?" a="Gói Unlimited cho phép bạn upload không giới hạn số lượng file trong ngày, không bị ràng buộc bởi quota." />
            <FaqItem q="Dữ liệu của tôi có an toàn không?" a="File tải lên được xử lý tự động và xóa sau khi bạn rời trang. Chúng tôi không lưu trữ nội dung tài liệu của bạn." />
          </div>
        </div>
      </div>

      {/* Contact modal */}
      {showContact && (
        <ContactModal
          plan={PLANS.find(p => p.key === contactPlan)}
          currentPlan={currentPlan}
          onClose={() => setShowContact(false)}
        />
      )}
    </section>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-[#1a1d27] border border-[#2e3144] rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-5 py-3.5 text-left">
        <span className="text-sm font-medium">{q}</span>
        <span className={`text-[#9496a1] transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm text-[#9496a1] border-t border-[#2e3144] pt-3 animate-fade-in">
          {a}
        </div>
      )}
    </div>
  );
}

function ContactModal({ plan, currentPlan, onClose }) {
  if (!plan) return null;

  const PLAN_ORDER = ['free', 'basic', 'pro', 'unlimited'];
  const isDowngrade = PLAN_ORDER.indexOf(plan.key) < PLAN_ORDER.indexOf(currentPlan);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-[#1a1d27] border border-[#2e3144] rounded-2xl shadow-2xl animate-fade-in p-6 text-center">
        <div className="text-4xl mb-3">{plan.badge}</div>
        <h3 className="text-lg font-bold mb-1">
          {isDowngrade ? `Hạ xuống gói ${plan.name}` : `Nâng cấp gói ${plan.name}`}
        </h3>
        <p className="text-[#9496a1] text-sm mb-4">{plan.price} {plan.priceNote}</p>

        {isDowngrade ? (
          <div className="bg-[#0f1117] rounded-xl p-4 mb-4 text-left space-y-2">
            <p className="text-sm font-medium text-yellow-400">Lưu ý khi hạ gói:</p>
            <p className="text-xs text-[#9496a1]">• Gói hiện tại sẽ được sử dụng đến hết thời hạn đã thanh toán</p>
            <p className="text-xs text-[#9496a1]">• Sau khi hết hạn, tài khoản sẽ tự động chuyển sang gói {plan.name}</p>
            <p className="text-xs text-[#9496a1]">• Vui lòng liên hệ admin để yêu cầu hạ gói</p>
            <div className="border-t border-[#2e3144] pt-2 mt-2">
              <p className="text-xs text-[#9496a1]">Liên hệ qua <strong className="text-white">Zalo/Telegram</strong> hoặc email admin để được hỗ trợ</p>
            </div>
          </div>
        ) : (
          <div className="bg-[#0f1117] rounded-xl p-4 mb-4 text-left space-y-2">
            <p className="text-sm font-medium text-primary-400">Hướng dẫn thanh toán:</p>
            <p className="text-xs text-[#9496a1]">1. Chuyển khoản <strong className="text-white">{plan.price}</strong> đến tài khoản bên dưới</p>
            <p className="text-xs text-[#9496a1]">2. Nội dung chuyển khoản: <strong className="text-white font-mono">NOTEMIND [username]</strong></p>
            <p className="text-xs text-[#9496a1]">3. Admin sẽ kích hoạt gói trong vòng 5 phút</p>

            <div className="border-t border-[#2e3144] pt-2 mt-2">
              <p className="text-xs text-[#9496a1]">Ngân hàng: <strong className="text-white">MB Bank</strong></p>
              <p className="text-xs text-[#9496a1]">STK: <strong className="text-white font-mono">0123456789</strong></p>
              <p className="text-xs text-[#9496a1]">Tên: <strong className="text-white">NGUYEN VAN A</strong></p>
            </div>
          </div>
        )}

        <p className="text-xs text-[#9496a1] mb-4">
          Hoặc liên hệ qua Zalo/Telegram để được hỗ trợ nhanh nhất
        </p>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 rounded-xl text-sm font-semibold transition-colors"
        >
          Đã hiểu
        </button>
      </div>
    </div>
  );
}
