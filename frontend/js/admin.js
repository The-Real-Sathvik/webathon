
import { auth, db } from "./config.js";
import { onAuthStateChanged, signOut } from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let currentUser = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    // Verify Admin Status
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists() && userDoc.data().isAdmin) {
      currentUser = user;
      document.getElementById("adminName").innerText = userDoc.data().name || "Admin";
      loadDashboard();
    } else {
      alert("Access Denied: You are not an administrator.");
      window.location.href = "dashboard.html";
    }
  }
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  signOut(auth).then(() => {
    window.location.href = "login.html";
  });
});

window.switchTab = function (tabName) {
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

  const tabBtn = document.querySelector(`.tab[onclick="switchTab('${tabName}')"]`);
  const tabContent = document.getElementById(tabName);

  if (tabBtn) tabBtn.classList.add("active");
  if (tabContent) tabContent.classList.add("active");
};

async function loadDashboard() {
  loadStats();
  loadReports(); // Default tab
  loadUsers();
}

async function loadStats() {
  try {
    const usersSnap = await getDocs(collection(db, "users"));
    const reportsSnap = await getDocs(collection(db, "reports")); // Assuming 'reports' collection exists

    document.getElementById("totalUsers").innerText = usersSnap.size;
    document.getElementById("activeReports").innerText = reportsSnap.size; // Simplification
  } catch (e) {
    console.error("Error loading stats:", e);
  }
}

// Global functions for HTML access
window.loadUsers = async function () {
  const tbody = document.querySelector("#usersTable tbody");
  tbody.innerHTML = "<tr><td colspan='6'>Loading...</td></tr>";

  try {
    const snap = await getDocs(collection(db, "users"));
    tbody.innerHTML = "";

    snap.forEach(docSnap => {
      const user = docSnap.data();
      const tr = document.createElement("tr");

      // Status Logic (Mock logic based on fields, defaulting to Active)
      let status = "Active";
      let statusClass = "status-active";
      if (user.isSuspended) { status = "Suspended"; statusClass = "status-suspended"; }
      if (user.isBanned) { status = "Banned"; statusClass = "status-banned"; }

      tr.innerHTML = `
                <td>
                    <div style="font-weight: 500">${user.name || "Unknown"}</div>
                    <div style="font-size: 12px; color: var(--color-text-secondary)">${docSnap.id}</div>
                </td>
                <td>${user.email || "N/A"}</td>
                <td><span class="${statusClass}">${status}</span></td>
                <td>${(user.projects || []).length} Projects</td>
                <td>${user.warnings || 0}</td>
                <td>
                    <div class="actions">
                        <button class="btn-action btn-warn" onclick="warnUser('${docSnap.id}')">Warn</button>
                        <button class="btn-action btn-suspend" onclick="suspendUser('${docSnap.id}')">Suspend</button>
                        <button class="btn-action btn-ban" onclick="deleteUser('${docSnap.id}')">Delete</button>
                    </div>
                </td>
            `;
      tbody.appendChild(tr);
    });
  } catch (e) {
    console.error("Error loading users:", e);
    tbody.innerHTML = "<tr><td colspan='6'>Error loading users. Check console.</td></tr>";
  }
};

window.loadReports = async function () {
  const tbody = document.querySelector("#reportsTable tbody");
  tbody.innerHTML = "<tr><td colspan='7'>Loading...</td></tr>";

  try {
    // Mock reports for now if collection empty, else fetch
    const snap = await getDocs(collection(db, "reports"));

    if (snap.empty) {
      tbody.innerHTML = "<tr><td colspan='7' style='text-align:center; color: var(--color-text-secondary)'>No reports found.</td></tr>";
      return;
    }

    tbody.innerHTML = "";
    snap.forEach(docSnap => {
      const report = docSnap.data();
      const tr = document.createElement("tr");

      tr.innerHTML = `
                <td>${report.targetUserName || report.targetUserId}</td>
                <td>${report.reporterName || "Anonymous"}</td>
                <td>${report.reason}</td>
                <td><span class="badge badge-pending">${report.status || "Pending"}</span></td>
                <td>${report.actionTaken || "None"}</td>
                <td>${report.createdAt ? new Date(report.createdAt.seconds * 1000).toLocaleDateString() : "N/A"}</td>
                <td>
                    <div class="actions">
                        <button class="btn-action btn-dismiss" onclick="dismissReport('${docSnap.id}')">Dismiss</button>
                        <button class="btn-action btn-ban" onclick="banUserFromReport('${report.targetUserId}', '${docSnap.id}')">Ban User</button>
                    </div>
                </td>
            `;
      tbody.appendChild(tr);
    });
  } catch (e) {
    console.error("Error loading reports:", e);
    tbody.innerHTML = "<tr><td colspan='7'>Error loading reports.</td></tr>";
  }
};

// Actions
window.warnUser = async function (uid) {
  if (!confirm("Send warning to this user?")) return;
  try {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    const currentWarnings = userSnap.data().warnings || 0;

    await updateDoc(userRef, { warnings: currentWarnings + 1 });
    alert("User warned.");
    loadUsers();
  } catch (e) {
    console.error(e);
    alert("Failed to warn user.");
  }
};

window.suspendUser = async function (uid) {
  if (!confirm("Suspend this user? They won't be able to login.")) return;
  try {
    await updateDoc(doc(db, "users", uid), { isSuspended: true });
    alert("User suspended.");
    loadUsers();
  } catch (e) {
    console.error(e);
    alert("Failed to suspend user.");
  }
};

window.deleteUser = async function (uid) {
  if (!confirm("PERMANENTLY DELETE this user? This cannot be undone.")) return;
  try {
    await deleteDoc(doc(db, "users", uid));
    alert("User deleted from database (Auth account remains until next login check).");
    loadUsers();
  } catch (e) {
    console.error(e);
    alert("Failed to delete user.");
  }
};

window.dismissReport = async function (reportId) {
  try {
    await deleteDoc(doc(db, "reports", reportId));
    loadReports();
  } catch (e) {
    console.log(e);
  }
};