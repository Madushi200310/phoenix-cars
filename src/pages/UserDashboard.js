import React, { useEffect, useState, useRef } from "react";
import { collectionGroup, collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db, auth } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

function UserDashboard() {
  const [user, setUser] = useState(null);
  const [threads, setThreads] = useState([]); // [{ vehicleId, vehicleName }]
  const [messagesByVehicle, setMessagesByVehicle] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const unsubscribesRef = useRef([]);

  // Require login
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        navigate("/login");
      } else {
        setUser(currentUser);
      }
    });
    return () => unsubscribeAuth();
  }, [navigate]);

  // Find every vehicle thread this user has posted a message in
  useEffect(() => {
    if (!user) return;

    const q = query(collectionGroup(db, "messages"), where("uid", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const found = {};
      snapshot.docs.forEach((docSnap) => {
        const vehicleId = docSnap.ref.parent.parent.id;
        found[vehicleId] = docSnap.data().vehicleName || "Vehicle";
      });
      setThreads(Object.entries(found).map(([vehicleId, vehicleName]) => ({ vehicleId, vehicleName })));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Subscribe to the full conversation for each of those vehicles
  useEffect(() => {
    unsubscribesRef.current.forEach((unsub) => unsub());
    unsubscribesRef.current = [];

    threads.forEach(({ vehicleId }) => {
      const q = query(collection(db, "vehicles", vehicleId, "messages"), orderBy("time"));
      const unsub = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setMessagesByVehicle((prev) => ({ ...prev, [vehicleId]: msgs }));
      });
      unsubscribesRef.current.push(unsub);
    });

    return () => {
      unsubscribesRef.current.forEach((unsub) => unsub());
      unsubscribesRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threads]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial", maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h1 style={{ color: "#e25822" }}>🔥 My Dashboard</h1>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={() => navigate("/")}
            style={{ padding: "8px 16px", background: "#333", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}>
            Home
          </button>
          <button onClick={handleLogout}
            style={{ padding: "8px 16px", background: "#e25822", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}>
            Logout
          </button>
        </div>
      </div>

      {user && <p>👋 Welcome, {user.displayName || user.email}</p>}

      <h2>💬 My Inquiries</h2>

      {loading && <p>Loading...</p>}
      {!loading && threads.length === 0 && (
        <p style={{ color: "#aaa" }}>You haven't messaged about any vehicles yet.</p>
      )}

      {threads.map(({ vehicleId, vehicleName }) => (
        <div key={vehicleId}
          style={{ border: "1px solid #ddd", borderRadius: "10px", padding: "15px", marginBottom: "20px", background: "#fff" }}>
          <h3
            onClick={() => navigate(`/vehicle/${vehicleId}`)}
            style={{ color: "#e25822", cursor: "pointer", marginTop: 0 }}
          >
            🚗 {vehicleName}
          </h3>
          <div style={{ maxHeight: "250px", overflowY: "auto" }}>
            {(messagesByVehicle[vehicleId] || []).map((msg) => (
              <div key={msg.id} style={{ marginBottom: "10px", textAlign: msg.role === "admin" ? "right" : "left" }}>
                <span style={{ background: msg.role === "admin" ? "#e25822" : "#eee", color: msg.role === "admin" ? "#fff" : "#000", padding: "8px 12px", borderRadius: "15px", display: "inline-block" }}>
                  <strong>{msg.sender}:</strong> {msg.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default UserDashboard;