// Records JavaScript for NexusCare
const API_BASE_URL = "http://localhost:8000/api";

// Check authentication
function checkAuth() {
  const token = localStorage.getItem("accessToken");
  if (!token) {
    window.location.href = "login.html";
    return false;
  }
  return true;
}

// Logout function
function logout() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("userRole");
  window.location.href = "index.html";
}

// Get auth headers
function getAuthHeaders() {
  const token = localStorage.getItem("accessToken");
  return {
    Authorization: `Bearer ${token}`,
  };
}

// Load user info
function loadUserInfo() {
  const userEmail = localStorage.getItem("userEmail");
  const userName = localStorage.getItem("userName");
  const userPhoto = localStorage.getItem("userPhoto");

  // Update user name
  const navUserName = document.getElementById("navUserName");
  if (navUserName) {
    navUserName.textContent = userName || userEmail?.split("@")[0] || "User";
  }

  // Update user photo
  const navUserPhoto = document.getElementById("navUserPhoto");
  if (navUserPhoto && userPhoto) {
    navUserPhoto.src = userPhoto;
    navUserPhoto.style.display = "block";
    navUserPhoto.nextElementSibling.style.display = "none";
  } else if (navUserPhoto) {
    // Generate default avatar with user's initial
    const initial = (userName || userEmail || "U").charAt(0).toUpperCase();
    const defaultAvatar = `data:image/svg+xml,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="20" fill="#4F46E5"/>
        <text x="50%" y="50%" text-anchor="middle" dy="0.35em" fill="white" font-size="18" font-family="Inter, sans-serif" font-weight="600">
          ${initial}
        </text>
      </svg>
    `)}`;
    navUserPhoto.src = defaultAvatar;
    navUserPhoto.style.display = "block";
    navUserPhoto.nextElementSibling.style.display = "none";
  }
}

// Load records
async function loadRecords() {
  try {
    const response = await fetch(`${API_BASE_URL}/records/files/`, {
      headers: getAuthHeaders(),
    });

    if (response.status === 401) {
      logout();
      return;
    }

    const data = await response.json();
    const records = data.results || data || [];

    // Update stats
    document.getElementById("totalRecords").textContent = records.length;
    document.getElementById("labResults").textContent = records.filter(
      (r) => r.file_type === "lab"
    ).length;
    document.getElementById("prescriptions").textContent = records.filter(
      (r) => r.file_type === "prescription"
    ).length;
    document.getElementById("imaging").textContent = records.filter(
      (r) => r.file_type === "imaging"
    ).length;

    // Display records
    displayRecords(records);
  } catch (error) {
    console.error("Error loading records:", error);
    document.getElementById("recordsTable").innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 2rem; color: var(--status-error);">
                    Error loading records. Please try again.
                </td>
            </tr>
        `;
  }
}

// Display records in table
function displayRecords(records) {
  const tbody = document.getElementById("recordsTable");

  if (records.length === 0) {
    tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 3rem;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📁</div>
                    <h4>No Records Yet</h4>
                    <p style="color: var(--text-secondary); margin-top: 0.5rem;">
                        Upload your first medical record to get started
                    </p>
                    <button onclick="showUploadModal()" class="btn btn-primary" style="margin-top: 1rem;">
                        Upload Record
                    </button>
                </td>
            </tr>
        `;
    return;
  }

  tbody.innerHTML = records
    .map(
      (record) => `
        <tr>
            <td><span class="badge badge-info">${getFileTypeIcon(
              record.file_type
            )}</span></td>
            <td><strong>${escapeHtml(record.title || "Untitled")}</strong></td>
            <td>${escapeHtml(record.description || "-")}</td>
            <td>${formatDate(record.uploaded_at)}</td>
            <td>${formatFileSize(record.file_size || 0)}</td>
            <td>
                <button onclick="viewRecord(${
                  record.id
                })" class="btn btn-outline" style="padding: 0.5rem 1rem; font-size: 0.85rem; margin-right: 0.5rem;">
                    👁️ View
                </button>
                <button onclick="downloadRecord(${
                  record.id
                })" class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.85rem;">
                    ⬇️ Download
                </button>
            </td>
        </tr>
    `
    )
    .join("");
}

// Show upload modal
function showUploadModal() {
  document.getElementById("uploadModal").classList.remove("hidden");
  // Focus first input
  setTimeout(() => {
    document.getElementById("fileType").focus();
  }, 100);
}

// Close upload modal
function closeUploadModal() {
  document.getElementById("uploadModal").classList.add("hidden");
  document.getElementById("uploadForm").reset();
  document.getElementById("uploadAlert").classList.add("hidden");
}

// Close modal when clicking outside
document.getElementById("uploadModal")?.addEventListener("click", (e) => {
  if (e.target.id === "uploadModal") {
    closeUploadModal();
  }
});

// Close modal with Escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const modal = document.getElementById("uploadModal");
    if (modal && !modal.classList.contains("hidden")) {
      closeUploadModal();
    }
  }
});

// Handle upload form
document.getElementById("uploadForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const fileType = document.getElementById("fileType").value;
  const title = document.getElementById("fileTitle").value;
  const description = document.getElementById("fileDescription").value;
  const fileInput = document.getElementById("fileInput");
  const file = fileInput.files[0];

  if (!file) {
    showUploadAlert("Please select a file");
    return;
  }

  // Create FormData
  const formData = new FormData();
  formData.append("file", file);
  formData.append("file_type", fileType);
  formData.append("title", title);
  if (description) formData.append("description", description);

  setUploadLoading(true);

  try {
    const response = await fetch(`${API_BASE_URL}/records/files/upload/`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: formData,
    });

    if (response.status === 401) {
      logout();
      return;
    }

    const data = await response.json();

    if (response.ok) {
      showUploadAlert("File uploaded successfully!", "success");
      setTimeout(() => {
        closeUploadModal();
        loadRecords();
      }, 1500);
    } else {
      showUploadAlert(data.detail || data.error || "Upload failed");
    }
  } catch (error) {
    console.error("Upload error:", error);
    showUploadAlert("Network error. Please try again.");
  } finally {
    setUploadLoading(false);
  }
});

// Upload alert
function showUploadAlert(message, type = "error") {
  const alertDiv = document.getElementById("uploadAlert");
  const alertText = document.getElementById("uploadAlertText");

  alertDiv.className = `alert alert-${type}`;
  alertText.textContent = message;
  alertDiv.classList.remove("hidden");

  if (type === "success") {
    setTimeout(() => alertDiv.classList.add("hidden"), 3000);
  }
}

// Upload loading state
function setUploadLoading(isLoading) {
  const btn = document.getElementById("uploadBtn");
  const spinner = document.getElementById("uploadSpinner");
  const text = document.getElementById("uploadBtnText");

  btn.disabled = isLoading;
  if (isLoading) {
    spinner.classList.remove("hidden");
    text.classList.add("hidden");
  } else {
    spinner.classList.add("hidden");
    text.classList.remove("hidden");
  }
}

// View record
async function viewRecord(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/records/files/${id}/link/`, {
      headers: getAuthHeaders(),
    });

    if (response.ok) {
      const data = await response.json();
      window.open(data.url, "_blank");
    } else {
      alert("Failed to get file link");
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Error accessing file");
  }
}

// Download record
async function downloadRecord(id) {
  await viewRecord(id);
}

// Apply filters
function applyFilters() {
  // Implement filtering logic
  loadRecords();
}

// Utility functions
function formatDate(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

function getFileTypeIcon(type) {
  const icons = {
    lab: "🔬 Lab",
    prescription: "💊 Rx",
    imaging: "📷 Scan",
    document: "📄 Doc",
    other: "📎 File",
  };
  return icons[type] || icons["other"];
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Initialize
if (checkAuth()) {
  document.addEventListener("DOMContentLoaded", () => {
    loadUserInfo();
    loadRecords();
  });
}
