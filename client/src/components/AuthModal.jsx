import { useState } from 'react';
import { X, User, Mail, Lock, Eye, EyeOff, LogIn, UserPlus, Loader2 } from 'lucide-react';
import { register, login } from '../api';

export default function AuthModal({ isOpen, onClose, onAuthSuccess, defaultTab = 'login' }) {
  const [tab, setTab] = useState(defaultTab); // 'login' | 'register'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Form fields
  const [formData, setFormData] = useState({
    login: '',
    username: '',
    email: '',
    password: '',
    displayName: '',
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let result;
      if (tab === 'login') {
        result = await login(formData.login, formData.password);
      } else {
        result = await register(
          formData.username,
          formData.email,
          formData.password,
          formData.displayName || formData.username
        );
      }
      onAuthSuccess(result.user);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Đã xảy ra lỗi');
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (newTab) => {
    setTab(newTab);
    setError('');
    setFormData({ login: '', username: '', email: '', password: '', displayName: '' });
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
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
              tab === 'login'
                ? 'bg-primary-600 text-white shadow-lg'
                : 'text-[#9496a1] hover:text-white'
            }`}
          >
            <LogIn size={15} /> Đăng nhập
          </button>
          <button
            onClick={() => switchTab('register')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
              tab === 'register'
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
