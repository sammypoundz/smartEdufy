import React from "react";
import {
  Folder,
  TrendingUp,
  BellRing,
} from "lucide-react";

const C = {
  background: "#f3effe",
  blue: "#2563eb",
  dark: "#0f172a",
  muted: "#64748b",
  border: "#e2e8f0",
  white: "#ffffff",
  offWhite: "#f8fafc",
};

function Feature({
  icon: Icon,
  title,
  description
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 14
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12, background: "#eff6ff",
        display: "grid", placeItems: "center", color: "#2563eb", flexShrink: 0
      }}>
        <Icon size={22} />
      </div>
      <div>
        <h3 style={{
          fontSize: 16, fontWeight: 700,
          margin: "0 0 6px", color: C.dark
        }}>{title}</h3>
        <p style={{
          margin: 0, fontSize: 13, lineHeight: 1.5,
          color: C.muted
        }}>{description}</p>
      </div>
    </div>
  );
}

export default function WorkflowSection() {
  return (
    <section 
      id="workflow"
      style={{
        width: "100%", 
        background: C.background,
        color: C.dark, 
        overflow: "hidden",
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
        paddingTop: "100px",
        marginTop: "40px",
        borderTop: "1px solid rgba(226, 232, 240, 0.8)",
      }}
    >
      <div style={{
        maxWidth: 1200, 
        margin: "0 auto", 
        padding: "0 24px",
        display: "flex", 
        flexDirection: "column",
        alignItems: "center"
      }}>
        <div style={{
          textAlign: "center", 
          maxWidth: 640,
          margin: "0 auto 50px"
        }}>
          <span style={{
            color: "#2563eb", 
            fontSize: 11,
            fontWeight: 800, 
            letterSpacing: 1.2
          }}>
            INTEGRATED WORKFLOW
          </span>

          <h1 style={{
            margin: "12px 0 16px", 
            fontSize: "clamp(32px, 4vw, 42px)",
            fontWeight: 800, 
            letterSpacing: -1, 
            color: C.dark
          }}>
            Everything in One Place
          </h1>

          <p style={{
            margin: "0 auto", 
            maxWidth: 520,
            fontSize: 16, 
            lineHeight: 1.6, 
            color: C.muted
          }}>
            A cohesive workspace that harmonizes classroom records, bursary accounts, and administrative oversight without switching tools.
          </p>
        </div>

        {/* THREE PHONE MOCKUP IMAGES WITH INDIVIDUAL SIZING */}
        <div style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 28,
          flexWrap: "wrap",
          width: "100%",
          marginBottom: 60
        }}>
          <div style={styles.imageWrapper}>
            <img src="/screen4.png" alt="Admin Portal" style={styles.adminImage} />
          </div>
          <div style={styles.imageWrapper}>
            <img src="/screen1.png" alt="Parent Portal" style={styles.parentImage} />
          </div>
          <div style={styles.imageWrapper}>
            <img src="/screen2.png" alt="Teacher Portal" style={styles.teacherImage} />
          </div>
        </div>
      </div>

      {/* BOTTOM FEATURES CONTAINER WITH OFF-WHITE BACKGROUND */}
      <div style={{
        width: "100%",
        background: C.offWhite,
        borderTop: "1px solid #e2e8f0",
        padding: "50px 24px"
      }}>
        <div style={{
          maxWidth: 1100,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 32
        }}>
          <Feature
            icon={Folder}
            title="Manage Students"
            description="Keep student information organized, secure, and easily accessible for schools and parents, anytime, anywhere."
          />

          <Feature
            icon={TrendingUp}
            title="Track Performance"
            description="Stay on top of attendance, results, and school activities with ease—keeping schools and parents informed every step of the way."
          />

          <Feature
            icon={BellRing}
            title="Stay Connected"
            description="Keep parents, teachers, and school administrators connected with instant updates and alerts."
          />
        </div>
      </div>
    </section>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  imageWrapper: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  adminImage: {
    width: "270px",
    height: "auto",
    objectFit: "contain",
    filter: "drop-shadow(0 25px 35px rgba(15, 23, 42, 0.18))",
    display: "block",
  },
  parentImage: {
    width: "270px",
    height: "auto",
    objectFit: "contain",
    filter: "drop-shadow(0 25px 35px rgba(15, 23, 42, 0.18))",
    display: "block",
  },
  // You can increase or decrease this width value independently to match the others perfectly!
  teacherImage: {
    width: "305px", 
    height: "auto",
    objectFit: "contain",
    filter: "drop-shadow(0 25px 35px rgba(15, 23, 42, 0.18))",
    display: "block",
  },
};
