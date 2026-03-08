import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft, Check, Crown, Zap, Star, Package,
  Sparkles, Shield, Loader2, CheckCircle2, AlertCircle,
  QrCode, Clock, Copy, CopyCheck, RefreshCw,
} from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { createPaymentOrder, checkPaymentOrder } from '../api';

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
                q={t('pricing.faqItems.q1')}
                a={t('pricing.faqItems.a1')}
              />
              <FaqItem
                q={t('pricing.faqItems.q2')}
                a={t('pricing.faqItems.a2')}
              />
              <FaqItem
                q={t('pricing.faqItems.q3')}
                a={t('pricing.faqItems.a3')}
              />
              <FaqItem
                q={t('pricing.faqItems.q4')}
                a={t('pricing.faqItems.a4')}
              />
            </div>

            {/* Cột 2 - Thanh toán & Tài khoản */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-accent-400 uppercase tracking-wider px-1 mb-1">{t('pricing.paymentAccount')}</p>
              <FaqItem
                q={t('pricing.faqItems.q5')}
                a={t('pricing.faqItems.a5')}
              />
              <FaqItem
                q={t('pricing.faqItems.q6')}
                a={t('pricing.faqItems.a6')}
              />
              <FaqItem
                q={t('pricing.faqItems.q7')}
                a={t('pricing.faqItems.a7')}
              />
              <FaqItem
                q={t('pricing.faqItems.q8')}
                a={t('pricing.faqItems.a8')}
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
          user={user}
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

function ContactModal({ plan, currentPlan, onClose, user }) {
  const { t } = useLanguage();
  if (!plan) return null;

  const PLAN_ORDER = ['free', 'basic', 'pro', 'unlimited'];
  const isDowngrade = PLAN_ORDER.indexOf(plan.key) < PLAN_ORDER.indexOf(currentPlan);

  if (isDowngrade) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-sm bg-surface border border-line rounded-2xl shadow-2xl animate-fade-in p-6 text-center">
          <div className="text-4xl mb-3">{plan.badge}</div>
          <h3 className="text-lg font-bold mb-1">{t('pricing.downgradeToName', { name: plan.name })}</h3>
          <p className="text-muted text-sm mb-4">{plan.price} {plan.priceNote}</p>
          <div className="bg-bg rounded-xl p-4 mb-4 text-left space-y-2">
            <p className="text-sm font-medium text-yellow-400">{t('pricing.downgradeNote')}</p>
            <p className="text-xs text-muted">• {t('pricing.downgradeDesc1')}</p>
            <p className="text-xs text-muted">• {t('pricing.downgradeDesc3', { name: plan.name })}</p>
            <p className="text-xs text-muted">• {t('pricing.downgradeDesc2')}</p>
            <div className="border-t border-line pt-2 mt-2">
              <p className="text-xs text-muted">{t('pricing.downgradeContact')}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 rounded-xl text-sm font-semibold transition-colors">
            {t('pricing.understood')}
          </button>
        </div>
      </div>
    );
  }

  return <PaymentModal plan={plan} user={user} onClose={onClose} />;
}

function PaymentModal({ plan, user, onClose }) {
  const { t } = useLanguage();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('creating'); // creating | pending | paid | expired | error
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const pollRef = useRef(null);
  const timerRef = useRef(null);

  // Create order on mount
  useEffect(() => {
    let cancelled = false;
    async function create() {
      try {
        setLoading(true);
        setError(null);
        const newOrder = await createPaymentOrder(plan.key);
        if (cancelled) return;
        setOrder(newOrder);
        setStatus('pending');
        setTimeLeft(Math.max(0, Math.floor((new Date(newOrder.expiredAt).getTime() - Date.now()) / 1000)));
      } catch (err) {
        if (cancelled) return;
        setError(err.response?.data?.error || err.message);
        setStatus('error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    create();
    return () => { cancelled = true; };
  }, [plan.key]);

  // Countdown timer
  useEffect(() => {
    if (status !== 'pending' || timeLeft <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setStatus('expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [status, timeLeft]);

  // Poll order status every 5 seconds
  useEffect(() => {
    if (status !== 'pending' || !order) return;
    pollRef.current = setInterval(async () => {
      try {
        const updated = await checkPaymentOrder(order.id);
        if (updated.status === 'paid') {
          setStatus('paid');
          clearInterval(pollRef.current);
        } else if (updated.status === 'expired' || updated.status === 'cancelled') {
          setStatus('expired');
          clearInterval(pollRef.current);
        }
      } catch {
        // silent — will retry next interval
      }
    }, 5000);
    return () => clearInterval(pollRef.current);
  }, [status, order]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(pollRef.current);
      clearInterval(timerRef.current);
    };
  }, []);

  const handleCopy = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }, []);

  const handleRetry = useCallback(async () => {
    setLoading(true);
    setError(null);
    setStatus('creating');
    try {
      const newOrder = await createPaymentOrder(plan.key);
      setOrder(newOrder);
      setStatus('pending');
      setTimeLeft(Math.max(0, Math.floor((new Date(newOrder.expiredAt).getTime() - Date.now()) / 1000)));
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  }, [plan.key]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const formatPrice = (amount) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + '₫';
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-surface border border-line rounded-2xl shadow-2xl animate-fade-in overflow-hidden">

        {/* Header */}
        <div className="p-5 pb-3 text-center border-b border-line">
          <div className="text-3xl mb-2">{plan.badge}</div>
          <h3 className="text-lg font-bold">
            {t('pricing.upgradeToName', { name: plan.name })}
          </h3>
          <p className="text-muted text-sm">{plan.price} {plan.priceNote}</p>
        </div>

        {/* Body */}
        <div className="p-5">

          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="animate-spin text-primary-500" size={32} />
              <p className="text-sm text-muted">{t('pricing.payment.creatingOrder')}</p>
            </div>
          )}

          {/* Error state */}
          {status === 'error' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <AlertCircle className="text-red-400" size={32} />
              <p className="text-sm text-red-400">{error}</p>
              <button onClick={handleRetry} className="flex items-center gap-2 px-4 py-2 bg-surface-2 hover:bg-line rounded-lg text-sm transition-colors">
                <RefreshCw size={14} /> {t('pricing.payment.retry')}
              </button>
            </div>
          )}

          {/* Payment success! */}
          {status === 'paid' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="text-emerald-400" size={36} />
              </div>
              <h4 className="text-lg font-bold text-emerald-400">{t('pricing.payment.success')}</h4>
              <p className="text-sm text-muted text-center">{t('pricing.payment.successDesc', { name: plan.name })}</p>
              <button onClick={() => { onClose(); window.location.reload(); }} className="mt-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 rounded-xl text-sm font-semibold transition-colors">
                {t('pricing.payment.continue')}
              </button>
            </div>
          )}

          {/* Expired */}
          {status === 'expired' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Clock className="text-yellow-400" size={32} />
              <h4 className="text-base font-bold text-yellow-400">{t('pricing.payment.expired')}</h4>
              <p className="text-sm text-muted text-center">{t('pricing.payment.expiredDesc')}</p>
              <button onClick={handleRetry} className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded-xl text-sm font-semibold transition-colors">
                <RefreshCw size={14} /> {t('pricing.payment.newOrder')}
              </button>
            </div>
          )}

          {/* Pending — show QR and payment details */}
          {status === 'pending' && order && (
            <div className="space-y-4">
              {/* QR Code */}
              {order.qrUrl && (
                <div className="flex justify-center">
                  <div className="bg-white rounded-xl p-3">
                    <img
                      src={order.qrUrl}
                      alt="Payment QR"
                      className="w-48 h-48 object-contain"
                      loading="eager"
                    />
                  </div>
                </div>
              )}

              {/* Timer */}
              <div className="flex items-center justify-center gap-2 text-sm">
                <Clock size={14} className="text-yellow-400" />
                <span className="text-muted">{t('pricing.payment.expiresIn')}</span>
                <span className={`font-mono font-bold ${timeLeft < 60 ? 'text-red-400' : 'text-yellow-400'}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>

              {/* Transfer details */}
              <div className="bg-bg rounded-xl p-4 space-y-2.5">
                <p className="text-xs font-semibold text-primary-400 uppercase tracking-wider mb-2">{t('pricing.payment.transferInfo')}</p>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">{t('pricing.bank')}</span>
                  <span className="font-semibold">{order.bankName}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">{t('pricing.accountNo')}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-semibold">{order.bankAccount}</span>
                    <button onClick={() => handleCopy(order.bankAccount)} className="p-1 hover:bg-surface-2 rounded transition-colors">
                      {copied ? <CopyCheck size={13} className="text-emerald-400" /> : <Copy size={13} className="text-muted" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">{t('pricing.accountName')}</span>
                  <span className="font-semibold">{order.accountName}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">{t('pricing.payment.amount')}</span>
                  <span className="font-bold text-primary-400">{formatPrice(order.amount)}</span>
                </div>

                <div className="border-t border-line pt-2.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">{t('pricing.payment.content')}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-primary-400">{order.transferContent}</span>
                      <button onClick={() => handleCopy(order.transferContent)} className="p-1 hover:bg-surface-2 rounded transition-colors">
                        {copied ? <CopyCheck size={13} className="text-emerald-400" /> : <Copy size={13} className="text-muted" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Warning */}
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
                <p className="text-xs text-yellow-400 leading-relaxed">
                  <AlertCircle size={12} className="inline mr-1 -mt-0.5" />
                  {t('pricing.payment.warning')}
                </p>
              </div>

              {/* Waiting indicator */}
              <div className="flex items-center justify-center gap-2 py-1">
                <Loader2 className="animate-spin text-primary-500" size={16} />
                <span className="text-xs text-muted">{t('pricing.payment.waiting')}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {status !== 'paid' && (
          <div className="px-5 pb-5">
            <button onClick={onClose} className="w-full py-2.5 bg-surface-2 hover:bg-line rounded-xl text-sm font-medium transition-colors text-muted">
              {t('pricing.payment.cancel')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
