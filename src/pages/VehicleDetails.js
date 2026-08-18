import React, { useEffect, useState } from "react";
import { doc, getDoc, collection, addDoc, onSnapshot, query, orderBy } from "firebase/firestore";
import { db, auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useParams, useNavigate } from "react-router-dom";

function VehicleDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [user, setUser] = useState(null);
  const [showTracker, setShowTracker] = useState(false);
  const [vehicleLocation, setVehicleLocation] = useState(null);
  const [activeTab, setActiveTab] = useState("details"); // details, chat, location

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

    const q = query(collection(db, "vehicles", id, "messages"), orderBy("time"));
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
        setVehicleLocation(prev => ({
          ...prev,
          lat: Math.min(9.8, Math.max(5.9, prev.lat + (Math.random() - 0.5) * movement)),
          lng: Math.min(81.9, Math.max(79.5, prev.lng + (Math.random() - 0.5) * movement)),
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
      { name: "Galle", lat: 6.0323, lng: 80.2150 },
      { name: "Kandy", lat: 7.2906, lng: 80.6337 },
      { name: "Jaffna", lat: 9.6615, lng: 80.0254 },
      { name: "Arugam Bay", lat: 6.4240, lng: 81.4950 },
      { name: "Dambulla", lat: 7.8731, lng: 80.7710 },
      { name: "Hambantota", lat: 6.2542, lng: 81.1440 },
      { name: "Anuradhapura", lat: 8.3690, lng: 80.3985 },
      { name: "Nuwara Eliya", lat: 6.9758, lng: 80.5564 },
      { name: "Matara", lat: 5.9534, lng: 80.5523 },
      { name: "Negombo", lat: 7.2098, lng: 79.8330 },
      { name: "Batticaloa", lat: 7.7169, lng: 81.7005 },
      { name: "Trincomalee", lat: 8.5776, lng: 81.2058 },
    ];
    
    const randomLocation = sriLankaLocations[Math.floor(Math.random() * sriLankaLocations.length)];
    const randomOffset = 0.01;
    setVehicleLocation({
      lat: randomLocation.lat + (Math.random() - 0.5) * randomOffset,
      lng: randomLocation.lng + (Math.random() - 0.5) * randomOffset,
      name: randomLocation.name
    });
    
    addDoc(collection(db, "vehicles", id, "messages"), {
      text: ` I'm interested in purchasing this vehicle! Currently in ${randomLocation.name}, Sri Lanka.`,
      sender: user.displayName || user.email,
      role: "user",
      time: new Date(),
      uid: user.uid,
      vehicleName: vehicle?.name || "Vehicle",
    }).catch(console.error);
  };

  if (!vehicle) return (
    <div style={styles.loading}>
      <div style={styles.loadingSpinner}></div>
      <h2>Loading vehicle details...</h2>
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
              <img src={vehicle.image} alt={vehicle.name} style={styles.mainImage} />
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
            <p style={styles.vehiclePrice}>${vehicle.price?.toLocaleString() || "N/A"}</p>
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
                <span style={styles.specValue}>{vehicle.mileage || "N/A"} km</span>
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
            <p style={styles.descriptionText}>{vehicle.description || "No description available."}</p>
          </div>

          {/* 3D Model */}
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

          {/* Action Buttons */}
          <div style={styles.actionButtons}>
            <button onClick={handleRequestPurchase} style={styles.purchaseButton}>
               Request to Buy & Track Location
            </button>
            <button onClick={() => setActiveTab("chat")} style={styles.chatButton}>
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
            background: activeTab === "details" ? "#e25822" : "#f5f5f5",
            color: activeTab === "details" ? "#fff" : "#555",
          }}
        >
           Details
        </button>
        <button
          onClick={() => setActiveTab("chat")}
          style={{
            ...styles.tabButton,
            background: activeTab === "chat" ? "#e25822" : "#f5f5f5",
            color: activeTab === "chat" ? "#fff" : "#555",
          }}
        >
           Chat
        </button>
        {showTracker && (
          <button
            onClick={() => setActiveTab("location")}
            style={{
              ...styles.tabButton,
              background: activeTab === "location" ? "#e25822" : "#f5f5f5",
              color: activeTab === "location" ? "#fff" : "#555",
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
              <h3> Chat with Our Team</h3>
              {!user && (
                <div style={styles.loginPrompt}>
                  <p>Please <span onClick={() => navigate("/login")} style={styles.link}>login</span> or <span onClick={() => navigate("/register")} style={styles.link}>register</span> to chat.</p>
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
                    justifyContent: msg.role === "admin" ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      ...styles.chatBubble,
                      background: msg.role === "admin" ? "#e25822" : "#f0f0f0",
                      color: msg.role === "admin" ? "#fff" : "#333",
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
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
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
              <h3> Vehicle Location - Sri Lanka</h3>
              <span style={styles.locationStatus}> Live Tracking</span>
            </div>
            <div style={styles.mapContainer}>
              <iframe
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${vehicleLocation.lng-0.05}%2C${vehicleLocation.lat-0.05}%2C${vehicleLocation.lng+0.05}%2C${vehicleLocation.lat+0.05}&layer=mapnik&marker=${vehicleLocation.lat}%2C${vehicleLocation.lng}`}
                style={styles.mapFrame}
                title="Vehicle Location - Sri Lanka"
              />
            </div>
            <div style={styles.locationInfo}>
              <div style={styles.locationInfoItem}>
                <span style={styles.locationInfoIcon}></span>
                <div>
                  <span style={styles.locationInfoLabel}>Current Location</span>
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
                    Lat: {vehicleLocation.lat.toFixed(6)}, Lng: {vehicleLocation.lng.toFixed(6)}
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
    padding: "30px",
    fontFamily: "'Segoe UI', Arial, sans-serif",
    maxWidth: "1200px",
    margin: "0 auto",
    background: "#f8f9fa",
    minHeight: "100vh",
  },
  loading: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "80px",
    color: "#666",
  },
  loadingSpinner: {
    width: "40px",
    height: "40px",
    border: "4px solid #f3f3f3",
    borderTop: "4px solid #e25822",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    marginBottom: "20px",
  },
  backButton: {
    padding: "10px 24px",
    backgroundColor: "#fff",
    color: "#333",
    border: "1px solid #ddd",
    borderRadius: "8px",
    cursor: "pointer",
    marginBottom: "25px",
    fontSize: "14px",
    transition: "all 0.3s",
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
    "&:hover": {
      background: "#f5f5f5",
      transform: "translateX(-4px)",
    },
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
    background: "#fff",
    borderRadius: "16px",
    overflow: "hidden",
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
    height: "100%",
    minHeight: "400px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  mainImage: {
    width: "100%",
    height: "100%",
    maxHeight: "500px",
    objectFit: "cover",
  },
  noImage: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "#999",
    padding: "40px",
  },
  noImageIcon: {
    fontSize: "64px",
    marginBottom: "16px",
  },
  detailsColumn: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  vehicleHeader: {
    background: "#fff",
    padding: "24px",
    borderRadius: "16px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
  },
  vehicleName: {
    margin: "0 0 8px 0",
    fontSize: "28px",
    color: "#1a1a2e",
    fontWeight: "700",
  },
  vehiclePrice: {
    margin: 0,
    fontSize: "32px",
    fontWeight: "bold",
    color: "#e25822",
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
    background: "#fff",
    padding: "16px",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  },
  specIcon: {
    fontSize: "24px",
  },
  specLabel: {
    display: "block",
    fontSize: "11px",
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  specValue: {
    display: "block",
    fontSize: "16px",
    fontWeight: "600",
    color: "#1a1a2e",
  },
  descriptionSection: {
    background: "#fff",
    padding: "20px",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  },
  sectionTitle: {
    margin: "0 0 12px 0",
    fontSize: "16px",
    color: "#333",
  },
  descriptionText: {
    margin: 0,
    color: "#555",
    lineHeight: "1.6",
    fontSize: "15px",
  },
  modelSection: {
    background: "#fff",
    padding: "20px",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  },
  modelContainer: {
    height: "250px",
    borderRadius: "8px",
    overflow: "hidden",
    background: "#f8f9fa",
  },
  modelFrame: {
    width: "100%",
    height: "100%",
    border: "none",
  },
  actionButtons: {
    display: "flex",
    gap: "12px",
  },
  purchaseButton: {
    flex: 1,
    padding: "14px 20px",
    background: "linear-gradient(135deg, #28a745, #20c997)",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "600",
    transition: "all 0.3s",
    boxShadow: "0 4px 12px rgba(40,167,69,0.3)",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: "0 6px 20px rgba(40,167,69,0.4)",
    },
  },
  chatButton: {
    flex: 1,
    padding: "14px 20px",
    background: "linear-gradient(135deg, #e25822, #f39c12)",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "600",
    transition: "all 0.3s",
    boxShadow: "0 4px 12px rgba(226,88,34,0.3)",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: "0 6px 20px rgba(226,88,34,0.4)",
    },
  },
  tabsContainer: {
    display: "flex",
    gap: "10px",
    marginBottom: "0",
    background: "#fff",
    padding: "12px 20px 0 20px",
    borderRadius: "16px 16px 0 0",
    boxShadow: "0 -2px 10px rgba(0,0,0,0.04)",
  },
  tabButton: {
    padding: "12px 24px",
    border: "none",
    borderRadius: "10px 10px 0 0",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    transition: "all 0.3s",
  },
  tabContent: {
    background: "#fff",
    padding: "24px",
    borderRadius: "0 0 16px 16px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
    marginBottom: "30px",
  },
  detailsTab: {
    padding: "10px 0",
  },
  detailsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "15px",
  },
  detailCard: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    padding: "16px",
    background: "#f8f9fa",
    borderRadius: "12px",
    border: "1px solid #eee",
  },
  detailCardIcon: {
    fontSize: "28px",
  },
  detailCardLabel: {
    margin: "0",
    fontSize: "12px",
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  detailCardValue: {
    margin: "4px 0 0 0",
    fontSize: "16px",
    fontWeight: "600",
    color: "#1a1a2e",
  },
  chatTab: {
    display: "flex",
    flexDirection: "column",
    height: "450px",
  },
  chatHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "15px",
    "& h3": {
      margin: 0,
    },
  },
  chatMessages: {
    flex: 1,
    overflowY: "auto",
    padding: "15px",
    background: "#f8f9fa",
    borderRadius: "12px",
    marginBottom: "15px",
  },
  noMessages: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    color: "#aaa",
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
    padding: "12px 16px",
    borderRadius: "8px",
  },
  link: {
    color: "#e25822",
    cursor: "pointer",
    fontWeight: "bold",
  },
  chatInputContainer: {
    display: "flex",
    gap: "10px",
  },
  chatInput: {
    flex: 1,
    padding: "12px 16px",
    borderRadius: "10px",
    border: "2px solid #e0e0e0",
    fontSize: "14px",
    transition: "border-color 0.3s",
    "&:focus": {
      borderColor: "#e25822",
      outline: "none",
    },
  },
  sendButton: {
    padding: "12px 24px",
    background: "#e25822",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    transition: "background 0.3s",
    "&:hover": {
      background: "#c94a1a",
    },
  },
  locationTab: {
    padding: "10px 0",
  },
  locationHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "15px",
    "& h3": {
      margin: 0,
    },
  },
  locationStatus: {
    padding: "6px 14px",
    background: "#e8f5e9",
    color: "#2e7d32",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "600",
  },
  mapContainer: {
    height: "300px",
    borderRadius: "12px",
    overflow: "hidden",
    marginBottom: "15px",
  },
  mapFrame: {
    width: "100%",
    height: "100%",
    border: "none",
  },
  locationInfo: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "15px",
  },
  locationInfoItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "14px",
    background: "#f8f9fa",
    borderRadius: "10px",
    border: "1px solid #eee",
  },
  locationInfoIcon: {
    fontSize: "20px",
  },
  locationInfoLabel: {
    display: "block",
    fontSize: "11px",
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  locationInfoValue: {
    display: "block",
    fontSize: "14px",
    fontWeight: "600",
    color: "#1a1a2e",
  },
};

// Add keyframe animation for loading spinner
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default VehicleDetails;