import React from 'react';

interface FooterProps {
  setCurrentPage: (page: string) => void;
}

export default function Footer({ setCurrentPage }: FooterProps) {
  const navigateTo = (page: string, sectionId?: string) => {
    if (page === 'login' || page === 'signin') {
      setCurrentPage('login');
      return;
    }
    if (page === 'signup') {
      setCurrentPage('signup');
      return;
    }
    setCurrentPage(page);
    if (sectionId) {
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <footer style={styles.footer}>
      <div style={styles.container}>
        <div style={styles.footerInner}>
          
          {/* Brand Col */}
          <div style={styles.brandCol}>
            {/* Logo Section */}
            <div 
              style={styles.logoGroup} 
              onClick={() => navigateTo('home')}
            >
              <img 
                src="/logo1.png" 
                alt="SmartEdufy Logo" 
                style={styles.logoImage}
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <p style={styles.brandDesc}>Smart school management. Built for Africa.</p>
          </div>

          {/* Nav Links */}
          <div style={styles.linksRow}>
            <button style={styles.linkBtn} onClick={() => navigateTo('home')}>Home</button>
            <button style={styles.linkBtn} onClick={() => navigateTo('features')}>Features</button>
            <button style={styles.linkBtn} onClick={() => navigateTo('home', 'about')}>About</button>
            <button style={styles.linkBtn} onClick={() => navigateTo('pricing')}>Pricing</button>
            <button style={styles.linkBtn} onClick={() => navigateTo('home', 'faq')}>FAQ</button>
          </div>

          {/* Legal / Copyright */}
          <div style={styles.legalCol}>
            <p style={styles.copyText}>© 2026 SmartEdufy. Empowering African education with AI-driven school management.</p>
            <div style={styles.legalLinks}>
              <span style={styles.legalItem}>Privacy Policy</span>
              <span style={styles.dot}>•</span>
              <span style={styles.legalItem}>Terms of Service</span>
              <span style={styles.dot}>•</span>
              <span style={styles.legalItem}>Compliance</span>
              <span style={styles.dot}>•</span>
              <span style={styles.legalItem}>System Status</span>
            </div>
          </div>

        </div>
      </div>
    </footer>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  footer: {
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    backdropFilter: 'blur(16px)',
    borderTop: '1px solid rgba(255, 255, 255, 0.9)',
    padding: '40px 0',
    width: '100%',
    boxSizing: 'border-box',
    marginTop: '80px',
  },
  container: {
    maxWidth: '1280px',
    margin: '0 auto',
    padding: '0 24px',
    boxSizing: 'border-box',
  },
  footerInner: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '30px',
  },
  brandCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  logoGroup: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
  },
  logoImage: {
    height: '32px',
    width: 'auto',
    objectFit: 'contain',
  },
  brandDesc: {
    fontSize: '13px',
    color: '#64748B',
    margin: 0,
  },
  linksRow: {
    display: 'flex',
    gap: '24px',
    flexWrap: 'wrap',
  },
  linkBtn: {
    background: 'transparent',
    border: 'none',
    color: '#475569',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    padding: 0,
    transition: 'color 0.2s ease',
  },
  legalCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '6px',
  },
  copyText: {
    fontSize: '12px',
    color: '#64748B',
    margin: 0,
    textAlign: 'right',
  },
  legalLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '11px',
    color: '#64748B',
  },
  legalItem: {
    cursor: 'pointer',
  },
  dot: {
    color: '#CBD5E1',
  },
};
