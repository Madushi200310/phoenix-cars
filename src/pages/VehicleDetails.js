import React, { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useParams, useNavigate } from "react-router-dom";

// Format price in LKR
const formatLKR = (value) => {
  if (value === undefined || value === null || value === "") return "N/A";
  const num = Number(value);
  if (isNaN(num)) return value;
  return `LKR ${num.toLocaleString("en-LK")}`;
};

function VehicleDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [user, setUser] = useState(null);
  const [showTracker, setShowTracker] = useState(false);
  const [vehicleLocation, setVehicleLocation] = useState(null);
  const [activeTab, setActiveTab] = useState("details");

  useEffect(() => {
    const fetchVehicle = async () => {
      try {
        const docRef = doc(db, "vehicles", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setVehicle({ id: docSnap.id, ...docSnap.data() });
        }
      } catch (error) {
        console.error("Error fetching vehicle:", error);
      }
    };
    fetchVehicle();

    const q = query(
      collection(db, "vehicles", id, "messages"),
      orderBy("time")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => {
      unsubscribe();
      unsubscribeAuth();
    };
  }, [id]);

  // Simulate vehicle location tracking in Sri Lanka
  useEffect(() => {
    if (vehicleLocation) {
      const interval = setInterval(() => {
        const movement = 0.001;
        setVehicleLocation((prev) => ({
          ...prev,
          lat: Math.min(
            9.8,
            Math.max(5.9, prev.lat + (Math.random() - 0.5) * movement)
          ),
          lng: Math.min(
            81.9,
            Math.max(79.5, prev.lng + (Math.random() - 0.5) * movement)
          ),
        }));
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [vehicleLocation]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    if (!user) return navigate("/login");
    try {
      await addDoc(collection(db, "vehicles", id, "messages"), {
        text: newMessage,
        sender: user.displayName || user.email,
        role: "user",
        time: new Date(),
        uid: user.uid,
        vehicleName: vehicle?.name || "Vehicle",
      });
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message. Please try again.");
    }
  };

  const handleRequestPurchase = () => {
    if (!user) {
      navigate("/login");
      return;
    }
    setShowTracker(true);
    setActiveTab("location");

    const sriLankaLocations = [
      { name: "Colombo", lat: 6.9271, lng: 79.8612 },
      { name: "Galle", lat: 6.0323, lng: 80.215 },
      { name: "Kandy", lat: 7.2906, lng: 80.6337 },
      { name: "Jaffna", lat: 9.6615, lng: 80.0254 },
      { name: "Arugam Bay", lat: 6.424, lng: 81.495 },
      { name: "Dambulla", lat: 7.8731, lng: 80.771 },
      { name: "Hambantota", lat: 6.2542, lng: 81.144 },
      { name: "Anuradhapura", lat: 8.369, lng: 80.3985 },
      { name: "Nuwara Eliya", lat: 6.9758, lng: 80.5564 },
      { name: "Matara", lat: 5.9534, lng: 80.5523 },
      { name: "Negombo", lat: 7.2098, lng: 79.833 },
      { name: "Batticaloa", lat: 7.7169, lng: 81.7005 },
      { name: "Trincomalee", lat: 8.5776, lng: 81.2058 },
    ];

    const randomLocation =
      sriLankaLocations[Math.floor(Math.random() * sriLankaLocations.length)];
    const randomOffset = 0.01;
    setVehicleLocation({
      lat: randomLocation.lat + (Math.random() - 0.5) * randomOffset,
      lng: randomLocation.lng + (Math.random() - 0.5) * randomOffset,
      name: randomLocation.name,
    });

    addDoc(collection(db, "vehicles", id, "messages"), {
      text: `I'm interested in purchasing this vehicle! Currently in ${randomLocation.name}, Sri Lanka.`,
      sender: user.displayName || user.email,
      role: "user",
      time: new Date(),
      uid: user.uid,
      vehicleName: vehicle?.name || "Vehicle",
    }).catch(console.error);
  };

  if (!vehicle)
    return (
      <div style={styles.loading}>
        <div style={styles.loadingSpinner}></div>
        <h2 style={styles.loadingText}>Loading vehicle details...</h2>
      </div>
    );

  return (
    <div style={styles.container}>
      {/* Back Button */}
      <button onClick={() => navigate("/")} style={styles.backButton}>
        ← Back to Vehicles
      </button>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Left Column - Image */}
        <div style={styles.imageColumn}>
          <div style={styles.imageContainer}>
            {vehicle.image ? (
              <img
                src={vehicle.image}
                alt={vehicle.name}
                style={styles.mainImage}
              />
            ) : (
              <div style={styles.noImage}>
                <span style={styles.noImageIcon}></span>
                <p>No Image Available</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Details */}
        <div style={styles.detailsColumn}>
          <div style={styles.vehicleHeader}>
            <h1 style={styles.vehicleName}>{vehicle.name}</h1>
            <p style={styles.vehiclePrice}>{formatLKR(vehicle.price)}</p>
          </div>

          <div style={styles.specsGrid}>
            <div style={styles.specItem}>
              <span style={styles.specIcon}></span>
              <div>
                <span style={styles.specLabel}>Year</span>
                <span style={styles.specValue}>{vehicle.year || "N/A"}</span>
              </div>
            </div>
            <div style={styles.specItem}>
              <span style={styles.specIcon}></span>
              <div>
                <span style={styles.specLabel}>Mileage</span>
                <span style={styles.specValue}>
                  {vehicle.mileage || "N/A"} km
                </span>
              </div>
            </div>
            <div style={styles.specItem}>
              <span style={styles.specIcon}></span>
              <div>
                <span style={styles.specLabel}>Color</span>
                <span style={styles.specValue}>{vehicle.color || "N/A"}</span>
              </div>
            </div>
          </div>

          <div style={styles.descriptionSection}>
            <h3 style={styles.sectionTitle}> Description</h3>
            <p style={styles.descriptionText}>
              {vehicle.description || "No description available."}
            </p>
          </div>

          {vehicle.modelUrl && (
            <div style={styles.modelSection}>
              <h3 style={styles.sectionTitle}> 3D Model</h3>
              <div style={styles.modelContainer}>
                <iframe
                  src={vehicle.modelUrl}
                  title="3D Model"
                  style={styles.modelFrame}
                  allow="autoplay; fullscreen"
                />
              </div>
            </div>
          )}

          <div style={styles.actionButtons}>
            <button
              onClick={handleRequestPurchase}
              style={styles.purchaseButton}
            >
               Request to Buy & Track Location
            </button>
            <button
              onClick={() => setActiveTab("chat")}
              style={styles.chatButton}
            >
               Chat with Team
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div style={styles.tabsContainer}>
        <button
          onClick={() => setActiveTab("details")}
          style={{
            ...styles.tabButton,
            ...(activeTab === "details"
              ? styles.tabButtonActive
              : styles.tabButtonInactive),
          }}
        >
           Details
        </button>
        <button
          onClick={() => setActiveTab("chat")}
          style={{
            ...styles.tabButton,
            ...(activeTab === "chat"
              ? styles.tabButtonActive
              : styles.tabButtonInactive),
          }}
        >
           Chat
        </button>
        {showTracker && (
          <button
            onClick={() => setActiveTab("location")}
            style={{
              ...styles.tabButton,
              ...(activeTab === "location"
                ? styles.tabButtonActive
                : styles.tabButtonInactive),
            }}
          >
             Location
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div style={styles.tabContent}>
        {/* Details Tab */}
        {activeTab === "details" && (
          <div style={styles.detailsTab}>
            <div style={styles.detailsGrid}>
              <div style={styles.detailCard}>
                <span style={styles.detailCardIcon}></span>
                <div>
                  <p style={styles.detailCardLabel}>Vehicle Type</p>
                  <p style={styles.detailCardValue}>SUV</p>
                </div>
              </div>
              <div style={styles.detailCard}>
                <span style={styles.detailCardIcon}></span>
                <div>
                  <p style={styles.detailCardLabel}>Fuel Type</p>
                  <p style={styles.detailCardValue}>Petrol</p>
                </div>
              </div>
              <div style={styles.detailCard}>
                <span style={styles.detailCardIcon}></span>
                <div>
                  <p style={styles.detailCardLabel}>Transmission</p>
                  <p style={styles.detailCardValue}>Automatic</p>
                </div>
              </div>
              <div style={styles.detailCard}>
                <span style={styles.detailCardIcon}></span>
                <div>
                  <p style={styles.detailCardLabel}>Seats</p>
                  <p style={styles.detailCardValue}>5</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Chat Tab */}
        {activeTab === "chat" && (
          <div style={styles.chatTab}>
            <div style={styles.chatHeader}>
              <h3 style={styles.chatTitle}> Chat with Our Team</h3>
              {!user && (
                <div style={styles.loginPrompt}>
                  <p style={styles.loginPromptText}>
                    Please{" "}
                    <span
                      onClick={() => navigate("/login")}
                      style={styles.link}
                    >
                      login
                    </span>{" "}
                    or{" "}
                    <span
                      onClick={() => navigate("/register")}
                      style={styles.link}
                    >
                      register
                    </span>{" "}
                    to chat.
                  </p>
                </div>
              )}
            </div>

            <div style={styles.chatMessages}>
              {messages.length === 0 && (
                <div style={styles.noMessages}>
                  <span style={styles.noMessagesIcon}></span>
                  <p>No messages yet. Ask us anything!</p>
                </div>
              )}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    ...styles.chatMessage,
                    justifyContent:
                      msg.role === "admin" ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      ...styles.chatBubble,
                      ...(msg.role === "admin"
                        ? styles.chatBubbleAdmin
                        : styles.chatBubbleUser),
                    }}
                  >
                    <strong>{msg.sender}</strong>
                    <p style={styles.chatText}>{msg.text}</p>
                    <span style={styles.chatTime}>
                      {msg.time?.toDate?.()?.toLocaleTimeString() || "Just now"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {user && (
              <div style={styles.chatInputContainer}>
                <input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  style={styles.chatInput}
                />
                <button onClick={sendMessage} style={styles.sendButton}>
                  Send →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Location Tab */}
        {activeTab === "location" && showTracker && vehicleLocation && (
          <div style={styles.locationTab}>
            <div style={styles.locationHeader}>
              <h3 style={styles.locationTitle}>
                 Vehicle Location - Sri Lanka
              </h3>
              <span style={styles.locationStatus}> Live Tracking</span>
            </div>
            <div style={styles.mapContainer}>
              <iframe
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${
                  vehicleLocation.lng - 0.05
                }%2C${vehicleLocation.lat - 0.05}%2C${
                  vehicleLocation.lng + 0.05
                }%2C${
                  vehicleLocation.lat + 0.05
                }&layer=mapnik&marker=${vehicleLocation.lat}%2C${
                  vehicleLocation.lng
                }`}
                style={styles.mapFrame}
                title="Vehicle Location - Sri Lanka"
              />
            </div>
            <div style={styles.locationInfo}>
              <div style={styles.locationInfoItem}>
                <span style={styles.locationInfoIcon}></span>
                <div>
                  <span style={styles.locationInfoLabel}>
                    Current Location
                  </span>
                  <span style={styles.locationInfoValue}>
                    {vehicleLocation.name || "Sri Lanka"}
                  </span>
                </div>
              </div>
              <div style={styles.locationInfoItem}>
                <span style={styles.locationInfoIcon}></span>
                <div>
                  <span style={styles.locationInfoLabel}>Coordinates</span>
                  <span style={styles.locationInfoValue}>
                    Lat: {vehicleLocation.lat.toFixed(6)}, Lng:{" "}
                    {vehicleLocation.lng.toFixed(6)}
                  </span>
                </div>
              </div>
              <div style={styles.locationInfoItem}>
                <span style={styles.locationInfoIcon}></span>
                <div>
                  <span style={styles.locationInfoLabel}>Status</span>
                  <span style={styles.locationInfoValue}>In Transit</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: "30px 28px",
    fontFamily: "'Segoe UI', Arial, sans-serif",
    maxWidth: "1250px",
    margin: "0 auto",
    background: "#faf6f0",
    minHeight: "100vh",
  },
  loading: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "100px 20px",
    color: "#7a5c3a",
    background: "#faf6f0",
    minHeight: "100vh",
  },
  loadingText: {
    color: "#7a5c3a",
    fontWeight: "600",
  },
  loadingSpinner: {
    width: "40px",
    height: "40px",
    border: "4px solid #f3e9d2",
    borderTop: "4px solid #b8860b",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    marginBottom: "20px",
  },
  backButton: {
    padding: "10px 22px",
    backgroundColor: "#fffdf8",
    color: "#8b0000",
    border: "1.5px solid #d4a017",
    borderRadius: "8px",
    cursor: "pointer",
    marginBottom: "24px",
    fontSize: "13px",
    fontWeight: "600",
    transition: "all 0.3s",
  },
  mainContent: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "30px",
    marginBottom: "30px",
  },
  imageColumn: {
    position: "relative",
  },
  imageContainer: {
    background: "#fffdf8",
    borderRadius: "16px",
    overflow: "hidden",
    border: "1px solid #efe6d3",
    boxShadow: "0 4px 20px rgba(139,0,0,0.08)",
    height: "100%",
    minHeight: "420px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  mainImage: {
    width: "100%",
    height: "100%",
    maxHeight: "520px",
    objectFit: "cover",
  },
  noImage: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "#b8a884",
    padding: "40px",
  },
  noImageIcon: {
    fontSize: "64px",
    marginBottom: "16px",
  },
  detailsColumn: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  vehicleHeader: {
    background: "#fffdf8",
    padding: "24px",
    borderRadius: "16px",
    border: "1px solid #efe6d3",
    boxShadow: "0 4px 20px rgba(139,0,0,0.06)",
  },
  vehicleName: {
    margin: "0 0 10px 0",
    fontSize: "28px",
    color: "#2b1a0a",
    fontWeight: "800",
  },
  vehiclePrice: {
    margin: 0,
    fontSize: "28px",
    fontWeight: "800",
    color: "#b8860b",
  },
  specsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "12px",
  },
  specItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    background: "#fffdf8",
    padding: "16px",
    borderRadius: "12px",
    border: "1px solid #efe6d3",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },
  specIcon: {
    fontSize: "22px",
  },
  specLabel: {
    display: "block",
    fontSize: "11px",
    color: "#a08a63",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  specValue: {
    display: "block",
    fontSize: "15px",
    fontWeight: "700",
    color: "#2b1a0a",
  },
  descriptionSection: {
    background: "#fffdf8",
    padding: "20px",
    borderRadius: "12px",
    border: "1px solid #efe6d3",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },
  sectionTitle: {
    margin: "0 0 12px 0",
    fontSize: "16px",
    color: "#2b1a0a",
    fontWeight: "700",
  },
  descriptionText: {
    margin: 0,
    color: "#6b5636",
    lineHeight: "1.6",
    fontSize: "15px",
  },
  modelSection: {
    background: "#fffdf8",
    padding: "20px",
    borderRadius: "12px",
    border: "1px solid #efe6d3",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },
  modelContainer: {
    height: "250px",
    borderRadius: "10px",
    overflow: "hidden",
    background: "#faf6f0",
  },
  modelFrame: {
    width: "100%",
    height: "100%",
    border: "none",
  },
  actionButtons: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },
  purchaseButton: {
    flex: 1,
    minWidth: "220px",
    padding: "14px 20px",
    background: "linear-gradient(135deg, #b8860b 0%, #8b0000 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "15px",
    fontWeight: "700",
    transition: "all 0.3s",
    boxShadow: "0 6px 16px rgba(139,0,0,0.25)",
  },
  chatButton: {
    flex: 1,
    minWidth: "180px",
    padding: "14px 20px",
    background: "#fff",
    color: "#8b0000",
    border: "1.5px solid #d4a017",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "15px",
    fontWeight: "700",
    transition: "all 0.3s",
  },
  tabsContainer: {
    display: "flex",
    gap: "8px",
    background: "#fffdf8",
    padding: "10px",
    borderRadius: "14px 14px 0 0",
    border: "1px solid #efe6d3",
    borderBottom: "none",
    flexWrap: "wrap",
  },
  tabButton: {
    padding: "10px 22px",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "700",
    transition: "all 0.3s",
  },
  tabButtonActive: {
    background: "linear-gradient(135deg, #b8860b 0%, #8b0000 100%)",
    color: "#fff",
  },
  tabButtonInactive: {
    background: "transparent",
    color: "#6b5636",
  },
  tabContent: {
    background: "#fffdf8",
    padding: "24px",
    borderRadius: "0 0 16px 16px",
    border: "1px solid #efe6d3",
    boxShadow: "0 4px 20px rgba(139,0,0,0.06)",
    marginBottom: "30px",
  },
  detailsTab: {
    padding: "6px 0",
  },
  detailsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: "15px",
  },
  detailCard: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    padding: "16px",
    background: "#faf6f0",
    borderRadius: "12px",
    border: "1px solid #efe6d3",
  },
  detailCardIcon: {
    fontSize: "26px",
  },
  detailCardLabel: {
    margin: "0",
    fontSize: "11px",
    color: "#a08a63",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  detailCardValue: {
    margin: "4px 0 0 0",
    fontSize: "16px",
    fontWeight: "700",
    color: "#2b1a0a",
  },
  chatTab: {
    display: "flex",
    flexDirection: "column",
    height: "480px",
  },
  chatHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "15px",
    flexWrap: "wrap",
    gap: "10px",
  },
  chatTitle: {
    margin: 0,
    color: "#2b1a0a",
    fontSize: "16px",
    fontWeight: "700",
  },
  chatMessages: {
    flex: 1,
    overflowY: "auto",
    padding: "16px",
    background: "#faf6f0",
    borderRadius: "12px",
    marginBottom: "15px",
    border: "1px solid #efe6d3",
  },
  noMessages: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    color: "#a08a63",
    textAlign: "center",
  },
  noMessagesIcon: {
    fontSize: "48px",
    marginBottom: "12px",
  },
  chatMessage: {
    display: "flex",
    marginBottom: "12px",
  },
  chatBubble: {
    padding: "12px 16px",
    borderRadius: "16px",
    maxWidth: "70%",
    wordWrap: "break-word",
    fontSize: "14px",
    lineHeight: "1.5",
  },
  chatBubbleAdmin: {
    background: "linear-gradient(135deg, #b8860b 0%, #8b0000 100%)",
    color: "#fff",
  },
  chatBubbleUser: {
    background: "#f5ecd8",
    color: "#2b1a0a",
  },
  chatText: {
    margin: "4px 0",
    fontSize: "14px",
  },
  chatTime: {
    fontSize: "10px",
    opacity: 0.7,
  },
  loginPrompt: {
    background: "#fff3e0",
    padding: "10px 14px",
    borderRadius: "8px",
    border: "1px solid #d4a017",
  },
  loginPromptText: {
    margin: 0,
    fontSize: "13px",
    color: "#6b5636",
  },
  link: {
    color: "#8b0000",
    cursor: "pointer",
    fontWeight: "700",
  },
  chatInputContainer: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  chatInput: {
    flex: 1,
    minWidth: "180px",
    padding: "12px 16px",
    borderRadius: "10px",
    border: "1.5px solid #efe6d3",
    fontSize: "14px",
    color: "#2b1a0a",
    background: "#fff",
    outline: "none",
  },
  sendButton: {
    padding: "12px 24px",
    background: "linear-gradient(135deg, #b8860b 0%, #8b0000 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "700",
  },
  locationTab: {
    padding: "6px 0",
  },
  locationHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "15px",
    flexWrap: "wrap",
    gap: "10px",
  },
  locationTitle: {
    margin: 0,
    color: "#2b1a0a",
    fontSize: "16px",
    fontWeight: "700",
  },
  locationStatus: {
    padding: "6px 14px",
    background: "#e8f5e9",
    color: "#2e7d32",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "700",
  },
  mapContainer: {
    height: "320px",
    borderRadius: "12px",
    overflow: "hidden",
    marginBottom: "15px",
    border: "1px solid #efe6d3",
  },
  mapFrame: {
    width: "100%",
    height: "100%",
    border: "none",
  },
  locationInfo: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: "15px",
  },
  locationInfoItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "14px",
    background: "#faf6f0",
    borderRadius: "10px",
    border: "1px solid #efe6d3",
  },
  locationInfoIcon: {
    fontSize: "20px",
  },
  locationInfoLabel: {
    display: "block",
    fontSize: "11px",
    color: "#a08a63",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  locationInfoValue: {
    display: "block",
    fontSize: "14px",
    fontWeight: "700",
    color: "#2b1a0a",
  },
};

export default VehicleDetails;