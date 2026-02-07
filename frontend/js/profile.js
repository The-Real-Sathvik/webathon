import { auth, db } from "./config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let currentUser;
let selectedSkills = new Set();
let profilePhotoBase64 = null; // Store Base64 string

// --- 1. AUTH & INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      await loadProfileData(user.uid);
    } else {
      window.location.href = "login.html";
    }
  });
});

// --- 2. LOAD EXISTING DATA ---
async function loadProfileData(uid) {
  try {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();

      // Basic Fields
      document.getElementById("fullname").value = data.name || "";
      document.getElementById("bio").value = data.bio || "";
      document.getElementById("availability").value = data.availability || "";

      // Profile Image
      if (data.photoURL) {
        document.getElementById("imagePreview").src = data.photoURL;
      }

      // Contact
      if (data.contact) {
        document.getElementById("mobile").value = data.contact.mobile || "";
        document.getElementById("linkedin").value = data.contact.linkedin || "";
      }

      // Skills
      if (data.skills && Array.isArray(data.skills)) {
        data.skills.forEach(skill => selectedSkills.add(skill));
        renderSkills();
      }

      // Projects
      const projectList = document.getElementById("projectList");
      projectList.innerHTML = "";
      if (data.projects && data.projects.length > 0) {
        data.projects.forEach(proj => addProjectRow(proj.url, proj.abstract));
      } else {
        addProjectRow();
      }
    }
  } catch (error) {
    console.error("Error loading profile:", error);
  }
}

// --- 3. IMAGE PREVIEW LOGIC ---
const profileImageInput = document.getElementById('profileImage');
const imagePreview = document.getElementById('imagePreview');

if (profileImageInput) {
  profileImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check size (limit to ~500KB)
      if (file.size > 500 * 1024) {
        alert("Image is too large. Please select an image under 500KB.");
        return;
      }

      const reader = new FileReader();
      reader.onload = function (e) {
        const base64String = e.target.result;
        imagePreview.src = base64String;
        profilePhotoBase64 = base64String;
      };
      reader.readAsDataURL(file);
    }
  });
}

// --- 4. SKILLS SECTION LOGIC ---
const skillInput = document.getElementById('skillInput');
const skillsContainer = document.getElementById('skillsContainer');
const suggestedSkillsContainer = document.getElementById('suggestedSkills');

function renderSkills() {
  skillsContainer.innerHTML = '';
  selectedSkills.forEach(skill => {
    const skillTag = document.createElement('span');
    skillTag.className = 'skill-tag';
    skillTag.innerHTML = `${skill} <button type="button" class="remove-skill-btn">&times;</button>`;

    skillTag.querySelector('.remove-skill-btn').addEventListener('click', () => {
      removeSkill(skill);
    });
    skillsContainer.appendChild(skillTag);
  });
  updateSuggestedVisuals();
}

function updateSuggestedVisuals() {
  const pills = suggestedSkillsContainer.querySelectorAll('.suggested-skill-pill');
  pills.forEach(pill => {
    const skillName = pill.getAttribute('data-skill');
    if (selectedSkills.has(skillName)) {
      pill.classList.add('added');
    } else {
      pill.classList.remove('added');
    }
  });
}

function addSkill(skill) {
  const cleanSkill = skill.trim();
  if (cleanSkill && !selectedSkills.has(cleanSkill)) {
    selectedSkills.add(cleanSkill);
    renderSkills();
  }
}

function removeSkill(skill) {
  selectedSkills.delete(skill);
  renderSkills();
}

if (skillInput) {
  skillInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkill(skillInput.value);
      skillInput.value = '';
    }
  });
}

if (suggestedSkillsContainer) {
  suggestedSkillsContainer.addEventListener('click', (e) => {
    const button = e.target.closest('.suggested-skill-pill');
    if (button) {
      const skillName = button.getAttribute('data-skill');
      if (selectedSkills.has(skillName)) {
        removeSkill(skillName);
      } else {
        addSkill(skillName);
      }
    }
  });
}

// --- 5. PROJECTS SECTION LOGIC ---
const projectList = document.getElementById("projectList");
const addProjectBtn = document.getElementById("addProjectBtn");

function addProjectRow(url = "", abstract = "") {
  const div = document.createElement("div");
  div.className = "project-item";
  div.innerHTML = `
    <div class="project-fields">
      <input type="url" name="projectUrl[]" placeholder="GitHub Repo / Live Project Link" value="${url}">
      <textarea name="projectAbstract[]" placeholder="Brief description of the project">${abstract}</textarea>
    </div>
    <button type="button" class="remove-button" title="Remove Project">&times;</button>
  `;
  div.querySelector(".remove-button").addEventListener("click", () => div.remove());
  projectList.appendChild(div);
}

if (addProjectBtn) {
  addProjectBtn.addEventListener("click", () => addProjectRow());
}

// --- 6. FORM SUBMISSION & UPLOAD ---
const profileForm = document.getElementById("profileForm");

if (profileForm) {
  profileForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitBtn = profileForm.querySelector("button[type='submit']");
    const originalText = submitBtn.innerText;
    submitBtn.innerText = "Saving...";
    submitBtn.disabled = true;

    try {
      // Use Base64 string if available, otherwise keep existing URL
      let finalPhotoURL = profilePhotoBase64 || imagePreview.src;

      // Filter out local blob URLs if they somehow persist (though createObjectURL was removed)
      // And filter out the default avatar if we don't want to save it as the user's custom photo
      if (finalPhotoURL && finalPhotoURL.startsWith("blob:")) {
        finalPhotoURL = null; // Should not happen with FileReader, but good safety
      }

      // 2. Collect Projects
      const projectUrls = document.getElementsByName("projectUrl[]");
      const projectAbstracts = document.getElementsByName("projectAbstract[]");
      const projects = [];
      for (let i = 0; i < projectUrls.length; i++) {
        const url = projectUrls[i].value.trim();
        const abstract = projectAbstracts[i].value.trim();
        if (url || abstract) projects.push({ url, abstract });
      }

      // 3. Prepare Data Object
      const profileData = {
        name: document.getElementById("fullname").value,
        bio: document.getElementById("bio").value,
        availability: document.getElementById("availability").value,
        skills: Array.from(selectedSkills),
        projects: projects,
        photoURL: finalPhotoURL, // Save Base64 string or existing URL
        contact: {
          mobile: document.getElementById("mobile").value,
          linkedin: document.getElementById("linkedin").value
        },
        updatedAt: new Date()
      };

      // 4. Save to Firestore
      await setDoc(doc(db, "users", currentUser.uid), profileData, { merge: true });

      alert("Profile saved successfully!");
      window.location.href = "myprofile.html";

    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Failed to save profile: " + error.message);
      submitBtn.innerText = originalText;
      submitBtn.disabled = false;
    }
  });
}