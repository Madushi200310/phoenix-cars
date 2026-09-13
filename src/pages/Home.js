import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db, auth } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

// Format price in LKR
const formatLKR = (value) => {
  if (value === undefined || value === null || value === "") return "N/A";
  const num = Number(value);
  if (isNaN(num)) return value; // fall back if it's not a number
  return `LKR ${num.toLocaleString("en-LK")}`;
};

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
    const filtered = vehicles.filter(
      (v) =>
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
      {/* ───────── HEADER ───────── */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.logoRow} onClick={() => navigate("/")}>
            <div style={styles.logoMark}>✳</div>
            <span style={styles.logoText}>Phoenix</span>
          </div>

          <div style={styles.headerActions}>
            {user ? (
              <>
                <span style={styles.userName}>
                  👋 {user.displayName || user.email}
                </span>
                <button
                  onClick={() => navigate("/dashboard")}
                  style={styles.btnPrimary}
                >
                  My Dashboard
                </button>
                <button onClick={handleLogout} style={styles.btnOutline}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate("/login")}
                  style={styles.btnOutline}
                >
                  Login
                </button>
                <button
                  onClick={() => navigate("/register")}
                  style={styles.btnPrimary}
                >
                  Register
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ───────── HERO ───────── */}
      <section style={styles.hero}>
        <div style={styles.heroInner} className="hero-grid">
          <div style={styles.heroLeft}>
            <p style={styles.heroEyebrow}>PREMIUM VEHICLES · SRI LANKA</p>
            <h1 style={styles.heroTitle}>
              Find Your Next <span style={styles.heroAccent}>Dream Car</span>
            </h1>
            <p style={styles.heroSubtitle}>
              Browse a curated catalogue, chat with our team, and track your
              vehicle live — all in one place.
            </p>
          </div>

          <div style={styles.heroRight}>
            <div style={styles.searchWrapper}>
              <span style={styles.searchIcon}>🔍</span>
              <input
                type="text"
                placeholder="Search by name, year, or price..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={styles.searchInput}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  style={styles.clearButton}
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
            <p style={styles.resultCount}>
              {filteredVehicles.length}{" "}
              {filteredVehicles.length === 1 ? "vehicle" : "vehicles"} found
            </p>
          </div>
        </div>
      </section>

      {/* ───────── VEHICLE GRID ───────── */}
      <main style={styles.main}>
        {loading ? (
          <div style={styles.loading}>
            <div style={styles.spinner}></div>
            <p>Loading vehicles...</p>
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div style={styles.noResults}>
            <div style={styles.noResultsIcon}>🚗</div>
            <h3 style={styles.noResultsTitle}>No vehicles found</h3>
            <p style={styles.noResultsText}>
              Try a different search term, or check back soon.
            </p>
          </div>
        ) : (
          <div style={styles.vehicleGrid}>
            {filteredVehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                onClick={() => navigate(`/vehicle/${vehicle.id}`)}
                style={styles.vehicleCard}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow =
                    "0 12px 32px rgba(139,0,0,0.18)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 2px 8px rgba(0,0,0,0.06)";
                }}
              >
                <div style={styles.imageWrapper}>
                  {vehicle.image ? (
                    <img
                      src={vehicle.image}
                      alt={vehicle.name}
                      style={styles.vehicleImage}
                    />
                  ) : (
                    <div style={styles.noImage}>No Image</div>
                  )}
                  {vehicle.modelUrl && (
                    <span style={styles.modelBadge}>🔮 3D</span>
                  )}
                </div>

                <div style={styles.vehicleContent}>
                  <h3 style={styles.vehicleName}>{vehicle.name}</h3>
                  <p style={styles.vehiclePrice}>{formatLKR(vehicle.price)}</p>

                  <div style={styles.vehicleDetails}>
                    <span style={styles.detailChip}>
                      📅 {vehicle.year || "N/A"}
                    </span>
                    <span style={styles.detailChip}>
                      🛣️ {vehicle.mileage || "N/A"} km
                    </span>
                    <span style={styles.detailChip}>
                      🎨 {vehicle.color || "N/A"}
                    </span>
                  </div>

                  <button style={styles.viewButton}>View Details →</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ───────── FOOTER ───────── */}
      <footer style={styles.footer}>
        <p style={styles.footerText}>
          © {new Date().getFullYear()} Phoenix Cars. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

/* ────────────── STYLES ────────────── */
const styles = {
  container: {
    minHeight: "100vh",
    fontFamily: "'Segoe UI', Arial, sans-serif",
    background: "#faf6f0",
  },

  /* ── Header ── */
  header: {
    background: "#fffdf8",
    borderBottom: "1px solid #efe6d3",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  headerInner: {
    maxWidth: "1300px",
    margin: "0 auto",
    padding: "16px 28px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "12px",
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
  },
  logoMark: {
    fontSize: "28px",
    color: "#b8860b",
    fontWeight: "300",
    lineHeight: 1,
  },
  logoText: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#2b1a0a",
    letterSpacing: "0.3px",
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },
  userName: {
    fontSize: "13px",
    color: "#7a5c3a",
    maxWidth: "180px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  btnPrimary: {
    padding: "9px 18px",
    background: "linear-gradient(135deg, #b8860b 0%, #8b0000 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },
  btnOutline: {
    padding: "9px 18px",
    background: "#fff",
    color: "#8b0000",
    border: "1.5px solid #d4a017",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },

  /* ── Hero ── */
  hero: {
    background:
      "linear-gradient(135deg, #2b1a0a 0%, #4a1e0a 55%, #8b0000 100%)",
    color: "#fff",
    padding: "64px 28px",
    position: "relative",
    overflow: "hidden",
  },
  heroInner: {
    maxWidth: "1300px",
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "1.2fr 1fr",
    gap: "48px",
    alignItems: "center",
  },
  heroLeft: {
    textAlign: "left",
  },
  heroRight: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "10px",
  },
  heroEyebrow: {
    fontSize: "12px",
    fontWeight: "700",
    letterSpacing: "2px",
    color: "#e0b84c",
    margin: "0 0 14px 0",
  },
  heroTitle: {
    fontSize: "48px",
    fontWeight: "800",
    margin: "0 0 16px 0",
    lineHeight: "1.15",
    color: "#faf3e0",
  },
  heroAccent: {
    background:
      "linear-gradient(135deg, #f4d03f 0%, #b8860b 50%, #8b0000 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  heroSubtitle: {
    fontSize: "16px",
    lineHeight: "1.6",
    color: "#e8d9b8",
    margin: 0,
    maxWidth: "560px",
  },

  /* ── Search ── */
  searchWrapper: {
    display: "flex",
    alignItems: "center",
    background: "#faf3e0",
    borderRadius: "12px",
    padding: "4px 8px 4px 16px",
    width: "100%",
    maxWidth: "480px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
    border: "1.5px solid #d4a017",
  },
  searchIcon: {
    fontSize: "18px",
    marginRight: "10px",
    color: "#8b0000",
  },
  searchInput: {
    flex: 1,
    border: "none",
    outline: "none",
    fontSize: "15px",
    padding: "12px 0",
    color: "#2b1a0a",
    background: "transparent",
  },
  clearButton: {
    background: "none",
    border: "none",
    fontSize: "16px",
    color: "#8b0000",
    cursor: "pointer",
    padding: "8px 12px",
  },
  resultCount: {
    fontSize: "13px",
    color: "#e0b84c",
    margin: 0,
    textAlign: "right",
  },

  /* ── Main ── */
  main: {
    maxWidth: "1300px",
    margin: "0 auto",
    padding: "48px 28px 64px",
    marginTop: "-32px",
    position: "relative",
    zIndex: 2,
  },

  /* ── Loading ── */
  loading: {
    textAlign: "center",
    padding: "80px 20px",
    color: "#7a5c3a",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "4px solid #f3e9d2",
    borderTop: "4px solid #b8860b",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    margin: "0 auto 20px",
  },

  /* ── No results ── */
  noResults: {
    textAlign: "center",
    padding: "80px 20px",
    background: "#fffdf8",
    borderRadius: "16px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    border: "1px solid #efe6d3",
  },
  noResultsIcon: {
    fontSize: "56px",
    marginBottom: "16px",
  },
  noResultsTitle: {
    fontSize: "20px",
    color: "#2b1a0a",
    margin: "0 0 8px 0",
  },
  noResultsText: {
    fontSize: "14px",
    color: "#8a7a5c",
    margin: 0,
  },

  /* ── Grid ── */
  vehicleGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
    gap: "24px",
  },

  /* ── Card ── */
  vehicleCard: {
    background: "#fffdf8",
    borderRadius: "16px",
    overflow: "hidden",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    cursor: "pointer",
    transition: "transform 0.25s ease, box-shadow 0.25s ease",
    display: "flex",
    flexDirection: "column",
    border: "1px solid #efe6d3",
  },
  imageWrapper: {
    position: "relative",
    height: "200px",
    background: "#f5ecd8",
    overflow: "hidden",
  },
  vehicleImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  noImage: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#b8a884",
    fontSize: "14px",
  },
  modelBadge: {
    position: "absolute",
    top: "12px",
    right: "12px",
    background: "linear-gradient(135deg, #b8860b 0%, #8b0000 100%)",
    color: "#fff",
    fontSize: "11px",
    fontWeight: "700",
    padding: "5px 10px",
    borderRadius: "20px",
  },
  vehicleContent: {
    padding: "18px 20px 20px",
    display: "flex",
    flexDirection: "column",
    flex: 1,
  },
  vehicleName: {
    margin: "0 0 6px 0",
    fontSize: "17px",
    fontWeight: "700",
    color: "#2b1a0a",
  },
  vehiclePrice: {
    margin: "0 0 14px 0",
    fontSize: "20px",
    fontWeight: "800",
    color: "#b8860b",
  },
  vehicleDetails: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
    marginBottom: "16px",
  },
  detailChip: {
    fontSize: "12px",
    color: "#6b5636",
    background: "#f5ecd8",
    padding: "5px 10px",
    borderRadius: "20px",
    whiteSpace: "nowrap",
  },
  viewButton: {
    marginTop: "auto",
    padding: "10px 16px",
    background: "linear-gradient(135deg, #b8860b 0%, #8b0000 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "opacity 0.2s",
  },

  /* ── Footer ── */
  footer: {
    borderTop: "1px solid #efe6d3",
    background: "#fffdf8",
    padding: "24px 28px",
    textAlign: "center",
  },
  footerText: {
    margin: 0,
    fontSize: "13px",
    color: "#a08a63",
  },
};

export default Home;