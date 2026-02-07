
import { auth, db } from "./config.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, updateDoc } from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let currentUser;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    currentUser = user;
    loadProfile();
  }
});

async function loadProfile() {
  const ref = doc(db, "users", currentUser.uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const data = snap.data();

    // Update DOM elements safely
    const setText = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.innerText = val;
    };

    setText("name", data.name || "Anonymous");
    setText("bio", data.bio || "No bio available");
    setText("availability", data.availability || "Unknown");

    // Update Avatar
    if (data.photoURL) {
      document.getElementById("avatar").src = data.photoURL;
    }

    // Skills
    const skillsContainer = document.getElementById("skills");
    if (skillsContainer && data.skills) {
      skillsContainer.innerHTML = data.skills.map(s => `<span class="skill-tag">${s}</span>`).join("");
    }

    // Projects
    const projectsContainer = document.getElementById("projects");
    if (projectsContainer && data.projects) {
      projectsContainer.innerHTML = data.projects.map(p => {
        const url = typeof p === 'string' ? p : p.url;
        const abstract = typeof p === 'string' ? '' : p.abstract;
        return `
            <div class="project-card">
                <div class="project-header">
                    <span class="project-domain">Project</span>
                    <a href="${url}" target="_blank" class="project-link">View</a>
                </div>
                <p class="project-abstract">${abstract || "No description"}</p>
            </div>
        `}).join("");
    }

    // Contact
    const contactContainer = document.getElementById("contact");
    if (contactContainer && data.contact) {
      contactContainer.innerHTML = `
            ${data.contact.mobile ? `<div class="contact-item"><i data-lucide="phone"></i> ${data.contact.mobile}</div>` : ''}
            ${data.contact.linkedin ? `<div class="contact-item"><i data-lucide="linkedin"></i> <a href="${data.contact.linkedin}" target="_blank">LinkedIn</a></div>` : ''}
        `;
      // Re-render icons
      if (window.lucide) window.lucide.createIcons();
    }
  }
}