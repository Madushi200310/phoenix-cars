import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";

function Home() {
  const [vehicles, setVehicles] = useState([]);
  const [search, setSearch] = useState("");
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
  }, []);

  const filtered = vehicles.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1 style={{ color: "#e25822" }}>🔥 Phoenix Cars</h1>
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