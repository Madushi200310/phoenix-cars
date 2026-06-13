import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/");
    } catch (err) {
      setError("Invalid email or password. Please try again.");
    }
  };

  return (
    <div style={{ padding: "40px", fontFamily: "Arial", maxWidth: "400px", margin: "80px auto", border: "1px solid #ddd", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
      <h1 style={{ color: "#e25822", textAlign: "center" }}>🔥 Phoenix Cars</h1>
      <h2 style={{ textAlign: "center", marginBottom: "20px" }}>Login</h2>

      {error && <p style={{ color: "red", textAlign: "center" }}>{error}</p>}

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: "100%", padding: "10px", marginBottom: "12px", borderRadius: "8px", border: "1px solid #ccc", boxSizing: "border-box" }}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: "100%", padding: "10px", marginBottom: "12px", borderRadius: "8px", border: "1px solid #ccc", boxSizing: "border-box" }}
      />
      <button
        onClick={handleLogin}
        style={{ width: "100%", padding: "12px", background: "#e25822", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "16px" }}
      >Login</button>

      <p style={{ textAlign: "center", marginTop: "16px" }}>
        Don't have an account?{" "}
        <span onClick={() => navigate("/register")} style={{ color: "#e25822", cursor: "pointer", fontWeight: "bold" }}>Register</span>
      </p>
    </div>
  );
}

export default Login;