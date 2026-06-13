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

  useEffect(() => {
    const fetchVehicle = async () => {
      const docRef = doc(db, "vehicles", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) setVehicle({ id: docSnap.id, ...docSnap.data() });
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

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    if (!user) return navigate("/login");
    await addDoc(collection(db, "vehicles", id, "messages"), {
      text: newMessage,
      sender: user.displayName || user.email,
      role: "user",
      time: new Date(),
    });
    setNewMessage("");
  };

  if (!vehicle) return <p style={{ padding: "20px" }}>Loading...</p>;

  return (
    <div style={{ padding: "20px", fontFamily: "Arial", maxWidth: "800px", margin: "0 auto" }}>
      <button onClick={() => navigate("/")} style={{ marginBottom: "15px", padding: "8px 16px", cursor: "pointer" }}>← Back</button>
      {vehicle.image && <img src={vehicle.image} alt={vehicle.name} style={{ width: "100%", borderRadius: "10px" }} />}
      <h1 style={{ color: "#e25822" }}>{vehicle.name}</h1>
      <p><strong>Price:</strong> ${vehicle.price}</p>
      <p><strong>Year:</strong> {vehicle.year}</p>
      <p><strong>Mileage:</strong> {vehicle.mileage} km</p>
      <p><strong>Color:</strong> {vehicle.color}</p>
      <p><strong>Description:</strong> {vehicle.description}</p>

      <h2 style={{ marginTop: "30px" }}>💬 Chat with our team</h2>

      {!user && (
        <div style={{ background: "#fff3e0", padding: "15px", borderRadius: "8px", marginBottom: "15px" }}>
          <p>Please <span onClick={() => navigate("/login")} style={{ color: "#e25822", cursor: "pointer", fontWeight: "bold" }}>login</span> or <span onClick={() => navigate("/register")} style={{ color: "#e25822", cursor: "pointer", fontWeight: "bold" }}>register</span> to chat with our team.</p>
        </div>
      )}

      <div style={{ border: "1px solid #ddd", borderRadius: "10px", padding: "15px", height: "250px", overflowY: "auto", marginBottom: "10px", background: "#f9f9f9" }}>
        {messages.length === 0 && <p style={{ color: "#aaa" }}>No messages yet. Ask us anything!</p>}
        {messages.map((msg) => (
          <div key={msg.id} style={{ marginBottom: "10px", textAlign: msg.role === "admin" ? "right" : "left" }}>
            <span style={{ background: msg.role === "admin" ? "#e25822" : "#eee", color: msg.role === "admin" ? "#fff" : "#000", padding: "8px 12px", borderRadius: "15px", display: "inline-block" }}>
              <strong>{msg.sender}:</strong> {msg.text}
            </span>
          </div>
        ))}
      </div>

      {user && (
        <div style={{ display: "flex", gap: "10px" }}>
          <input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "1px solid #ccc" }}
          />
          <button
            onClick={sendMessage}
            style={{ padding: "8px 16px", background: "#e25822", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}
          >Send</button>
        </div>
      )}
    </div>
  );
}

export default VehicleDetails;