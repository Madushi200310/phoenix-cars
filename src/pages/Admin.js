import React, { useEffect, useState } from "react";
import { collection, addDoc, getDocs, deleteDoc, doc, onSnapshot, query, orderBy } from "firebase/firestore";
import { db, CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from "../firebase";

function Admin() {
  const [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState({ name: "", price: "", year: "", mileage: "", color: "", description: "" });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState("");
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    fetchVehicles();
  }, []);

  useEffect(() => {
    if (!selectedVehicle) return;
    const q = query(collection(db, "vehicles", selectedVehicle.id, "messages"), orderBy("time"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [selectedVehicle]);

  const fetchVehicles = async () => {
    const querySnapshot = await getDocs(collection(db, "vehicles"));
    setVehicles(querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  };

  const handleLogin = () => {
    if (password === "phoenix123") setLoggedIn(true);
    else alert("Wrong password!");
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadImageToCloudinary = async () => {
    const formData = new FormData();
    formData.append("file", imageFile);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: "POST",
      body: formData,
    });
    const data = await response.json();
    return data.secure_url;
  };

  const handleAdd = async () => {
    if (!form.name.trim()) return alert("Please enter vehicle name!");
    if (!imageFile) return alert("Please select an image!");
    setUploading(true);
    try {
      const imageUrl = await uploadImageToCloudinary();
      await addDoc(collection(db, "vehicles"), { ...form, image: imageUrl });
      setForm({ name: "", price: "", year: "", mileage: "", color: "", description: "" });
      setImageFile(null);
      setImagePreview(null);
      fetchVehicles();
    } catch (error) {
      alert("Error adding vehicle. Please try again.");
    }
    setUploading(false);
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, "vehicles", id));
    setVehicles(vehicles.filter((v) => v.id !== id));
  };

  const handleReply = async () => {
    if (!reply.trim()) return;
    await addDoc(collection(db, "vehicles", selectedVehicle.id, "messages"), {
      text: reply,
      sender: "Team Phoenix",
      role: "admin",
      time: new Date(),
    });
    setReply("");
  };

  if (!loggedIn) return (
    <div style={{ padding: "40px", fontFamily: "Arial", textAlign: "center" }}>
      <h1 style={{ color: "#e25822" }}>🔥 Phoenix Admin</h1>
      <input type="password" placeholder="Enter admin password" value={password} onChange={(e) => setPassword(e.target.value)}
        style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ccc", marginRight: "10px" }} />
      <button onClick={handleLogin} style={{ padding: "10px 20px", background: "#e25822", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}>Login</button>
    </div>
  );

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1 style={{ color: "#e25822" }}>🔥 Phoenix Admin Panel</h1>

      <h2>Add New Vehicle</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "20px" }}>
        {["name", "price", "year", "mileage", "color"].map((field) => (
          <input key={field} placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
            value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })}
            style={{ padding: "8px", borderRadius: "8px", border: "1px solid #ccc", width: "180px" }} />
        ))}
        <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
          style={{ padding: "8px", borderRadius: "8px", border: "1px solid #ccc", width: "380px" }} />

        <div style={{ width: "100%" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Upload Car Image:</label>
          <input type="file" accept="image/*" onChange={handleImageChange}
            style={{ padding: "8px", borderRadius: "8px", border: "1px solid #ccc" }} />
          {imagePreview && (
            <img src={imagePreview} alt="Preview" style={{ marginTop: "10px", width: "200px", borderRadius: "8px" }} />
          )}
        </div>

        <button onClick={handleAdd} disabled={uploading}
          style={{ padding: "10px 20px", background: uploading ? "#aaa" : "#e25822", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}>
          {uploading ? "Uploading..." : "Add Vehicle"}
        </button>
      </div>

      <h2>Vehicle List</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "15px", marginBottom: "30px" }}>
        {vehicles.map((v) => (
          <div key={v.id} style={{ border: "1px solid #ddd", borderRadius: "10px", padding: "15px", width: "220px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            {v.image && <img src={v.image} alt={v.name} style={{ width: "100%", borderRadius: "8px", marginBottom: "8px" }} />}
            <h3>{v.name}</h3>
            <p>💰 ${v.price}</p>
            <p>📅 {v.year}</p>
            <button onClick={() => setSelectedVehicle(v)} style={{ marginRight: "8px", padding: "6px 12px", background: "#333", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}>Messages</button>
            <button onClick={() => handleDelete(v.id)} style={{ padding: "6px 12px", background: "#cc0000", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}>Delete</button>
          </div>
        ))}
      </div>

      {selectedVehicle && (
        <div>
          <h2>💬 Messages for: {selectedVehicle.name}</h2>
          <div style={{ border: "1px solid #ddd", borderRadius: "10px", padding: "15px", height: "250px", overflowY: "auto", background: "#f9f9f9", marginBottom: "10px" }}>
            {messages.length === 0 && <p style={{ color: "#aaa" }}>No messages yet.</p>}
            {messages.map((msg) => (
              <div key={msg.id} style={{ marginBottom: "10px", textAlign: msg.role === "admin" ? "right" : "left" }}>
                <span style={{ background: msg.role === "admin" ? "#e25822" : "#eee", color: msg.role === "admin" ? "#fff" : "#000", padding: "8px 12px", borderRadius: "15px", display: "inline-block" }}>
                  <strong>{msg.sender}:</strong> {msg.text}
                </span>
              </div>
            ))}
          </div>
          <input placeholder="Type your reply..." value={reply} onChange={(e) => setReply(e.target.value)}
            style={{ padding: "8px", width: "300px", borderRadius: "8px", border: "1px solid #ccc" }} />
          <button onClick={handleReply} style={{ padding: "8px 16px", marginLeft: "10px", background: "#e25822", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}>Reply</button>
        </div>
      )}
    </div>
  );
}

export default Admin;