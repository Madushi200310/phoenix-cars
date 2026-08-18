import React, { useEffect, useState, useRef } from "react";
import { collection, collectionGroup, query, where, orderBy, onSnapshot, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { getDoc } from "firebase/firestore";

function Dashboard() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [threads, setThreads] = useState([]);
  const [messagesByVehicle, setMessagesByVehicle] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("inquiries");
  const [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState({ 
    name: "", 
    price: "", 
    year: "", 
    mileage: "", 
    color: "", 
    description: "",
    modelUrl: "" // Added 3D model field
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [reply, setReply] = useState("");
  const [vehicleMessages, setVehicleMessages] = useState([]);
  const [stats, setStats] = useState({ vehicles: 0, messages: 0 });
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const notificationSound = useRef(null);

  const checkUserRole = async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        const role = userDoc.data().role || "user";
        setUserRole(role);
        return role;
      }
      return "user";
    } catch (error) {
      console.error("Error fetching user role:", error);
      return "user";
    }
  };

  // Auth listener
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        navigate("/login");
      } else {
        setUser(currentUser);
        const role = await checkUserRole(currentUser.uid);
        setUserRole(role);
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, [navigate]);

  // Load user's inquiry threads
  useEffect(() => {
    if (!user) return;

    try {
      const q = query(
        collectionGroup(db, "messages"),
        where("uid", "==", user.uid),
        orderBy("time")
      );

      const unsubscribe = onSnapshot(q,
        (snapshot) => {
          const found = {};
          snapshot.docs.forEach((docSnap) => {
            const vehicleId = docSnap.ref.parent.parent.id;
            found[vehicleId] = docSnap.data().vehicleName || "Vehicle";
          });
          setThreads(Object.entries(found).map(([vehicleId, vehicleName]) => ({ vehicleId, vehicleName })));
          setLoading(false);
        },
        (error) => {
          console.error("Error fetching messages:", error);
          loadMessagesAlternative();
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error("Error setting up listener:", error);
      loadMessagesAlternative();
    }
  }, [user]);

  const loadMessagesAlternative = async () => {
    try {
      const vehiclesSnap = await getDocs(collection(db, "vehicles"));
      const allVehicles = vehiclesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      let userThreads = [];
      for (const vehicle of allVehicles) {
        const messagesSnap = await getDocs(collection(db, "vehicles", vehicle.id, "messages"));
        const userMessages = messagesSnap.docs.filter(doc => doc.data().uid === user.uid);
        if (userMessages.length > 0) {
          userThreads.push({ vehicleId: vehicle.id, vehicleName: vehicle.name });
        }
      }
      setThreads(userThreads);
      setLoading(false);
    } catch (error) {
      console.error("Alternative load failed:", error);
      setLoading(false);
    }
  };

  // Subscribe to messages for each thread
  useEffect(() => {
    if (threads.length === 0) return;

    const unsubscribes = [];
    threads.forEach(({ vehicleId }) => {
      try {
        const q = query(collection(db, "vehicles", vehicleId, "messages"), orderBy("time"));
        const unsub = onSnapshot(q, (snapshot) => {
          const msgs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          setMessagesByVehicle((prev) => ({ ...prev, [vehicleId]: msgs }));
        });
        unsubscribes.push(unsub);
      } catch (error) {
        console.error(`Error subscribing to messages for vehicle ${vehicleId}:`, error);
      }
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [threads]);

  // Load vehicles for admin
  useEffect(() => {
    if (userRole === "admin") {
      fetchVehicles();
      loadStats();
      listenForNewMessages();
    }
  }, [userRole]);

  const fetchVehicles = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "vehicles"));
      setVehicles(querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error fetching vehicles:", error);
    }
  };

  const loadStats = async () => {
    try {
      const vehiclesSnap = await getDocs(collection(db, "vehicles"));
      const messagesSnap = await getDocs(collectionGroup(db, "messages"));
      setStats({ vehicles: vehiclesSnap.size, messages: messagesSnap.size });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };
    // Listen for new messages from users (Admin only)
  const listenForNewMessages = () => {
    try {
      const q = query(
        collectionGroup(db, "messages"),
        where("role", "==", "user"),
        orderBy("time", "desc")
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const msg = change.doc.data();
            const vehicleId = change.doc.ref.parent.parent.id;
            
            // Check if message is not from current admin
            if (msg.uid !== user?.uid) {
              // Create notification
              const notification = {
                id: change.doc.id,
                vehicleId: vehicleId,
                vehicleName: msg.vehicleName || "Unknown Vehicle",
                message: msg.text,
                sender: msg.sender || "Customer",
                time: msg.time?.toDate?.() || new Date(),
                read: false
              };
              
              setNotifications(prev => [notification, ...prev]);
              setUnreadCount(prev => prev + 1);
              
              // Play notification sound if available
              if (notificationSound.current) {
                notificationSound.current.play().catch(err => console.log("Sound play failed"));
              }
              
              // Show browser notification if permitted
              try {
                if (Notification.permission === "granted") {
                  const notif = new Notification("🔔 New Message from Customer!", {
                    body: `🚗 ${notification.vehicleName}\n👤 ${notification.sender}\n💬 ${notification.message.substring(0, 80)}${notification.message.length > 80 ? '...' : ''}`,
                    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E🚗%3C/text%3E%3C/svg%3E",
                    tag: notification.vehicleId,
                    requireInteraction: true
                  });
                  
                  notif.onclick = function() {
                    window.focus();
                    setSelectedVehicle({ id: notification.vehicleId, name: notification.vehicleName });
                    setActiveTab("inquiries");
                    setShowNotifications(false);
                    markNotificationAsRead(notification.id);
                  };
                }
              } catch (e) {
                console.log("Browser notification error:", e);
              }
            }
          }
        });
      });

      return () => unsubscribe();
    } catch (error) {
      console.error("Error listening for new messages:", error);
    }
  };

  // Subscribe to messages for selected vehicle (admin)
  useEffect(() => {
    if (!selectedVehicle) return;
    try {
      const q = query(collection(db, "vehicles", selectedVehicle.id, "messages"), orderBy("time"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setVehicleMessages(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsubscribe();
    } catch (error) {
      console.error("Error subscribing to vehicle messages:", error);
    }
  }, [selectedVehicle]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadImageToCloudinary = async () => {
    const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } = await import("../firebase");
    const formData = new FormData();
    formData.append("file", imageFile);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );
    const data = await response.json();
    return data.secure_url;
  };

  const handleAddVehicle = async () => {
    if (!form.name.trim()) return alert("Please enter vehicle name!");
    if (!imageFile) return alert("Please select an image!");
    setUploading(true);
    try {
      const imageUrl = await uploadImageToCloudinary();
      await addDoc(collection(db, "vehicles"), { 
        ...form, 
        image: imageUrl,
        modelUrl: form.modelUrl || null 
      });
      setForm({ name: "", price: "", year: "", mileage: "", color: "", description: "", modelUrl: "" });
      setImageFile(null);
      setImagePreview(null);
      fetchVehicles();
      loadStats();
    } catch (error) {
      alert("Error adding vehicle. Please try again.");
      console.error(error);
    }
    setUploading(false);
  };

  const handleDeleteVehicle = async (id) => {
    if (window.confirm("Are you sure you want to delete this vehicle?")) {
      await deleteDoc(doc(db, "vehicles", id));
      setVehicles(vehicles.filter((v) => v.id !== id));
      loadStats();
    }
  };

  const handleReply = async () => {
    if (!reply.trim()) return;
    try {
      await addDoc(collection(db, "vehicles", selectedVehicle.id, "messages"), {
        text: reply,
        sender: "Team Phoenix",
        role: "admin",
        time: new Date(),
      });
      setReply("");
      
      // Mark notification as read when replied
      setNotifications(prev => 
        prev.map(n => n.vehicleId === selectedVehicle.id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error sending reply:", error);
      alert("Failed to send reply. Please try again.");
    }
  };

  const markNotificationAsRead = (notificationId) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  // Request notification permission
  useEffect(() => {
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <h2>Loading your dashboard...</h2>
      </div>
    );
  }
    return (
    <div style={styles.container}>
      {/* Notification Sound */}
      <audio ref={notificationSound} src="data:audio/wav;base64,UklGRlAAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoAAACFj5yQk5SSlZSSk5KRkpGQkI+OjYyLiomIh4aFhIOCgYB/fn18e3p5eHd2dXRzcnFwb25tbGtqaWhoZ2ZlY2JhYF9eXVxbWllYV1ZVVFNSUVBPTk1MS0pJSEdGRURDQkFAPz49PDs6OTg3NjU0MzIxMC8uLSwrKikoJyYlJCMiISAfHh0cGxoZGBcWFRQTEhEQDw4NDAsKCQgHBgUEAwIBAA==" />
      
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.logo}>🔥 Phoenix Cars</h1>
          <p style={styles.roleText}>
            {userRole === "admin" ? "👑 Admin Dashboard" : "👤 User Dashboard"}
          </p>
        </div>
        <div style={styles.headerActions}>
          {/* Notification Bell for Admin */}
          {userRole === "admin" && (
            <div style={styles.notificationWrapper}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                style={styles.notificationBell}
              >
                🔔
                {unreadCount > 0 && (
                  <span style={styles.notificationBadge}>{unreadCount}</span>
                )}
              </button>
              
              {/* Notification Dropdown */}
              {showNotifications && (
                <div style={styles.notificationDropdown}>
                  <div style={styles.notificationHeader}>
                    <span>Notifications</span>
                    {unreadCount > 0 && (
                      <button onClick={markAllAsRead} style={styles.markAllRead}>
                        Mark all as read
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <p style={styles.noNotifications}>No notifications</p>
                  ) : (
                    notifications.map((n) => (
                      <div 
                        key={n.id} 
                        style={{
                          ...styles.notificationItem,
                          background: n.read ? "#fff" : "#fff3e0"
                        }}
                        onClick={() => {
                          markNotificationAsRead(n.id);
                          setSelectedVehicle({ id: n.vehicleId, name: n.vehicleName });
                          setActiveTab("inquiries");
                          setShowNotifications(false);
                        }}
                      >
                        <div style={styles.notificationContent}>
                          <strong>{n.vehicleName}</strong>
                          <p style={styles.notificationMessage}>{n.sender}: {n.message.substring(0, 60)}...</p>
                          <small style={styles.notificationTime}>
                            {n.time.toLocaleString()}
                          </small>
                        </div>
                        {!n.read && <span style={styles.unreadDot}></span>}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
          
          <span style={styles.userName}>👋 {user?.displayName || user?.email}</span>
          <button onClick={() => navigate("/")} style={styles.btnSecondary}>
            Home
          </button>
          <button onClick={handleLogout} style={styles.btnDanger}>
            Logout
          </button>
        </div>
      </div>

      {/* Show different content based on role */}
      {userRole === "admin" ? (
        // ============ ADMIN VIEW ============
        <div>
          {/* Admin Tabs */}
          <div style={styles.tabs}>
            <button
              onClick={() => {
                setActiveTab("inquiries");
                setShowNotifications(false);
              }}
              style={{
                ...styles.tabButton,
                background: activeTab === "inquiries" ? "#e25822" : "transparent",
                color: activeTab === "inquiries" ? "#fff" : "#333",
                position: "relative",
              }}
            >
              💬 Inquiries
              {unreadCount > 0 && activeTab !== "inquiries" && (
                <span style={styles.tabBadge}>{unreadCount}</span>
              )}
            </button>
            <button
              onClick={() => {
                setActiveTab("admin");
                setShowNotifications(false);
              }}
              style={{
                ...styles.tabButton,
                background: activeTab === "admin" ? "#e25822" : "transparent",
                color: activeTab === "admin" ? "#fff" : "#333",
              }}
            >
              🛠️ Admin Panel
            </button>
            <button
              onClick={() => {
                setActiveTab("stats");
                setShowNotifications(false);
              }}
              style={{
                ...styles.tabButton,
                background: activeTab === "stats" ? "#e25822" : "transparent",
                color: activeTab === "stats" ? "#fff" : "#333",
              }}
            >
              📊 Statistics
            </button>
          </div>

          {/* Admin Content */}
          <div>
            {activeTab === "inquiries" && (
              <div>
                <h2 style={styles.sectionTitle}>💬 Customer Inquiries</h2>
                {threads.length === 0 ? (
                  <p style={styles.noData}>No customer inquiries yet.</p>
                ) : (
                  threads.map(({ vehicleId, vehicleName }) => (
                    <div key={vehicleId} style={styles.threadCard}>
                      <h3 style={styles.threadTitle}>🚗 {vehicleName}</h3>
                      <div style={styles.messageContainer}>
                        {(messagesByVehicle[vehicleId] || []).map((msg) => (
                          <div
                            key={msg.id}
                            style={{
                              ...styles.messageWrapper,
                              justifyContent: msg.role === "admin" ? "flex-end" : "flex-start",
                            }}
                          >
                            <span
                              style={{
                                ...styles.messageBubble,
                                background: msg.role === "admin" ? "#e25822" : "#eee",
                                color: msg.role === "admin" ? "#fff" : "#000",
                              }}
                            >
                              <strong>{msg.sender}:</strong> {msg.text}
                            </span>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => setSelectedVehicle({ id: vehicleId, name: vehicleName })}
                        style={styles.replyButton}
                      >
                        Reply to this inquiry
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "admin" && (
              <div>
                <h2 style={styles.sectionTitle}>🛠️ Manage Vehicles</h2>

                {/* Add Vehicle Form */}
                <div style={styles.formContainer}>
                  <h3>Add New Vehicle</h3>
                  <div style={styles.formGrid}>
                    <input
                      placeholder="Vehicle Name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      style={styles.formInput}
                    />
                    <input
                      placeholder="Price ($)"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      style={styles.formInput}
                    />
                    <input
                      placeholder="Year"
                      value={form.year}
                      onChange={(e) => setForm({ ...form, year: e.target.value })}
                      style={styles.formInput}
                    />
                    <input
                      placeholder="Mileage (km)"
                      value={form.mileage}
                      onChange={(e) => setForm({ ...form, mileage: e.target.value })}
                      style={styles.formInput}
                    />
                    <input
                      placeholder="Color"
                      value={form.color}
                      onChange={(e) => setForm({ ...form, color: e.target.value })}
                      style={styles.formInput}
                    />
                    <input
                      placeholder="🔮 3D Model URL (optional)"
                      value={form.modelUrl || ""}
                      onChange={(e) => setForm({ ...form, modelUrl: e.target.value })}
                      style={styles.formInput}
                    />
                    <textarea
                      placeholder="Description"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      style={styles.formTextarea}
                    />
                  </div>

                  <div style={styles.imageUpload}>
                    <label style={styles.imageLabel}>Upload Car Image:</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      style={styles.fileInput}
                    />
                    {imagePreview && (
                      <img src={imagePreview} alt="Preview" style={styles.imagePreview} />
                    )}
                  </div>

                  <button
                    onClick={handleAddVehicle}
                    disabled={uploading}
                    style={{
                      ...styles.btnPrimary,
                      opacity: uploading ? 0.7 : 1,
                      cursor: uploading ? "not-allowed" : "pointer",
                    }}
                  >
                    {uploading ? "Uploading..." : "Add Vehicle"}
                  </button>
                </div>

                {/* Vehicle List */}
                <h3>All Vehicles ({vehicles.length})</h3>
                <div style={styles.vehicleGrid}>
                  {vehicles.map((v) => (
                    <div key={v.id} style={styles.vehicleCard}>
                      {v.image && (
                        <img src={v.image} alt={v.name} style={styles.vehicleImage} />
                      )}
                      <h4 style={styles.vehicleName}>{v.name}</h4>
                      <p style={styles.vehiclePrice}>💰 ${v.price}</p>
                      <p style={styles.vehicleYear}>📅 {v.year}</p>
                      {v.modelUrl && (
                        <p style={styles.vehicleModel}>🔮 3D Model Available</p>
                      )}
                      <div style={styles.vehicleActions}>
                        <button
                          onClick={() => setSelectedVehicle(v)}
                          style={styles.btnSmall}
                        >
                          💬 Messages
                        </button>
                        <button
                          onClick={() => handleDeleteVehicle(v.id)}
                          style={styles.btnDangerSmall}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "stats" && (
              <div>
                <h2 style={styles.sectionTitle}>📊 Statistics</h2>
                <div style={styles.statsGrid}>
                  <div 
                    style={styles.statCard} 
                    onClick={() => setActiveTab("admin")}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <h2 style={styles.statNumber}>{stats.vehicles}</h2>
                    <p style={styles.statLabel}>🚗 Total Vehicles</p>
                    <p style={styles.statHint}>Click to manage vehicles →</p>
                  </div>

                  <div 
                    style={styles.statCard} 
                    onClick={() => setActiveTab("inquiries")}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <h2 style={styles.statNumber}>{stats.messages}</h2>
                    <p style={styles.statLabel}>💬 Total Inquiries</p>
                    <p style={styles.statHint}>Click to view inquiries →</p>
                  </div>

                  <div 
                    style={styles.statCard} 
                    onClick={() => setActiveTab("inquiries")}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <h2 style={styles.statNumber}>{threads.length}</h2>
                    <p style={styles.statLabel}>💬 Active Inquiries</p>
                    <p style={styles.statHint}>Click to view inquiries →</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        // ============ USER VIEW ============
        <div>
          <h2 style={styles.sectionTitle}>💬 My Inquiries</h2>
          {threads.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyText}>You haven't messaged about any vehicles yet.</p>
              <button onClick={() => navigate("/")} style={styles.btnPrimary}>
                Browse Vehicles
              </button>
            </div>
          ) : (
            threads.map(({ vehicleId, vehicleName }) => (
              <div key={vehicleId} style={styles.threadCard}>
                <h3
                  onClick={() => navigate(`/vehicle/${vehicleId}`)}
                  style={styles.threadTitle}
                >
                  🚗 {vehicleName}
                  <span style={styles.viewLink}>Click to view</span>
                </h3>
                <div style={styles.messageContainer}>
                  {(messagesByVehicle[vehicleId] || []).length === 0 ? (
                    <p style={styles.noMessages}>No messages yet.</p>
                  ) : (
                    (messagesByVehicle[vehicleId] || []).map((msg) => (
                      <div
                        key={msg.id}
                        style={{
                          ...styles.messageWrapper,
                          justifyContent: msg.role === "admin" ? "flex-end" : "flex-start",
                        }}
                      >
                        <span
                          style={{
                            ...styles.messageBubble,
                            background: msg.role === "admin" ? "#e25822" : "#eee",
                            color: msg.role === "admin" ? "#fff" : "#000",
                          }}
                        >
                          <strong>{msg.sender}:</strong> {msg.text}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Reply Modal */}
      {selectedVehicle && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h2 style={styles.modalTitle}>💬 Messages: {selectedVehicle.name}</h2>
            <div style={styles.modalMessages}>
              {vehicleMessages.length === 0 && (
                <p style={styles.noMessages}>No messages yet.</p>
              )}
              {vehicleMessages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    ...styles.messageWrapper,
                    justifyContent: msg.role === "admin" ? "flex-end" : "flex-start",
                  }}
                >
                  <span
                    style={{
                      ...styles.messageBubble,
                      background: msg.role === "admin" ? "#e25822" : "#eee",
                      color: msg.role === "admin" ? "#fff" : "#000",
                    }}
                  >
                    <strong>{msg.sender}:</strong> {msg.text}
                  </span>
                </div>
              ))}
            </div>
            {userRole === "admin" && (
              <>
                <div style={styles.modalInputContainer}>
                  <input
                    placeholder="Type your reply..."
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    style={styles.modalInput}
                  />
                  <button onClick={handleReply} style={styles.btnPrimary}>
                    Reply
                  </button>
                </div>
              </>
            )}
            <button
              onClick={() => {
                setSelectedVehicle(null);
                setReply("");
              }}
              style={styles.modalClose}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: "20px",
    fontFamily: "Arial, sans-serif",
    maxWidth: "1200px",
    margin: "0 auto",
    backgroundColor: "#f5f5f5",
    minHeight: "100vh",
  },
  loadingContainer: {
    padding: "60px",
    textAlign: "center",
    color: "#666",
  },
  header: {
    backgroundColor: "#fff",
    padding: "20px",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "10px",
    marginBottom: "20px",
  },
  headerLeft: {
    display: "flex",
    flexDirection: "column",
  },
  logo: {
    color: "#e25822",
    margin: 0,
    fontSize: "24px",
  },
  roleText: {
    margin: "5px 0 0 0",
    color: "#666",
    fontSize: "14px",
  },
  headerActions: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
    flexWrap: "wrap",
    position: "relative",
  },
  userName: {
    color: "#555",
    fontSize: "14px",
  },
  btnPrimary: {
    padding: "10px 20px",
    backgroundColor: "#e25822",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "bold",
  },
  btnSecondary: {
    padding: "8px 16px",
    backgroundColor: "#333",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
  },
  btnDanger: {
    padding: "8px 16px",
    backgroundColor: "#dc3545",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
  },
  notificationWrapper: {
    position: "relative",
  },
  notificationBell: {
    position: "relative",
    fontSize: "24px",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "5px 10px",
  },
  notificationBadge: {
    position: "absolute",
    top: "-5px",
    right: "-5px",
    backgroundColor: "#dc3545",
    color: "#fff",
    borderRadius: "50%",
    padding: "2px 8px",
    fontSize: "12px",
    minWidth: "18px",
    textAlign: "center",
  },
  notificationDropdown: {
    position: "absolute",
    top: "40px",
    right: "0",
    width: "350px",
    maxHeight: "400px",
    overflowY: "auto",
    backgroundColor: "#fff",
    borderRadius: "12px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
    zIndex: 1000,
    padding: "10px",
  },
  notificationHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px",
    borderBottom: "1px solid #eee",
    fontWeight: "bold",
  },
  markAllRead: {
    background: "none",
    border: "none",
    color: "#e25822",
    cursor: "pointer",
    fontSize: "12px",
  },
  noNotifications: {
    textAlign: "center",
    color: "#999",
    padding: "20px",
  },
  notificationItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px",
    borderRadius: "8px",
    marginBottom: "5px",
    cursor: "pointer",
    transition: "background 0.3s",
  },
  notificationContent: {
    flex: 1,
  },
  notificationMessage: {
    margin: "5px 0",
    fontSize: "14px",
    color: "#333",
  },
  notificationTime: {
    fontSize: "11px",
    color: "#999",
  },
  unreadDot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    backgroundColor: "#e25822",
    flexShrink: 0,
    marginLeft: "10px",
  },
  tabs: {
    display: "flex",
    gap: "10px",
    marginBottom: "20px",
    backgroundColor: "#fff",
    padding: "10px",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    position: "relative",
  },
  tabButton: {
    padding: "10px 24px",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "bold",
    transition: "all 0.3s",
    position: "relative",
  },
  tabBadge: {
    position: "absolute",
    top: "-8px",
    right: "-8px",
    background: "#dc3545",
    color: "#fff",
    borderRadius: "50%",
    padding: "2px 8px",
    fontSize: "12px",
    minWidth: "20px",
    textAlign: "center",
  },
  sectionTitle: {
    marginTop: 0,
    color: "#333",
  },
  emptyState: {
    padding: "40px",
    textAlign: "center",
    backgroundColor: "#fff",
    borderRadius: "12px",
    border: "2px dashed #ddd",
  },
  emptyText: {
    fontSize: "18px",
    color: "#aaa",
  },
  threadCard: {
    backgroundColor: "#fff",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "20px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  },
  threadTitle: {
    color: "#e25822",
    cursor: "pointer",
    marginTop: 0,
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  viewLink: {
    fontSize: "12px",
    backgroundColor: "#eee",
    padding: "2px 10px",
    borderRadius: "12px",
    color: "#666",
  },
  messageContainer: {
    maxHeight: "250px",
    overflowY: "auto",
    border: "1px solid #f0f0f0",
    borderRadius: "8px",
    padding: "10px",
    backgroundColor: "#fafafa",
  },
  messageWrapper: {
    display: "flex",
    marginBottom: "8px",
  },
  messageBubble: {
    padding: "8px 14px",
    borderRadius: "15px",
    maxWidth: "80%",
    wordWrap: "break-word",
    fontSize: "14px",
  },
  noMessages: {
    color: "#aaa",
    textAlign: "center",
    padding: "20px",
  },
  noData: {
    color: "#aaa",
    textAlign: "center",
    padding: "20px",
  },
  replyButton: {
    marginTop: "10px",
    padding: "8px 16px",
    backgroundColor: "#333",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
  formContainer: {
    backgroundColor: "#fff",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "30px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  },
  formInput: {
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    fontSize: "14px",
  },
  formTextarea: {
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    fontSize: "14px",
    gridColumn: "1 / -1",
    minHeight: "60px",
  },
  imageUpload: {
    marginTop: "15px",
    marginBottom: "15px",
  },
  imageLabel: {
    display: "block",
    marginBottom: "8px",
    fontWeight: "bold",
  },
  fileInput: {
    padding: "8px",
  },
  imagePreview: {
    marginTop: "10px",
    width: "150px",
    borderRadius: "8px",
    border: "1px solid #ddd",
  },
  vehicleGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: "15px",
  },
  vehicleCard: {
    backgroundColor: "#fff",
    borderRadius: "10px",
    padding: "15px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  },
  vehicleImage: {
    width: "100%",
    height: "150px",
    objectFit: "cover",
    borderRadius: "8px",
    marginBottom: "8px",
  },
  vehicleName: {
    margin: "5px 0",
    fontSize: "16px",
  },
  vehiclePrice: {
    margin: "3px 0",
    color: "#e25822",
    fontWeight: "bold",
  },
  vehicleYear: {
    margin: "3px 0",
    fontSize: "14px",
    color: "#666",
  },
  vehicleModel: {
    margin: "3px 0",
    fontSize: "12px",
    color: "#28a745",
    fontWeight: "bold",
  },
  vehicleActions: {
    display: "flex",
    gap: "5px",
    marginTop: "8px",
  },
  btnSmall: {
    flex: 1,
    padding: "6px 10px",
    backgroundColor: "#333",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "12px",
  },
  btnDangerSmall: {
    flex: 1,
    padding: "6px 10px",
    backgroundColor: "#dc3545",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "12px",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: "20px",
  },
  statCard: {
    backgroundColor: "#fff",
    borderRadius: "12px",
    padding: "25px",
    textAlign: "center",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    cursor: "pointer",
    transition: "transform 0.3s ease, box-shadow 0.3s ease",
  },
  statNumber: {
    margin: 0,
    color: "#e25822",
    fontSize: "36px",
  },
  statLabel: {
    margin: "8px 0 0 0",
    color: "#666",
  },
  statHint: {
    margin: "8px 0 0 0",
    color: "#999",
    fontSize: "12px",
    fontStyle: "italic",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: "30px",
    borderRadius: "12px",
    maxWidth: "600px",
    width: "90%",
    maxHeight: "80vh",
    overflow: "auto",
  },
  modalTitle: {
    color: "#e25822",
    marginTop: 0,
  },
  modalMessages: {
    border: "1px solid #ddd",
    borderRadius: "10px",
    padding: "15px",
    height: "250px",
    overflowY: "auto",
    backgroundColor: "#f9f9f9",
    marginBottom: "10px",
  },
  modalInputContainer: {
    display: "flex",
    gap: "10px",
    marginBottom: "10px",
  },
  modalInput: {
    flex: 1,
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    fontSize: "14px",
  },
  modalClose: {
    width: "100%",
    padding: "10px",
    backgroundColor: "#666",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
  },
};

export default Dashboard;