import React, { useState, useEffect, useRef } from 'react';
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
  const { login, setUser: setAuthUser } = useAuth();
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
  // School-name autocomplete: as the admin types, we search the backend's
  // public schools list (/auth/schools) and offer matching existing schools.
  // If the typed name matches an existing school they pick it; if NOT, the
  // form tells them the school isn't registered and points them to school
  // registration (school onboarding is separate from user registration).
  const [schoolSuggestions, setSchoolSuggestions] = useState<{ id: string; name: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [schoolExists, setSchoolExists] = useState<boolean | null>(null);
  // The school the user explicitly picked from the suggestions dropdown —
  // its id is what teacher/parent sign-up needs to join the school.
  const [pickedSchool, setPickedSchool] = useState<{ id: string; name: string } | null>(null);
  // The typed school is only "concluded" to not exist AFTER the user has
  // stopped typing (debounce) — while typing, partial matches act as hints
  // and the not-registered error stays suppressed.
  const [typingSchool, setTypingSchool] = useState<boolean>(false);
  const schoolTimer = useRef<number | null>(null);
  // Live email validation state (sign-up): format is validated on every
  // keystroke and existence is checked against the backend (debounced).
  const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid_format' | 'taken'>('idle');
  const emailCheckTimer = useRef<number | null>(null);
  const [allSchools, setAllSchools] = useState<{ id: string; name: string }[]>([]);
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  
  // Fetch the public schools list once for the sign-up autocomplete.
  useEffect(() => {
    let cancelled = false;
    api.get('/auth/schools')
      .then((res: any) => {
        if (cancelled) return;
        const list = (res?.data?.schools || []).map((s: any) => ({ id: s.id, name: s.name }));
        setAllSchools(list);
      })
      .catch(() => {
        /* public list unavailable — autocomplete silently degrades */
      });
    return () => { cancelled = true; };
  }, []);
  
  // Carousel slide state (0 = AI writeup, 1 = dashboard mockup)
  // `visibleSlide` drives the enter/exit animation: on slide change the old
  // content animates out first, then the new slide animates in.
  // Slide 0 shows a handwritten-style writeup about SmartEdufy's AI-powered
  // ecosystem that types itself in (handwriting animation), then the slider
  // advances to the dashboard mockup. Hovering pauses the rotation.
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const [visibleSlide, setVisibleSlide] = useState<number>(0);
  const [phase, setPhase] = useState<'in' | 'out'>('in');
  const [hovered, setHovered] = useState<boolean>(false);
  const heroRef = useRef<HTMLElement | null>(null);

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

  // Automatic rotation. WRITEUP_DURATION gives the handwriting animation
  // time to finish (~8s) before the slider moves to the mockup; MOCKUP_HOLD
  // is how long the mockup stays before cycling back. Hover pauses.
  const SLIDER_ENABLED = true;
  const WRITEUP_DURATION = 11000;
  const MOCKUP_HOLD = 8000;
  useEffect(() => {
    if (!SLIDER_ENABLED) return;
    if (hovered) return; // paused while the user hovers the hero panel
    const delay = currentSlide === 0 ? WRITEUP_DURATION : MOCKUP_HOLD;
    const t = setTimeout(() => {
      setCurrentSlide((prev) => (prev === 0 ? 1 : 0));
    }, delay);
    return () => clearTimeout(t);
  }, [currentSlide, hovered]);

  useEffect(() => {
    if (visibleSlide === currentSlide && phase === 'in') return;
    if (visibleSlide === currentSlide) return; // already transitioning in
    // Phase 1 — animate the current content out (300ms), then swap content
    // and animate the next slide in.
    setPhase('out');
    const t = setTimeout(() => {
      setVisibleSlide(currentSlide);
      setPhase('in');
    }, 300);
    return () => clearTimeout(t);
  }, [currentSlide, visibleSlide, phase]);

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

  // School-name autocomplete: filter the fetched school list as the user
  // types. Suggestions (hints) react instantly to every keystroke; the
  // "school doesn't exist" conclusion is DEBOUNCED — it only fires once the
  // user has stopped typing for 700ms AND no registered school matches.
  const handleSchoolNameChange = (value: string) => {
    setSchoolName(value);
    // Name changed by hand — the previously picked school no longer applies.
    setPickedSchool(null);
    // Mark the field as "still typing" — suppresses the not-found error.
    setTypingSchool(true);
    if (schoolTimer.current) window.clearTimeout(schoolTimer.current);
    schoolTimer.current = window.setTimeout(() => setTypingSchool(false), 700);

    const trimmed = value.trim().toLowerCase();
    if (!trimmed) {
      setSchoolSuggestions([]);
      setShowSuggestions(false);
      setSchoolExists(null);
      return;
    }
    const matches = allSchools.filter((s) =>
      s.name.toLowerCase().includes(trimmed),
    );
    setSchoolSuggestions(matches.slice(0, 6));
    // Hints (autocomplete) show whenever there are partial matches — the
    // not-registered error is a separate, role-specific signal below.
    setShowSuggestions(matches.length > 0);
    // Exact match (case-insensitive) → existing school; otherwise it's not
    // registered yet — flag it so the form can react appropriately.
    setSchoolExists(
      allSchools.some(
        (s) => s.name.toLowerCase() === trimmed,
      ),
    );
  };

  const pickSchool = (name: string) => {
    const picked = allSchools.find((s) => s.name === name) || null;
    setPickedSchool(picked);
    setSchoolName(name);
    setShowSuggestions(false);
    setSchoolExists(true);
    setTypingSchool(false);
    if (schoolTimer.current) window.clearTimeout(schoolTimer.current);
  };

  // ===== Live email validation (sign-up) =====
  // Format is checked on every keystroke; once the format is valid we debounce
  // a backend existence check so the user instantly knows if the email is
  // already registered (they should log in instead of signing up again).
  const emailFormatOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());

  useEffect(() => {
    if (activeNav !== 'Sign Up') return;
    const value = email.trim();
    if (emailCheckTimer.current) window.clearTimeout(emailCheckTimer.current);
    if (!value) {
      setEmailStatus('idle');
      return;
    }
    if (!emailFormatOk) {
      setEmailStatus('invalid_format');
      return;
    }
    setEmailStatus('checking');
    emailCheckTimer.current = window.setTimeout(async () => {
      try {
        const res = await api.get(`/auth/check-email?email=${encodeURIComponent(value)}`);
        setEmailStatus(res.data?.exists ? 'taken' : 'valid');
      } catch {
        // Availability check unavailable — format is still valid.
        setEmailStatus('valid');
      }
    }, 500);
    return () => {
      if (emailCheckTimer.current) window.clearTimeout(emailCheckTimer.current);
    };
  }, [email, activeNav, emailFormatOk]);

  const emailInvalid = emailStatus === 'invalid_format';
  const emailTaken = emailStatus === 'taken';

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (!emailFormatOk) {
      toast.error('Please enter a valid work / school email address');
      return;
    }
    if (emailTaken) {
      toast.error('An account with this email already exists. Please log in instead.');
      return;
    }
    // Route by the SELECTED role tab — never assume admin:
    //   Administrative → /auth/register-school (school + first admin)
    //   Teacher / Parent → /auth/register (role-specific account joined
    //   to the picked existing school).
    const isSchoolSignup = role === 'Administrative';
    const schoolId = pickedSchool?.id;
    if (!isSchoolSignup && !schoolId) {
      toast.error('Please pick your school from the suggestions before continuing');
      return;
    }
    setSubmitting(true);
    try {
      const res = isSchoolSignup
        ? await api.post('/auth/register-school', {
            schoolName: schoolName.trim(),
            adminName: fullName.trim(),
            email: email.trim().toLowerCase(),
            password,
          })
        : await api.post('/auth/register', {
            role: role === 'Teacher' ? 'TEACHER' : 'PARENT',
            name: fullName.trim(),
            email: email.trim().toLowerCase(),
            password,
            schoolId,
            idMode: 'AUTO',
          });
      // register-school creates a brand-new school + its FIRST admin, so the
      // account is always immediately valid — persist the session directly.
      try {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        localStorage.setItem('tenantId', res.data.user.schoolId);
      } catch {
        /* storage unavailable – ignore */
      }
      // Update React auth state so ProtectedRoute sees the user right
      // away — writing localStorage alone is not enough.
      if (setAuthUser) setAuthUser(res.data.user);
      api.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      api.defaults.headers.common['x-tenant-id'] = res.data.user.schoolId;
      toast.success('Account created! Welcome aboard 🎉');
      setTimeout(
        () =>
          navigate(
            isSchoolSignup
              ? '/admin'
              : role === 'Teacher' ? '/teacher/profile-setup' : '/parent',
            { replace: true },
          ),
        1200,
      );
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.pendingApproval) {
        // A second admin registering into an existing school must be
        // approved by an active admin first — no auto-login.
        toast.success(
          data?.message ||
            'Registration received — your account will be valid once an existing administrator approves it.',
        );
        setActiveNav('Sign In');
      } else {
        toast.error(data?.error || 'Could not create the account');
      }
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
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      padding: isMobile ? '2rem 1.25rem' : '2rem 3rem',
      position: 'relative',
      overflow: 'hidden',
      // On mobile only the right (form) section is shown — the hero panel is
      // hidden entirely so the login form is the first thing users see.
      display: isMobile ? 'none' : 'flex',
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
      // Brought down slightly from the vertical midpoint of the hero panel.
      marginTop: '1rem',
      marginBottom: 'auto',
      position: 'relative',
    },
    // Slide content wrapper — drives the enter/exit animation (opacity +
    // translate transitions between the 'in' and 'out' phases).
    slideContent: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: '100%',
      opacity: phase === 'in' ? 1 : 0,
      transform: phase === 'in' ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.98)',
      transition: 'opacity 0.3s ease, transform 0.3s ease',
      willChange: 'opacity, transform',
    },
     heroImgFirst: {
       // Mockup styling (per design spec): oversized so it slides under the
       // login form, offset right, pushed down, sidebar visible.
       width: '160%',
       maxWidth: 'none',
       height: 'auto',
       objectFit: 'contain',
       objectPosition: 'left center',
       marginLeft: '25rem',
       // Vertically centered: pulled up from the previous 9rem offset.
       marginTop: '0',
       zIndex: 1,
       position: 'relative',
       borderRadius: '10px',
       boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
     },
    // ===== AI writeup slide (slide 0) =====
    writeupSlide: {
      width: '100%',
      maxWidth: '520px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      textAlign: 'left',
      padding: '1rem 0.5rem',
    },
    writeupEyebrow: {
      fontSize: '0.75rem',
      fontWeight: 700,
      letterSpacing: '0.18em',
      textTransform: 'uppercase' as const,
      color: '#d946ef',
      marginBottom: '1rem',
    },
    writeupHeading: {
      // Elegant display serif for the headline
      fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
      fontSize: '2.1rem',
      fontWeight: 700,
      color: '#0f172a',
      lineHeight: 1.2,
      marginBottom: '1.25rem',
    },
    writeupBody: {
      // Handwriting font for the body — carries the "writing itself in"
      // feel together with the typewriter-style reveal.
      fontFamily: "'Caveat', 'Segoe Script', cursive",
      fontSize: '1.35rem',
      lineHeight: 1.55,
      color: '#475569',
      marginBottom: '1.5rem',
    },
    writeupCta: {
      fontFamily: "'Playfair Display', Georgia, serif",
      fontSize: '0.95rem',
      fontWeight: 600,
      color: '#2563eb',
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      padding: 0,
      borderBottom: '2px solid #2563eb',
      paddingBottom: '2px',
    },
    // ===== end AI writeup slide =====
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
      fontSize: isMobile ? '1.15rem' : '1.35rem',
      fontWeight: 700,
      color: '#0f172a',
      marginBottom: '0.75rem',
      lineHeight: 1.25,
      maxWidth: '460px',
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
    // ===== Mobile-only writeup (top of the Sign Up form) =====
    mobileWriteup: {
      textAlign: 'center' as const,
      marginBottom: '1.25rem',
      width: '100%',
    },
    mobileWriteupEyebrow: {
      fontSize: '0.72rem',
      fontWeight: 700,
      letterSpacing: '0.18em',
      textTransform: 'uppercase' as const,
      color: '#d946ef',
      margin: '0 0 0.5rem 0',
    },
    mobileWriteupHeading: {
      fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
      fontSize: '1.35rem',
      fontWeight: 700,
      color: '#0f172a',
      lineHeight: 1.25,
      margin: '0 0 0.5rem 0',
    },
    mobileWriteupBody: {
      fontFamily: "'Caveat', 'Segoe Script', cursive",
      fontSize: '1.05rem',
      lineHeight: 1.5,
      color: '#475569',
      margin: 0,
    },
    formLogo: {
      // Hidden on mobile — the header already carries the logo there.
      display: isMobile ? 'none' : 'flex',
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
      position: 'relative' as const,
    },
    // ===== School-name autocomplete / validation =====
    schoolNameHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    schoolRegLink: {
      fontSize: '0.75rem',
      fontWeight: 600,
      color: '#2563eb',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: 0,
    },
    suggestionsDropdown: {
      position: 'absolute' as const,
      top: '100%',
      left: 0,
      right: 0,
      zIndex: 20,
      backgroundColor: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
      overflow: 'hidden',
      marginTop: '2px',
    },
    suggestionItem: {
      display: 'block',
      width: '100%',
      textAlign: 'left' as const,
      padding: '0.55rem 0.9rem',
      fontSize: '0.85rem',
      color: '#1e293b',
      background: 'none',
      border: 'none',
      borderBottom: '1px solid #f1f5f9',
      cursor: 'pointer',
    },
    schoolNotFoundBox: {
      backgroundColor: '#fef2f2',
      border: '1px solid #fecaca',
      borderRadius: '8px',
      padding: '0.7rem 0.9rem',
      fontSize: '0.82rem',
      color: '#991b1b',
    },
    schoolNotFoundBtn: {
      display: 'inline-block',
      padding: '0.35rem 0.8rem',
      borderRadius: '6px',
      backgroundColor: '#ef4444',
      color: '#ffffff',
      fontSize: '0.78rem',
      fontWeight: 600,
      border: 'none',
      cursor: 'pointer',
    },
    emailErrorText: {
      margin: 0,
      fontSize: '0.78rem',
      color: '#ef4444',
      fontWeight: 500,
    },
    // ===== end autocomplete styles =====
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
    // Responsive: shrink text and padding as the screen gets narrower.
    padding: isMobile ? '6px 6px' : '8px 12px',
    fontSize: isMobile ? '0.7rem' : '0.85rem',
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
        /* Google Fonts for the AI writeup slide */
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Caveat:wght@500;600&display=swap');
        /* Handwriting entry — PER LINE, smooth (no jitter): each line is a
           nowrap block whose clip-path wipes left→right like being written,
           with a soft caret that fades out as the line completes. Lines are
           staggered by inline animation-delay. */
        .se-writeup-typed {
          display: block;
          white-space: nowrap;
          max-width: 100%;
          overflow: hidden;
          clip-path: inset(0 100% 0 0);
          animation: se-line-writing 1.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          position: relative;
        }
        .se-writeup-typed::after {
          content: '';
          position: absolute;
          top: 12%;
          bottom: 12%;
          right: 0;
          width: 2px;
          background: #d946ef;
          opacity: 0;
          animation: se-caret-glow 1.2s ease-in forwards;
          animation-delay: inherit;
        }
        @keyframes se-line-writing {
          from { clip-path: inset(0 100% 0 0); }
          to { clip-path: inset(0 0 0 0); }
        }
        /* Caret appears during the write, then softly fades as the line
           completes — no endless blinking, nothing noisy. */
        @keyframes se-caret-glow {
          0% { opacity: 0; }
          15% { opacity: 1; }
          80% { opacity: 1; }
          100% { opacity: 0; }
        }
        .se-writeup-fade {
          animation: se-fade-up 1s ease both;
        }
        .se-writeup-fade-late {
          animation: se-fade-up 1s ease 3.2s both;
        }
        @keyframes se-fade-up {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
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
          {/* Mobile: the nav is hidden — mobile users get just the logo
              header and the login form. */}
          {isMobile
            ? null
            : ['Sign In', 'Sign Up', 'Forgot Password', 'Reset Password'].map((item) => (
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
        {/* Left Hero Section — hover pauses the slider rotation */}
        <section
          style={styles.leftHeroSection}
          ref={heroRef}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {/* Home button — routes back to the landing page */}
          <button
            style={styles.homeBtn}
            onClick={() => (setCurrentPage ? setCurrentPage('home') : navigate('/'))}
          >
            <span style={styles.homeChevron}>‹</span> Home
          </button>

          {/* Carousel Dots */}
          {SLIDER_ENABLED && (
            <div style={styles.carouselDots}>
              <span style={getDotStyle(currentSlide === 0)} onClick={() => setCurrentSlide(0)} title="SmartEdufy AI"></span>
              <span style={getDotStyle(currentSlide === 1)} onClick={() => setCurrentSlide(1)} title="Dashboard"></span>
            </div>
          )}

          <div style={styles.heroImageContainer}>
            {/* Animated slide wrapper: fades/slides out on change, then the
                new slide animates up and in. */}
            <div style={styles.slideContent} key={visibleSlide}>
              {visibleSlide === 0 ? (
                <>
                  {/* SLIDE 1 — SmartEdufy AI writeup, vertically centered in
                      the hero panel, with a per-line handwriting reveal. */}
                  <div style={styles.writeupSlide}>
                    <p className="se-writeup-fade" style={styles.writeupEyebrow}>
                      SmartEdufy AI
                    </p>
                    <h2 className="se-writeup-fade" style={styles.writeupHeading}>
                      An AI-Powered Education Ecosystem
                    </h2>
                    {/* Handwriting animation runs line by line — each line
                        reveals in sequence with its own caret. */}
                    <p
                      className="se-writeup-typed"
                      style={{ ...styles.writeupBody, animationDelay: '0.2s' }}
                    >
                      AI-powered timetabling, testing and reporting
                    </p>
                    <p
                      className="se-writeup-typed"
                      style={{ ...styles.writeupBody, animationDelay: '1.6s' }}
                    >
                      — built for African schools of every size.
                    </p>
                    <button
                      className="se-writeup-fade-late"
                      style={styles.writeupCta}
                      onClick={() => (setCurrentPage ? setCurrentPage('features') : navigate('/'))}
                    >
                      Discover more →
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* SLIDE 2 — the dashboard mockup */}
                  <img
                    src="desktop1.jpeg"
                    alt="SmartEdufy Dashboard Preview"
                    style={styles.heroImgFirst}
                  />
                </>
              )}
            </div>
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
              <>
              {/* Mobile-only writeup — the hero panel (which carries the
                  AI writeup on desktop) is hidden on mobile, so introduce
                  the sign-up experience with a short writeup instead. */}
              {isMobile && (
                <div style={styles.mobileWriteup}>
                  <p style={styles.mobileWriteupEyebrow}>SmartEdufy AI</p>
                  <h2 style={styles.mobileWriteupHeading}>
                    An AI-Powered Education Ecosystem
                  </h2>
                  <p style={styles.mobileWriteupBody}>
                    AI-powered timetabling, testing and reporting — built
                    for African schools of every size.
                  </p>
                </div>
              )}
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
                  <div style={styles.schoolNameHeader}>
                    <label style={styles.label} htmlFor="schoolName">School Name</label>
                  {/* "Register a school →" link — only for the Administrative
                      role, and only once typing has settled with no match. */}
                    {role === 'Administrative' && schoolExists === false && !typingSchool && (
                      <button
                        type="button"
                        style={styles.schoolRegLink}
                        onClick={() => navigate('/register/school')}
                      >
                        Register a school →
                      </button>
                    )}
                  </div>
                  <input
                    id="schoolName"
                    type="text"
                    value={schoolName}
                    onChange={(e) => handleSchoolNameChange(e.target.value)}
                    onFocus={() => setShowSuggestions(schoolSuggestions.length > 0)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    style={styles.input}
                    autoComplete="off"
                    required
                  />
                  {/* Autocomplete dropdown — existing schools matching the
                      typed name. */}
                  {showSuggestions && (
                    <div style={styles.suggestionsDropdown}>
                      {schoolSuggestions.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          style={styles.suggestionItem}
                          onMouseDown={(e) => { e.preventDefault(); pickSchool(s.name); }}
                        >
                          {s.name}
                        </button>
                      ))}
                    </div>
                  )}
                  {/* Validation:
                        • Admins → the typed school isn't registered yet, so
                          they're nudged to school registration.
                        • Teachers / Parents → plain "school doesn't exist"
                          error; they can only join an existing school. */}
                  {schoolName.trim() !== '' && schoolExists === false && !typingSchool && (
                    role === 'Administrative' ? (
                      <div style={styles.schoolNotFoundBox}>
                        <p style={{ margin: 0, fontWeight: 600 }}>
                          “{schoolName.trim()}” is not a registered school yet.
                        </p>
                        <p style={{ margin: '4px 0 8px 0', fontSize: '0.8rem' }}>
                          Are you an admin setting up a new school? Register it first — school registration is separate from user sign-up.
                        </p>
                        <button
                          type="button"
                          style={styles.schoolNotFoundBtn}
                          onClick={() => navigate('/register/school')}
                        >
                          Register this school
                        </button>
                      </div>
                    ) : (
                      <div style={styles.schoolNotFoundBox}>
                        <p style={{ margin: 0, fontWeight: 600 }}>
                          School doesn't exist — “{schoolName.trim()}” is not a registered school.
                        </p>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem' }}>
                          Please pick a registered school from the suggestions, or contact your school admin.
                        </p>
                      </div>
                    )
                  )}
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label} htmlFor="signupEmail">Work / School Email</label>
                  <input
                    id="signupEmail"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={
                      emailInvalid || emailTaken
                        ? { ...styles.input, borderColor: '#ef4444' }
                        : emailStatus === 'valid'
                          ? { ...styles.input, borderColor: '#16a34a' }
                          : styles.input
                    }
                    required
                  />
                  {/* Live validation feedback while typing */}
                  {emailInvalid && (
                    <p style={styles.emailErrorText}>
                      Please enter a valid email address (e.g. you@school.edu.ng)
                    </p>
                  )}
                  {emailTaken && (
                    <p style={styles.emailErrorText}>
                      This email is already registered — try logging in instead.
                    </p>
                  )}
                  {emailStatus === 'checking' && !emailInvalid && !emailTaken && (
                    <p style={{ ...styles.emailErrorText, color: '#64748b' }}>
                      Checking email availability…
                    </p>
                  )}
                  {emailStatus === 'valid' && (
                    <p style={{ ...styles.emailErrorText, color: '#16a34a' }}>
                      ✓ Email looks good and is available
                    </p>
                  )}
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

                {/* Mobile: the top nav is hidden, so offer a sign-in
                    link directly under the sign-up form. */}
                {isMobile && (
                  <p style={styles.signupPrompt}>
                    Already have an account?{' '}
                    <button
                      type='button'
                      style={styles.signupLink}
                      onClick={() => setActiveNav('Sign In')}
                    >
                      Sign in
                    </button>
                  </p>
                )}
              </form>
              </>
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
