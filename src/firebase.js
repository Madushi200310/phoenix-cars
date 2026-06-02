import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBUPhnmaQ6qbDR-nGLZ4cS8iVb3M8aUOPs",
  authDomain: "planning-with-ai-5eb0b.firebaseapp.com",
  projectId: "planning-with-ai-5eb0b",
  storageBucket: "planning-with-ai-5eb0b.firebasestorage.app",
  messagingSenderId: "90001613029",
  appId: "1:90001613029:web:1dbfd9486e3625aa46b40c"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);