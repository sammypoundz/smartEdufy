
import React, { useState } from 'react';
import {
  CheckCircle2,
  Rocket,
  Sparkles,
  ArrowRight,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      question: "Is SmartEdufy Basic really free forever?",
      answer: "Yes. SmartEdufy Basic is 100% free with no monthly subscription charges or trial expiration. You get unlimited access to student management, CA entry, report cards, attendance, timetables, and all 3 mobile apps."
    },
    {
      question: "What will be included in SmartEdufy Premium?",
      answer: "SmartEdufy Premium introduces autonomous AI school assistants, intelligent conflict-free timetabling, predictive academic & fee analytics, automated terminal reports, and advanced multi-campus governance tools."
    },
    {
      question: "How fast can our school onboard?",
      answer: "Schools can typically complete their setup and begin daily operations within minutes using our spreadsheet batch onboarding or template import tools, with zero expensive server hardware required."
    }
  ];

  return (
    <div style={styles.pageWrapper}>
      <div style={styles.container}>

        {/* HEADER */}

        <div style={styles.header}>
          <div style={styles.badge}>
            <Sparkles size={14} color="#2563EB" />
            <span style={styles.badgeText}>PRICING</span>
          </div>

          <h1 style={styles.title}>Simple Plans</h1>

          <p style={styles.subtitle}>
            Start free forever. Upgrade to Premium for advanced AI.
          </p>
        </div>

        {/* PRICING CARDS */}

        <div style={styles.grid}>

          {/* BASIC PLAN */}

          <div style={styles.card}>
            <div style={styles.cardHeader}>

              <div style={styles.greenBadge}>
                <CheckCircle2 size={14} color="#15803D" />
                <span style={styles.greenBadgeText}>FREE FOREVER</span>
              </div>

              <h2 style={styles.cardName}>SmartEdufy Basic</h2>

              <div style={styles.priceRow}>
                <span style={styles.priceMain}>Free</span>
                <span style={styles.priceSub}>($0 / ₦0)</span>
              </div>

              <p style={styles.cardTarget}>
                For schools running daily operations
              </p>
            </div>

            <button style={styles.primaryBtn}>
              <span>Get Started Free</span>
              <ArrowRight size={16} />
            </button>

            <div style={styles.featureList}>
              {[
                "Full School & Student Records",
                "Results, CA & Report Cards",
                "Attendance & Timetables",
                "Fee Tracking & Online Payments",
                "3 Mobile Apps Included (Parent, Staff, Admin)"
              ].map((feature, index) => (
                <div style={styles.featureItem} key={index}>
                  <CheckCircle2
                    size={19}
                    color="#16A34A"
                    style={{ flexShrink: 0 }}
                  />
                  <span style={styles.featureText}>{feature}</span>
                </div>
              ))}
            </div>

            <div style={styles.cardFooter}>
              <p style={styles.footerNote}>
                No credit card required • Zero subscription fees
              </p>
            </div>
          </div>

          {/* PREMIUM PLAN */}

          <div style={styles.premiumCard}>
            <div style={styles.cardHeader}>

              <div style={styles.purpleBadge}>
                <Sparkles size={14} color="#2563EB" />
                <span style={styles.purpleBadgeText}>COMING SOON</span>
              </div>

              <h2 style={styles.cardName}>SmartEdufy Premium</h2>

              <div style={styles.priceRow}>
                <span style={styles.priceBlue}>Next-Gen AI</span>
              </div>

              <p style={styles.cardTarget}>
                For schools seeking AI automation
              </p>
            </div>

            <button style={styles.outlineBtn}>
              <span>Join Waitlist</span>
              <Rocket size={16} />
            </button>

            <div style={styles.featureList}>
              {[
                "Autonomous AI School Assistant",
                "Intelligent Timetabler & Conflict Resolution",
                "Predictive Academic & Fee Analytics",
                "Automated Parent & School Reports",
                "Multi-Campus Governance"
              ].map((feature, index) => (
                <div style={styles.featureItem} key={index}>
                  <CheckCircle2
                    size={19}
                    color="#2563EB"
                    style={{ flexShrink: 0 }}
                  />
                  <span style={styles.featureText}>{feature}</span>
                </div>
              ))}
            </div>

            <div style={styles.cardFooter}>
              <p style={styles.highlightFooterNote}>
                Priority waitlist schools get grandfathered pricing
              </p>
            </div>
          </div>

        </div>

        {/* FAQ SECTION */}

        <div style={styles.faqSection}>

          <div style={styles.faqHeader}>
            <h2 style={styles.faqTitle}>
              Frequently Asked Questions
            </h2>

            <p style={styles.faqSubtitle}>
              Everything you need to know about plans and onboarding.
            </p>
          </div>

          <div style={styles.faqList}>
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;

              return (
                <div
                  key={index}
                  style={styles.faqCard}
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                >
                  <div style={styles.faqQuestionRow}>
                    <span style={styles.faqQuestionText}>
                      {faq.question}
                    </span>

                    {isOpen
                      ? <ChevronUp size={19} color="#475569" />
                      : <ChevronDown size={19} color="#475569" />
                    }
                  </div>

                  {isOpen && (
                    <p style={styles.faqAnswerText}>
                      {faq.answer}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* BLUE CTA BANNER */}

        <div style={styles.bottomBanner}>
          <div style={styles.bannerGlow}></div>

          <h2 style={styles.bannerTitle}>
            Ready to get started?
          </h2>

          <p style={styles.bannerSubtitle}>
            Modernize your school with zero software fees.
          </p>

          <button style={styles.bannerBtn}>
            Get Started Free
            <ArrowRight size={16} />
          </button>
        </div>

      </div>
    </div>
  );
}


/* ==========================================
   STYLES
========================================== */

const styles: { [key: string]: React.CSSProperties } = {

  /* PAGE BACKGROUND */

  pageWrapper: {
    width: '100%',
    minHeight: '100vh',

    background: `
      radial-gradient(
        ellipse at 50% 0%,
        rgba(240, 198, 255, 0.72) 0%,
        transparent 42%
      ),
      radial-gradient(
        ellipse at 0% 35%,
        rgba(196, 181, 253, 0.30) 0%,
        transparent 45%
      ),
      radial-gradient(
        ellipse at 100% 65%,
        rgba(147, 197, 253, 0.32) 0%,
        transparent 45%
      ),
      radial-gradient(
        ellipse at 50% 100%,
        rgba(221, 214, 254, 0.55) 0%,
        transparent 45%
      ),
      linear-gradient(
        180deg,
        #FCEAFF 0%,
        #F7EDFF 22%,
        #EEF0FF 52%,
        #E5ECFF 78%,
        #F7EAFF 100%
      )
    `,

    paddingTop: '70px',
    paddingBottom: '110px',

    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    boxSizing: 'border-box',
  },


  container: {
    maxWidth: '1100px',
    width: '100%',
    margin: '0 auto',
    padding: '0 20px',
    boxSizing: 'border-box',
  },


  /* HEADER */

  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: '55px',
  },

  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '7px',

    background: 'rgba(255, 255, 255, 0.58)',
    border: '1px solid rgba(255, 255, 255, 0.85)',

    padding: '7px 17px',
    borderRadius: '50px',

    marginBottom: '18px',

    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',

    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.06)',
  },

  badgeText: {
    fontSize: '11px',
    fontWeight: 750,
    color: '#2563EB',
    letterSpacing: '1px',
  },

  title: {
    fontSize: 'clamp(32px, 4vw, 44px)',
    fontWeight: 800,
    letterSpacing: '-1.3px',
    color: '#101D32',
    margin: '0 0 12px 0',
  },

  subtitle: {
    fontSize: '16px',
    fontWeight: 450,
    color: '#64718A',
    margin: 0,
    lineHeight: 1.6,
  },


  /* PRICING GRID */

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '28px',
    alignItems: 'stretch',
    maxWidth: '960px',
    margin: '0 auto 105px auto',
  },


  /* BASIC GLASS CARD */

  card: {
    position: 'relative',

    background: `
      linear-gradient(
        145deg,
        rgba(255, 255, 255, 0.78) 0%,
        rgba(255, 255, 255, 0.48) 50%,
        rgba(237, 233, 254, 0.48) 100%
      )
    `,

    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',

    borderRadius: '25px',

    padding: '36px 32px',

    display: 'flex',
    flexDirection: 'column',

    border: '1px solid rgba(255, 255, 255, 0.9)',

    boxShadow: `
      0 20px 45px rgba(79, 70, 229, 0.08),
      0 8px 18px rgba(15, 23, 42, 0.045),
      inset 0 1px 2px rgba(255, 255, 255, 0.95),
      inset 0 -1px 2px rgba(148, 163, 184, 0.08)
    `,

    boxSizing: 'border-box',
    overflow: 'hidden',
  },


  /* PREMIUM GLASS CARD */

  premiumCard: {
    position: 'relative',

    background: `
      radial-gradient(
        ellipse at 100% 0%,
        rgba(191, 219, 254, 0.48) 0%,
        transparent 55%
      ),
      linear-gradient(
        145deg,
        rgba(255, 255, 255, 0.82) 0%,
        rgba(239, 246, 255, 0.55) 55%,
        rgba(221, 214, 254, 0.52) 100%
      )
    `,

    backdropFilter: 'blur(26px)',
    WebkitBackdropFilter: 'blur(26px)',

    borderRadius: '25px',
    padding: '36px 32px',

    display: 'flex',
    flexDirection: 'column',

    border: '1px solid rgba(255, 255, 255, 0.95)',

    boxShadow: `
      0 20px 48px rgba(37, 99, 235, 0.11),
      0 8px 20px rgba(79, 70, 229, 0.06),
      inset 0 1px 2px rgba(255, 255, 255, 1),
      inset 0 -1px 2px rgba(148, 163, 184, 0.08)
    `,

    boxSizing: 'border-box',
    overflow: 'hidden',
  },


  cardHeader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginBottom: '25px',
  },


  /* BADGES */

  greenBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '7px',

    background: 'rgba(220, 252, 231, 0.75)',
    border: '1px solid rgba(187, 247, 208, 0.9)',

    padding: '5px 13px',
    borderRadius: '50px',
    marginBottom: '18px',

    backdropFilter: 'blur(8px)',
  },

  greenBadgeText: {
    fontSize: '11px',
    fontWeight: 800,
    color: '#15803D',
    letterSpacing: '0.5px',
  },

  purpleBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '7px',

    background: 'rgba(219, 234, 254, 0.65)',
    border: '1px solid rgba(191, 219, 254, 0.85)',

    padding: '5px 13px',
    borderRadius: '50px',
    marginBottom: '18px',

    backdropFilter: 'blur(10px)',
  },

  purpleBadgeText: {
    fontSize: '11px',
    fontWeight: 800,
    color: '#1E40AF',
    letterSpacing: '0.5px',
  },


  /* PRICES */

  cardName: {
    fontSize: '21px',
    fontWeight: 750,
    color: '#0F172A',
    margin: '0 0 12px 0',
    letterSpacing: '-0.5px',
  },

  priceRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '9px',
    marginBottom: '7px',
  },

  priceMain: {
    fontSize: '34px',
    fontWeight: 800,
    color: '#0F172A',
    letterSpacing: '-1px',
  },

  priceSub: {
    fontSize: '15px',
    color: '#64748B',
    fontWeight: 550,
  },

  priceBlue: {
    fontSize: '27px',
    fontWeight: 800,
    color: '#2563EB',
    letterSpacing: '-0.6px',
  },

  cardTarget: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#64748B',
    margin: 0,
    lineHeight: 1.5,
  },


  /* BUTTONS */

  primaryBtn: {
    width: '100%',
    background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',

    color: '#FFFFFF',
    border: '1px solid rgba(255,255,255,0.25)',

    padding: '15px',
    borderRadius: '12px',

    fontSize: '15px',
    fontWeight: 700,

    cursor: 'pointer',

    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '9px',

    marginBottom: '32px',

    boxShadow: '0 7px 18px rgba(37, 99, 235, 0.23)',
  },

  outlineBtn: {
    width: '100%',

    background: 'rgba(255, 255, 255, 0.55)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',

    color: '#1D4ED8',

    border: '1px solid rgba(37, 99, 235, 0.38)',

    padding: '15px',
    borderRadius: '12px',

    fontSize: '15px',
    fontWeight: 700,

    cursor: 'pointer',

    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '9px',

    marginBottom: '32px',

    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.07)',
  },


  /* FEATURES */

  featureList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '19px',
    marginBottom: '32px',
    flexGrow: 1,
  },

  featureItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
  },

  featureText: {
    fontSize: '14px',
    fontWeight: 550,
    color: '#334155',
    lineHeight: 1.55,
  },


  /* CARD FOOTERS */

  cardFooter: {
    paddingTop: '20px',
    borderTop: '1px solid rgba(148, 163, 184, 0.20)',
    textAlign: 'center',
  },

  footerNote: {
    fontSize: '13px',
    color: '#64748B',
    margin: 0,
    fontWeight: 550,
  },

  highlightFooterNote: {
    fontSize: '13.5px',
    color: '#2563EB',
    fontWeight: 750,
    margin: 0,
  },


  /* FAQ */

  faqSection: {
    maxWidth: '860px',
    margin: '0 auto 85px auto',

    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },

  faqHeader: {
    textAlign: 'center',
    marginBottom: '36px',
  },

  faqTitle: {
    fontSize: '26px',
    fontWeight: 800,
    color: '#0F172A',
    margin: '0 0 10px 0',
    letterSpacing: '-0.6px',
  },

  faqSubtitle: {
    fontSize: '14.5px',
    color: '#64748B',
    margin: 0,
    lineHeight: 1.6,
  },

  faqList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    width: '100%',
  },

  faqCard: {
    background: `
      linear-gradient(
        135deg,
        rgba(255, 255, 255, 0.72),
        rgba(255, 255, 255, 0.43)
      )
    `,

    backdropFilter: 'blur(18px)',
    WebkitBackdropFilter: 'blur(18px)',

    borderRadius: '17px',
    padding: '23px 25px',

    border: '1px solid rgba(255, 255, 255, 0.85)',

    boxShadow: `
      0 7px 20px rgba(79, 70, 229, 0.045),
      inset 0 1px 2px rgba(255,255,255,0.9)
    `,

    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },

  faqQuestionRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '15px',
  },

  faqQuestionText: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#0F172A',
    lineHeight: 1.5,
  },

  faqAnswerText: {
    fontSize: '14px',
    fontWeight: 450,
    color: '#526178',
    lineHeight: 1.75,
    margin: '14px 0 0 0',
  },


  /* BLUE CTA BANNER - PRESERVED */

  bottomBanner: {
    position: 'relative',

    background: `
      radial-gradient(
        ellipse at 50% 0%,
        rgba(96, 165, 250, 0.38) 0%,
        transparent 65%
      ),
      linear-gradient(
        135deg,
        #1D4ED8 0%,
        #2563EB 50%,
        #4338CA 100%
      )
    `,

    borderRadius: '27px',
    padding: '55px 30px',

    textAlign: 'center',
    maxWidth: '960px',
    margin: '0 auto',

    boxShadow: `
      0 20px 45px rgba(37, 99, 235, 0.24),
      0 8px 20px rgba(79, 70, 229, 0.12),
      inset 0 1px 1px rgba(255,255,255,0.25)
    `,

    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',

    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.2)',
  },

  bannerGlow: {
    position: 'absolute',
    width: '350px',
    height: '250px',
    top: '-170px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(255,255,255,0.18)',
    filter: 'blur(65px)',
    borderRadius: '50%',
    pointerEvents: 'none',
  },

  bannerTitle: {
    position: 'relative',
    fontSize: 'clamp(25px, 3vw, 34px)',
    fontWeight: 800,
    color: '#FFFFFF',
    margin: '0 0 12px 0',
    letterSpacing: '-0.7px',
  },

  bannerSubtitle: {
    position: 'relative',
    fontSize: '15px',
    fontWeight: 500,
    color: 'rgba(255, 255, 255, 0.88)',
    margin: '0 0 28px 0',
    lineHeight: 1.6,
  },

  bannerBtn: {
    position: 'relative',

    background: '#FFFFFF',
    color: '#1D4ED8',

    border: '1px solid rgba(255,255,255,0.8)',

    padding: '14px 27px',
    borderRadius: '12px',

    fontSize: '14px',
    fontWeight: 750,

    cursor: 'pointer',

    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '9px',

    boxShadow: '0 5px 15px rgba(15, 23, 42, 0.13)',
  },
};
