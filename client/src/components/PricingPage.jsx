import { useState } from 'react';
import {
  ArrowLeft, Check, Crown, Zap, Star, Package,
  Sparkles, Shield, Loader2, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { useLanguage } from '../LanguageContext';

const PLANS = [
  {
    key: 'free',
    name: 'Free',
    badge: '📦',
    price: 'Miễn phí',
    priceNote: 'mãi mãi',
    color: '#9496a1',
    bg: 'from-surface to-surface',
    border: 'border-line',
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
    bg: 'from-yellow-600/10 to-surface',
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
    bg: 'from-indigo-600/10 to-surface',
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
    bg: 'from-primary-600/10 to-surface',
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
  const { t } = useLanguage();
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
            {t('pricing.title')} <span className="gradient-text">NoteMinds</span>
          </h2>
          <p className="text-muted">{t('pricing.subtitle')}</p>
        </div>

        {/* Current plan badge */}
        {user && (
          <div className="mb-8 flex items-center justify-center gap-2">
            <span className="text-sm text-muted">{t('pricing.currentPlan')}</span>
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
                className={`relative bg-gradient-to-b ${plan.bg} border ${plan.popular ? plan.border : 'border-line'} rounded-2xl p-6 flex flex-col transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-black/10 ${isCurrent ? 'ring-2 ring-primary-500/50' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-full flex items-center gap-1">
                    <Sparkles size={12} /> {t('pricing.popular')}
                  </div>
                )}

                {isCurrent && (
                  <div className="absolute -top-3 right-4 px-3 py-1 bg-primary-600 text-white text-xs font-bold rounded-full">
                    {t('pricing.currentPlanBadge')}
                  </div>
                )}

                {/* Plan header */}
                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">{plan.badge}</span>
                    <h3 className="text-lg font-bold" style={{ color: plan.color }}>{plan.name}</h3>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold">{plan.price}</span>
                    <span className="text-xs text-muted">{plan.priceNote}</span>
                  </div>
                </div>

                {/* Features */}
                <div className="flex-1 space-y-3 mb-6">
                  {plan.features.map((feat, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-sm">
                      <Check size={15} className="shrink-0 mt-0.5" style={{ color: plan.color }} />
                      <span className="text-muted">{feat}</span>
                    </div>
                  ))}
                  {plan.limitations.map((lim, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-sm text-muted/60">
                      <span className="shrink-0 mt-0.5 w-[15px] text-center">✕</span>
                      <span>{lim}</span>
                    </div>
                  ))}
                </div>

                {/* CTA button */}
                <button
                  onClick={() => handleSelectPlan(plan.key)}
                  disabled={isCurrent}
                  className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${isCurrent
                    ? 'bg-surface-2 text-muted cursor-default'
                    : isDowngrade
                      ? 'bg-surface-2 text-muted hover:bg-line'
                      : plan.popular
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25'
                        : 'bg-surface-2 hover:bg-line text-txt'
                    }`}
                >
                  {isCurrent ? t('pricing.inUse') : !user ? t('pricing.loginToSelect') : isDowngrade ? t('pricing.downgrade') : t('pricing.upgrade')}
                </button>
              </div>
            );
          })}
        </div>

        {/* FAQ / Info */}
        <div className="mt-16 max-w-3xl mx-auto" id="faq">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-extrabold font-display tracking-tight mb-2">{t('pricing.faq')}</h3>
            <p className="text-sm text-muted">{t('pricing.faqSubtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Cột 1 - Sản phẩm */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-primary-400 uppercase tracking-wider px-1 mb-1">{t('pricing.aboutProduct')}</p>
              <FaqItem
                q="NoteMinds hoạt động như thế nào?"
                a="Bạn chỉ cần upload tài liệu (PDF, Word, PowerPoint, Excel, ảnh, ghi âm...), AI sẽ tự động phân tích và tạo Sơ đồ tư duy, Flashcard, Quiz và cho phép bạn Chat hỏi đáp trực tiếp với nội dung tài liệu."
              />
              <FaqItem
                q="Hỗ trợ những định dạng file nào?"
                a="NoteMinds hỗ trợ PDF, DOCX, PPTX, XLSX, TXT, MD, và các file ảnh (JPG, PNG — dùng OCR). Ngoài ra còn hỗ trợ file ghi âm MP3, WAV, M4A, OGG, WEBM với tính năng phiên âm tự động."
              />
              <FaqItem
                q="Flashcard có xuất sang Anki/Quizlet được không?"
                a="Có! Bạn có thể export flashcard sang định dạng Anki (.apkg) hoặc Quizlet-compatible CSV chỉ với 1 click."
              />
              <FaqItem
                q="Dữ liệu của tôi có an toàn không?"
                a="Hoàn toàn an toàn. Toàn bộ dữ liệu được mã hóa end-to-end (AES-256). Tài liệu của bạn chỉ bạn mới có thể truy cập, ngay cả admin cũng không thể đọc nội dung."
              />
            </div>

            {/* Cột 2 - Thanh toán & Tài khoản */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-accent-400 uppercase tracking-wider px-1 mb-1">{t('pricing.paymentAccount')}</p>
              <FaqItem
                q="Thanh toán bằng cách nào?"
                a="NoteMinds hỗ trợ thanh toán qua chuyển khoản ngân hàng, MoMo và ZaloPay. Sau khi thanh toán, admin sẽ kích hoạt gói cho bạn trong vòng 5 phút."
              />
              <FaqItem
                q="Có thể hủy gói bất cứ lúc nào không?"
                a="Có. Bạn có thể liên hệ admin để hủy gói. Gói sẽ tiếp tục hoạt động cho đến khi hết thời hạn đã thanh toán, không bị cắt giữa chừng."
              />
              <FaqItem
                q="Upload không giới hạn nghĩa là gì?"
                a="Gói Unlimited cho phép bạn upload không giới hạn số lượng file trong ngày, không bị ràng buộc bởi quota hàng ngày. File size tối đa cũng được nâng lên đáng kể."
              />
              <FaqItem
                q="Gói Free có bị giới hạn tính năng không?"
                a="Gói Free vẫn được truy cập đầy đủ các tính năng cốt lõi: Sơ đồ tư duy, Flashcard, Chat AI, Quiz. Chỉ giới hạn về số lượt upload mỗi ngày và dung lượng file."
              />
            </div>
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
    <div className={`bg-surface border rounded-xl overflow-hidden transition-colors duration-300 ${open ? 'border-primary-500/30 shadow-sm shadow-primary-500/5' : 'border-line'}`}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-5 py-3.5 text-left gap-3 group">
        <span className="text-sm font-medium group-hover:text-primary-400 transition-colors">{q}</span>
        <span className={`text-muted transition-transform duration-300 shrink-0 ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      <div className={`grid transition-all duration-300 ease-in-out ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden">
          <div className="px-5 pb-4 text-sm text-muted border-t border-line pt-3 leading-relaxed">
            {a}
          </div>
        </div>
      </div>
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
      <div className="relative w-full max-w-sm bg-surface border border-line rounded-2xl shadow-2xl animate-fade-in p-6 text-center">
        <div className="text-4xl mb-3">{plan.badge}</div>
        <h3 className="text-lg font-bold mb-1">
          {isDowngrade ? `Hạ xuống gói ${plan.name}` : `Nâng cấp gói ${plan.name}`}
        </h3>
        <p className="text-muted text-sm mb-4">{plan.price} {plan.priceNote}</p>

        {isDowngrade ? (
          <div className="bg-bg rounded-xl p-4 mb-4 text-left space-y-2">
            <p className="text-sm font-medium text-yellow-400">Lưu ý khi hạ gói:</p>
            <p className="text-xs text-muted">• Gói hiện tại sẽ được sử dụng đến hết thời hạn đã thanh toán</p>
            <p className="text-xs text-muted">• Sau khi hết hạn, tài khoản sẽ tự động chuyển sang gói {plan.name}</p>
            <p className="text-xs text-muted">• Vui lòng liên hệ admin để yêu cầu hạ gói</p>
            <div className="border-t border-line pt-2 mt-2">
              <p className="text-xs text-muted">Liên hệ qua <strong className="text-txt">Zalo/Telegram</strong> hoặc email admin để được hỗ trợ</p>
            </div>
          </div>
        ) : (
          <div className="bg-bg rounded-xl p-4 mb-4 text-left space-y-2">
            <p className="text-sm font-medium text-primary-400">Hướng dẫn thanh toán:</p>
            <p className="text-xs text-muted">1. Chuyển khoản <strong className="text-txt">{plan.price}</strong> đến tài khoản bên dưới</p>
            <p className="text-xs text-muted">2. Nội dung chuyển khoản: <strong className="text-txt font-mono">NOTEMIND [username]</strong></p>
            <p className="text-xs text-muted">3. Admin sẽ kích hoạt gói trong vòng 5 phút</p>

            <div className="border-t border-line pt-2 mt-2">
              <p className="text-xs text-muted">Ngân hàng: <strong className="text-txt">MB Bank</strong></p>
              <p className="text-xs text-muted">STK: <strong className="text-txt font-mono">0123456789</strong></p>
              <p className="text-xs text-muted">Tên: <strong className="text-txt">NGUYEN VAN A</strong></p>
            </div>
          </div>
        )}

        <p className="text-xs text-muted mb-4">
          Hoặc liên hệ qua Zalo/Telegram để được hỗ trợ nhanh nhất
        </p>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 rounded-xl text-sm font-semibold transition-colors"
        >
          {t('pricing.understood')}
        </button>
      </div>
    </div>
  );
}
