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
        
        // Redirect based on role
        if (role === "admin") {
          navigate("/admin");
        } else {
          navigate("/dashboard");
        }
      } else {
        // If no user document exists, treat as regular user
        navigate("/dashboard");
      }
    } catch (err) {
      setError("Invalid email or password. Please try again.");
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div style={{ 
      padding: "40px", 
      fontFamily: "Arial", 
      maxWidth: "400px", 
      margin: "80px auto", 
      border: "1px solid #ddd", 
      borderRadius: "12px", 
      boxShadow: "0 4px 12px rgba(0,0,0,0.1)" 
    }}>
      <h1 style={{ color: "#e25822", textAlign: "center" }}>🔥 Phoenix Cars</h1>
      <h2 style={{ textAlign: "center", marginBottom: "20px" }}>Login</h2>

      {error && (
        <p style={{ 
          color: "red", 
          textAlign: "center", 
          background: "#ffe6e6", 
          padding: "10px", 
          borderRadius: "8px",
          marginBottom: "15px"
        }}>
          {error}
        </p>
      )}

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyPress={(e) => e.key === "Enter" && handleLogin()}
        style={{ width: "100%", padding: "10px", marginBottom: "12px", borderRadius: "8px", border: "1px solid #ccc", boxSizing: "border-box" }}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyPress={(e) => e.key === "Enter" && handleLogin()}
        style={{ width: "100%", padding: "10px", marginBottom: "12px", borderRadius: "8px", border: "1px solid #ccc", boxSizing: "border-box" }}
      />
      <button
        onClick={handleLogin}
        disabled={loading}
        style={{ 
          width: "100%", 
          padding: "12px", 
          background: loading ? "#ccc" : "#e25822", 
          color: "#fff", 
          border: "none", 
          borderRadius: "8px", 
          cursor: loading ? "not-allowed" : "pointer", 
          fontSize: "16px",
          transition: "background 0.3s ease"
        }}
      >
        {loading ? "Logging in..." : "Login"}
      </button>

      <p style={{ textAlign: "center", marginTop: "16px" }}>
        Don't have an account?{" "}
        <span onClick={() => navigate("/register")} style={{ color: "#e25822", cursor: "pointer", fontWeight: "bold" }}>
          Register
        </span>
      </p>
    </div>
  );
}

export default Login;