import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import api from '../utils/api';
import logo from '../assets/full_logo.png';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

const AdminLoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { t } = useTranslation();

  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const token = useAuthStore((state) => state.token);
  const role = useAuthStore((state) => state.role);

  // Redirect if already authenticated
  useEffect(() => {
    if (token && role) {
      navigate(role === 'ADMIN' ? '/report/admin' : '/report', { replace: true });
    }
  }, [token, role, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      toast.error(t('auth.pleaseEnterCredentials'));
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post('/auth/admin/login', {
        email: email.trim(),
        password: password,
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      const { jwt, expertName, role: userRole } = response.data;
      setAuth(jwt, expertName, userRole);
      toast.success(t('auth.loginSuccess'));
      navigate(userRole === 'ADMIN' ? '/report/admin' : '/report', { replace: true });
    } catch (err) {
      toast.error(t('auth.loginFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Subtle background pattern */}
      <div style={styles.bgPattern} />

      <div style={styles.card}>
        {/* Logo / Brand */}
        <div style={styles.brandSection}>
          <div style={styles.logoIcon}>
            <img src={logo} alt="MyGutachter Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          {/* <h1 style={styles.brandTitle}>MyGutachter</h1> */}
          {/* <p style={styles.brandSubtitle}>{t('auth.adminPortal')}</p> */}
        </div>

        {/* Divider */}
        <div style={styles.divider} />

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Email Field */}
          <div style={styles.fieldGroup}>
            <label htmlFor="admin-email" style={styles.label}>{t('auth.emailAddress')}</label>
            <div style={styles.inputWrapper}>
              <svg style={styles.inputIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              <input
                id="admin-email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.enterEmail')}
                style={styles.input}
                autoComplete="email"
                autoFocus
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Password Field */}
          <div style={styles.fieldGroup}>
            <label htmlFor="admin-password" style={styles.label}>{t('auth.password')}</label>
            <div style={styles.inputWrapper}>
              <svg style={styles.inputIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth.enterPassword')}
                style={styles.input}
                autoComplete="current-password"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.togglePassword}
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              ...styles.submitBtn,
              ...(isLoading ? styles.submitBtnDisabled : {}),
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                (e.target as HTMLElement).style.background = '#D46A00';
                (e.target as HTMLElement).style.transform = 'translateY(-1px)';
                (e.target as HTMLElement).style.boxShadow = '0 6px 20px rgba(238, 119, 0, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                (e.target as HTMLElement).style.background = '#EE7700';
                (e.target as HTMLElement).style.transform = 'translateY(0)';
                (e.target as HTMLElement).style.boxShadow = '0 4px 14px rgba(238, 119, 0, 0.2)';
              }
            }}
          >
            {isLoading ? (
              <span style={styles.loadingContent}>
                <svg style={styles.spinner} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Authenticating...
              </span>
            ) : (
              t('auth.signIn')
            )}
          </button>

          {/* Forgot password */}
          <div style={{ textAlign: 'center', marginTop: '14px' }}>
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              style={{
                background: 'none',
                border: 'none',
                color: '#EE7700',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'none',
              }}
            >
              {t('auth.forgotPassword')}
            </button>
          </div>
        </form>

        {/* Footer */}
        <p style={styles.footerText}>
          {t('auth.authorizedOnly')}
        </p>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f5f5f5',
    padding: '20px',
    position: 'relative',
    overflow: 'hidden',
  },
  bgPattern: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `radial-gradient(circle at 25% 25%, rgba(30, 58, 95, 0.05) 0%, transparent 50%),
                       radial-gradient(circle at 75% 75%, rgba(238, 119, 0, 0.05) 0%, transparent 50%)`,
    pointerEvents: 'none',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    background: '#ffffff',
    borderRadius: '12px',
    padding: '40px 36px 32px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
    position: 'relative' as const,
    zIndex: 1,
    animation: 'scaleUp 0.3s ease-out',
  },
  brandSection: {
    textAlign: 'center' as const,
    marginBottom: '24px',
  },
  logoIcon: {
    width: '180px',
    height: 'auto',
    minHeight: '60px',
    margin: '0 auto 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: '24px',
    fontWeight: 800,
    color: '#1e3a5f',
    margin: '0 0 4px',
    fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
  },
  brandSubtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
  },
  divider: {
    height: '1px',
    background: '#e5e7eb',
    marginBottom: '28px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#374151',
    fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
  },
  inputWrapper: {
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute' as const,
    left: '14px',
    pointerEvents: 'none' as const,
    zIndex: 1,
  },
  input: {
    width: '100%',
    padding: '12px 44px 12px 42px',
    fontSize: '14px',
    fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    outline: 'none',
    background: '#ffffff',
    color: '#111827',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box' as const,
  },
  togglePassword: {
    position: 'absolute' as const,
    right: '12px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtn: {
    width: '100%',
    padding: '13px 24px',
    fontSize: '15px',
    fontWeight: 700,
    fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
    color: '#ffffff',
    background: '#EE7700',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 6px rgba(238, 119, 0, 0.2)',
    marginTop: '4px',
  },
  submitBtnDisabled: {
    opacity: 0.7,
    cursor: 'not-allowed',
    transform: 'none',
  },
  loadingContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  spinner: {
    animation: 'spin 1s linear infinite',
  },
  footerText: {
    textAlign: 'center' as const,
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '24px',
    marginBottom: 0,
    fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
  },
};

export default AdminLoginPage;
