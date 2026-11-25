import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FaqItem {
  id: number;
  question: string;
  answer: string;
}

const faqs: FaqItem[] = [
  {
    id: 1,
    question: "Is SmartEdufy cloud-based?",
    answer: "Yes, SmartEdufy is 100% cloud-based. You can access your school's administrative portal, records, and tools securely from any browser without needing local server setups or complex installations."
  },
  {
    id: 2,
    question: "Can I use SmartEdufy on mobile?",
    answer: "Absolutely! SmartEdufy is fully mobile-optimized for smartphones and tablets, ensuring administrators, teachers, and parents can easily manage tasks and receive updates on the go."
  },
  {
    id: 3,
    question: "How secure is my school's data?",
    answer: "We use bank-grade encryption both in transit and at rest. Your student records, financial information, and administrative data are isolated and regularly backed up on secure enterprise cloud infrastructure."
  },
  {
    id: 4,
    question: "Can we import existing school data?",
    answer: "Yes. Our onboarding team provides easy spreadsheet templates (CSV/Excel) to seamlessly import student rosters, staff accounts, class lists, and historical academic records."
  },
  {
    id: 5,
    question: "How does pricing work?",
    answer: "Our pricing is transparent and calculated termly based on student enrollment. There are zero hidden setup fees or unexpected maintenance costs."
  },
  {
    id: 6,
    question: "When will AI features become available?",
    answer: "Core management features are ready today. AI insights, automated report compilation, and personalized student analytics are actively rolling out across our planned platform updates."
  }
];

export default function FaqSection() {
  const [openId, setOpenId] = useState<number | null>(null);

  const toggleFaq = (id: number) => {
    setOpenId(prev => (prev === id ? null : id));
  };

  return (
    <section 
      id="faq"
      style={{
        width: "100%",
        // Solid light lavender background matching the reference image (no gradient)
        backgroundColor: "#F6F1FF",
        padding: "100px 24px 120px 24px",
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
        boxSizing: "border-box",
        borderTop: "1px solid rgba(226, 232, 240, 0.8)",
      }}
    >
      <div style={{ maxWidth: 960, width: "100%", margin: "0 auto", textAlign: "center", boxSizing: "border-box" }}>
        
        {/* SECTION HEADER */}
        <div style={{ marginBottom: "52px" }}>
          <h2 style={{
            fontSize: "clamp(32px, 4vw, 44px)",
            fontWeight: 800,
            color: "#0F172A",
            letterSpacing: "-1.2px",
            margin: "0 0 14px 0",
            lineHeight: 1.15,
          }}>
            Frequently Asked Questions
          </h2>

          <p style={{
            fontSize: "16px",
            lineHeight: 1.6,
            color: "#64748B",
            margin: 0,
          }}>
            Everything you need to know about getting started with SmartEdufy.
          </p>
        </div>

        {/* FAQ ACCORDION CARDS CONTAINER */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          textAlign: "left",
          width: "100%",
        }}>
          {faqs.map((faq) => {
            const isOpen = openId === faq.id;

            return (
              <div
                key={faq.id}
                onClick={() => toggleFaq(faq.id)}
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: "20px",
                  padding: "22px 32px",
                  boxShadow: "0 8px 20px -6px rgba(15, 23, 42, 0.05), 0 2px 6px -1px rgba(15, 23, 42, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.9)",
                  cursor: "pointer",
                  transition: "all 0.25s ease",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              >
                {/* Question Header Row */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "16px",
                }}>
                  <span style={{
                    fontSize: "17px",
                    fontWeight: 700,
                    color: "#0F172A",
                    letterSpacing: "-0.2px",
                  }}>
                    {faq.question}
                  </span>

                  <ChevronDown
                    size={20}
                    color="#64748B"
                    style={{
                      transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.25s ease",
                      flexShrink: 0,
                    }}
                  />
                </div>

                {/* Collapsible Answer Content */}
                {isOpen && (
                  <div style={{
                    marginTop: "14px",
                    paddingTop: "12px",
                    borderTop: "1px solid #F1F5F9",
                    fontSize: "15px",
                    lineHeight: 1.65,
                    color: "#475569",
                  }}>
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
