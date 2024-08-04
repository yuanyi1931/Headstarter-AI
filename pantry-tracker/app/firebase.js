// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore} from "firebase/firestore";
import { getStorage } from 'firebase/storage';
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDKrsiTae5tyE_0ERgfaHQNZ8qlqVyC3lc",
  authDomain: "expense-tracker-eaae9.firebaseapp.com",
  projectId: "expense-tracker-eaae9",
  storageBucket: "expense-tracker-eaae9.appspot.com",
  messagingSenderId: "946193543519",
  appId: "1:946193543519:web:aa27bb6ae08651864c06ea"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

export { db, storage, auth };

