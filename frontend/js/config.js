

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js"; // <--- Add this

const firebaseConfig = {
  apiKey: "AIzaSyDJlfp1oZZc_JNqIIZTmXlaAZXjIyFhaPQ",
  authDomain: "collabx-007.firebaseapp.com",
  projectId: "collabx-007",
  storageBucket: "collabx-007.firebasestorage.app",
  messagingSenderId: "486543553978",
  appId: "1:486543553978:web:c8910eb7e1df07292f1983"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app); // <--- Initialize this

export { auth, db, storage }; // <--- Export storage