import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  collection,
  collectionGroup,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

// Format price in LKR (for display)
const formatLKR = (value) => {
  if (value === undefined || value === null || value === "") return "N/A";
  const num = Number(value);
  if (isNaN(num)) return value;
  return `LKR ${num.toLocaleString("en-LK")}`;
};

// Format input value — strips non-digits, then prefixes with "LKR "
const formatPriceInput = (value) => {
  if (value === undefined || value === null) return "";
  const digits = String(value).replace(/[^\d]/g, "");
  if (!digits) return "";
  return `LKR ${Number(digits).toLocaleString("en-LK")}`;
};

// Parse input value — strips non-digits (for Firestore storage)
const parsePriceValue = (value) => {
  if (value === undefined || value === null) return "";
  return String(value).replace(/[^\d]/g, "");
};

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
    modelUrl: "",
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
  const [editingVehicle, setEditingVehicle] = useState(null);
  const navigate = useNavigate();
  const notificationSound = useRef(null);

  // ═══════════════════════════════════════════════
  // Helper functions (memoized)
  // ═══════════════════════════════════════════════

  const checkUserRole = useCallback(async (uid) => {
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
  }, []);

  const loadMessagesAlternative = useCallback(async () => {
    try {
      const vehiclesSnap = await getDocs(collection(db, "vehicles"));
      const allVehicles = vehiclesSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      let userThreads = [];
      for (const vehicle of allVehicles) {
        const messagesSnap = await getDocs(
          collection(db, "vehicles", vehicle.id, "messages")
        );
        const userMessages = messagesSnap.docs.filter(
          (d) => d.data().uid === user?.uid
        );
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
  }, [user]);

  const fetchVehicles = useCallback(async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "vehicles"));
      setVehicles(
        querySnapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
      );
    } catch (error) {
      console.error("Error fetching vehicles:", error);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const vehiclesSnap = await getDocs(collection(db, "vehicles"));
      const messagesSnap = await getDocs(collectionGroup(db, "messages"));
      setStats({ vehicles: vehiclesSnap.size, messages: messagesSnap.size });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  }, []);

  const markNotificationAsRead = useCallback((notificationId) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const listenForNewMessages = useCallback(() => {
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

            if (msg.uid !== user?.uid) {
              const notification = {
                id: change.doc.id,
                vehicleId,
                vehicleName: msg.vehicleName || "Unknown Vehicle",
                message: msg.text,
                sender: msg.sender || "Customer",
                time: msg.time?.toDate?.() || new Date(),
                read: false,
              };

              setNotifications((prev) => [notification, ...prev]);
              setUnreadCount((prev) => prev + 1);

              if (notificationSound.current) {
                notificationSound.current
                  .play()
                  .catch((err) => console.log("Sound play failed:", err));
              }

              try {
                if (
                  typeof Notification !== "undefined" &&
                  Notification.permission === "granted"
                ) {
                  const notif = new Notification(
                    "🔔 New Message from Customer!",
                    {
                      body: `🚗 ${notification.vehicleName}\n👤 ${
                        notification.sender
                      }\n💬 ${notification.message.substring(0, 80)}${
                        notification.message.length > 80 ? "..." : ""
                      }`,
                      icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E🚗%3C/text%3E%3C/svg%3E",
                      tag: notification.vehicleId,
                      requireInteraction: true,
                    }
                  );

                  notif.onclick = function () {
                    window.focus();
                    setSelectedVehicle({
                      id: notification.vehicleId,
                      name: notification.vehicleName,
                    });
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
  }, [user, markNotificationAsRead]);

  // ═══════════════════════════════════════════════
  // Effects
  // ═══════════════════════════════════════════════

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
  }, [navigate, checkUserRole]);

  useEffect(() => {
    if (!user) return;

    try {
      const q = query(
        collectionGroup(db, "messages"),
        where("uid", "==", user.uid),
        orderBy("time")
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const found = {};
          snapshot.docs.forEach((docSnap) => {
            const vehicleId = docSnap.ref.parent.parent.id;
            found[vehicleId] = docSnap.data().vehicleName || "Vehicle";
          });
          setThreads(
            Object.entries(found).map(([vehicleId, vehicleName]) => ({
              vehicleId,
              vehicleName,
            }))
          );
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
  }, [user, loadMessagesAlternative]);

  useEffect(() => {
    if (threads.length === 0) return;

    const unsubscribes = [];
    threads.forEach(({ vehicleId }) => {
      try {
        const q = query(
          collection(db, "vehicles", vehicleId, "messages"),
          orderBy("time")
        );
        const unsub = onSnapshot(q, (snapshot) => {
          const msgs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          setMessagesByVehicle((prev) => ({ ...prev, [vehicleId]: msgs }));
        });
        unsubscribes.push(unsub);
      } catch (error) {
        console.error(
          `Error subscribing to messages for vehicle ${vehicleId}:`,
          error
        );
      }
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [threads]);

  useEffect(() => {
    if (userRole === "admin") {
      fetchVehicles();
      loadStats();
      listenForNewMessages();
    }
  }, [userRole, fetchVehicles, loadStats, listenForNewMessages]);

  useEffect(() => {
    if (!selectedVehicle) return;
    try {
      const q = query(
        collection(db, "vehicles", selectedVehicle.id, "messages"),
        orderBy("time")
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setVehicleMessages(
          snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
        );
      });
      return () => unsubscribe();
    } catch (error) {
      console.error("Error subscribing to vehicle messages:", error);
    }
  }, [selectedVehicle]);

  useEffect(() => {
    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission();
    }
  }, []);

  // ═══════════════════════════════════════════════
  // Handlers
  // ═══════════════════════════════════════════════

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadImageToCloudinary = async () => {
    const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } = await import(
      "../firebase"
    );
    const formData = new FormData();
    formData.append("file", imageFile);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: "POST", body: formData }
    );
    const data = await response.json();
    return data.secure_url;
  };

  const resetForm = () => {
    setForm({
      name: "",
      price: "",
      year: "",
      mileage: "",
      color: "",
      description: "",
      modelUrl: "",
    });
    setImageFile(null);
    setImagePreview(null);
    setEditingVehicle(null);
  };

  // ─── ADD ───
  const handleAddVehicle = async () => {
    if (!form.name.trim()) return alert("Please enter vehicle name!");
    if (!imageFile) return alert("Please select an image!");
    setUploading(true);
    try {
      const imageUrl = await uploadImageToCloudinary();
      await addDoc(collection(db, "vehicles"), {
        ...form,
        image: imageUrl,
        modelUrl: form.modelUrl || null,
      });
      resetForm();
      fetchVehicles();
      loadStats();
    } catch (error) {
      alert("Error adding vehicle. Please try again.");
      console.error(error);
    }
    setUploading(false);
  };

  // ─── START EDIT ───
  const handleStartEdit = (vehicle) => {
    setEditingVehicle(vehicle);
    setForm({
      name: vehicle.name || "",
      price: vehicle.price || "",
      year: vehicle.year || "",
      mileage: vehicle.mileage || "",
      color: vehicle.color || "",
      description: vehicle.description || "",
      modelUrl: vehicle.modelUrl || "",
    });
    setImageFile(null);
    setImagePreview(vehicle.image || null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ─── CANCEL EDIT ───
  const handleCancelEdit = () => {
    resetForm();
  };

  // ─── UPDATE ───
  const handleUpdateVehicle = async () => {
    if (!editingVehicle) return;
    if (!form.name.trim()) return alert("Please enter vehicle name!");
    setUploading(true);
    try {
      let imageUrl = editingVehicle.image;
      if (imageFile) {
        imageUrl = await uploadImageToCloudinary();
      }

      await updateDoc(doc(db, "vehicles", editingVehicle.id), {
        ...form,
        image: imageUrl,
        modelUrl: form.modelUrl || null,
      });

      resetForm();
      fetchVehicles();
      loadStats();
    } catch (error) {
      alert("Error updating vehicle. Please try again.");
      console.error(error);
    }
    setUploading(false);
  };

  // ─── DELETE ───
  const handleDeleteVehicle = async (id) => {
    if (window.confirm("Are you sure you want to delete this vehicle?")) {
      await deleteDoc(doc(db, "vehicles", id));
      setVehicles(vehicles.filter((v) => v.id !== id));
      loadStats();
      if (editingVehicle?.id === id) resetForm();
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

      setNotifications((prev) =>
        prev.map((n) =>
          n.vehicleId === selectedVehicle.id ? { ...n, read: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error sending reply:", error);
      alert("Failed to send reply. Please try again.");
    }
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <h2 style={styles.loadingText}>Loading your dashboard...</h2>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <audio
        ref={notificationSound}
        src="data:audio/wav;base64,UklGRlAAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoAAACFj5yQk5SSlZSSk5KRkpGQkI+OjYyLiomIh4aFhIOCgYB/fn18e3p5eHd2dXRzcnFwb25tbGtqaWhoZ2ZlY2JhYF9eXVxbWllYV1ZVVFNSUVBPTk1MS0pJSEdGRURDQkFAPz49PDs6OTg3NjU0MzIxMC8uLSwrKikoJyYlJCMiISAfHh0cGxoZGBcWFRQTEhEQDw4NDAsKCQgHBgUEAwIBAA=="
      />

      {/* ───────── HEADER ───────── */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.logo}>
            <span style={styles.logoMark}>✳</span> Phoenix Cars
          </h1>
          <p style={styles.roleText}>
            {userRole === "admin" ? "👑 Admin Dashboard" : "👤 User Dashboard"}
          </p>
        </div>

        <div style={styles.headerActions}>
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
                          background: n.read ? "#fffdf8" : "#fff3e0",
                        }}
                        onClick={() => {
                          markNotificationAsRead(n.id);
                          setSelectedVehicle({
                            id: n.vehicleId,
                            name: n.vehicleName,
                          });
                          setActiveTab("inquiries");
                          setShowNotifications(false);
                        }}
                      >
                        <div style={styles.notificationContent}>
                          <strong style={styles.notificationTitle}>
                            {n.vehicleName}
                          </strong>
                          <p style={styles.notificationMessage}>
                            {n.sender}: {n.message.substring(0, 60)}...
                          </p>
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

          <span style={styles.userName}>
            👋 {user?.displayName || user?.email}
          </span>
          <button onClick={() => navigate("/")} style={styles.btnOutline}>
            Home
          </button>
          <button onClick={handleLogout} style={styles.btnPrimary}>
            Logout
          </button>
        </div>
      </div>

      {/* ───────── CONTENT ───────── */}
      {userRole === "admin" ? (
        <div>
          <div style={styles.tabs}>
            <button
              onClick={() => {
                setActiveTab("inquiries");
                setShowNotifications(false);
              }}
              style={{
                ...styles.tabButton,
                ...(activeTab === "inquiries"
                  ? styles.tabButtonActive
                  : styles.tabButtonInactive),
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
                ...(activeTab === "admin"
                  ? styles.tabButtonActive
                  : styles.tabButtonInactive),
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
                ...(activeTab === "stats"
                  ? styles.tabButtonActive
                  : styles.tabButtonInactive),
              }}
            >
              📊 Statistics
            </button>
          </div>

          <div>
            {/* ── INQUIRIES TAB ── */}
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
                              justifyContent:
                                msg.role === "admin"
                                  ? "flex-end"
                                  : "flex-start",
                            }}
                          >
                            <span
                              style={{
                                ...styles.messageBubble,
                                ...(msg.role === "admin"
                                  ? styles.messageBubbleAdmin
                                  : styles.messageBubbleUser),
                              }}
                            >
                              <strong>{msg.sender}:</strong> {msg.text}
                            </span>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() =>
                          setSelectedVehicle({
                            id: vehicleId,
                            name: vehicleName,
                          })
                        }
                        style={styles.replyButton}
                      >
                        Reply to this inquiry
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── ADMIN TAB ── */}
            {activeTab === "admin" && (
              <div>
                <h2 style={styles.sectionTitle}>
                  🛠️ {editingVehicle ? "Edit Vehicle" : "Manage Vehicles"}
                </h2>

                <div style={styles.formContainer}>
                  <h3 style={styles.formTitle}>
                    {editingVehicle
                      ? `✏️ Editing: ${editingVehicle.name}`
                      : "➕ Add New Vehicle"}
                  </h3>

                  {editingVehicle && (
                    <div style={styles.editBanner}>
                      You are editing an existing vehicle. Changes will update
                      the listing immediately.
                    </div>
                  )}

                  <div style={styles.formGrid}>
                    <input
                      placeholder="Vehicle Name"
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      style={styles.formInput}
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Price (LKR)"
                      value={formatPriceInput(form.price)}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          price: parsePriceValue(e.target.value),
                        })
                      }
                      style={styles.formInput}
                    />
                    <input
                      placeholder="Year"
                      value={form.year}
                      onChange={(e) =>
                        setForm({ ...form, year: e.target.value })
                      }
                      style={styles.formInput}
                    />
                    <input
                      placeholder="Mileage (km)"
                      value={form.mileage}
                      onChange={(e) =>
                        setForm({ ...form, mileage: e.target.value })
                      }
                      style={styles.formInput}
                    />
                    <input
                      placeholder="Color"
                      value={form.color}
                      onChange={(e) =>
                        setForm({ ...form, color: e.target.value })
                      }
                      style={styles.formInput}
                    />
                    <input
                      placeholder="🔮 3D Model URL (optional)"
                      value={form.modelUrl || ""}
                      onChange={(e) =>
                        setForm({ ...form, modelUrl: e.target.value })
                      }
                      style={styles.formInput}
                    />
                    <textarea
                      placeholder="Description"
                      value={form.description}
                      onChange={(e) =>
                        setForm({ ...form, description: e.target.value })
                      }
                      style={styles.formTextarea}
                    />
                  </div>

                  <div style={styles.imageUpload}>
                    <label style={styles.imageLabel}>
                      {editingVehicle
                        ? "Replace Image (optional — leave empty to keep current)"
                        : "Upload Car Image:"}
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      style={styles.fileInput}
                    />
                    {imagePreview && (
                      <div>
                        <img
                          src={imagePreview}
                          alt="Preview"
                          style={styles.imagePreview}
                        />
                        {editingVehicle && !imageFile && (
                          <p style={styles.imageNote}>
                            (Current image — pick a new file to replace)
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div style={styles.formActions}>
                    {editingVehicle ? (
                      <>
                        <button
                          onClick={handleUpdateVehicle}
                          disabled={uploading}
                          style={{
                            ...styles.btnPrimary,
                            opacity: uploading ? 0.7 : 1,
                            cursor: uploading ? "not-allowed" : "pointer",
                          }}
                        >
                          {uploading ? "Saving..." : "💾 Save Changes"}
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          disabled={uploading}
                          style={styles.btnOutline}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={handleAddVehicle}
                        disabled={uploading}
                        style={{
                          ...styles.btnPrimary,
                          opacity: uploading ? 0.7 : 1,
                          cursor: uploading ? "not-allowed" : "pointer",
                        }}
                      >
                        {uploading ? "Uploading..." : "➕ Add Vehicle"}
                      </button>
                    )}
                  </div>
                </div>

                <h3 style={styles.subTitle}>
                  All Vehicles ({vehicles.length})
                </h3>
                <div style={styles.vehicleGrid}>
                  {vehicles.map((v) => (
                    <div key={v.id} style={styles.vehicleCard}>
                      {v.image && (
                        <img
                          src={v.image}
                          alt={v.name}
                          style={styles.vehicleImage}
                        />
                      )}
                      <h4 style={styles.vehicleName}>{v.name}</h4>
                      <p style={styles.vehiclePrice}>
                        💰 {formatLKR(v.price)}
                      </p>
                      <p style={styles.vehicleYear}>📅 {v.year}</p>
                      {v.modelUrl && (
                        <p style={styles.vehicleModel}>
                          🔮 3D Model Available
                        </p>
                      )}
                      <div style={styles.vehicleActions}>
                        <button
                          onClick={() => setSelectedVehicle(v)}
                          style={styles.btnSmall}
                        >
                          💬
                        </button>
                        <button
                          onClick={() => handleStartEdit(v)}
                          style={styles.btnEditSmall}
                        >
                          ✏️ Edit
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

            {/* ── STATS TAB ── */}
            {activeTab === "stats" && (
              <div>
                <h2 style={styles.sectionTitle}>📊 Statistics</h2>
                <div style={styles.statsGrid}>
                  <div
                    style={styles.statCard}
                    onClick={() => setActiveTab("admin")}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.transform = "scale(1.05)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.transform = "scale(1)")
                    }
                  >
                    <h2 style={styles.statNumber}>{stats.vehicles}</h2>
                    <p style={styles.statLabel}>🚗 Total Vehicles</p>
                    <p style={styles.statHint}>
                      Click to manage vehicles →
                    </p>
                  </div>

                  <div
                    style={styles.statCard}
                    onClick={() => setActiveTab("inquiries")}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.transform = "scale(1.05)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.transform = "scale(1)")
                    }
                  >
                    <h2 style={styles.statNumber}>{stats.messages}</h2>
                    <p style={styles.statLabel}>💬 Total Inquiries</p>
                    <p style={styles.statHint}>
                      Click to view inquiries →
                    </p>
                  </div>

                  <div
                    style={styles.statCard}
                    onClick={() => setActiveTab("inquiries")}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.transform = "scale(1.05)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.transform = "scale(1)")
                    }
                  >
                    <h2 style={styles.statNumber}>{threads.length}</h2>
                    <p style={styles.statLabel}>💬 Active Inquiries</p>
                    <p style={styles.statHint}>
                      Click to view inquiries →
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        // ═══════════ USER VIEW ═══════════
        <div>
          <h2 style={styles.sectionTitle}>💬 My Inquiries</h2>
          {threads.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyText}>
                You haven't messaged about any vehicles yet.
              </p>
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
                          justifyContent:
                            msg.role === "admin" ? "flex-end" : "flex-start",
                        }}
                      >
                        <span
                          style={{
                            ...styles.messageBubble,
                            ...(msg.role === "admin"
                              ? styles.messageBubbleAdmin
                              : styles.messageBubbleUser),
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

      {/* ───────── REPLY MODAL ───────── */}
      {selectedVehicle && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h2 style={styles.modalTitle}>
              💬 Messages: {selectedVehicle.name}
            </h2>
            <div style={styles.modalMessages}>
              {vehicleMessages.length === 0 && (
                <p style={styles.noMessages}>No messages yet.</p>
              )}
              {vehicleMessages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    ...styles.messageWrapper,
                    justifyContent:
                      msg.role === "admin" ? "flex-end" : "flex-start",
                  }}
                >
                  <span
                    style={{
                      ...styles.messageBubble,
                      ...(msg.role === "admin"
                        ? styles.messageBubbleAdmin
                        : styles.messageBubbleUser),
                    }}
                  >
                    <strong>{msg.sender}:</strong> {msg.text}
                  </span>
                </div>
              ))}
            </div>
            {userRole === "admin" && (
              <div style={styles.modalInputContainer}>
                <input
                  placeholder="Type your reply..."
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleReply()}
                  style={styles.modalInput}
                />
                <button onClick={handleReply} style={styles.btnPrimary}>
                  Reply
                </button>
              </div>
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

/* ────────────── STYLES ────────────── */
const styles = {
  container: {
    padding: "24px 28px",
    fontFamily: "'Segoe UI', Arial, sans-serif",
    maxWidth: "1300px",
    margin: "0 auto",
    background: "#faf6f0",
    minHeight: "100vh",
  },
  loadingContainer: {
    padding: "80px 20px",
    textAlign: "center",
    color: "#7a5c3a",
    background: "#faf6f0",
    minHeight: "100vh",
  },
  loadingText: {
    color: "#7a5c3a",
    fontWeight: "600",
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

  header: {
    background: "#fffdf8",
    padding: "20px 24px",
    borderRadius: "16px",
    border: "1px solid #efe6d3",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "12px",
    marginBottom: "20px",
  },
  headerLeft: {
    display: "flex",
    flexDirection: "column",
  },
  logo: {
    color: "#2b1a0a",
    margin: 0,
    fontSize: "22px",
    fontWeight: "700",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  logoMark: {
    color: "#b8860b",
    fontWeight: "300",
  },
  roleText: {
    margin: "6px 0 0 0",
    color: "#8a7a5c",
    fontSize: "13px",
  },
  headerActions: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
    flexWrap: "wrap",
    position: "relative",
  },
  userName: {
    color: "#7a5c3a",
    fontSize: "13px",
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
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
  },
  btnOutline: {
    padding: "9px 18px",
    background: "#fff",
    color: "#8b0000",
    border: "1.5px solid #d4a017",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
  },
  btnDanger: {
    padding: "9px 18px",
    background: "#8b0000",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
  },

  notificationWrapper: {
    position: "relative",
  },
  notificationBell: {
    position: "relative",
    fontSize: "22px",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "6px 10px",
  },
  notificationBadge: {
    position: "absolute",
    top: "-2px",
    right: "-2px",
    backgroundColor: "#8b0000",
    color: "#fff",
    borderRadius: "50%",
    padding: "2px 8px",
    fontSize: "11px",
    fontWeight: "700",
    minWidth: "18px",
    textAlign: "center",
  },
  notificationDropdown: {
    position: "absolute",
    top: "44px",
    right: "0",
    width: "360px",
    maxHeight: "420px",
    overflowY: "auto",
    backgroundColor: "#fffdf8",
    borderRadius: "12px",
    border: "1px solid #efe6d3",
    boxShadow: "0 8px 32px rgba(139,0,0,0.15)",
    zIndex: 1000,
    padding: "10px",
  },
  notificationHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px",
    borderBottom: "1px solid #efe6d3",
    fontWeight: "700",
    color: "#2b1a0a",
  },
  markAllRead: {
    background: "none",
    border: "none",
    color: "#8b0000",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "600",
  },
  noNotifications: {
    textAlign: "center",
    color: "#a08a63",
    padding: "20px",
  },
  notificationItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px",
    borderRadius: "8px",
    marginBottom: "6px",
    cursor: "pointer",
    transition: "background 0.2s",
    border: "1px solid transparent",
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    color: "#2b1a0a",
    fontSize: "14px",
  },
  notificationMessage: {
    margin: "5px 0",
    fontSize: "13px",
    color: "#6b5636",
  },
  notificationTime: {
    fontSize: "11px",
    color: "#a08a63",
  },
  unreadDot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    backgroundColor: "#8b0000",
    flexShrink: 0,
    marginLeft: "10px",
  },

  tabs: {
    display: "flex",
    gap: "10px",
    marginBottom: "20px",
    backgroundColor: "#fffdf8",
    padding: "8px",
    borderRadius: "12px",
    border: "1px solid #efe6d3",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    position: "relative",
    flexWrap: "wrap",
  },
  tabButton: {
    padding: "10px 22px",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "700",
    transition: "all 0.3s",
    position: "relative",
  },
  tabButtonActive: {
    background: "linear-gradient(135deg, #b8860b 0%, #8b0000 100%)",
    color: "#fff",
  },
  tabButtonInactive: {
    background: "transparent",
    color: "#6b5636",
  },
  tabBadge: {
    position: "absolute",
    top: "-6px",
    right: "-6px",
    background: "#8b0000",
    color: "#fff",
    borderRadius: "50%",
    padding: "2px 8px",
    fontSize: "11px",
    fontWeight: "700",
    minWidth: "20px",
    textAlign: "center",
  },

  sectionTitle: {
    marginTop: 0,
    marginBottom: "16px",
    color: "#2b1a0a",
    fontSize: "20px",
    fontWeight: "700",
  },
  subTitle: {
    color: "#2b1a0a",
    fontSize: "16px",
    fontWeight: "700",
    marginBottom: "12px",
  },
  noData: {
    color: "#a08a63",
    textAlign: "center",
    padding: "40px 20px",
    background: "#fffdf8",
    borderRadius: "12px",
    border: "1px dashed #efe6d3",
  },

  emptyState: {
    padding: "48px 24px",
    textAlign: "center",
    backgroundColor: "#fffdf8",
    borderRadius: "16px",
    border: "2px dashed #efe6d3",
  },
  emptyText: {
    fontSize: "16px",
    color: "#8a7a5c",
    marginBottom: "20px",
  },

  threadCard: {
    backgroundColor: "#fffdf8",
    borderRadius: "14px",
    padding: "20px",
    marginBottom: "18px",
    border: "1px solid #efe6d3",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },
  threadTitle: {
    color: "#8b0000",
    cursor: "pointer",
    marginTop: 0,
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "16px",
    fontWeight: "700",
  },
  viewLink: {
    fontSize: "12px",
    backgroundColor: "#f5ecd8",
    padding: "3px 12px",
    borderRadius: "12px",
    color: "#6b5636",
    fontWeight: "600",
  },
  messageContainer: {
    maxHeight: "260px",
    overflowY: "auto",
    border: "1px solid #efe6d3",
    borderRadius: "10px",
    padding: "14px",
    backgroundColor: "#faf6f0",
  },
  messageWrapper: {
    display: "flex",
    marginBottom: "10px",
  },
  messageBubble: {
    padding: "10px 16px",
    borderRadius: "16px",
    maxWidth: "80%",
    wordWrap: "break-word",
    fontSize: "14px",
    lineHeight: "1.5",
  },
  messageBubbleAdmin: {
    background: "linear-gradient(135deg, #b8860b 0%, #8b0000 100%)",
    color: "#fff",
  },
  messageBubbleUser: {
    background: "#f5ecd8",
    color: "#2b1a0a",
  },
  noMessages: {
    color: "#a08a63",
    textAlign: "center",
    padding: "20px",
    fontStyle: "italic",
  },
  replyButton: {
    marginTop: "12px",
    padding: "10px 18px",
    background: "linear-gradient(135deg, #b8860b 0%, #8b0000 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
  },

  formContainer: {
    backgroundColor: "#fffdf8",
    borderRadius: "14px",
    padding: "24px",
    marginBottom: "28px",
    border: "1px solid #efe6d3",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },
  formTitle: {
    marginTop: 0,
    color: "#2b1a0a",
    fontSize: "17px",
    fontWeight: "700",
  },
  editBanner: {
    background: "#fff3e0",
    border: "1px solid #d4a017",
    color: "#8b0000",
    padding: "10px 14px",
    borderRadius: "8px",
    fontSize: "13px",
    marginBottom: "16px",
    fontWeight: "600",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  },
  formInput: {
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1.5px solid #efe6d3",
    fontSize: "14px",
    color: "#2b1a0a",
    background: "#fff",
    outline: "none",
  },
  formTextarea: {
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1.5px solid #efe6d3",
    fontSize: "14px",
    color: "#2b1a0a",
    background: "#fff",
    outline: "none",
    gridColumn: "1 / -1",
    minHeight: "80px",
    resize: "vertical",
  },
  imageUpload: {
    marginTop: "18px",
    marginBottom: "18px",
  },
  imageLabel: {
    display: "block",
    marginBottom: "8px",
    fontWeight: "600",
    color: "#2b1a0a",
    fontSize: "14px",
  },
  fileInput: {
    padding: "8px",
    fontSize: "13px",
    color: "#6b5636",
  },
  imagePreview: {
    marginTop: "12px",
    width: "160px",
    borderRadius: "10px",
    border: "1.5px solid #d4a017",
  },
  imageNote: {
    fontSize: "12px",
    color: "#8a7a5c",
    marginTop: "6px",
    fontStyle: "italic",
  },
  formActions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },

  vehicleGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
    gap: "16px",
  },
  vehicleCard: {
    backgroundColor: "#fffdf8",
    borderRadius: "12px",
    padding: "16px",
    border: "1px solid #efe6d3",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },
  vehicleImage: {
    width: "100%",
    height: "150px",
    objectFit: "cover",
    borderRadius: "8px",
    marginBottom: "10px",
  },
  vehicleName: {
    margin: "6px 0",
    fontSize: "16px",
    fontWeight: "700",
    color: "#2b1a0a",
  },
  vehiclePrice: {
    margin: "4px 0",
    color: "#b8860b",
    fontWeight: "700",
    fontSize: "14px",
  },
  vehicleYear: {
    margin: "4px 0",
    fontSize: "13px",
    color: "#7a5c3a",
  },
  vehicleModel: {
    margin: "4px 0",
    fontSize: "12px",
    color: "#8b0000",
    fontWeight: "700",
  },
  vehicleActions: {
    display: "flex",
    gap: "6px",
    marginTop: "10px",
  },
  btnSmall: {
    flex: 1,
    padding: "8px 12px",
    background: "linear-gradient(135deg, #b8860b 0%, #8b0000 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "600",
  },
  btnEditSmall: {
    flex: 1,
    padding: "8px 12px",
    background: "#d4a017",
    color: "#2b1a0a",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "700",
  },
  btnDangerSmall: {
    flex: 1,
    padding: "8px 12px",
    background: "#8b0000",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "600",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: "20px",
  },
  statCard: {
    backgroundColor: "#fffdf8",
    borderRadius: "14px",
    padding: "28px",
    textAlign: "center",
    border: "1px solid #efe6d3",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    cursor: "pointer",
    transition: "transform 0.3s ease, box-shadow 0.3s ease",
  },
  statNumber: {
    margin: 0,
    color: "#b8860b",
    fontSize: "38px",
    fontWeight: "800",
  },
  statLabel: {
    margin: "10px 0 0 0",
    color: "#6b5636",
    fontWeight: "600",
  },
  statHint: {
    margin: "10px 0 0 0",
    color: "#a08a63",
    fontSize: "12px",
    fontStyle: "italic",
  },

  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(43,26,10,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "20px",
  },
  modalContent: {
    backgroundColor: "#fffdf8",
    padding: "28px",
    borderRadius: "16px",
    maxWidth: "620px",
    width: "100%",
    maxHeight: "85vh",
    overflow: "auto",
    border: "1px solid #efe6d3",
    boxShadow: "0 20px 60px rgba(139,0,0,0.3)",
  },
  modalTitle: {
    color: "#8b0000",
    marginTop: 0,
    fontSize: "20px",
    fontWeight: "700",
  },
  modalMessages: {
    border: "1px solid #efe6d3",
    borderRadius: "10px",
    padding: "16px",
    height: "280px",
    overflowY: "auto",
    backgroundColor: "#faf6f0",
    marginBottom: "14px",
  },
  modalInputContainer: {
    display: "flex",
    gap: "10px",
    marginBottom: "12px",
  },
  modalInput: {
    flex: 1,
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1.5px solid #efe6d3",
    fontSize: "14px",
    color: "#2b1a0a",
    background: "#fff",
    outline: "none",
  },
  modalClose: {
    width: "100%",
    padding: "12px",
    backgroundColor: "#6b5636",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
  },
};

export default Dashboard;