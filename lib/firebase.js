// lib/firebase.js
import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
<<<<<<< HEAD
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
	authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
	projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
	storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
	appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
=======

const firebaseConfig = {
  apiKey: "AIzaSyDTNT27c1I0GTEzKyGeWtE3d7flcuLCIVQ",
  authDomain: "attendance-app-7cb16.firebaseapp.com",
  projectId: "attendance-app-7cb16",
  storageBucket: "attendance-app-7cb16.appspot.com", // fix typo: should be .appspot.com
  messagingSenderId: "824414947498",
  appId: "1:824414947498:web:ad39bf698c70f7540e68d3",
>>>>>>> c39aa9d3570ced9499a5f3473f6b937ca0c693a8
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
<<<<<<< HEAD
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { db, auth, googleProvider };
=======

export { db };
>>>>>>> c39aa9d3570ced9499a5f3473f6b937ca0c693a8
