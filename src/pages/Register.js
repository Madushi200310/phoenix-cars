import React, { useState, useEffect } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";

// ─── Slideshow content (matches Login page) ───
const SLIDES = [
  {
    icon: "🚗",
    title: "Join Phoenix!",
    subtitle: "Create Your Free Account",
    description:
      "Sign up in under a minute and unlock instant access to our full vehicle catalogue.",
  },
  {
    icon: "💬",
    title: "Chat Directly",
    subtitle: "With Our Sales Team",
    description:
      "Ask questions, request quotes, and negotiate in real time — no phone tag.",
  },
  {
    icon: "📍",
    title: "Track Live",
    subtitle: "See Every Vehicle",
    description:
      "Follow a vehicle's location in real time across Sri Lanka before you buy.",
  },
  {
    icon: "⚡",
    title: "Fast & Simple",
    subtitle: "Start Browsing Now",
    description:
      "Automated tools make buying a car the easiest thing you'll do today.",
  },
];

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  // Auto-rotate slides every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRegister = async () => {
    if (!name.trim()) return setError("Please enter your name.");
    if (!email.trim()) return setError("Please enter your email.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");

    setLoading(true);
    setError("");

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });

      await setDoc(doc(db, "users", userCredential.user.uid), {
        name,
        email,
        role,
        createdAt: new Date(),
      });

      sessionStorage.setItem("userRole", role);
      navigate("/dashboard");
    } catch (err) {
      setError("Registration failed. Email may already be in use.");
      console.error(err);
    }
    setLoading(false);
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

      {/* ───────── RIGHT PANEL — Register Form ───────── */}
      <div style={styles.rightPanel}>
        <div style={styles.formWrapper}>
          <h3 style={styles.brandTop}>Phoenix</h3>

          <h1 style={styles.welcomeTitle}>Create Account</h1>
          <p style={styles.welcomeSubtitle}>
            Already have an account?{" "}
            <span onClick={() => navigate("/login")} style={styles.link}>
              Login here
            </span>
            .
            <br />
            Join our community today.
          </p>

          {error && <div style={styles.errorMessage}>{error}</div>}

          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRegister()}
            style={styles.input}
          />
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRegister()}
            style={styles.input}
          />
          <input
            type="password"
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRegister()}
            style={styles.input}
          />

          {/* Role selector — compact pills */}
          <div style={styles.roleSection}>
            <label style={styles.roleLabel}>Select Your Role</label>
            <div style={styles.roleOptions}>
              <button
                type="button"
                onClick={() => setRole("user")}
                style={{
                  ...styles.rolePill,
                  ...(role === "user" ? styles.rolePillActive : {}),
                }}
              >
                👤 User
              </button>
              <button
                type="button"
                onClick={() => setRole("admin")}
                style={{
                  ...styles.rolePill,
                  ...(role === "admin" ? styles.rolePillActive : {}),
                }}
              >
                👑 Admin
              </button>
            </div>
          </div>

          <button
            onClick={handleRegister}
            disabled={loading}
            style={{
              ...styles.registerButton,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>

          <p style={styles.loginText}>
            Already have an account?{" "}
            <span onClick={() => navigate("/login")} style={styles.link}>
              Login here
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
    background: "linear-gradient(135deg, #3b3bff 0%, #2929cc 60%, #1e1ea8 100%)",
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
    color: "#fff",
    fontWeight: "300",
    lineHeight: 1,
  },
  logoText: {
    fontSize: "20px",
    fontWeight: "600",
    letterSpacing: "0.5px",
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
  },
  wave: {
    display: "inline-block",
  },
  heroSubtitle: {
    fontSize: "22px",
    fontWeight: "600",
    margin: "0 0 18px 0",
    opacity: 0.95,
  },
  heroDescription: {
    fontSize: "16px",
    lineHeight: "1.6",
    opacity: 0.85,
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
    background: "rgba(255,255,255,0.35)",
    cursor: "pointer",
    padding: 0,
    transition: "all 0.3s",
  },
  dotActive: {
    background: "#fff",
    width: "28px",
    borderRadius: "6px",
  },
  copyright: {
    fontSize: "12px",
    opacity: 0.7,
    margin: 0,
    position: "relative",
    zIndex: 2,
  },

  /* ── RIGHT ── */
  rightPanel: {
    flex: 1,
    background: "#fff",
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
    color: "#111",
    marginTop: 0,
    marginBottom: "48px",
  },
  welcomeTitle: {
    fontSize: "28px",
    fontWeight: "700",
    color: "#111",
    margin: "0 0 10px 0",
  },
  welcomeSubtitle: {
    fontSize: "14px",
    color: "#666",
    lineHeight: "1.6",
    margin: "0 0 28px 0",
  },
  errorMessage: {
    backgroundColor: "#fff3f3",
    color: "#dc3545",
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
    borderBottom: "1.5px solid #ddd",
    fontSize: "15px",
    boxSizing: "border-box",
    outline: "none",
    background: "transparent",
    color: "#111",
  },

  /* ── Role pills ── */
  roleSection: {
    marginBottom: "26px",
  },
  roleLabel: {
    display: "block",
    fontSize: "12px",
    fontWeight: "600",
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: "10px",
  },
  roleOptions: {
    display: "flex",
    gap: "10px",
  },
  rolePill: {
    flex: 1,
    padding: "12px 16px",
    background: "#f8f9fa",
    color: "#333",
    border: "1.5px solid #e0e0e0",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  rolePillActive: {
    background: "#fff",
    borderColor: "#e25822",
    color: "#e25822",
    boxShadow: "0 0 0 3px rgba(226,88,34,0.12)",
  },

  registerButton: {
    width: "100%",
    padding: "15px",
    backgroundColor: "#111",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    fontSize: "15px",
    fontWeight: "600",
    marginTop: "6px",
  },
  loginText: {
    textAlign: "center",
    marginTop: "28px",
    fontSize: "13px",
    color: "#666",
  },
  link: {
    color: "#e25822",
    cursor: "pointer",
    fontWeight: "600",
  },
};

export default Register;