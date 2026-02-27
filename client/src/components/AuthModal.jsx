import { useState } from 'react';
import { X, User, Mail, Lock, Eye, EyeOff, LogIn, UserPlus, Loader2, ArrowLeft, CheckCircle2, MailCheck } from 'lucide-react';
import { register, login, forgotPassword, resendVerification } from '../api';

export default function AuthModal({ isOpen, onClose, onAuthSuccess, defaultTab = 'login' }) {
  const [tab, setTab] = useState(defaultTab); // 'login' | 'register' | 'forgot' | 'verify-notice'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  // Form fields
  const [formData, setFormData] = useState({
    login: '',
    username: '',
    email: '',
    password: '',
    displayName: '',
    forgotEmail: '',
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      let result;
      if (tab === 'login') {
        result = await login(formData.login, formData.password);
        onAuthSuccess(result.user);
        onClose();
      } else if (tab === 'register') {
        result = await register(
          formData.username,
          formData.email,
          formData.password,
          formData.displayName || formData.username
        );
        setRegisteredEmail(formData.email);
        onAuthSuccess(result.user);
        setTab('verify-notice');
      } else if (tab === 'forgot') {
        const resp = await forgotPassword(formData.forgotEmail);
        setSuccess(resp.message);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Đã xảy ra lỗi');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await resendVerification(registeredEmail);
      setSuccess(resp.message);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (newTab) => {
    setTab(newTab);
    setError('');
    setSuccess('');
    setFormData({ login: '', username: '', email: '', password: '', displayName: '', forgotEmail: '' });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-[#1a1d27] border border-[#2e3144] rounded-2xl shadow-2xl animate-fade-in">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-[#242736] transition-colors text-[#9496a1] hover:text-white"
        >
          <X size={18} />
        </button>

        {/* Verify Notice View */}
        {tab === 'verify-notice' && (
          <div className="px-6 py-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-600/20 flex items-center justify-center">
              <MailCheck size={32} className="text-primary-400" />
            </div>
            <h2 className="text-xl font-bold mb-2">Kiểm tra email của bạn!</h2>
            <p className="text-sm text-[#9496a1] mb-4 leading-relaxed">
              Chúng tôi đã gửi email xác minh đến <strong className="text-primary-400">{registeredEmail}</strong>.
              Vui lòng kiểm tra hộp thư (bao gồm thư rác) và nhấn vào link xác minh.
            </p>
            {error && (
              <div className="mb-3 px-4 py-2.5 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-3 px-4 py-2.5 bg-green-500/10 border border-green-500/30 rounded-lg text-sm text-green-400">
                {success}
              </div>
            )}
            <button
              onClick={handleResendVerification}
              disabled={loading}
              className="w-full py-2.5 bg-[#242736] hover:bg-[#2e3144] rounded-xl text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
              Gửi lại email xác minh
            </button>
            <button
              onClick={onClose}
              className="mt-3 text-sm text-[#9496a1] hover:text-white transition-colors"
            >
              Đóng
            </button>
          </div>
        )}

        {/* Forgot Password View */}
        {tab === 'forgot' && (
          <>
            <div className="px-6 pt-6 pb-4">
              <button
                onClick={() => switchTab('login')}
                className="flex items-center gap-1 text-sm text-[#9496a1] hover:text-white transition-colors mb-3"
              >
                <ArrowLeft size={14} /> Quay lại đăng nhập
              </button>
              <h2 className="text-xl font-bold font-display">Quên mật khẩu</h2>
              <p className="text-sm text-[#9496a1] mt-1">
                Nhập email để nhận link đặt lại mật khẩu
              </p>
            </div>

            {error && (
              <div className="mx-6 mb-3 px-4 py-2.5 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
                {error}
              </div>
            )}
            {success && (
              <div className="mx-6 mb-3 px-4 py-2.5 bg-green-500/10 border border-green-500/30 rounded-lg text-sm text-green-400 flex items-start gap-2">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-3">
              <InputField
                icon={<Mail size={16} />}
                name="forgotEmail"
                type="email"
                placeholder="Nhập email đã đăng ký"
                value={formData.forgotEmail}
                onChange={handleChange}
                autoFocus
              />
              <button
                type="submit"
                disabled={loading || !formData.forgotEmail}
                className="w-full py-3 bg-primary-600 hover:bg-primary-700 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary-600/25 mt-4"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Đang gửi...
                  </>
                ) : (
                  <>
                    <Mail size={16} /> Gửi link đặt lại
                  </>
                )}
              </button>
            </form>
          </>
        )}

        {/* Login / Register Views */}
        {(tab === 'login' || tab === 'register') && (
          <>
            {/* Header */}
            <div className="px-6 pt-6 pb-4">
              <h2 className="text-xl font-bold font-display text-center">
                {tab === 'login' ? 'Đăng nhập' : 'Đăng ký tài khoản'}
              </h2>
              <p className="text-sm text-[#9496a1] text-center mt-1">
                {tab === 'login'
                  ? 'Đăng nhập để có 5 lượt upload/ngày'
                  : 'Tạo tài khoản miễn phí để sử dụng nhiều hơn'}
              </p>
            </div>

            {/* Tabs */}
            <div className="flex mx-6 mb-4 bg-[#0f1117] rounded-lg p-1">
              <button
                onClick={() => switchTab('login')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${tab === 'login'
                    ? 'bg-primary-600 text-white shadow-lg'
                    : 'text-[#9496a1] hover:text-white'
                  }`}
              >
                <LogIn size={15} /> Đăng nhập
              </button>
              <button
                onClick={() => switchTab('register')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${tab === 'register'
                    ? 'bg-primary-600 text-white shadow-lg'
                    : 'text-[#9496a1] hover:text-white'
                  }`}
              >
                <UserPlus size={15} /> Đăng ký
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="mx-6 mb-3 px-4 py-2.5 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-3">
              {tab === 'login' ? (
                <>
                  <InputField
                    icon={<User size={16} />}
                    name="login"
                    placeholder="Tên đăng nhập hoặc email"
                    value={formData.login}
                    onChange={handleChange}
                    autoFocus
                  />
                  <InputField
                    icon={<Lock size={16} />}
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mật khẩu"
                    value={formData.password}
                    onChange={handleChange}
                    suffix={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[#9496a1] hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    }
                  />
                  <button
                    type="button"
                    onClick={() => switchTab('forgot')}
                    className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
                  >
                    Quên mật khẩu?
                  </button>
                </>
              ) : (
                <>
                  <InputField
                    icon={<User size={16} />}
                    name="username"
                    placeholder="Tên đăng nhập"
                    value={formData.username}
                    onChange={handleChange}
                    autoFocus
                  />
                  <InputField
                    icon={<Mail size={16} />}
                    name="email"
                    type="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={handleChange}
                  />
                  <InputField
                    icon={<User size={16} />}
                    name="displayName"
                    placeholder="Tên hiển thị (tuỳ chọn)"
                    value={formData.displayName}
                    onChange={handleChange}
                  />
                  <InputField
                    icon={<Lock size={16} />}
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mật khẩu (ít nhất 6 ký tự)"
                    value={formData.password}
                    onChange={handleChange}
                    suffix={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[#9496a1] hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    }
                  />
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-primary-600 hover:bg-primary-700 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary-600/25 mt-4"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Đang xử lý...
                  </>
                ) : tab === 'login' ? (
                  <>
                    <LogIn size={16} /> Đăng nhập
                  </>
                ) : (
                  <>
                    <UserPlus size={16} /> Đăng ký
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function InputField({ icon, suffix, ...props }) {
  return (
    <div className="relative flex items-center">
      <span className="absolute left-3 text-[#9496a1]">{icon}</span>
      <input
        {...props}
        className="w-full bg-[#0f1117] border border-[#2e3144] rounded-xl pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:border-primary-500/50 transition-colors placeholder:text-[#9496a1]/50"
      />
      {suffix && <span className="absolute right-3">{suffix}</span>}
    </div>
  );
}
