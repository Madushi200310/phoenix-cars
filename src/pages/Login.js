import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
        const userData = userDoc.data();
        const role = userData.role || "user";
        // Store role in session for quick access
        sessionStorage.setItem("userRole", role);
        navigate("/dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError("Invalid email or password. Please try again.");
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.logo}> Phoenix Cars</h1>
        <h2 style={styles.title}>Welcome Back!</h2>
        <p style={styles.subtitle}>Login to your account</p>

        {error && <div style={styles.errorMessage}>{error}</div>}

        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleLogin()}
          style={styles.input}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleLogin()}
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
          {loading ? "Logging in..." : "Login"}
        </button>

        <p style={styles.registerText}>
          Don't have an account?{" "}
          <span onClick={() => navigate("/register")} style={styles.link}>
            Register here
          </span>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    backgroundColor: "#f5f5f5",
    padding: "20px",
  },
  card: {
    backgroundColor: "#fff",
    padding: "40px",
    borderRadius: "16px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
    maxWidth: "420px",
    width: "100%",
  },
  logo: {
    color: "#e25822",
    textAlign: "center",
    margin: "0 0 8px 0",
    fontSize: "28px",
  },
  title: {
    textAlign: "center",
    margin: "0 0 4px 0",
    color: "#333",
  },
  subtitle: {
    textAlign: "center",
    color: "#666",
    margin: "0 0 24px 0",
  },
  errorMessage: {
    backgroundColor: "#fff3f3",
    color: "#dc3545",
    padding: "10px",
    borderRadius: "8px",
    marginBottom: "16px",
    fontSize: "14px",
    textAlign: "center",
  },
  input: {
    width: "100%",
    padding: "12px 16px",
    marginBottom: "12px",
    borderRadius: "8px",
    border: "2px solid #e0e0e0",
    fontSize: "14px",
    boxSizing: "border-box",
    transition: "border-color 0.3s",
  },
  loginButton: {
    width: "100%",
    padding: "12px",
    backgroundColor: "#e25822",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "bold",
    transition: "background 0.3s",
    marginTop: "8px",
  },
  registerText: {
    textAlign: "center",
    marginTop: "20px",
    color: "#666",
  },
  link: {
    color: "#e25822",
    cursor: "pointer",
    fontWeight: "bold",
  },
};

export default Login;