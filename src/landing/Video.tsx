import { useRef, useState } from 'react';
import { Play } from 'lucide-react';

const C = {
  blue: "#2563eb",
  dark: "#0f172a",
  muted: "#64748b",
  border: "#cbd5e1",
  white: "#ffffff",
};

export default function PricingVideoSection() {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <section style={{
      width: "100%",
      background: "linear-gradient(180deg, #E0E7FF 0%, #F3E8FF 45%, #F3E8FF 100%)",
      padding: "110px 24px 130px 24px",
      fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      borderTop: "0.2px  rgba(170, 95, 245, 0.4)", 
      marginTop: "3px",
    }}>
      <div style={{ maxWidth: 1200, width: "100%", margin: "0 auto", textAlign: "center" }}>
        
        {/* SECTION HEADER */}
        <div style={{ maxWidth: 720, margin: "0 auto 56px auto" }}>
          <h2 style={{
            fontSize: "clamp(34px, 4.5vw, 48px)",
            fontWeight: 800,
            color: C.dark,
            letterSpacing: "-1.2px",
            margin: "0 0 16px 0",
            lineHeight: 1.15,
          }}>
            Transparent Plans for Every School
          </h2>

          <p style={{
            fontSize: "16px",
            lineHeight: 1.6,
            color: C.muted,
            margin: "0 auto",
            maxWidth: "600px",
          }}>
            No hidden implementation costs. Predictable termly pricing designed to scale with your student enrollment.
          </p>
        </div>

        {/* LAPTOP DISPLAY MOCKUP FRAME */}
        <div style={{
          position: "relative",
          maxWidth: "1020px",
          width: "100%",
          margin: "0 auto",
          backgroundColor: "#0B1329",
          borderRadius: "28px",
          padding: "12px",
          boxShadow: "0 35px 70px -15px rgba(15, 23, 42, 0.3)",
          border: "2px solid rgba(255, 255, 255, 0.2)",
          boxSizing: "border-box",
        }}>
          {/* Inner Screen Container */}
          <div style={{
            position: "relative",
            width: "100%",
            aspectRatio: "16 / 10",
            backgroundColor: "#000000",
            borderRadius: "1px",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            
            {/* Video Thumbnail Image (Shown when video is NOT playing) */}
            {!isPlaying && (
              <img 
                src="/video.jpeg" // <-- Replace with your actual thumbnail filename in the public folder
                alt="SmartEdufy Video Thumbnail" 
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            )}

            {/* Actual HTML5 Video Tag */}
            <video
              ref={videoRef}
              src="" // <-- ADD YOUR VIDEO LINK HERE
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: isPlaying ? "block" : "none",
                zIndex: 5,
              }}
              controls={isPlaying}
            />

            {/* Play Button Overlay */}
            {!isPlaying && (
              <div 
                onClick={togglePlay}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: "rgba(15, 23, 42, 0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  zIndex: 10,
                }}
              >
                <div style={{
                  width: "80px",
                  height: "80px",
                  backgroundColor: "#000000",
                  borderRadius: "24px",
                  display: "grid",
                  placeItems: "center",
                  boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
                  transition: "transform 0.2s ease",
                }}>
                  <Play size={36} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: "4px" }} />
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </section>
  );
}
