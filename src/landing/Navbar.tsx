import { useState } from 'react';
import { Menu, X, ArrowRight } from 'lucide-react';

interface NavbarProps {
  currentPage: string;
  setCurrentPage: (page: string, sectionId?: string) => void;
}

export default function Navbar({
  currentPage,
  setCurrentPage,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNav = (page: string, sectionId?: string) => {
    setMobileMenuOpen(false);
    setCurrentPage(page, sectionId);
  };

  const navItems = [
    { label: 'Home', page: 'home', action: () => handleNav('home') },
    {
      label: 'About',
      page: 'home',
      section: 'about',
      action: () => handleNav('home', 'about'),
    },
    { label: 'Features', page: 'features', action: () => handleNav('features') },
    { label: 'Pricing', page: 'pricing', action: () => handleNav('pricing') },
    {
      label: 'FAQ',
      page: 'home',
      section: 'faq',
      action: () => handleNav('home', 'faq'),
    },
  ];

  const isActive = (item: (typeof navItems)[number]) => {
    if (item.section) return false;
    return currentPage === item.page;
  };

  return (
    <>
      <nav className="smart-navbar">
        <div className="navbar-container">
          <button
            className="navbar-logo"
            onClick={() => handleNav('home')}
            aria-label="Go to homepage"
          >
            <img
              src="/logo1.png"
              alt="SmartEdufy Logo"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            </button>

          <div className="navbar-links">
            {navItems.map((item) => (
              <button
                key={item.label}
                className={`navbar-link ${isActive(item) ? 'active' : ''}`}
                onClick={item.action}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* DESKTOP ACTIONS */}
          <div className="navbar-actions">
            <button
              className="navbar-login"
              onClick={() => handleNav('login')}
            >
              Login
            </button>

            <button
              className="navbar-signup"
              onClick={() => handleNav('signup')}
            >
              Sign up for free
              <ArrowRight size={16} />
            </button>
          </div>

          <button
            className="navbar-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* MOBILE NAVIGATION */}
        <div
          className={`mobile-navigation ${
            mobileMenuOpen ? 'mobile-navigation-open' : ''
          }`}
        >
          <div className="mobile-navigation-inner">
            {navItems.map((item) => (
              <button
                key={item.label}
                className={`mobile-nav-link ${isActive(item) ? 'active' : ''}`}
                onClick={item.action}
              >
                {item.label}
              </button>
            ))}

            <div className="mobile-navigation-actions">
              <button
                className="mobile-login"
                onClick={() => handleNav('login')}
              >
                Login
              </button>

              <button
                className="mobile-signup"
                onClick={() => handleNav('signup')}
              >
                Sign up for free
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <style>{`
        .smart-navbar, .smart-navbar * {
          box-sizing: border-box;
        }
        .smart-navbar {
          position: sticky;
          top: 0;
          left: 0;
          width: 100%;
          z-index: 1000;
          background: rgba(255, 255, 255, 0.88);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(226, 232, 240, 0.75);
          box-shadow: 0 4px 25px rgba(15, 23, 42, 0.035);
          font-family: Inter, system-ui, -apple-system, sans-serif;
        }
        .navbar-container {
          max-width: 1280px;
          width: 100%;
          min-height: 76px;
          margin: 0 auto;
          padding: 12px 30px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .navbar-logo {
          display: flex;
          align-items: center;
          gap: 8px;
          background: transparent;
          border: none;
          padding: 0;
          cursor: pointer;
        }
        .navbar-logo img {
          display: block;
          height: 38px;
          width: auto;
          max-width: 190px;
          object-fit: contain;
        }
        .logo-fallback-text {
          font-size: 1.25rem;
          font-weight: 700;
          color: #0f172a;
        }
        .navbar-links {
          display: flex;
          align-items: center;
          gap: 35px;
        }
        .navbar-link {
          position: relative;
          padding: 10px 0;
          background: transparent;
          border: none;
          color: #64748B;
          font-family: inherit;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: color 0.2s ease;
        }
        .navbar-link:hover, .navbar-link.active {
          color: #2563EB;
        }
        .navbar-link.active::after {
          content: '';
          position: absolute;
          left: 0;
          bottom: 2px;
          width: 100%;
          height: 2px;
          background: #2563EB;
          border-radius: 10px;
        }
        .navbar-actions {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        .navbar-login {
          background: transparent;
          border: none;
          color: #475569;
          font-family: inherit;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }
        .navbar-signup {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          padding: 12px 21px;
          background: linear-gradient(110deg, #2563EB, #1D4ED8);
          border: none;
          border-radius: 50px;
          color: white;
          font-family: inherit;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 5px 15px rgba(37, 99, 235, 0.22);
        }
        .navbar-menu-toggle {
          display: none;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          background: rgba(241, 245, 249, 0.8);
          border: 1px solid #E2E8F0;
          border-radius: 11px;
          color: #0F172A;
          cursor: pointer;
        }
        .mobile-navigation {
          display: none;
          width: 100%;
          background: rgba(255, 255, 255, 0.97);
          backdrop-filter: blur(20px);
          border-top: 1px solid #F1F5F9;
        }
        .mobile-navigation-open {
          display: block;
        }
        .mobile-navigation-inner {
          display: flex;
          flex-direction: column;
          gap: 5px;
          padding: 18px 24px 25px;
        }
        .mobile-nav-link {
          width: 100%;
          padding: 13px 12px;
          text-align: left;
          background: transparent;
          border: none;
          border-radius: 9px;
          color: #475569;
          font-weight: 600;
          cursor: pointer;
        }
        .mobile-nav-link.active {
          background: #EFF6FF;
          color: #2563EB;
        }
        .mobile-navigation-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 14px;
          padding-top: 18px;
          border-top: 1px solid #E2E8F0;
        }
        .mobile-login, .mobile-signup {
          width: 100%;
          padding: 12px;
          border-radius: 10px;
          font-weight: 650;
          cursor: pointer;
        }
        .mobile-login {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          color: #334155;
        }
        .mobile-signup {
          background: #2563EB;
          border: none;
          color: white;
        }
        @media (max-width: 850px) {
          .navbar-links, .navbar-actions { display: none; }
          .navbar-menu-toggle { display: flex; }
          .mobile-navigation { display: none; }
          .mobile-navigation.mobile-navigation-open { display: block; }
        }
      `}</style>
    </>
  );
}
