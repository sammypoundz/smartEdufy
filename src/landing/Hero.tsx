import { useState, useEffect } from 'react';
import { CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';

interface HeroProps {
  setCurrentPage: (page: string) => void;
}

export default function Hero({ setCurrentPage }: HeroProps) {
  const navigate = (page: string) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Edufy AI color cycling state (cycles between 3 vibrant colors every 2 seconds)
  const [aiColorIndex, setAiColorIndex] = useState<number>(0);
  const aiColors = ['#2563EB', '#D946EF', '#10B981']; // Blue, Pink, Emerald

  useEffect(() => {
    const colorInterval = setInterval(() => {
      setAiColorIndex((prevIndex) => (prevIndex + 1) % aiColors.length);
    }, 2000);

    return () => clearInterval(colorInterval);
  }, []);

  return (
    <>
      <section className="hero-section">
        <div className="hero-glow hero-glow-one" />
        <div className="hero-glow hero-glow-two" />

        <div className="hero-container">

          {/* LEFT CONTENT */}
          <div className="hero-content">

            <div className="hero-badge">
              <span className="hero-dot" />
              <Sparkles size={13} />
              BUILT FOR AFRICAN SCHOOLS
            </div>

            <h1 className="hero-title">
              Powered by <span style={{ color: aiColors[aiColorIndex], transition: 'color 0.6s ease-in-out' }}>Edufy AI</span>: The Smart School Management System Built for{' '}
              <span>African Schools.</span>
            </h1>

            <p className="hero-subtitle">
              Manage students, attendance, fees, results, staff and
              communication — all in one intelligent, simple platform
              designed for modern African education.
            </p>

            <div className="hero-buttons">
              <button
                className="hero-primary-btn"
                onClick={() => navigate('signup')}
              >
                Sign up for free
                <ArrowRight size={17} />
              </button>

              {/* Dedicated CTA for school onboarding — school registration is
                  separate from user sign-up and lives at /register/school. */}
              <button
                className="hero-secondary-btn"
                onClick={() => window.location.assign('/register/school')}
              >
                Register School
              </button>

              <button
                className="hero-secondary-btn"
                onClick={() => navigate('features')}
              >
                Explore Features
              </button>
            </div>

            <div className="hero-perks">
              <div className="hero-perk">
                <CheckCircle2 size={17} />
                <span>Zero Setup Hassle</span>
              </div>

              <div className="hero-perk">
                <CheckCircle2 size={17} />
                <span>Free 14-Day Trial</span>
              </div>

              <div className="hero-perk">
                <CheckCircle2 size={17} />
                <span>Offline Ready</span>
              </div>
            </div>

            <div className="hero-trust-line">
              <span className="trust-line" />
              <span>SIMPLIFYING SCHOOL MANAGEMENT</span>
              <span className="trust-line" />
            </div>

          </div>

          {/* RIGHT IMAGE */}
          <div className="hero-image-col">
           <div className="hero-image-glass">

              <img
                src="/screen3.png"
                alt="SmartEdufy Dashboard"
                className="hero-phone-mockup"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />

            </div>

            {/* Floating card remains unchanged */}
            <div className="hero-floating-card">
              <div className="floating-icon">
                <CheckCircle2 size={19} />
              </div>
              <div>
                <strong>Everything Connected</strong>
                <p>One platform. Complete control.</p>
              </div>
            </div>

          </div>

        </div>
      </section>

      <style>{`

        .hero-section {
          position: relative;
          width: 100%;
          min-height: 620px;
          padding: 85px 0 95px;
          overflow: hidden;
          isolation: isolate;
          font-family: Inter, system-ui, -apple-system, sans-serif;

          background:
            radial-gradient(
              ellipse at 15% 15%,
              rgba(225, 205, 255, 0.65) 0%,
              transparent 45%
            ),
            radial-gradient(
              ellipse at 85% 25%,
              rgba(191, 219, 254, 0.65) 0%,
              transparent 43%
            ),
            radial-gradient(
              ellipse at 50% 100%,
              rgba(221, 214, 254, 0.55) 0%,
              transparent 48%
            ),
            linear-gradient(
              135deg,
              #FCF7FF 0%,
              #F2EEFF 38%,
              #E7EDFF 72%,
              #F8EDFF 100%
            );
        }

        .hero-section * {
          box-sizing: border-box;
        }

        .hero-glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(75px);
          pointer-events: none;
          z-index: -1;
        }

        .hero-glow-one {
          width: 280px;
          height: 280px;
          background: rgba(147, 112, 219, 0.16);
          top: 5%;
          left: -100px;
        }

        .hero-glow-two {
          width: 350px;
          height: 350px;
          background: rgba(59, 130, 246, 0.13);
          bottom: -100px;
          right: -80px;
        }

        .hero-container {
          position: relative;
          max-width: 1250px;
          width: 100%;
          margin: 0 auto;
          padding: 0 30px;

          display: grid;
          grid-template-columns: 1.05fr 0.95fr;
          align-items: center;
          gap: 55px;
        }

        /* LEFT CONTENT */

        .hero-content {
          max-width: 620px;
          position: relative;
          z-index: 2;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          padding: 9px 15px;
          margin-bottom: 25px;

          background: rgba(255,255,255,0.58);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);

          border: 1px solid rgba(255,255,255,0.85);
          border-radius: 50px;

          color: #1D4ED8;
          font-size: 11px;
          font-weight: 750;
          letter-spacing: 0.65px;

          box-shadow: 0 5px 18px rgba(37,99,235,0.07);
        }

        .hero-dot {
          width: 7px;
          height: 7px;
          background: #2563EB;
          border-radius: 50%;
          box-shadow: 0 0 9px rgba(37,99,235,0.6);
        }

        .hero-title {
          font-size: clamp(37px, 4.3vw, 57px);
          font-weight: 800;
          line-height: 1.13;
          letter-spacing: -1.9px;
          color: #101D32;
          margin: 0 0 22px;
        }

        /* African Schools now uses the same heading color */
        .hero-title span {
          color: #101D32;
          background: none;
          -webkit-background-clip: initial;
          background-clip: initial;
          -webkit-text-fill-color: initial;
        }

        .hero-subtitle {
          max-width: 530px;
          font-size: 16px;
          font-weight: 500;
          line-height: 1.8;
          color: #52617A;
          margin: 0 0 32px;
        }

        /* BUTTONS */

        .hero-buttons {
          display: flex;
          align-items: center;
          gap: 13px;
          flex-wrap: wrap;
          margin-bottom: 35px;
        }

        .hero-primary-btn,
        .hero-secondary-btn {
          display: inline-flex;
          justify-content: center;
          align-items: center;
          gap: 10px;
          padding: 15px 25px;
          border-radius: 12px;
          font-family: inherit;
          font-size: 14px;
          font-weight: 750;
          cursor: pointer;
          transition: all 0.25s ease;
        }

        .hero-primary-btn {
          color: white;
          background: linear-gradient(
            110deg,
            #2563EB,
            #1D4ED8
          );
          border: 1px solid rgba(255,255,255,0.2);
          box-shadow:
            0 8px 20px rgba(37,99,235,0.25),
            inset 0 1px 1px rgba(255,255,255,0.2);
        }

        .hero-primary-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 25px rgba(37,99,235,0.32);
        }

        .hero-secondary-btn {
          color: #1E293B;
          background: rgba(255,255,255,0.55);
          border: 1px solid rgba(255,255,255,0.9);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          box-shadow: 0 5px 16px rgba(15,23,42,0.05);
        }

        .hero-secondary-btn:hover {
          background: rgba(255,255,255,0.9);
          transform: translateY(-3px);
        }

        /* TRUST POINTS */

        .hero-perks {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 20px;
        }

        .hero-perk {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #334155;
          font-size: 12px;
          font-weight: 650;
        }

        .hero-perk svg {
          color: #2563EB;
          flex-shrink: 0;
        }

        .hero-trust-line {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 37px;
          color: #718096;
          font-size: 9px;
          font-weight: 750;
          letter-spacing: 1.5px;
        }

        .trust-line {
          height: 1px;
          width: 35px;
          background: rgba(100,116,139,0.3);
        }

        /* IMAGE SECTION */

        .hero-image-col {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 0;
          padding: 15px;
        }

        /* Removed glass background, border, radius and shadow */
        .hero-image-glass {
          position: relative;
          width: 100%;
          max-width: 520px;
          min-height: 390px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          background: transparent;
          backdrop-filter: none;
          -webkit-backdrop-filter: none;

          border: none;
          border-radius: 0;
          padding: 0;
          box-shadow: none;
        }

        .hero-phone-mockup {
          display: block;
          width: 100%;
          max-width: 460px;
          height: auto;
          object-fit: contain;
          filter: drop-shadow(
            0 20px 30px rgba(15,23,42,0.12)
          );
          transition: transform 0.35s ease;
        }

        .hero-image-glass:hover .hero-phone-mockup {
          transform: translateY(-5px);
        }

        /* FLOATING CARD */

        .hero-floating-card {
          position: absolute;
          bottom: 35px;
          left: -15px;
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 13px 17px;

          background: rgba(255,255,255,0.83);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);

          border: 1px solid rgba(255,255,255,0.95);
          border-radius: 15px;

          box-shadow: 0 12px 30px rgba(15,23,42,0.10);
        }

        .floating-icon {
          width: 37px;
          height: 37px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          color: #2563EB;
          background: #DBEAFE;
        }

        .hero-floating-card strong {
          display: block;
          font-size: 11px;
          font-weight: 750;
          color: #0F172A;
          margin-bottom: 3px;
        }

        .hero-floating-card p {
          margin: 0;
          font-size: 10px;
          color: #64748B;
          font-weight: 500;
        }

        /* TABLET */

        @media (max-width: 950px) {
          .hero-container {
            grid-template-columns: 1fr 0.9fr;
            gap: 25px;
            padding: 0 22px;
          }

          .hero-title {
            font-size: clamp(34px, 4.5vw, 45px);
          }

          .hero-image-glass {
            min-height: 300px;
          }

          .hero-floating-card {
            left: -5px;
            bottom: 20px;
          }
        }

        /* MOBILE */

        @media (max-width: 700px) {
          .hero-section {
            padding: 55px 0 65px;
          }

          .hero-container {
            display: flex;
            flex-direction: column;
            align-items: stretch;
            gap: 40px;
            padding: 0 19px;
          }

          .hero-content {
            max-width: 100%;
            text-align: center;
          }

          .hero-badge {
            margin-bottom: 20px;
            font-size: 9px;
          }

          .hero-title {
            font-size: clamp(32px, 8vw, 43px);
            line-height: 1.17;
            letter-spacing: -1.2px;
            margin-bottom: 17px;
          }

          .hero-subtitle {
            font-size: 14px;
            line-height: 1.75;
            margin: 0 auto 25px;
            max-width: 450px;
          }

          .hero-buttons {
            justify-content: center;
            margin-bottom: 27px;
          }

          .hero-primary-btn,
          .hero-secondary-btn {
            padding: 13px 19px;
            font-size: 13px;
          }

          .hero-perks {
            justify-content: center;
            gap: 13px;
          }

          .hero-perk {
            font-size: 10px;
          }

          .hero-trust-line {
            justify-content: center;
            margin-top: 27px;
            font-size: 8px;
          }

          .hero-image-col {
            width: 100%;
            padding: 0 5px;
          }

          .hero-image-glass {
            max-width: 480px;
            min-height: 240px;
            padding: 0;
          }

          .hero-phone-mockup {
            max-width: 100%;
          }

          .hero-floating-card {
            bottom: -17px;
            left: 10px;
            padding: 10px 12px;
          }

          .floating-icon {
            width: 32px;
            height: 32px;
          }
        }

        @media (max-width: 380px) {
          .hero-container {
            padding: 0 14px;
          }

          .hero-title {
            font-size: 30px;
          }

          .hero-buttons {
            flex-direction: column;
            width: 100%;
          }

          .hero-primary-btn,
          .hero-secondary-btn {
            width: 100%;
          }

          .hero-perks {
            gap: 10px;
          }
        }

      `}</style>
    </>
  );
}
