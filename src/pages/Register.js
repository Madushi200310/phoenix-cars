import React, { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleRegister = async () => {
    if (!name.trim()) return setError("Please enter your name.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });
      navigate("/");
    } catch (err) {
      setError("Registration failed. Email may already be in use.");
    }
  };

  return (
    <div style={{ padding: "40px", fontFamily: "Arial", maxWidth: "400px", margin: "80px auto", border: "1px solid #ddd", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
      <h1 style={{ color: "#e25822", textAlign: "center" }}>🔥 Phoenix Cars</h1>
      <h2 style={{ textAlign: "center", marginBottom: "20px" }}>Create Account</h2>

      {error && <p style={{ color: "red", textAlign: "center" }}>{error}</p>}

      <input
        type="text"
        placeholder="Full Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ width: "100%", padding: "10px", marginBottom: "12px", borderRadius: "8px", border: "1px solid #ccc", boxSizing: "border-box" }}
      />
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: "100%", padding: "10px", marginBottom: "12px", borderRadius: "8px", border: "1px solid #ccc", boxSizing: "border-box" }}
      />
      <input
        type="password"
        placeholder="Password (min 6 characters)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: "100%", padding: "10px", marginBottom: "12px", borderRadius: "8px", border: "1px solid #ccc", boxSizing: "border-box" }}
      />
      <button
        onClick={handleRegister}
        style={{ width: "100%", padding: "12px", background: "#e25822", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "16px" }}
      >Create Account</button>

      <p style={{ textAlign: "center", marginTop: "16px" }}>
        Already have an account?{" "}
        <span onClick={() => navigate("/login")} style={{ color: "#e25822", cursor: "pointer", fontWeight: "bold" }}>Login</span>
      </p>
    </div>
  );
}

export default Register;