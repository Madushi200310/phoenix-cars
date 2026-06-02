import React, { useEffect, useState } from "react";
import { doc, getDoc, collection, addDoc, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { useParams, useNavigate } from "react-router-dom";

function VehicleDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [name, setName] = useState("");

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
    return () => unsubscribe();
  }, [id]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !name.trim()) return;
    await addDoc(collection(db, "vehicles", id, "messages"), {
      text: newMessage,
      sender: name,
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
      <input
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ padding: "8px", marginRight: "10px", borderRadius: "8px", border: "1px solid #ccc" }}
      />
      <input
        placeholder="Type a message..."
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        style={{ padding: "8px", width: "300px", borderRadius: "8px", border: "1px solid #ccc" }}
      />
      <button
        onClick={sendMessage}
        style={{ padding: "8px 16px", marginLeft: "10px", background: "#e25822", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}
      >Send</button>
    </div>
  );
}

export default VehicleDetails;