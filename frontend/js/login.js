import { auth } from "./config.js";
import { signInWithEmailAndPassword, signOut } from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";


// Clear any existing auth state on load
signOut(auth).catch(() => {});

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = "dashboard.html";
  } catch (err) {
    alert("Invalid email or password");
  }
});