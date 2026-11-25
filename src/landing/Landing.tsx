// Public landing page — the marketing site pulled from the Mazoje/smart-edufy
// repo. Sections live in src/landing/*; this wrapper reproduces that repo's
// App.tsx page switching (home / features / pricing / signin) but routes the
// "Sign in"/"Sign up" buttons into the real app login instead of the demo
// alert. Registered at "/" and "/home" in App.tsx.
import { useState, useEffect } from "react";
import "./landing.css";
import Navbar from "./Navbar";
import Hero from "./Hero";
import About from "./About";
import FeaturesPage from "./Features";
import Flow from "./Flow";
import Evolution from "./Evolution";
import Video from "./Video";
import FAQ from "./FAQ";
import Footer from "./Footer";
import PricingPage from "./Pricing";
import SmartEdufySignIn from "./Signin";

export type LandingPage =
  | "home"
  | "features"
  | "pricing"
  | "signin"
  | "signin-signup";

export default function Landing({
  initialPage,
}: {
  initialPage?: LandingPage;
}) {
  const [currentPage, setCurrentPage] = useState<LandingPage>(
    initialPage || "home"
  );

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPage]);

  const handlePageChange = (page: string, sectionId?: string) => {
    // Login / Sign up use the cloned landing page's own Signin design.
    if (page === "login" || page === "signin") {
      setCurrentPage("signin");
      return;
    }
    if (page === "signup") {
      setCurrentPage("signin-signup");
      return;
    }
    const nextPage = page as LandingPage;
    const pageChanged = nextPage !== currentPage;

    setCurrentPage(nextPage);

    if (sectionId) {
      if (pageChanged) {
        setTimeout(() => {
          document.getElementById(sectionId)?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 250);
      } else {
        document.getElementById(sectionId)?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    } else if (pageChanged) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // The Signin page renders its own top bar (logo + Sign In / Sign Up tabs),
  // so the landing navbar and footer must be hidden on those views.
  const showHeaderFooter =
    currentPage !== "signin" && currentPage !== "signin-signup";

  return (
    <div className="smart-landing" style={styles.appContainer}>
      {showHeaderFooter && (
        <Navbar currentPage={currentPage} setCurrentPage={handlePageChange} />
      )}

      <main style={styles.mainContent}>
        {currentPage === "home" && (
          <>
            <Hero setCurrentPage={handlePageChange} />

            <section id="about" className="app-scroll-section">
              <About />
            </section>

            <Flow />
            <Evolution />
            <Video />

            <section id="faq" className="app-scroll-section">
              <FAQ />
            </section>
          </>
        )}

        {currentPage === "features" && (
          <FeaturesPage setCurrentPage={handlePageChange} />
        )}

        {currentPage === "pricing" && <PricingPage />}

        {currentPage === "signin" && (
          <SmartEdufySignIn setCurrentPage={(p) => handlePageChange(p)} />
        )}

        {currentPage === "signin-signup" && (
          <SmartEdufySignIn
            setCurrentPage={(p) => handlePageChange(p)}
            initialAuth="Sign Up"
          />
        )}
      </main>

      {showHeaderFooter && <Footer setCurrentPage={handlePageChange} />}

      <style>{`
        html {
          scroll-behavior: smooth;
        }
        .app-scroll-section {
          scroll-margin-top: 90px;
        }
      `}</style>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  appContainer: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    width: "100%",
    fontFamily: "Inter, system-ui, -apple-system, sans-serif",
    backgroundColor: "#FDF8FF",
    overflowX: "hidden",
  },
  mainContent: {
    flex: 1,
    width: "100%",
  },
};
