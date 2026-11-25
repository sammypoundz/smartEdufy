import React, { useState } from 'react';
import { Building2, TrendingUp, Sparkles, Check, Network, Rocket, ArrowRight } from 'lucide-react';

const C = {
  blue: "#2563eb",
  dark: "#0f172a",
  muted: "#64748b",
  border: "#cbd5e1",
  white: "#ffffff",
};

export default function StrategicEvolution() {
  // State to track which card is currently hovered (by index)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <section style={{
      width: "100%",
      background: "linear-gradient(180deg, #F3E8FF 0%, #EEF2FF 50%, #E0E7FF 100%)",
      padding: "90px 24px 110px",
      fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
      boxSizing: "border-box",
    }}>
      <div style={{ maxWidth: 1150, margin: "0 auto" }}>
        
        {/* --- TOP SECTION: STRATEGIC EVOLUTION --- */}
        <div style={{ textAlign: "center", maxWidth: 720, margin: "0 auto 60px" }}>
          <div style={{
            display: "inline-block",
            background: "#eff6ff",
            color: "#2563eb",
            border: "1px solid #dbeafe",
            padding: "6px 16px",
            borderRadius: 50,
            fontSize: 12,
            fontWeight: 700,
            marginBottom: 20,
            letterSpacing: 0.5,
          }}>
            Strategic Evolution
          </div>

          <h2 style={{
            fontSize: "clamp(32px, 4vw, 44px)",
            fontWeight: 800,
            color: C.dark,
            letterSpacing: -1,
            margin: "0 0 16px 0",
          }}>
            Built for Today. Ready for Tomorrow.
          </h2>

          <p style={{
            fontSize: 16,
            lineHeight: 1.6,
            color: C.muted,
            margin: 0,
          }}>
            SmartEdufy starts as a complete, reliable school management system to streamline your daily operations today, and is architected from the ground up to evolve into an AI-powered education platform that personalizes learning and administration.
          </p>
        </div>

        {/* 3-Step Flow Cards */}
        <div style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 110,
        }}>
          {/* Step 1 */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.20)',
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            padding: "20px 24px",
            display: "flex",
            alignItems: "center",
            gap: 14,
            minWidth: 220,
            transition: "transform 0.25s ease, box-shadow 0.25s ease, background 0.25s ease",
            transform: "translateY(-3px)",
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            boxShadow: "0 8px 18px rgba(15, 23, 42, 0.13), 0 2px 5px rgba(15, 23, 42, 0.08)"
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10, background: "#eff6ff",
              display: "grid", placeItems: "center", color: C.blue
            }}>
              <Building2 size={20} />
            </div>
            <div>
              <span style={{ fontSize: 11, color: C.muted, display: "block" }}>Step 1</span>
              <strong style={{ fontSize: 15, color: C.dark }}>School Management</strong>
            </div>
          </div>

          <ArrowRight size={20} color="#94a3b8" />

          {/* Step 2 */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.20)',
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            padding: "20px 24px",
            display: "flex",
            alignItems: "center",
            gap: 14,
            minWidth: 220,
            transition: "transform 0.25s ease, box-shadow 0.25s ease, background 0.25s ease",
            transform: "translateY(-3px)",
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            boxShadow: "0 8px 18px rgba(15, 23, 42, 0.13), 0 2px 5px rgba(15, 23, 42, 0.08)"
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10, background: "#eff6ff",
              display: "grid", placeItems: "center", color: C.blue
            }}>
              <TrendingUp size={20} />
            </div>
            <div>
              <span style={{ fontSize: 11, color: C.muted, display: "block" }}>Step 2</span>
              <strong style={{ fontSize: 15, color: C.dark }}>Smart Insights</strong>
            </div>
          </div>

          <ArrowRight size={20} color="#94a3b8" />

          {/* Step 3 (Highlighted) */}
          <div style={{
            background: "#dbeafe",
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            padding: "20px 24px",
            display: "flex",
            alignItems: "center",
            gap: 14,
            minWidth: 220,
            transition: "transform 0.25s ease, box-shadow 0.25s ease, background 0.25s ease",
            transform: "translateY(-3px)",
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            boxShadow: "0 8px 18px rgba(15, 23, 42, 0.13), 0 2px 5px rgba(15, 23, 42, 0.08)"
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10, background: "#ffffff",
              display: "grid", placeItems: "center", color: C.blue
            }}>
              <Sparkles size={20} />
            </div>
            <div>
              <span style={{ fontSize: 11, color: "#1e40af", display: "block", fontWeight: 600 }}>Step 3</span>
              <strong style={{ fontSize: 15, color: "#1e3a8a" }}>AI-Powered Education</strong>
            </div>
          </div>
        </div>

        {/* --- BOTTOM SECTION: WHY SMARTEDUFY --- */}
        <div style={{ 
          textAlign: "center", 
          maxWidth: 640, 
          margin: "0 auto 50px auto",
          paddingTop: "40px",
          borderTop: "1px solid rgba(196, 181, 253, 0.4)"
        }}>
          <h2 style={{
            fontSize: "clamp(28px, 3.5vw, 38px)",
            fontWeight: 800,
            color: C.dark,
            letterSpacing: -1,
            margin: "0 0 12px 0",
          }}>
            Why SmartEdufy
          </h2>
          <p style={{
            fontSize: 16,
            lineHeight: 1.6,
            color: C.muted,
            margin: 0,
          }}>
            Engineered with deep empathy for the infrastructure realities of African educational institutions.
          </p>
        </div>

        {/* 3 Glassmorphic Cards Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))",
          gap: 24,
        }}>
          {/* Card 1: Simple */}
          <div 
            style={getCardStyle(hoveredIndex === 0)}
            onMouseEnter={() => setHoveredIndex(0)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div style={iconBoxStyle}>
              <Check size={20} strokeWidth={2.8} color="#2563eb" />
            </div>
            <h3 style={titleStyle}>Simple</h3>
            <p style={descStyle}>
              Make everyday school management easier. Fast onboarding with zero technical background required for teachers or staff.
            </p>
          </div>

          {/* Card 2: Connected */}
          <div 
            style={getCardStyle(hoveredIndex === 1)}
            onMouseEnter={() => setHoveredIndex(1)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div style={iconBoxStyle}>
              <Network size={20} strokeWidth={2.2} color="#2563eb" />
            </div>
            <h3 style={titleStyle}>Connected</h3>
            <p style={descStyle}>
              Keep important school information in one place. Synchronize data effortlessly between cashiers, registrars, and parents.
            </p>
          </div>

          {/* Card 3: Future-Ready */}
          <div 
            style={getCardStyle(hoveredIndex === 2)}
            onMouseEnter={() => setHoveredIndex(2)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div style={iconBoxStyle}>
              <Rocket size={20} strokeWidth={2.2} color="#2563eb" />
            </div>
            <h3 style={titleStyle}>Future-Ready</h3>
            <p style={descStyle}>
              Built with an AI-powered future in mind. Expand effortlessly into automated exam analytics and personalized learning paths.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}

// Dynamic helper function that applies hover styling to the entire card
const getCardStyle = (isHovered: boolean): React.CSSProperties => ({
  backgroundColor: isHovered ? "rgba(255, 255, 255, 0.78)" : "rgba(255, 255, 255, 0.45)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255, 255, 255, 0.8)",
  borderRadius: "28px",
  padding: "36px 32px 40px",
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  cursor: "pointer",
  transform: isHovered ? "translateY(-3px)" : "translateY(0px)",
  transition: "transform 0.25s ease, box-shadow 0.25s ease, background 0.25s ease",
  boxShadow: isHovered
    ? "0 18px 35px -10px rgba(37, 99, 235, 0.15), 0 8px 18px rgba(15, 23, 42, 0.13), 0 2px 5px rgba(15, 23, 42, 0.08)"
    : "0 10px 30px -10px rgba(37, 99, 235, 0.06)",
});

const iconBoxStyle: React.CSSProperties = {
  width: "44px",
  height: "44px",
  borderRadius: "10px",
  backgroundColor: "#FFFFFF",
  border: "1px solid rgba(226, 232, 240, 0.9)",
  display: "grid",
  placeItems: "center",
  marginBottom: "32px",
  boxShadow: `
      0 3px 5px rgba(15, 23, 42, 0.20),
      0 1px 2px rgba(15, 23, 42, 0.12),
      inset 0 1px 2px rgba(255, 255, 255, 0.75)
    `,
};

const titleStyle: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: 800,
  color: "#0F172A",
  margin: "0 0 12px 0",
  letterSpacing: "-0.3px",
};

const descStyle: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: 1.6,
  color: "#475569",
  margin: 0,
};
