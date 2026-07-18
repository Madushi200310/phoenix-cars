import React, { useEffect, useState } from "react";
import { collection, collectionGroup, getDocs } from "firebase/firestore";
import { db, auth } from "../firebase";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

function AdminDashboard() {
  const [stats, setStats] = useState({ vehicles: 0, messages: 0 });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Reuse the same simple session gate as the Admin panel
  useEffect(() => {
    if (sessionStorage.getItem("phoenixAdmin") !== "true") {
      navigate("/admin");
    }
  }, [navigate]);

  useEffect(() => {
    const loadStats = async () => {
      const vehiclesSnap = await getDocs(collection(db, "vehicles"));
      const messagesSnap = await getDocs(collectionGroup(db, "messages"));
      setStats({ vehicles: vehiclesSnap.size, messages: messagesSnap.size });
      setLoading(false);
    };
    loadStats();
  }, []);

  const handleLogout = async () => {
    sessionStorage.removeItem("phoenixAdmin");
    await signOut(auth);
    navigate("/login");
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h1 style={{ color: "#e25822" }}>🔥 Admin Dashboard</h1>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={() => navigate("/admin")}
            style={{ padding: "8px 16px", background: "#333", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}>
            ← Back to Admin Panel
          </button>
          <button onClick={handleLogout}
            style={{ padding: "8px 16px", background: "#e25822", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}>
            Logout
          </button>
        </div>
      </div>

      {loading ? (
        <p>Loading stats...</p>
      ) : (
        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
          <div style={{ border: "1px solid #ddd", borderRadius: "10px", padding: "25px", width: "220px", textAlign: "center", background: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <h2 style={{ margin: 0, color: "#e25822", fontSize: "36px" }}>{stats.vehicles}</h2>
            <p style={{ margin: "8px 0 0" }}>🚗 Total Vehicles</p>
          </div>
          <div style={{ border: "1px solid #ddd", borderRadius: "10px", padding: "25px", width: "220px", textAlign: "center", background: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <h2 style={{ margin: 0, color: "#e25822", fontSize: "36px" }}>{stats.messages}</h2>
            <p style={{ margin: "8px 0 0" }}>💬 Total Inquiries</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;