import React, { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.logo}> Phoenix Cars</h1>
        <h2 style={styles.title}>Create Account</h2>
        <p style={styles.subtitle}>Join our community today</p>

        {error && <div style={styles.errorMessage}>{error}</div>}

        <input
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={styles.input}
        />
        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={styles.input}
        />
        <input
          type="password"
          placeholder="Password (min 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
        />

        <div style={styles.roleSection}>
          <label style={styles.roleLabel}>Select Your Role:</label>
          <div style={styles.roleOptions}>
            <label style={styles.roleOption}>
              <input
                type="radio"
                name="role"
                value="admin"
                checked={role === "admin"}
                onChange={() => setRole("admin")}
              />
               Admin
            </label>
            <label style={styles.roleOption}>
              <input
                type="radio"
                name="role"
                value="user"
                checked={role === "user"}
                onChange={() => setRole("user")}
              />
               User
            </label>
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
  roleSection: {
    marginBottom: "16px",
  },
  roleLabel: {
    display: "block",
    marginBottom: "8px",
    fontWeight: "bold",
    color: "#333",
  },
  roleOptions: {
    display: "flex",
    gap: "20px",
  },
  roleOption: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
    padding: "8px 16px",
    border: "2px solid #e0e0e0",
    borderRadius: "8px",
    transition: "border-color 0.3s, background 0.3s",
  },
  registerButton: {
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
  loginText: {
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

export default Register;