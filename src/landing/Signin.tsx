import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

interface SigninProps {
  setCurrentPage?: (page: string) => void;
  initialAuth?: 'Sign In' | 'Sign Up';
}

export default function SmartEdufySignIn({ setCurrentPage, initialAuth = 'Sign In' }: SigninProps) {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [role, setRole] = useState<string>('Administrative');
  const [activeNav, setActiveNav] = useState<string>(initialAuth);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [agreeTerms, setAgreeTerms] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  
  // Form states
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [schoolName, setSchoolName] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  
  // Carousel slide state (0 = Slide 1, 1 = Slide 2)
  const [currentSlide, setCurrentSlide] = useState<number>(0);

  // Responsive state for mobile viewports
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const handleResize = () => {
      // Swaps layout behavior when screen width drops below 960px
      setIsMobile(window.innerWidth <= 960);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Automatic slide/scroll effect every 5 seconds (5000ms)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prevSlide) => (prevSlide === 0 ? 1 : 0));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // ===== REAL AUTH HANDLERS (wired to the SmartEdufy backend) =====

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);
    if (result.success && result.user) {
      toast.success('Login successful! Redirecting...');
      setTimeout(() => {
        navigate(`/${result.user!.role!.toLowerCase()}`);
      }, 1000);
    } else {
      toast.error(result.error || 'Login failed. Please check your credentials.');
    }
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/auth/register-school', {
        schoolName: schoolName.trim(),
        adminName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      // Persist the session directly from the signup response.
      try {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        localStorage.setItem('tenantId', res.data.user.schoolId);
      } catch {
        /* storage unavailable – ignore */
      }
      toast.success('School account created! Welcome aboard 🎉');
      setTimeout(() => navigate('/admin', { replace: true }), 1200);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error || 'Could not create the school account',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const styles: { [key: string]: React.CSSProperties } = {
    pageWrapper: {
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      backgroundColor: '#ffffff',
      color: '#1e293b',
    },
    topHeader: {
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: isMobile ? '0.75rem 1rem' : '1rem 3rem',
      borderBottom: '1px solid #f1f5f9',
      gap: isMobile ? '0.75rem' : '0',
    },
    logoGroup: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      fontWeight: 700,
      fontSize: '1.25rem',
      color: '#0f172a',
      background: 'none',
      border: 'none',
    },
    logoImg: {
      height: '32px',
      width: 'auto',
      objectFit: 'contain',
    },
    navLinks: {
      display: 'flex',
      backgroundColor: '#f1f5f9',
      padding: '4px',
      borderRadius: '8px',
      gap: '4px',
      maxWidth: '100%',
      overflowX: 'auto',
    },
    mainContent: {
      display: 'flex',
      // Stacks vertically on mobile, side-by-side on desktop
      flexDirection: isMobile ? 'column' : 'row',
      flex: 1,
    },
    leftHeroSection: {
      flex: 1,
      width: '100%',
      background: `
        radial-gradient(
          ellipse 90% 40% at 50% 0%,
          rgba(238, 190, 255, 0.48) 0%,
          transparent 75%
        ),
        radial-gradient(
          ellipse 90% 45% at 50% 100%,
          rgba(246, 213, 255, 0.55) 0%,
          transparent 75%
        ),
        linear-gradient(
          180deg,
          #fbf5ff 0%,
          #ffffff 48%,
          #fcf3ff 100%
        )
      `,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      padding: isMobile ? '2rem 1.25rem' : '2rem 3rem',
      position: 'relative',
      overflow: 'hidden',
    },
    homeBtn: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      padding: '0',
      backgroundColor: 'transparent',
      border: 'none',
      color: '#475569',
      fontSize: '0.95rem',
      fontWeight: 500,
      cursor: 'pointer',
      alignSelf: 'flex-start',
      marginBottom: '1rem',
      transition: 'color 0.2s ease',
    },
    homeChevron: {
      fontSize: '1.1rem',
      fontWeight: 300,
      lineHeight: 1,
      color: '#64748b',
    },
    heroImageContainer: {
      width: '100%',
      maxWidth: '620px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      marginTop: isMobile ? '1rem' : 'auto',
      marginBottom: isMobile ? '1rem' : 'auto',
      position: 'relative',
    },
     heroImgFirst: {
      width: '150%',
      maxWidth: 'none',
      height: 'auto',
      objectFit: 'contain',
      marginLeft: '25rem',
      zIndex: 1,
      position: 'relative',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      borderRadius: '8px',
    },
    // Second demo image style
   heroImgSecond: {
      width: '130%',
      maxWidth: 'none',
      height: 'auto',
      objectFit: 'contain',
      marginTop: '-9rem', // Adjusted higher up
      zIndex: 1,
      position: 'relative',
      borderRadius: '8px',
    },
    badge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '6px 14px',
      borderRadius: '20px',
      backgroundColor: '#ffffff',
      border: '1px solid #e2e8f0',
      fontSize: '0.8rem',
      fontWeight: 600,
      color: '#2563eb',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
      marginBottom: '1.25rem',
    },
    heroHeadline: {
      fontSize: isMobile ? '1.5rem' : '2rem',
      fontWeight: 700,
      color: '#0f172a',
      marginBottom: '0.75rem',
      lineHeight: 1.25,
      maxWidth: '500px',
    },
    highlightPink: {
      color: '#d946ef',
    },
    carouselDots: {
      display: 'flex',
      gap: '8px',
      margin: '0.75rem 0 1rem 0',
      alignItems: 'center',
    },
    rightFormSection: {
      flex: 1,
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: isMobile ? '2.5rem 1.25rem' : '3rem 2rem',
      backgroundColor: '#ffffff',
      backgroundImage: `
        repeating-conic-gradient(
          from -8deg at 50% 48%,
          rgba(148, 163, 184, 0.055) 0deg 7deg,
          transparent 7deg 14deg
        ),
        radial-gradient(
          ellipse at center,
          rgba(255, 255, 255, 0.1) 0%,
          rgba(255, 255, 255, 0.45) 75%,
          #ffffff 100%
        )
      `,
      backgroundPosition: 'center',
      backgroundSize: 'cover',
      backgroundRepeat: 'no-repeat',
    },
    formWrapper: {
      width: '100%',
      maxWidth: '440px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    },
    formHeader: {
      textAlign: 'center',
      marginBottom: '1.5rem',
      width: '100%',
    },
    formLogo: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem',
      fontSize: '1.35rem',
      fontWeight: 700,
      color: '#0f172a',
      marginBottom: '1rem',
    },
    h1Title: {
      fontSize: isMobile ? '1.5rem' : '1.75rem',
      fontWeight: 700,
      color: '#0f172a',
      marginBottom: '0.5rem',
    },
    subtitle: {
      fontSize: '0.875rem',
      color: '#64748b',
      lineHeight: '1.4',
    },
    roleSelector: {
      display: 'flex',
      backgroundColor: '#f1f5f9',
      padding: '4px',
      borderRadius: '8px',
      width: '100%',
      marginBottom: '1.5rem',
    },
    form: {
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.25rem',
    },
    formGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.35rem',
    },
    labelRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    label: {
      fontSize: '0.875rem',
      fontWeight: 600,
      color: '#1e293b',
    },
    forgotLink: {
      fontSize: '0.8rem',
      color: '#2563eb',
      textDecoration: 'none',
      fontWeight: 500,
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: 0,
    },
    input: {
      width: '100%',
      padding: '10px 14px',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      fontSize: '0.95rem',
      outline: 'none',
      boxSizing: 'border-box',
    },
    passwordWrapper: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
    },
    togglePasswordBtn: {
      position: 'absolute',
      right: '12px',
      background: 'none',
      border: 'none',
      color: '#64748b',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
    },
    validationHint: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '0.8rem',
      color: password.length >= 8 ? '#059669' : '#64748b',
      marginTop: '2px',
    },
    checkboxLabel: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '0.875rem',
      color: '#64748b',
      cursor: 'pointer',
      lineHeight: 1.4,
    },
    termsLink: {
      color: '#2563eb',
      textDecoration: 'none',
    },
    btnPrimary: {
      width: '100%',
      padding: '12px',
      backgroundColor: submitting ? '#93b4f5' : '#2563eb',
      color: '#ffffff',
      border: 'none',
      borderRadius: '24px',
      fontSize: '0.95rem',
      fontWeight: 600,
      cursor: submitting ? 'not-allowed' : 'pointer',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '8px',
      opacity: submitting ? 0.85 : 1,
      transition: 'background-color 0.2s ease',
    },
    btnSpinner: {
      width: '18px',
      height: '18px',
      border: '2.5px solid rgba(255, 255, 255, 0.35)',
      borderTopColor: '#ffffff',
      borderRadius: '50%',
      animation: 'se-spin 0.7s linear infinite',
    },
    divider: {
      display: 'flex',
      alignItems: 'center',
      textAlign: 'center',
      color: '#94a3b8',
      fontSize: '0.75rem',
      fontWeight: 600,
      margin: '0.5rem 0',
    },
    dividerLine: {
      flex: 1,
      height: '1px',
      backgroundColor: '#e2e8f0',
    },
    btnGoogle: {
      width: '100%',
      padding: '10px',
      backgroundColor: '#ffffff',
      color: '#1e293b',
      border: '1px solid #e2e8f0',
      borderRadius: '24px',
      fontSize: '0.9rem',
      fontWeight: 600,
      cursor: 'pointer',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '10px',
    },
    signupPrompt: {
      textAlign: 'center',
      fontSize: '0.875rem',
      color: '#64748b',
      marginTop: '0.5rem',
    },
    signupLink: {
      color: '#2563eb',
      textDecoration: 'none',
      fontWeight: 600,
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: 0,
      font: 'inherit',
    },
    bottomFooter: {
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: isMobile ? '1rem' : '1.25rem 3rem',
      borderTop: '1px solid #f1f5f9',
      fontSize: '0.8rem',
      color: '#64748b',
      gap: isMobile ? '0.75rem' : '0',
      textAlign: isMobile ? 'center' : 'left',
    },
    footerLinks: {
      display: 'flex',
      gap: '12px',
      alignItems: 'center',
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
    footerLink: {
      color: '#64748b',
      textDecoration: 'none',
    },
  };

  const getNavBtnStyle = (isActive: boolean): React.CSSProperties => ({
    border: 'none',
    background: isActive ? '#ffffff' : 'transparent',
    color: isActive ? '#2563eb' : '#64748b',
    fontSize: isMobile ? '0.75rem' : '0.875rem',
    fontWeight: 500,
    padding: isMobile ? '4px 10px' : '6px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    boxShadow: isActive ? '0 1px 3px rgba(0, 0, 0, 0.05)' : 'none',
    transition: 'all 0.2s ease',
  });

  const getRoleBtnStyle = (isActive: boolean): React.CSSProperties => ({
    flex: 1,
    border: 'none',
    background: isActive ? '#ffffff' : 'transparent',
    padding: '8px 12px',
    fontSize: '0.85rem',
    fontWeight: 500,
    color: isActive ? '#2563eb' : '#64748b',
    borderRadius: '6px',
    cursor: 'pointer',
    boxShadow: isActive ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
    transition: 'all 0.2s',
  });

  const getDotStyle = (isActive: boolean): React.CSSProperties => ({
    width: isActive ? '10px' : '8px',
    height: isActive ? '10px' : '8px',
    borderRadius: '50%',
    backgroundColor: isActive ? '#c084fc' : '#cbd5e1',
    cursor: 'pointer',
    transition: 'all 0.2s',
  });

  // Primary action button — swaps label for a spinner while a request runs.
  const primaryBtn = (label: string, type: 'submit' | 'button' = 'submit', onClick?: () => void) => (
    <button type={type} style={styles.btnPrimary} onClick={onClick} disabled={submitting}>
      {submitting ? (
        <>
          <span style={styles.btnSpinner} />
          Please wait...
        </>
      ) : (
        <>
          {label}
          {type === 'submit' && (
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          )}
        </>
      )}
    </button>
  );

  return (
    <div style={styles.pageWrapper}>
      <style>{`
        @keyframes se-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      {/* Top Header */}
      <header style={styles.topHeader}>
        <div style={styles.logoGroup}>
          <img
            src="/logo1.png"
            alt="SmartEdufy Logo"
            style={styles.logoImg}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const svgEl = e.currentTarget.nextElementSibling as HTMLElement;
              if (svgEl) svgEl.style.display = 'flex';
            }}
          />
          <div style={{ display: 'none', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M16 4L3 11L16 18L29 11L16 4Z" fill="#3B82F6" />
              <path d="M7 15.5V21.5L16 26.5L25 21.5V15.5L16 20.5L7 15.5Z" fill="#2563EB" />
            </svg>
            <span>SmartEdufy</span>
          </div>
        </div>

        <nav style={styles.navLinks}>
          {['Sign In', 'Sign Up', 'Forgot Password', 'Reset Password'].map((item) => (
            <button
              key={item}
              style={getNavBtnStyle(activeNav === item)}
              onClick={() => setActiveNav(item)}
            >
              {item}
            </button>
          ))}
        </nav>
      </header>

      {/* Main Body */}
      <main style={styles.mainContent}>
        {/* Left Hero Section */}
        <section style={styles.leftHeroSection}>
          <button
            style={styles.homeBtn}
            onClick={() => (setCurrentPage ? setCurrentPage('home') : navigate('/'))}
          >
            <span style={styles.homeChevron}>‹</span> Home
          </button>

          {/* Carousel Dots */}
          <div style={styles.carouselDots}>
            <span style={getDotStyle(currentSlide === 0)} onClick={() => setCurrentSlide(0)} title="Slide 1"></span>
            <span style={getDotStyle(currentSlide === 1)} onClick={() => setCurrentSlide(1)} title="Slide 2"></span>
          </div>

          <div style={styles.heroImageContainer}>
            {currentSlide === 0 ? (
              <>
                <div style={styles.badge}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  Trusted by Leading African Institutions
                </div>
                <h2 style={styles.heroHeadline}>
                  Empowering the <span style={styles.highlightPink}>next</span> generation of academic <span style={{ color: '#c084fc' }}>leaders</span>.
                </h2>
                <p style={{ color: '#64748b', fontSize: '0.95rem', maxWidth: '440px', lineHeight: 1.5 }}>
                  Streamline admissions, student tracking, communication, and examinations with a modern system built for scale.
                </p>
                <img
                  src="desktop1.jpeg"
                  alt="SmartEdufy Dashboard Preview"
                  style={styles.heroImgFirst}
                />
              </>
            ) : (
              <>
                <h2 style={styles.heroHeadline}>
                  Manage <span style={styles.highlightPink}>multiple</span> schools, campuses, and track operations across <span style={styles.highlightPink}>Nationwide</span>.
                </h2>
                <img
                  src="desktop2.png"
                  alt="SmartEdufy Nationwide Campuses Map"
                  style={styles.heroImgSecond}
                />
              </>
            )}
          </div>
        </section>

        {/* Right Form Section */}
        <section style={styles.rightFormSection}>
          <div style={styles.formWrapper}>
            <div style={styles.formHeader}>
              {activeNav === 'Sign In' && (
                <div style={styles.formLogo}>
                  <img
                    src="/logo1.png"
                    alt="SmartEdufy Logo"
                    style={styles.logoImg}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const svgEl = e.currentTarget.nextElementSibling as HTMLElement;
                      if (svgEl) svgEl.style.display = 'flex';
                    }}
                  />
                </div>
              )}
              <h1 style={styles.h1Title}>
                {activeNav === 'Sign In' && 'Sign in to SmartEdufy'}
                {activeNav === 'Sign Up' && ''}
                {activeNav === 'Forgot Password' && 'Reset your password'}
                {activeNav === 'Reset Password' && 'Set new password'}
              </h1>
              <p style={styles.subtitle}>
                {activeNav === 'Sign In' && 'Enter your school email and password to access your dashboard.'}
                {activeNav === 'Forgot Password' && 'Enter your registered email address to receive a recovery link.'}
                {activeNav === 'Reset Password' && 'Please enter your new secure password below.'}
              </p>
            </div>

            {/* Role Selector Pills */}
            {(activeNav === 'Sign In' || activeNav === 'Sign Up') && (
              <div style={styles.roleSelector}>
                {['Administrative', 'Teacher', 'Parent'].map((r) => (
                  <button
                    key={r}
                    style={getRoleBtnStyle(role === r)}
                    onClick={() => setRole(r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}

            {/* SIGN IN FORM */}
            {activeNav === 'Sign In' && (
              <form style={styles.form} onSubmit={handleSignIn}>
                <div style={styles.formGroup}>
                  <label style={styles.label} htmlFor="email">Email address</label>
                  <input
                    id="email"
                    type="email"
                    placeholder="name@school.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={styles.input}
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <div style={styles.labelRow}>
                    <label style={styles.label} htmlFor="password">Password</label>
                    <button type="button" style={styles.forgotLink} onClick={() => setActiveNav('Forgot Password')}>
                      Forgot password?
                    </button>
                  </div>
                  <div style={styles.passwordWrapper}>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={styles.input}
                      required
                    />
                    <button
                      type="button"
                      style={styles.togglePasswordBtn}
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  </div>
                </div>

                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  Remember me
                </label>

                {primaryBtn('Sign in')}

                <div style={styles.divider}>
                  <div style={styles.dividerLine}></div>
                  <span style={{ padding: '0 10px' }}>OR</span>
                  <div style={styles.dividerLine}></div>
                </div>

                <button type="button" style={styles.btnGoogle} onClick={() => toast('Google sign-in is coming soon')}>
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  Sign in with Google
                </button>

                <p style={styles.signupPrompt}>
                  Don't have an account?{' '}
                  <button type="button" style={styles.signupLink} onClick={() => setActiveNav('Sign Up')}>
                    Sign up
                  </button>
                </p>
              </form>
            )}

            {/* SIGN UP FORM */}
            {activeNav === 'Sign Up' && (
              <form style={styles.form} onSubmit={handleSignUp}>
                <div style={styles.formGroup}>
                  <label style={styles.label} htmlFor="fullName">Full Name</label>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    style={styles.input}
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label} htmlFor="schoolName">School Name</label>
                  <input
                    id="schoolName"
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    style={styles.input}
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label} htmlFor="signupEmail">Work / School Email</label>
                  <input
                    id="signupEmail"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={styles.input}
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label} htmlFor="signupPassword">Password</label>
                  <div style={styles.passwordWrapper}>
                    <input
                      id="signupPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={styles.input}
                      required
                    />
                    <button
                      type="button"
                      style={styles.togglePasswordBtn}
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  </div>
                  <div style={styles.validationHint}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                    At least 8 characters
                  </div>
                </div>

                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    required
                  />
                  <span>
                    I agree to the <a href="#terms" style={styles.termsLink}>Terms of Service</a> and <a href="#privacy" style={styles.termsLink}>Privacy Policy</a>.
                  </span>
                </label>

                {primaryBtn('Create account')}

                <div style={styles.divider}>
                  <div style={styles.dividerLine}></div>
                  <span style={{ padding: '0 10px' }}>OR</span>
                  <div style={styles.dividerLine}></div>
                </div>

                <button type="button" style={styles.btnGoogle} onClick={() => toast('Google sign-up is coming soon')}>
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  Sign up with Google
                </button>
              </form>
            )}

            {/* FORGOT PASSWORD FORM */}
            {activeNav === 'Forgot Password' && (
              <form style={styles.form} onSubmit={(e) => { e.preventDefault(); alert('Reset link sent to your email!'); setActiveNav('Reset Password'); }}>
                <div style={styles.formGroup}>
                  <label style={styles.label} htmlFor="forgotEmail">Email address</label>
                  <input
                    id="forgotEmail"
                    type="email"
                    placeholder="name@school.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={styles.input}
                    required
                  />
                </div>

                {primaryBtn('Send Reset Link')}

                <button
                  type="button"
                  style={{ ...styles.forgotLink, textAlign: 'center', width: '100%', marginTop: '0.5rem' }}
                  onClick={() => setActiveNav('Sign In')}
                >
                  Back to Sign In
                </button>
              </form>
            )}

            {/* RESET PASSWORD FORM */}
            {activeNav === 'Reset Password' && (
              <form style={styles.form} onSubmit={(e) => { e.preventDefault(); alert('Password successfully updated!'); setActiveNav('Sign In'); }}>
                <div style={styles.formGroup}>
                  <label style={styles.label} htmlFor="newPassword">New Password</label>
                  <input
                    id="newPassword"
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={styles.input}
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label} htmlFor="confirmPassword">Confirm Password</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={styles.input}
                    required
                  />
                </div>

                {primaryBtn('Reset Password')}

                <button
                  type="button"
                  style={{ ...styles.forgotLink, textAlign: 'center', width: '100%', marginTop: '0.5rem' }}
                  onClick={() => setActiveNav('Sign In')}
                >
                  Back to Sign In
                </button>
              </form>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={styles.bottomFooter}>
        <p>© 2026 SmartEdufy Technologies Ltd. All rights reserved. Built for African schools.</p>
        <div style={styles.footerLinks}>
          <a href="#privacy" style={styles.footerLink}>Privacy Policy</a>
          <span>•</span>
          <a href="#terms" style={styles.footerLink}>Terms of Service</a>
          <span>•</span>
          <a href="#security" style={styles.footerLink}>Security</a>
          <span>•</span>
          <a href="#contact" style={styles.footerLink}>Contact Support</a>
        </div>
      </footer>
    </div>
  );
}
