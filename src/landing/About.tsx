
import React from 'react';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const featuresData: FeatureCardProps[] = [
  {
    title: 'Student Management',
    description:
      'Complete digital student profiles, enrollment, and biographical records.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="10" cy="7" r="4" />
        <path d="M20 8v6M17 11h6" />
      </svg>
    ),
  },
  {
    title: 'Attendance',
    description:
      'Fast daily roll call, automated absence alerts, and term attendance reports.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="8" r="3.5" />
        <path d="M4 20v-2a5 5 0 0 1 9-3" />
        <path d="m16 17 2 2 4-5" />
      </svg>
    ),
  },
  {
    title: 'Fees Management',
    description:
      'Transparent tuition tracking, instant digital receipts, and payment reminders.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20M6 15h3" />
      </svg>
    ),
  },
  {
    title: 'Results',
    description:
      'Automated continuous assessment scoring, broadsheets, and printable report cards.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="m12 2 3 6.5 7 1-5 4.9 1.2 7L12 18l-6.2 3.4 1.2-7-5-4.9 7-1L12 2Z" />
      </svg>
    ),
  },
  {
    title: 'Timetable',
    description:
      'Conflict-free scheduling for classes, teachers, and exam periods.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
      </svg>
    ),
  },
  {
    title: 'Parent Communication',
    description:
      'Direct SMS and app notifications for updates, alerts, and report releases.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        <path d="M8 10h.01M12 10h.01M16 10h.01" />
      </svg>
    ),
  },
  {
    title: 'Staff Management',
    description:
      'Teacher assignments, payroll tracking, and performance records in one place.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    title: 'Reports',
    description:
      'Comprehensive school analytics and exportable ministry compliance reports.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M8 16v-3M12 16V8M16 16v-5" />
      </svg>
    ),
  },
];

export default function Features() {
  return (
    <section className="features-section">
      <div className="features-container">

        <div className="features-header">
          <h2>Everything Your School Needs</h2>

          <p>
            Simple, powerful tools crafted specifically for the daily
            administration of primary and secondary institutions.
          </p>
        </div>

        <div className="features-grid">
          {featuresData.map((item) => (
            <article className="feature-card" key={item.title}>
              <div className="feature-icon">
                {item.icon}
              </div>

              <h3>{item.title}</h3>

              <p>{item.description}</p>
            </article>
          ))}
        </div>

      </div>

      <style>{`
        .features-section,
        .features-section * {
          box-sizing: border-box;
        }

        .features-section {
          width: 100%;
          padding: 62px 0 50px;
          background: linear-gradient(
            180deg,
            #F1F2FF 0%,
            #EAF0FF 100%
          );
          font-family: Inter, system-ui, -apple-system, sans-serif;
        }

        .features-container {
          width: 100%;
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 24px;
        }

        .features-header {
          text-align: center;
          max-width: 625px;
          margin: 0 auto 49px;
        }

        .features-header h2 {
          font-size: 27px;
          font-weight: 750;
          color: #101D32;
          letter-spacing: -0.9px;
          line-height: 1.25;
          margin: 0 0 12px;
        }

        .features-header p {
          font-size: 14px;
          color: #64718A;
          line-height: 1.7;
          font-weight: 400;
          margin: 0;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 19px;
          width: 100%;
        }

        .feature-card {
          min-width: 0;
          min-height: 163px;
          padding: 22px 20px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          background: rgba(237, 243, 255, 0.58);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1px solid rgba(203, 213, 225, 0.65);
          border-radius: 20px;
          box-shadow:
            0 3px 5px rgba(15, 23, 42, 0.12),
            0 1px 2px rgba(15, 23, 42, 0.06),
            inset 0 1px 2px rgba(255, 255, 255, 0.75);
          transition:
            transform 0.25s ease,
            box-shadow 0.25s ease,
            background 0.25s ease;
        }

        .feature-card:hover {
          transform: translateY(-4px);
          background: rgba(255, 255, 255, 0.85);
          box-shadow:
            0 12px 25px rgba(15, 23, 42, 0.10),
            0 3px 8px rgba(15, 23, 42, 0.06);
        }

        .feature-icon {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 17px;
          flex-shrink: 0;
          border-radius: 9px;
          background: rgba(37, 99, 235, 0.09);
          color: #2563EB;
        }

        .feature-icon svg {
          width: 19px;
          height: 19px;
          display: block;
        }

        .feature-card h3 {
          font-size: 14px;
          font-weight: 650;
          color: #142238;
          margin: 0 0 8px;
          letter-spacing: -0.15px;
          line-height: 1.35;
        }

        .feature-card p {
          font-size: 12px;
          color: #64718A;
          line-height: 1.6;
          font-weight: 400;
          margin: 0;
        }

        @media (max-width: 1000px) {
          .features-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 850px) {
          .features-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px;
          }

          .features-header {
            margin-bottom: 38px;
          }
        }

        @media (max-width: 520px) {
          .features-section {
            padding: 45px 0;
          }

          .features-container {
            padding: 0 18px;
          }

          .features-header {
            margin-bottom: 30px;
          }

          .features-header h2 {
            font-size: 24px;
          }

          .features-header p {
            font-size: 12px;
          }

          .features-grid {
            grid-template-columns: 1fr;
            gap: 14px;
          }

          .feature-card {
            min-height: 140px;
            padding: 20px;
          }

          .feature-card h3 {
            font-size: 14px;
          }

          .feature-card p {
            font-size: 12px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .feature-card {
            transition: none;
          }

          .feature-card:hover {
            transform: none;
          }
        }
      `}</style>
    </section>
  );
}
