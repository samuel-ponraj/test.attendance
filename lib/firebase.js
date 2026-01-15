// lib/firebase.js
import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDTNT27c1I0GTEzKyGeWtE3d7flcuLCIVQ",
  authDomain: "attendance-app-7cb16.firebaseapp.com",
  projectId: "attendance-app-7cb16",
  storageBucket: "attendance-app-7cb16.appspot.com", // fix typo: should be .appspot.com
  messagingSenderId: "824414947498",
  appId: "1:824414947498:web:ad39bf698c70f7540e68d3",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export { db };
