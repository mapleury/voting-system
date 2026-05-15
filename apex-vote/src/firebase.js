import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
const firebaseConfig = {
  apiKey: "AIzaSyCZPuk0FVhjOm2Uv5Vt4OM2V-ko0oXs0pA",
  authDomain: "vote-system-75c9c.firebaseapp.com",
  projectId: "vote-system-75c9c",
  storageBucket: "vote-system-75c9c.firebasestorage.app",
  messagingSenderId: "5122522206",
  appId: "1:5122522206:web:38c4b630126755945ac8cf",
  measurementId: "G-4S0WQZHKDR"
};


const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);