
import { auth, db } from "./config.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, getDocs, query, where, addDoc } from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let currentUser;
let sentRequests = new Set();

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    currentUser = user;
    await loadSentRequests();
    loadPartners();
  }
});

async function loadSentRequests() {
  try {
    const q = query(
      collection(db, "requests"),
      where("fromUserId", "==", currentUser.uid)
    );

    const snap = await getDocs(q);
    snap.forEach(doc => {
      sentRequests.add(doc.data().toUserId);
    });
  } catch (error) {
    console.error("Error loading requests:", error);
  }
}

async function loadPartners() {
  try {
    const usersRef = collection(db, "users");
    // Get all users (filtering by ID in client side is easier/cheaper for small datasets)
    const snapshot = await getDocs(usersRef);
    const container = document.querySelector(".partners-grid");

    if (!container) return;
    container.innerHTML = "";

    snapshot.forEach(docSnap => {
      const user = docSnap.data();
      const userId = docSnap.id;

      if (userId === currentUser.uid) return;

      const card = document.createElement("div");
      card.className = "partner-card";

      const isRequested = sentRequests.has(userId);

      card.innerHTML = `
        <div class="card-header">
          <div class="partner-avatar">
            <img src="${user.photoURL || 'images/avatar1.jpg'}" alt="${user.name}" style="object-fit:cover;"> 
          </div>
          <div class="partner-info">
            <h3>${user.name}</h3>
            <p>Availability: ${user.availability || "Unknown"}</p>
          </div>
        </div>
        <div class="skills-list">
          ${(user.skills || []).map(skill => `<span class="skill-tag">${skill}</span>`).join("")}
        </div>
        <div class="card-links">
           ${(user.projects || []).map(p => {
        const url = typeof p === 'string' ? p : p.url;
        return `<a href="${url}" target="_blank" class="card-link"><i data-lucide="globe"></i> Project</a>`
      }).join("")}
        </div>
        <div class="card-actions">
          <button 
            class="${isRequested ? 'btn-sent' : 'btn-connect'}"
            ${isRequested ? "disabled" : ""}
            onclick="sendRequest('${userId}')">
            ${isRequested ? "Request Sent" : "Connect"}
          </button>
        </div>
      `;

      container.appendChild(card);
    });

    if (window.lucide) window.lucide.createIcons();

  } catch (error) {
    console.error("Error loading partners:", error);
  }
}

window.sendRequest = async function (toUserId) {
  if (sentRequests.has(toUserId)) return;

  try {
    const btn = event.target;
    btn.innerText = "Sending...";
    btn.disabled = true;

    await addDoc(collection(db, "requests"), {
      fromUserId: currentUser.uid,
      toUserId,
      status: "pending",
      createdAt: new Date()
    });

    sentRequests.add(toUserId);

    // Update button UI
    btn.className = "btn-sent";
    btn.innerText = "Request Sent";
  } catch (error) {
    console.error("Error sending request:", error);
    alert("Failed to send request.");
    const btn = event.target;
    btn.innerText = "Connect";
    btn.disabled = false;
  }
};