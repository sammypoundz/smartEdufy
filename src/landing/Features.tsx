import React, { useState } from 'react';

import {
  WifiOff,
  Server,
  ShieldCheck,
  Building2,
  UserCheck,
  FileSpreadsheet,
  CreditCard,
  Banknote,
  Calendar,
  Timer,
  Sparkles,
  BookOpen,
  Calculator,
  MessageSquare,
  Users,
  QrCode,
  Receipt,
  ShieldAlert,
  MessageCircle,
  MessageSquareCode,
  CalendarCheck,
  Rocket,
  Tag,
} from 'lucide-react';

interface AboutPageProps {
  setCurrentPage: (page: string, sectionId?: string) => void;
}

interface FeatureItem {
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface SuiteProps {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  reverse?: boolean;
  features: FeatureItem[];
}

/* =========================================
   ADMINISTRATIVE FEATURES
========================================= */

const adminFeatures: FeatureItem[] = [
  {
    title: 'Multi-Campus Oversight',
    description:
      'Consolidated management dashboard for academy networks, multi-branch groups, and diocesan educational boards.',
    icon: <Building2 />,
  },
  {
    title: 'Student Biodata & Records',
    description:
      'Centralized digital registry with passport photo uploads, family sibling clustering, and instant spreadsheet batch onboarding.',
    icon: <UserCheck />,
  },
  {
    title: 'Ministry & Broadsheet Filings',
    description:
      'Export standardized ministry-compliant master broadsheets, BECE/WAEC prerequisite trackers, and executive analytics.',
    icon: <FileSpreadsheet />,
  },
  {
    title: 'Staff Payroll & Compliance',
    description:
      'Automated monthly payroll, tax deduction computations, pension remittances, and confidential salary slip generation.',
    icon: <CreditCard />,
  },
  {
    title: 'Bursary & Fee Reconciliation',
    description:
      'Automated fee invoicing, termly ledger reconciliation, instant receipting, and multi-channel bank clearing without financial leakages.',
    icon: <Banknote />,
  },
  {
    title: 'Conflict-Free Timetabler',
    description:
      'Intelligent scheduling accommodating specialized instructors, shared lab facilities, and double periods without timetable clashes.',
    icon: <Calendar />,
  },
];

/* =========================================
   TEACHER FEATURES
========================================= */

const teacherFeatures: FeatureItem[] = [
  {
    title: '60-Second Mobile Roll-Call',
    description:
      'Rapid morning attendance marking on any mobile phone that instantly flags unexcused absences for parent notification.',
    icon: <Timer />,
  },
  {
    title: 'Offline CA & Exam Grading',
    description:
      'Record test marks and continuous assessments without active internet connectivity; scores synchronize silently when reconnected.',
    icon: <WifiOff />,
  },
  {
    title: 'AI Report Remarks',
    description:
      'Generate constructive, personalized terminal comments based on multi-term academic trajectory in one click.',
    icon: <Sparkles />,
  },
  {
    title: 'Syllabus & Schemes of Work',
    description:
      'Digitally track termly scheme milestones, share pedagogical notes, and collaborate effortlessly across teaching departments.',
    icon: <BookOpen />,
  },
  {
    title: 'Instant Broadsheet Engine',
    description:
      'Eliminate tedious spreadsheet macros with automatic computation of cumulative scores, class averages, and subject positions.',
    icon: <Calculator />,
  },
  {
    title: 'Direct Guardian Messaging',
    description:
      'Communicate directly with student guardians without exposing personal phone numbers or interrupting lesson periods.',
    icon: <MessageSquare />,
  },
];

/* =========================================
   PARENT FEATURES
========================================= */

const parentFeatures: FeatureItem[] = [
  {
    title: 'Verified Digital Report Cards',
    description:
      'Download tamper-proof terminal academic records with instant cryptographic QR verification on closing day.',
    icon: <QrCode />,
  },
  {
    title: 'Transparent Fee Breakdowns',
    description:
      'Itemized billing statements for tuition, development levies, uniforms, and bus transport with traceable payment confirmations.',
    icon: <Receipt />,
  },
  {
    title: 'Verified Guardian ID',
    description:
      'Ensure child safety with photo-authenticated guardian pickup authorizations and secure multi-grade sibling profiles.',
    icon: <ShieldAlert />,
  },
  {
    title: 'Direct Teacher Communication',
    description:
      'Structured direct desk messaging allows parents to inquire into student progress without disrupting active instructional hours.',
    icon: <MessageCircle />,
  },
  {
    title: 'Instant SMS & WhatsApp Alerts',
    description:
      'Immediate peace-of-mind alerts for morning campus arrival, gate check-in, and emergency administrative announcements.',
    icon: <MessageSquareCode />,
  },
  {
    title: 'Calendar & Event Sync',
    description:
      'Keep track of mid-term breaks, open house consultations, PTA meetings, and sports activities synchronized to your smartphone.',
    icon: <CalendarCheck />,
  },
];

/* =========================================
   PLATFORM FEATURES
========================================= */

const topFeatures: FeatureItem[] = [
  {
    title: 'Offline-First Sync',
    description:
      'Operate reliably through unstable connectivity; local changes sync seamlessly.',
    icon: <WifiOff />,
  },
  {
    title: 'Zero Server Setup',
    description:
      'No expensive hardware or complex on-premise IT maintenance required.',
    icon: <Server />,
  },
  {
    title: 'Bank-Grade Privacy',
    description:
      'Enterprise encryption protects confidential financial data and student records.',
    icon: <ShieldCheck />,
  },
];

/* =========================================
   REUSABLE FEATURE CARD
========================================= */

function FeatureCard({ item }: { item: FeatureItem }) {
  return (
    <article className="about-feature-card">
      <div className="about-icon-box">
        {React.cloneElement(
          item.icon as React.ReactElement,
          {
            size: 19,
            strokeWidth: 2,
          }
        )}
      </div>

      <h3>{item.title}</h3>
      <p>{item.description}</p>
    </article>
  );
}

/* =========================================
   REUSABLE SUITE SECTION
========================================= */

function SuiteSection({
  id,
  eyebrow,
  title,
  description,
  image,
  imageAlt,
  reverse = false,
  features,
}: SuiteProps) {
  const [imageSrc, setImageSrc] = useState(image);

  const [fallbackAttempted, setFallbackAttempted] = useState(false);

  const handleImageError = () => {
    if (!fallbackAttempted && imageSrc !== '/admin-phone.png') {
      setFallbackAttempted(true);
      setImageSrc('/admin-phone.png');
    }
  };

  return (
    <section
      className={`about-suite ${reverse ? 'about-reverse' : ''}`}
      id={id}
    >
      <div className="about-suite-header">

        <div className="about-eyebrow">
          <span className="about-eyebrow-icon">
            {id === 'administrative' ? (
              <Building2 size={14} />
            ) : id === 'teachers' ? (
              <Sparkles size={14} />
            ) : (
              <Users size={14} />
            )}
          </span>

          {eyebrow}
        </div>

        <div className="about-suite-heading">
          <div>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>

          <span className="about-modules">
            6 Modules Enabled
          </span>
        </div>

        <div className="about-divider" />
      </div>

      <div className="about-suite-layout">

        <div className="about-phone">
          <img
            src={imageSrc}
            alt={imageAlt}
            loading="lazy"
            onError={handleImageError}
          />
        </div>

        <div className="about-feature-grid">
          {features.map((item) => (
            <FeatureCard
              key={item.title}
              item={item}
            />
          ))}
        </div>

      </div>
    </section>
  );
}

/* =========================================
   MAIN ABOUT PAGE
========================================= */

export default function AboutPage({
  setCurrentPage,
}: AboutPageProps) {

  const [activeTab, setActiveTab] = useState('all');

  const sections: SuiteProps[] = [
    {
      id: 'administrative',
      eyebrow: 'Institutional Oversight & Financials',
      title: 'Administrative Suite',
      description:
        'Precision control over institutional cashflow, regulatory compliance, multi-term admissions, and seamless campus scheduling.',
      image: '/screen4.png',
      imageAlt: 'SmartEdufy Admin Mobile Dashboard',
      features: adminFeatures,
    },
    {
      id: 'teachers',
      eyebrow: 'Empowering Classroom Educators',
      title: 'Teacher Tools',
      description:
        'Spend less time on repetitive manual record-keeping and broadsheet math, and more time inspiring academic excellence.',
      image: '/screen2.png',
      imageAlt: 'SmartEdufy Teacher Mobile Dashboard',
      reverse: true,
      features: teacherFeatures,
    },
    {
      id: 'parents',
      eyebrow: 'Connected Families',
      title: 'Parent Portal',
      description:
        'Bridging the communication gap between the classroom and home via everyday mobile devices and direct WhatsApp channels.',
      image: '/screen1.png',
      imageAlt: 'SmartEdufy Parent Mobile Portal',
      features: parentFeatures,
    },
  ];

  const visibleSections =
    activeTab === 'all'
      ? sections
      : sections.filter(
          (section) => section.id === activeTab
        );

  const handlePricing = () => {
    setCurrentPage('pricing');
  };

  return (
    <main className="about-page">

      <div className="about-container">

        {/* HERO */}
        <header className="about-hero">

          <div className="about-main-badge">
            <span className="about-main-dot" />
            PURPOSE-BUILT FOR AFRICAN EDUCATION
          </div>

          <h1>
            Everything Your School Needs
          </h1>

          <p className="about-hero-subtitle">
            A complete, unified school management platform built for African schools.
          </p>

          {/* FEATURE FILTERS */}
          <nav
            className="about-tabs"
            aria-label="Filter features"
          >

            <button
              className={activeTab === 'all' ? 'selected' : ''}
              onClick={() => setActiveTab('all')}
              aria-pressed={activeTab === 'all'}
            >
              All Features
            </button>

            <button
              className={
                activeTab === 'administrative' ? 'selected' : ''
              }
              onClick={() => setActiveTab('administrative')}
              aria-pressed={activeTab === 'administrative'}
            >
              <Building2 size={14} />
              Administrative
            </button>

            <button
              className={activeTab === 'teachers' ? 'selected' : ''}
              onClick={() => setActiveTab('teachers')}
              aria-pressed={activeTab === 'teachers'}
            >
              <BookOpen size={14} />
              Teachers
            </button>

            <button
              className={activeTab === 'parents' ? 'selected' : ''}
              onClick={() => setActiveTab('parents')}
              aria-pressed={activeTab === 'parents'}
            >
              <Users size={14} />
              Parents
            </button>

          </nav>

          {/* TOP FEATURES */}
          <div className="about-top-grid">
            {topFeatures.map((item) => (
              <FeatureCard
                key={item.title}
                item={item}
              />
            ))}
          </div>

        </header>

        {/* SUITE SECTIONS */}
        <div className="about-sections">

          {visibleSections.map((section) => (
            <SuiteSection
              key={section.id}
              {...section}
            />
          ))}

        </div>

        {/* CTA */}
        {activeTab === 'all' && (
          <section className="about-cta">

            <div className="about-cta-badge">
              <Rocket size={15} />
              Empower Your Institution Today
            </div>

            <h2>
              Ready to Modernize Your School’s Workflow?
            </h2>

            <p>
              Join hundreds of forward-thinking African schools.
              Get a tailored 20-minute demonstration for your board,
              bursary desk, or administrative team.
            </p>

            <button onClick={handlePricing}>
              Explore Pricing Plans
              <Tag size={16} />
            </button>

          </section>
        )}

      </div>

      {/* STYLES */}
      <style>{`

        /* =====================================
           ABOUT PAGE BASE
        ===================================== */

        .about-page,
        .about-page * {
          box-sizing: border-box;
        }

        .about-page {
          width: 100%;
          min-height: 100vh;
          overflow: hidden;

          font-family: Inter, system-ui, -apple-system, sans-serif;
          color: #17243A;

          background:
            radial-gradient(
              ellipse at 50% 5%,
              rgba(244, 207, 255, 0.65) 0%,
              transparent 38%
            ),
            radial-gradient(
              ellipse at 50% 48%,
              rgba(192, 211, 255, 0.45) 0%,
              transparent 50%
            ),
            linear-gradient(
              180deg,
              #FBE9FF 0%,
              #F8EFFF 17%,
              #EAF0FF 42%,
              #DCE5FF 66%,
              #F3E7FF 87%,
              #FCEAFF 100%
            );

          padding: 55px 0 80px;
        }

        .about-container {
          max-width: 1320px;
          width: 100%;
          padding: 0 28px;
          margin: 0 auto;
        }

        /* =====================================
           HERO
        ===================================== */

        .about-hero {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          margin-bottom: 48px;
        }

        .about-main-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 15px;

          background: rgba(219, 234, 254, 0.7);
          border: 1px solid rgba(191, 219, 254, 0.85);
          border-radius: 30px;

          color: #1D4ED8;
          font-size: 10px;
          font-weight: 750;
          letter-spacing: 0.5px;

          margin-bottom: 16px;
        }

        .about-main-dot {
          width: 7px;
          height: 7px;
          background: #2563EB;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .about-hero h1 {
          font-size: clamp(32px, 4vw, 45px);
          font-weight: 800;
          letter-spacing: -1.4px;
          color: #101D32;
          line-height: 1.2;
          margin: 0 0 12px;
        }

        .about-hero-subtitle {
          color: #52617A;
          font-size: 15px;
          font-weight: 500;
          line-height: 1.7;
          margin: 0 0 28px;
          max-width: 620px;
        }

        /* =====================================
           TABS
        ===================================== */

        .about-tabs {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          gap: 5px;

          padding: 5px;
          border-radius: 13px;

          border: 1px solid rgba(203, 213, 225, 0.85);
          background: rgba(255, 255, 255, 0.55);

          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);

          margin-bottom: 42px;

          box-shadow: 0 4px 14px rgba(30, 41, 59, 0.05);
        }

        .about-tabs button {
          display: inline-flex;
          justify-content: center;
          align-items: center;
          gap: 7px;

          border: none;
          border-radius: 9px;
          padding: 11px 16px;

          background: transparent;
          color: #475569;

          font-family: inherit;
          font-size: 12px;
          font-weight: 650;

          cursor: pointer;
          white-space: nowrap;

          transition: all 0.2s ease;
        }

        .about-tabs button:hover {
          background: rgba(219, 234, 254, 0.7);
          color: #2563EB;
        }

        .about-tabs button.selected {
          color: #FFFFFF;
          background: #2563EB;
          font-weight: 750;

          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.22);
        }

        /* =====================================
           FEATURE CARDS
        ===================================== */

        .about-top-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          width: 100%;
          gap: 18px;
        }

        .about-feature-card {
          min-width: 0;

          background: rgba(255, 255, 255, 0.58);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);

          border: 1px solid rgba(255, 255, 255, 0.9);
          border-radius: 19px;

          padding: 21px;

          box-shadow:
            0 6px 18px rgba(15, 23, 42, 0.07),
            inset 0 1px 2px rgba(255, 255, 255, 0.9);

          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;

          transition:
            transform 0.25s ease,
            box-shadow 0.25s ease;
        }

        .about-feature-card:hover {
          transform: translateY(-3px);

          box-shadow:
            0 12px 25px rgba(15, 23, 42, 0.1),
            inset 0 1px 2px rgba(255, 255, 255, 0.9);
        }

        .about-icon-box {
          width: 39px;
          height: 39px;
          flex-shrink: 0;

          border-radius: 10px;

          display: grid;
          place-items: center;

          background: rgba(219, 234, 254, 0.9);
          color: #2563EB;

          margin-bottom: 13px;
        }

        .about-feature-card h3 {
          font-size: 15px;
          font-weight: 750;
          color: #17243A;
          line-height: 1.4;
          margin: 0 0 7px;
        }

        .about-feature-card p {
          font-size: 13px;
          font-weight: 450;
          color: #52617A;
          line-height: 1.7;
          margin: 0;
        }

        /* =====================================
           SUITE HEADERS
        ===================================== */

        .about-suite {
          width: 100%;
          margin-top: 48px;
          scroll-margin-top: 100px;
        }

        .about-eyebrow {
          display: flex;
          align-items: center;
          gap: 8px;

          font-size: 12px;
          font-weight: 750;
          color: #2563EB;

          margin-bottom: 10px;
        }

        .about-eyebrow-icon {
          display: flex;
          align-items: center;
        }

        .about-suite-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
        }

        .about-suite-heading h2 {
          font-size: clamp(25px, 3vw, 33px);
          font-weight: 800;
          letter-spacing: -0.8px;
          color: #142238;
          line-height: 1.2;
          margin: 0 0 7px;
        }

        .about-suite-heading p {
          max-width: 680px;
          font-size: 13px;
          font-weight: 500;
          color: #52617A;
          line-height: 1.7;
          margin: 0;
        }

        .about-modules {
          font-size: 11px;
          font-weight: 700;
          color: #475569;
          white-space: nowrap;
          padding-bottom: 3px;
        }

        .about-divider {
          width: 100%;
          height: 1px;
          background: rgba(148, 163, 184, 0.35);
          margin-top: 19px;
          margin-bottom: 30px;
        }

        /* =====================================
           SUITE LAYOUT
        ===================================== */

        .about-suite-layout {
          display: grid;
          grid-template-columns: minmax(150px, 0.48fr) minmax(0, 1.52fr);
          gap: 30px;
          align-items: center;
          width: 100%;
        }

        .about-phone {
          display: flex;
          justify-content: center;
          align-items: center;
          min-width: 0;
        }

        .about-phone img {
          display: block;
          width: 100%;
          max-width: 250px;
          height: auto;
          object-fit: contain;

          filter: drop-shadow(
            0 14px 20px rgba(15, 23, 42, 0.16)
          );
        }

        /* =====================================
           SUITE FEATURE GRID
        ===================================== */

        .about-feature-grid {
          min-width: 0;

          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .about-feature-grid .about-feature-card {
          min-height: 140px;
          padding: 17px;
          border-radius: 17px;
        }

        .about-feature-grid .about-icon-box {
          width: 34px;
          height: 34px;
          margin-bottom: 9px;
        }

        .about-feature-grid .about-feature-card h3 {
          font-size: 13px;
          margin: 0 0 6px;
        }

        .about-feature-grid .about-feature-card p {
          font-size: 11px;
          line-height: 1.65;
        }

        /* =====================================
           REVERSE LAYOUT
        ===================================== */

        .about-reverse .about-suite-layout {
          grid-template-columns: minmax(0, 1.52fr) minmax(150px, 0.48fr);
        }

        .about-reverse .about-phone {
          grid-column: 2;
          grid-row: 1;
        }

        .about-reverse .about-feature-grid {
          grid-column: 1;
          grid-row: 1;
        }

        /* =====================================
           CTA
        ===================================== */

        .about-cta {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;

          margin-top: 70px;
          padding: 50px 30px;

          border: 1px solid rgba(255, 255, 255, 0.9);
          border-radius: 26px;

          background: rgba(255, 255, 255, 0.58);

          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);

          box-shadow:
            0 12px 35px rgba(15, 23, 42, 0.07),
            inset 0 1px 2px rgba(255, 255, 255, 0.9);
        }

        .about-cta-badge {
          display: flex;
          align-items: center;
          gap: 8px;

          color: #2563EB;
          font-size: 12px;
          font-weight: 750;

          padding: 8px 15px;
          border-radius: 30px;

          background: rgba(219, 234, 254, 0.7);
          border: 1px solid rgba(191, 219, 254, 0.65);

          margin-bottom: 18px;
        }

        .about-cta h2 {
          font-size: clamp(26px, 3vw, 37px);
          color: #142238;
          font-weight: 800;
          letter-spacing: -0.9px;
          line-height: 1.3;
          margin: 0 0 13px;
        }

        .about-cta p {
          font-size: 14px;
          font-weight: 500;
          line-height: 1.75;
          color: #52617A;
          max-width: 680px;
          margin: 0 0 25px;
        }

        .about-cta button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;

          padding: 14px 24px;
          border: none;
          border-radius: 10px;

          background: #2563EB;
          color: white;

          font-size: 13px;
          font-weight: 750;
          font-family: inherit;

          cursor: pointer;

          box-shadow: 0 5px 15px rgba(37, 99, 235, 0.22);

          transition: all 0.2s ease;
        }

        .about-cta button:hover {
          background: #1D4ED8;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(37, 99, 235, 0.28);
        }

        /* =====================================
           TABLET
        ===================================== */

        @media (max-width: 900px) {

          .about-container {
            padding-left: 22px;
            padding-right: 22px;
          }

          .about-suite-layout {
            grid-template-columns: minmax(130px, 0.42fr) minmax(0, 1.58fr);
            gap: 20px;
          }

          .about-reverse .about-suite-layout {
            grid-template-columns: minmax(0, 1.58fr) minmax(130px, 0.42fr);
          }

          .about-phone img {
            max-width: 155px;
          }

          .about-feature-grid {
            gap: 12px;
          }

          .about-feature-grid .about-feature-card {
            min-height: 130px;
            padding: 14px;
          }
        }

        /* =====================================
           SMALL TABLETS
        ===================================== */

        @media (max-width: 760px) {

          .about-top-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .about-suite-layout,
          .about-reverse .about-suite-layout {
            grid-template-columns: 1fr;
            gap: 25px;
          }

          .about-phone img {
            max-width: 175px;
          }

          .about-reverse .about-phone,
          .about-reverse .about-feature-grid {
            grid-column: auto;
            grid-row: auto;
          }

          .about-feature-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

        }

        /* =====================================
           MOBILE
        ===================================== */

        @media (max-width: 600px) {

          .about-page {
            padding: 40px 0 55px;
          }

          .about-container {
            padding: 0 16px;
          }

          .about-hero {
            margin-bottom: 35px;
          }

          .about-hero h1 {
            font-size: 30px;
            letter-spacing: -0.9px;
          }

          .about-hero-subtitle {
            font-size: 13px;
            max-width: 360px;
          }

          .about-main-badge {
            font-size: 9px;
          }

          .about-tabs {
            width: 100%;
            max-width: 390px;
            margin-bottom: 30px;
            gap: 3px;
          }

          .about-tabs button {
            font-size: 10px;
            padding: 9px 10px;
          }

          .about-top-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .about-top-grid .about-feature-card {
            display: grid;
            grid-template-columns: 40px 1fr;
            column-gap: 12px;
            padding: 15px;
          }

          .about-top-grid .about-icon-box {
            grid-row: 1 / span 2;
            margin: 0;
          }

          .about-top-grid .about-feature-card h3 {
            font-size: 14px;
            margin: 0 0 4px;
          }

          .about-top-grid .about-feature-card p {
            font-size: 12px;
          }

          .about-suite {
            margin-top: 40px;
          }

          .about-suite-heading {
            align-items: flex-start;
            flex-direction: column;
            gap: 8px;
          }

          .about-suite-heading h2 {
            font-size: 25px;
          }

          .about-suite-heading p {
            font-size: 12px;
          }

          .about-modules {
            font-size: 10px;
          }

          .about-divider {
            margin-bottom: 23px;
          }

          .about-suite-layout,
          .about-reverse .about-suite-layout {
            display: flex;
            flex-direction: column;
            gap: 23px;
          }

          .about-phone {
            width: 100%;
          }

          .about-phone img {
            max-width: 165px;
          }

          .about-reverse .about-phone {
            order: -1;
          }

          .about-feature-grid {
            width: 100%;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 11px;
          }

          .about-feature-grid .about-feature-card {
            min-height: 140px;
            padding: 13px;
          }

          .about-feature-grid .about-feature-card h3 {
            font-size: 12px;
          }

          .about-feature-grid .about-feature-card p {
            font-size: 10px;
            line-height: 1.6;
          }

          .about-cta {
            margin-top: 48px;
            padding: 32px 18px;
          }

          .about-cta h2 {
            font-size: 26px;
          }

          .about-cta p {
            font-size: 12px;
          }

        }

        /* =====================================
           SMALL PHONES
        ===================================== */

        @media (max-width: 380px) {

          .about-container {
            padding: 0 13px;
          }

          .about-feature-grid {
            grid-template-columns: 1fr;
          }

          .about-tabs button {
            font-size: 9px;
            padding: 8px;
          }

          .about-feature-grid .about-feature-card {
            min-height: auto;
          }

        }

        /* =====================================
           REDUCED MOTION
        ===================================== */

        @media (prefers-reduced-motion: reduce) {

          .about-page *,
          .about-page *::before,
          .about-page *::after {
            transition-duration: 0.01ms !important;
            animation-duration: 0.01ms !important;
          }

        }

      `}</style>

    </main>
  );
}
