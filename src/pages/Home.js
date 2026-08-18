import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db, auth } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
// ← NO VehicleCard import here!

function Home() {
  const [vehicles, setVehicles] = useState([]);
  const [filteredVehicles, setFilteredVehicles] = useState([]);
  const [search, setSearch] = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    fetchVehicles();
  }, []);

  useEffect(() => {
    const filtered = vehicles.filter((v) =>
      v.name?.toLowerCase().includes(search.toLowerCase()) ||
      v.year?.toString().includes(search) ||
      v.price?.toString().includes(search)
    );
    setFilteredVehicles(filtered);
  }, [search, vehicles]);

  const fetchVehicles = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "vehicles"));
      const data = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setVehicles(data);
      setFilteredVehicles(data);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.logo}> Phoenix Cars</h1>
          <div style={styles.headerActions}>
            {user ? (
              <>
                <span style={styles.userName}> {user.displayName || user.email}</span>
                <button onClick={() => navigate("/dashboard")} style={styles.btnPrimary}>
                  My Dashboard
                </button>
                <button onClick={handleLogout} style={styles.btnDanger}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <button onClick={() => navigate("/login")} style={styles.btnPrimary}>
                  Login
                </button>
                <button onClick={() => navigate("/register")} style={styles.btnSecondary}>
                  Register
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <div style={styles.searchSection}>
        <input
          type="text"
          placeholder=" Search by name, year, or price..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />
        <span style={styles.resultCount}>{filteredVehicles.length} vehicles found</span>
      </div>

      {loading ? (
        <div style={styles.loading}>Loading vehicles...</div>
      ) : (
        <div style={styles.vehicleGrid}>
          {filteredVehicles.length === 0 ? (
            <div style={styles.noResults}>
              <p>No vehicles found matching your search.</p>
            </div>
          ) : (
            filteredVehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                onClick={() => navigate(`/vehicle/${vehicle.id}`)}
                style={styles.vehicleCard}
              >
                {vehicle.image && (
                  <img src={vehicle.image} alt={vehicle.name} style={styles.vehicleImage} />
                )}
                <div style={styles.vehicleContent}>
                  <h3 style={styles.vehicleName}>{vehicle.name}</h3>
                  <p style={styles.vehiclePrice}> ${vehicle.price?.toLocaleString() || "N/A"}</p>
                  <div style={styles.vehicleDetails}>
                    <span style={styles.vehicleDetailItem}> {vehicle.year || "N/A"}</span>
                    <span style={styles.vehicleDetailItem}> {vehicle.mileage || "N/A"} km</span>
                    <span style={styles.vehicleDetailItem}> {vehicle.color || "N/A"}</span>
                  </div>
                  <button style={styles.vehicleViewButton}>View Details →</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: "20px",
    fontFamily: "Arial, sans-serif",
    maxWidth: "1400px",
    margin: "0 auto",
    backgroundColor: "#f5f5f5",
    minHeight: "100vh",
  },
  header: {
    backgroundColor: "#fff",
    padding: "15px 20px",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    marginBottom: "20px",
  },
  headerContent: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "10px",
  },
  logo: {
    color: "#e25822",
    margin: 0,
    fontSize: "28px",
  },
  headerActions: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
    flexWrap: "wrap",
  },
  userName: {
    color: "#555",
    fontSize: "14px",
  },
  btnPrimary: {
    padding: "8px 20px",
    background: "#e25822",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
  },
  btnSecondary: {
    padding: "8px 20px",
    background: "#333",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
  },
  btnDanger: {
    padding: "8px 20px",
    background: "#dc3545",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
  },
  searchSection: {
    display: "flex",
    gap: "15px",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: "25px",
    backgroundColor: "#fff",
    padding: "15px 20px",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  },
  searchInput: {
    flex: 1,
    padding: "12px 16px",
    borderRadius: "8px",
    border: "2px solid #e0e0e0",
    fontSize: "16px",
    minWidth: "200px",
  },
  resultCount: {
    color: "#666",
    fontSize: "14px",
    whiteSpace: "nowrap",
  },
  vehicleGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "20px",
  },
  loading: {
    textAlign: "center",
    padding: "60px",
    color: "#666",
    fontSize: "18px",
  },
  noResults: {
    textAlign: "center",
    padding: "60px",
    color: "#666",
    fontSize: "18px",
    gridColumn: "1 / -1",
  },
  vehicleCard: {
    backgroundColor: "#fff",
    borderRadius: "12px",
    overflow: "hidden",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    cursor: "pointer",
    transition: "transform 0.3s, box-shadow 0.3s",
    height: "100%",
    display: "flex",
    flexDirection: "column",
  },
  vehicleImage: {
    width: "100%",
    height: "200px",
    objectFit: "cover",
    backgroundColor: "#f0f0f0",
  },
  vehicleContent: {
    padding: "15px",
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  vehicleName: {
    margin: "0 0 8px 0",
    fontSize: "18px",
    color: "#333",
  },
  vehiclePrice: {
    margin: "0 0 10px 0",
    fontSize: "20px",
    fontWeight: "bold",
    color: "#e25822",
  },
  vehicleDetails: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    marginBottom: "12px",
  },
  vehicleDetailItem: {
    fontSize: "13px",
    color: "#666",
    backgroundColor: "#f5f5f5",
    padding: "4px 10px",
    borderRadius: "12px",
  },
  vehicleViewButton: {
    marginTop: "auto",
    padding: "8px 16px",
    backgroundColor: "#e25822",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    transition: "background 0.3s",
  },
};

export default Home;