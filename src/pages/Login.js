import React, { useState, useEffect } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";

// ─── Slideshow content (edit these to explain your app) ───
const SLIDES = [
  {
    icon: "🚗",
    title: "Hello Phoenix!",
    subtitle: "Find Your Dream Car",
    description:
      "Browse a curated collection of premium vehicles with detailed specs, photos, and 3D models.",
  },
  {
    icon: "💬",
    title: "Chat Instantly",
    subtitle: "Talk to Our Team",
    description:
      "Ask questions, negotiate, and get real-time answers directly from our sales team.",
  },
  {
    icon: "📍",
    title: "Track Live",
    subtitle: "See It In Real Time",
    description:
      "Request to buy and track your vehicle's location live across Sri Lanka.",
  },
  {
    icon: "⚡",
    title: "Skip the Hassle",
    subtitle: "Buy Smarter, Faster",
    description:
      "Automated workflows cut the back-and-forth so you get on the road sooner.",
  },
];

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  // Auto-rotate slides every 5s
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      return setError("Please enter both email and password.");
    }

    setLoading(true);
    setError("");

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));

      if (userDoc.exists()) {
        const role = userDoc.data().role || "user";
        sessionStorage.setItem("userRole", role);
      }
      navigate("/dashboard");
    } catch (err) {
      setError("Invalid email or password. Please try again.");
      console.error(err);
    }
    setLoading(false);
  };

  const handleGoogleLogin = () => {
    // TODO: wire up Google provider if needed
    alert("Google login coming soon — use email/password for now.");
  };

  const slide = SLIDES[currentSlide];

  return (
    <div style={styles.container}>
      {/* ───────── LEFT PANEL — Slideshow ───────── */}
      <div style={styles.leftPanel} className="login-left-panel">
        <div style={styles.leftContent}>
          {/* Logo */}
          <div style={styles.logoRow}>
            <div style={styles.logoMark}>✳</div>
            <span style={styles.logoText}>Phoenix</span>
          </div>

          {/* Slide content */}
          <div key={currentSlide} style={styles.slideContent}>
            <h1 style={styles.heroTitle}>
              {slide.title} <span style={styles.wave}>{slide.icon}</span>
            </h1>
            <h2 style={styles.heroSubtitle}>{slide.subtitle}</h2>
            <p style={styles.heroDescription}>{slide.description}</p>
          </div>

          {/* Dots */}
          <div style={styles.dots}>
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                style={{
                  ...styles.dot,
                  ...(i === currentSlide ? styles.dotActive : {}),
                }}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </div>

        <p style={styles.copyright}>
          © {new Date().getFullYear()} Phoenix Cars. All rights reserved.
        </p>
      </div>

      {/* ───────── RIGHT PANEL — Login Form ───────── */}
      <div style={styles.rightPanel}>
        <div style={styles.formWrapper}>
          {/* Top brand */}
          <h3 style={styles.brandTop}>Phoenix</h3>

          <h1 style={styles.welcomeTitle}>Welcome Back!</h1>
          <p style={styles.welcomeSubtitle}>
            Don't have an account?{" "}
            <span onClick={() => navigate("/register")} style={styles.link}>
              Create a new account
            </span>
            .<br />
            It's FREE! Takes less than a minute.
          </p>

          {error && <div style={styles.errorMessage}>{error}</div>}

          {/* Inputs — underlined style like the reference */}
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            style={styles.input}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            style={styles.input}
          />

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              ...styles.loginButton,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Logging in..." : "Login Now"}
          </button>

          {/* Divider */}
          <div style={styles.divider}>
            <span style={styles.dividerLine} />
            <span style={styles.dividerText}>or</span>
            <span style={styles.dividerLine} />
          </div>

          <button onClick={handleGoogleLogin} style={styles.googleButton}>
            <span style={styles.googleIcon}>G</span>
            Login with Google
          </button>

          <p style={styles.forgotText}>
            Forgot password?{" "}
            <span onClick={() => navigate("/register")} style={styles.link}>
              Click here
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ────────────── STYLES ────────────── */
const styles = {
  container: {
    display: "flex",
    minHeight: "100vh",
    fontFamily: "'Segoe UI', Arial, sans-serif",
  },

  /* ── LEFT ── */
  leftPanel: {
    flex: 1,
    background:
      "linear-gradient(135deg, #2b1a0a 0%, #4a1e0a 55%, #8b0000 100%)",
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: "48px 56px",
    position: "relative",
    overflow: "hidden",
  },
  leftContent: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    position: "relative",
    zIndex: 2,
  },
  logoRow: {
    position: "absolute",
    top: 0,
    left: 0,
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  logoMark: {
    fontSize: "36px",
    color: "#e0b84c",
    fontWeight: "300",
    lineHeight: 1,
  },
  logoText: {
    fontSize: "20px",
    fontWeight: "600",
    letterSpacing: "0.5px",
    color: "#faf3e0",
  },
  slideContent: {
    animation: "fadeSlide 0.6s ease-out",
    maxWidth: "480px",
  },
  heroTitle: {
    fontSize: "44px",
    fontWeight: "800",
    margin: "0 0 12px 0",
    lineHeight: "1.15",
    color: "#faf3e0",
  },
  wave: {
    display: "inline-block",
  },
  heroSubtitle: {
    fontSize: "22px",
    fontWeight: "600",
    margin: "0 0 18px 0",
    color: "#e0b84c",
  },
  heroDescription: {
    fontSize: "16px",
    lineHeight: "1.6",
    color: "#e8d9b8",
    margin: 0,
  },
  dots: {
    position: "absolute",
    bottom: "70px",
    left: "56px",
    display: "flex",
    gap: "10px",
  },
  dot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    border: "none",
    background: "rgba(224,184,76,0.35)",
    cursor: "pointer",
    padding: 0,
    transition: "all 0.3s",
  },
  dotActive: {
    background: "#e0b84c",
    width: "28px",
    borderRadius: "6px",
  },
  copyright: {
    fontSize: "12px",
    color: "#c9b58a",
    margin: 0,
    position: "relative",
    zIndex: 2,
  },

  /* ── RIGHT ── */
  rightPanel: {
    flex: 1,
    background: "#fffdf8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px",
  },
  formWrapper: {
    width: "100%",
    maxWidth: "420px",
  },
  brandTop: {
    fontSize: "22px",
    fontWeight: "700",
    color: "#b8860b",
    marginTop: 0,
    marginBottom: "48px",
  },
  welcomeTitle: {
    fontSize: "28px",
    fontWeight: "700",
    color: "#2b1a0a",
    margin: "0 0 10px 0",
  },
  welcomeSubtitle: {
    fontSize: "14px",
    color: "#7a5c3a",
    lineHeight: "1.6",
    margin: "0 0 28px 0",
  },
  errorMessage: {
    backgroundColor: "#fff3f3",
    color: "#8b0000",
    padding: "10px 14px",
    borderRadius: "8px",
    marginBottom: "18px",
    fontSize: "13px",
    border: "1px solid #f5c2c7",
  },
  input: {
    width: "100%",
    padding: "14px 4px",
    marginBottom: "22px",
    border: "none",
    borderBottom: "1.5px solid #e6d4a8",
    fontSize: "15px",
    boxSizing: "border-box",
    outline: "none",
    background: "transparent",
    color: "#2b1a0a",
    transition: "border-color 0.3s",
  },
  loginButton: {
    width: "100%",
    padding: "15px",
    background: "linear-gradient(135deg, #b8860b 0%, #8b0000 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    fontSize: "15px",
    fontWeight: "600",
    transition: "opacity 0.3s",
    marginTop: "6px",
    cursor: "pointer",
  },
  divider: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    margin: "22px 0",
  },
  dividerLine: {
    flex: 1,
    height: "1px",
    background: "#efe6d3",
  },
  dividerText: {
    fontSize: "12px",
    color: "#a08a63",
  },
  googleButton: {
    width: "100%",
    padding: "14px",
    backgroundColor: "#fff",
    color: "#2b1a0a",
    border: "1.5px solid #d4a017",
    borderRadius: "10px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    transition: "background 0.3s",
  },
  googleIcon: {
    fontSize: "18px",
    fontWeight: "800",
    color: "#b8860b",
  },
  forgotText: {
    textAlign: "center",
    marginTop: "28px",
    fontSize: "13px",
    color: "#7a5c3a",
  },
  link: {
    color: "#8b0000",
    cursor: "pointer",
    fontWeight: "600",
  },
};

export default Login;