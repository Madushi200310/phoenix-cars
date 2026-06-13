import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db, auth } from "../firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";

function Home() {
  const [vehicles, setVehicles] = useState([]);
  const [search, setSearch] = useState("");
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchVehicles = async () => {
      const querySnapshot = await getDocs(collection(db, "vehicles"));
      const data = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setVehicles(data);
    };
    fetchVehicles();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const filtered = vehicles.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h1 style={{ color: "#e25822" }}>🔥 Phoenix Cars</h1>
        <div>
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span>👋 {user.displayName || user.email}</span>
              <button onClick={handleLogout}
                style={{ padding: "8px 16px", background: "#e25822", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}>
                Logout
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => navigate("/login")}
                style={{ padding: "8px 16px", background: "#e25822", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}>
                Login
              </button>
              <button onClick={() => navigate("/register")}
                style={{ padding: "8px 16px", background: "#333", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}>
                Register
              </button>
            </div>
          )}
        </div>
      </div>

      <input
        placeholder="Search vehicles..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ padding: "10px", width: "300px", marginBottom: "20px", borderRadius: "8px", border: "1px solid #ccc" }}
      />

      <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
        {filtered.map((v) => (
          <div
            key={v.id}
            onClick={() => navigate(`/vehicle/${v.id}`)}
            style={{ border: "1px solid #ddd", borderRadius: "10px", padding: "15px", width: "250px", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
          >
            {v.image && <img src={v.image} alt={v.name} style={{ width: "100%", borderRadius: "8px" }} />}
            <h3>{v.name}</h3>
            <p>💰 ${v.price}</p>
            <p>📅 {v.year}</p>
            <p>🛣️ {v.mileage} km</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Home;