import { auth, db } from "./config.js";
import { createUserWithEmailAndPassword } from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc } from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.getElementById("signupForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirm-password").value;

  if (password !== confirmPassword) {
    alert("Passwords do not match");
    return;
  }

  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db, "users", userCred.user.uid), {
      name,
      email,
      bio: "",
      skills: [],
      availability: "",
      projects: [],
      contact: {
        mobile: "",
        linkedin: ""
      },
      isSuspended: false,
      warningCount: 0,
      createdAt: new Date()
    });

    alert("Account created successfully");
    window.location.href = "login.html";
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
});