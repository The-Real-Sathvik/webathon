
import { auth, db } from "./config.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  getDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let currentUser;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    currentUser = user;
    await loadDashboard();
  }
});

async function loadDashboard() {
  // Update greeting
  try {
    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    if (userDoc.exists()) {
      const name = userDoc.data().name || "User";
      document.getElementById("userGreeting").innerText = `Hello, ${name}`;
    }
  } catch (e) {
    console.error("Error loading user details:", e);
  }

  await Promise.all([
    loadReceivedRequests(),
    loadSentRequests(),
    loadMatches()
  ]);
  if (window.lucide) window.lucide.createIcons();
}

async function loadReceivedRequests() {
  const container = document.getElementById("receivedRequests");
  if (!container) return;

  try {
    const q = query(
      collection(db, "requests"),
      where("toUserId", "==", currentUser.uid),
      where("status", "==", "pending")
    );

    const snap = await getDocs(q);
    container.innerHTML = "";

    if (snap.empty) {
      container.innerHTML = "<p>No pending requests.</p>";
      return;
    }

    for (const req of snap.docs) {
      const data = req.data();
      const userSnap = await getDoc(doc(db, "users", data.fromUserId));

      if (!userSnap.exists()) continue;
      const user = userSnap.data();

      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <div class="card-left">
            <div class="card-avatar">
                 <img src="${user.photoURL || 'images/avatar2.jpg'}" alt="${user.name}" style="object-fit: cover;">
            </div>
            <div class="card-info">
                <h3>${user.name}</h3>
                <p>Availability: ${user.availability || "Unknown"}</p>
            </div>
        </div>
        <div class="card-middle">
            <div class="skills-container">
            ${(user.skills || []).map(s => `<span class="skill-tag">${s}</span>`).join("")}
            </div>
        </div>
        <div class="card-right">
             <div class="actions-container">
                <button class="btn btn-reject" onclick="respond('${req.id}', 'rejected')">Reject</button>
                <button class="btn btn-accept" onclick="respond('${req.id}', 'accepted')">Accept</button>
            </div>
        </div>
        `;
      container.appendChild(card);
    }
  } catch (err) {
    console.error("Error loading received requests:", err);
    container.innerHTML = "<p>Error loading requests.</p>";
  }
}

async function loadSentRequests() {
  const container = document.getElementById("sentRequests");
  if (!container) return;

  try {
    const q = query(
      collection(db, "requests"),
      where("fromUserId", "==", currentUser.uid)
    );

    const snap = await getDocs(q);
    container.innerHTML = "";

    if (snap.empty) {
      container.innerHTML = "<p>No sent requests.</p>";
      return;
    }

    for (const req of snap.docs) {
      const data = req.data();
      const userSnap = await getDoc(doc(db, "users", data.toUserId));

      if (!userSnap.exists()) continue;
      const user = userSnap.data();

      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <div class="card-left">
            <div class="card-avatar">
                 <img src="/images/default.jpg" alt="${user.name}">
            </div>
            <div class="card-info">
                <h3>${user.name}</h3>
                <p>Availability: ${user.availability || "Unknown"}</p>
            </div>
        </div>
        <div class="card-middle">
            <div class="skills-container">
                ${(user.skills || []).map(s => `<span class="skill-tag">${s}</span>`).join("")}
            </div>
        </div>
        <div class="card-right">
             <span class="status-badge ${data.status === 'rejected' ? 'rejected' : ''}">${data.status.charAt(0).toUpperCase() + data.status.slice(1)}</span>
        </div>
        `;
      container.appendChild(card);
    }
  } catch (err) {
    console.error("Error loading sent requests:", err);
    container.innerHTML = "<p>Error loading requests.</p>";
  }
}

window.respond = async function (requestId, status) {
  try {
    await updateDoc(doc(db, "requests", requestId), { status });
    await loadDashboard(); // Reload all to update UI
  } catch (err) {
    console.error("Error updating request:", err);
    alert("Failed to update request.");
  }
};

async function loadMatches() {
  const container = document.getElementById("matches");
  if (!container) return;

  try {
    // We need to query twice because Firestore OR queries have limitations or need composite indexes
    // 1. Requests I sent that were accepted
    const q1 = query(
      collection(db, "requests"),
      where("fromUserId", "==", currentUser.uid),
      where("status", "==", "accepted")
    );

    // 2. Requests I received that were accepted
    const q2 = query(
      collection(db, "requests"),
      where("toUserId", "==", currentUser.uid),
      where("status", "==", "accepted")
    );

    const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

    container.innerHTML = "";

    // Combine docs and deduplicate if necessary (unlikely with this logic but good practice)
    const matches = [...snap1.docs, ...snap2.docs];

    if (matches.length === 0) {
      container.innerHTML = ""; // Header handles the empty state text usually
      return;
    }

    for (const req of matches) {
      const data = req.data();
      let otherUserId = data.fromUserId === currentUser.uid ? data.toUserId : data.fromUserId;

      const userSnap = await getDoc(doc(db, "users", otherUserId));
      if (!userSnap.exists()) continue;
      const user = userSnap.data();

      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <div class="card-left">
            <div class="card-avatar">
                <img src="${user.photoURL || 'images/avatar2.jpg'}" alt="${user.name}">
            </div>
            <div class="card-info">
                <h3>${user.name}</h3>
                <p>Availability: ${user.availability || "Unknown"}</p>
            </div>
        </div>
        <div class="card-middle">
            <div class="skills-container">
             ${(user.skills || []).map(s => `<span class="skill-tag">${s}</span>`).join("")}
            </div>
        </div>
        <div class="card-right">
            <div class="contact-box">
            <div class="contact-label">Contact Details</div>
            ${user.contact?.mobile ? `<div class="contact-item"><i data-lucide="phone" style="width:14px"></i> ${user.contact.mobile}</div>` : ''}
            ${user.contact?.linkedin ? `<div class="contact-item"><a href="${user.contact.linkedin}" target="_blank"><i data-lucide="linkedin" style="width:14px"></i> LinkedIn</a></div>` : ''}
            </div>
        </div>
        `;
      container.appendChild(card);
    }
  } catch (err) {
    console.error("Error loading matches:", err);
  }
}
