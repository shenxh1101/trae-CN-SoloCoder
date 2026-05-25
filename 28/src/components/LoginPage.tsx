import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Music, Lock, Smartphone, LogOut, User, Loader2, ExternalLink, AlertCircle } from 'lucide-react';
import { login, logout as apiLogout } from '@/services/apiWithFallback';
import type { User as UserType } from '@/services/api';
import { usePlayerStore } from '@/store/playerStore';
import { showToast } from '@/utils/notification';
import { cn } from '@/lib/utils';

interface LoginPageProps {
  onClose?: () => void;
  isModal?: boolean;
}

export function LoginPage({ onClose, isModal = false }: LoginPageProps) {
  const navigate = useNavigate();
  const setUser = usePlayerStore((state) => state.setUser);

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<{ phone?: string; password?: string }>({});

  const validate = (): boolean => {
    const newErrors: { phone?: string; password?: string } = {};

    if (!phone.trim()) {
      newErrors.phone = '请输入手机号';
    } else if (!/^1[3-9]\d{9}$/.test(phone.trim())) {
      newErrors.phone = '请输入正确的手机号';
    }

    if (!password) {
      newErrors.password = '请输入密码';
    } else if (password.length < 6) {
      newErrors.password = '密码长度不能少于6位';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validate()) return;

    setLoading(true);
    try {
      const data = await login(phone.trim(), password);

      if (data.code === 200 && data.profile) {
        const userData: UserType = {
          userId: data.profile.userId,
          nickname: data.profile.nickname,
          avatarUrl: data.profile.avatarUrl,
          signature: data.profile.signature,
          level: data.profile.level,
          listenSongs: data.profile.listenSongs,
        };

        setUser(userData);
        showToast({ message: '登录成功', type: 'success' });

        if (isModal && onClose) {
          onClose();
        } else {
          navigate('/');
        }
      } else {
        setError(data.message || '登录失败，请检查账号密码');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    window.open('https://music.163.com/#/user/forgot', '_blank');
  };

  const content = (
    <div className="w-full max-w-md mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-8"
      >
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-accent flex items-center justify-center shadow-lg shadow-accent-purple/30 animate-pulse-glow">
          <Music className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gradient mb-2">登录网易云音乐</h1>
        <p className="text-text-muted">使用你的网易云账号登录</p>
      </motion.div>

      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </motion.div>
        )}

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-text-secondary mb-2">
            手机号
          </label>
          <div className="relative">
            <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setErrors((prev) => ({ ...prev, phone: undefined }));
                setError('');
              }}
              placeholder="请输入手机号"
              className={cn(
                'w-full pl-10 pr-4 py-3 bg-bg-tertiary border rounded-xl text-text-primary placeholder-text-muted focus:outline-none transition-colors',
                errors.phone
                  ? 'border-red-500/50 focus:border-red-500'
                  : 'border-border-subtle focus:border-accent-purple/50'
              )}
              maxLength={11}
            />
          </div>
          {errors.phone && <p className="mt-1 text-xs text-red-400">{errors.phone}</p>}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-2">
            密码
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrors((prev) => ({ ...prev, password: undefined }));
                setError('');
              }}
              placeholder="请输入密码"
              className={cn(
                'w-full pl-10 pr-4 py-3 bg-bg-tertiary border rounded-xl text-text-primary placeholder-text-muted focus:outline-none transition-colors',
                errors.password
                  ? 'border-red-500/50 focus:border-red-500'
                  : 'border-border-subtle focus:border-accent-purple/50'
              )}
            />
          </div>
          {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password}</p>}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleForgotPassword}
            className="text-sm text-accent-cyan hover:text-accent-cyan/80 transition-colors flex items-center gap-1"
          >
            忘记密码？
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-gradient-accent text-white font-medium rounded-xl hover:opacity-90 transition-opacity btn-glow disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              登录中...
            </>
          ) : (
            '登录'
          )}
        </button>
      </motion.form>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-6 text-center text-xs text-text-muted"
      >
        登录即表示同意
        <a
          href="https://music.163.com/terms"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent-purple hover:underline mx-1"
        >
          用户协议
        </a>
        和
        <a
          href="https://music.163.com/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent-purple hover:underline mx-1"
        >
          隐私政策
        </a>
      </motion.p>
    </div>
  );

  if (isModal) {
    return <div className="p-6">{content}</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {content}
    </div>
  );
}

interface UserMenuProps {
  user: UserType | null;
  onLoginClick: () => void;
  className?: string;
}

export function UserMenu({ user, onLoginClick, className }: UserMenuProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const setUser = usePlayerStore((state) => state.setUser);
  const navigate = useNavigate();

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await apiLogout();
      setUser(null);
      showToast({ message: '已退出登录', type: 'success' });
      setShowMenu(false);
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      showToast({ message: '退出失败，请重试', type: 'error' });
    } finally {
      setLoggingOut(false);
    }
  };

  if (!user) {
    return (
      <button
        onClick={onLoginClick}
        className={cn(
          'flex items-center gap-2 px-4 py-2 bg-gradient-accent text-white rounded-full font-medium hover:opacity-90 transition-opacity btn-glow',
          className
        )}
      >
        <User className="w-4 h-4" />
        登录
      </button>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 p-1 rounded-full hover:bg-white/5 transition-colors"
      >
        <img
          src={user.avatarUrl}
          alt={user.nickname}
          className="w-8 h-8 rounded-full object-cover ring-2 ring-accent-purple/30"
        />
        <span className="hidden sm:block text-sm text-text-primary font-medium">
          {user.nickname}
        </span>
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute right-0 top-full mt-2 w-48 bg-bg-secondary border border-border-subtle rounded-xl shadow-2xl shadow-accent-purple/10 overflow-hidden z-50"
          >
            <div className="p-3 border-b border-border-subtle">
              <p className="text-sm font-medium text-text-primary truncate">{user.nickname}</p>
              {user.level !== undefined && (
                <p className="text-xs text-text-muted">Lv.{user.level}</p>
              )}
            </div>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-text-secondary hover:bg-white/5 hover:text-red-400 transition-colors disabled:opacity-50"
            >
              {loggingOut ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogOut className="w-4 h-4" />
              )}
              {loggingOut ? '退出中...' : '退出登录'}
            </button>
          </motion.div>
        </>
      )}
    </div>
  );
}

export function LoginModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-md bg-bg-secondary rounded-2xl border border-border-subtle shadow-2xl shadow-accent-purple/10 overflow-hidden"
      >
        <LoginPage onClose={onClose} isModal />
      </motion.div>
    </motion.div>
  );
}

export default LoginPage;
