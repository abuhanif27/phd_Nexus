// Dashboard JavaScript for NexusCare
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
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

// Handle API errors
async function handleResponse(response) {
  if (response.status === 401) {
    // Token expired, redirect to login
    logout();
    return null;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || data.error || "API request failed");
  }

  return data;
}

// Load user info
async function loadUserInfo() {
  const userEmail = localStorage.getItem("userEmail");
  const userRole = localStorage.getItem("userRole");

  document.getElementById("userEmail").textContent = userEmail || "User";
  document.getElementById("userName").textContent =
    userEmail?.split("@")[0] || "User";
}

// Load dashboard stats
async function loadStats() {
  try {
    // Get current user info
    const response = await fetch(`${API_BASE_URL}/auth/me/`, {
      headers: getAuthHeaders(),
    });

    const userData = await handleResponse(response);

    if (userData) {
      // Load records count
      loadRecordsCount();
      loadAppointmentsCount();
      loadPrescriptionsCount();
    }
  } catch (error) {
    console.error("Error loading stats:", error);
  }
}

// Load records count
async function loadRecordsCount() {
  try {
    const response = await fetch(`${API_BASE_URL}/records/files/`, {
      headers: getAuthHeaders(),
    });

    const data = await handleResponse(response);

    if (data) {
      const count = data.results ? data.results.length : data.length || 0;
      document.getElementById("recordsCount").textContent = count;
    }
  } catch (error) {
    console.error("Error loading records count:", error);
    document.getElementById("recordsCount").textContent = "0";
  }
}

// Load appointments count
async function loadAppointmentsCount() {
  try {
    const response = await fetch(`${API_BASE_URL}/scheduling/appointments/`, {
      headers: getAuthHeaders(),
    });

    const data = await handleResponse(response);

    if (data) {
      const appointments = data.results || data || [];
      const upcomingCount = appointments.filter(
        (apt) => apt.status === "confirmed" && new Date(apt.date) > new Date()
      ).length;
      document.getElementById("appointmentsCount").textContent = upcomingCount;
      loadAppointmentsList(appointments);
    }
  } catch (error) {
    console.error("Error loading appointments count:", error);
    document.getElementById("appointmentsCount").textContent = "0";
    displayNoAppointments();
  }
}

// Load prescriptions count
async function loadPrescriptionsCount() {
  try {
    const response = await fetch(`${API_BASE_URL}/records/prescriptions/`, {
      headers: getAuthHeaders(),
    });

    const data = await handleResponse(response);

    if (data) {
      const count = data.results ? data.results.length : data.length || 0;
      document.getElementById("prescriptionsCount").textContent = count;
    }
  } catch (error) {
    console.error("Error loading prescriptions count:", error);
    document.getElementById("prescriptionsCount").textContent = "0";
  }
}

// Load recent records
async function loadRecentRecords() {
  try {
    const response = await fetch(`${API_BASE_URL}/records/files/?limit=5`, {
      headers: getAuthHeaders(),
    });

    const data = await handleResponse(response);
    const tbody = document.getElementById("recentRecordsTable");

    if (data && (data.results || data).length > 0) {
      const records = data.results || data;
      tbody.innerHTML = records
        .slice(0, 5)
        .map(
          (record) => `
                <tr>
                    <td><span class="badge badge-info">${getFileType(
                      record.file_type
                    )}</span></td>
                    <td><strong>${escapeHtml(
                      record.title || "Untitled"
                    )}</strong></td>
                    <td>${formatDate(record.uploaded_at)}</td>
                    <td><span class="badge badge-success">Processed</span></td>
                    <td>
                        <button class="btn btn-outline" style="padding: 0.5rem 1rem; font-size: 0.85rem;" onclick="viewRecord(${
                          record.id
                        })">
                            View
                        </button>
                    </td>
                </tr>
            `
        )
        .join("");
    } else {
      tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                        📁 No records yet. <a href="records.html#upload" style="color: var(--accent-teal);">Upload your first record</a>
                    </td>
                </tr>
            `;
    }
  } catch (error) {
    console.error("Error loading recent records:", error);
    document.getElementById("recentRecordsTable").innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 2rem; color: var(--status-error);">
                    ⚠️ Error loading records. Please try again.
                </td>
            </tr>
        `;
  }
}

// Load appointments list
function loadAppointmentsList(appointments) {
  const container = document.getElementById("appointmentsList");

  const upcoming = appointments
    .filter(
      (apt) => apt.status === "confirmed" && new Date(apt.date) > new Date()
    )
    .slice(0, 3);

  if (upcoming.length > 0) {
    container.innerHTML = upcoming
      .map(
        (apt) => `
            <div class="feature-card">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                    <h4 style="color: var(--secondary-blue);">${formatDate(
                      apt.date
                    )}</h4>
                    <span class="badge badge-success">${apt.status}</span>
                </div>
                <p style="color: var(--text-secondary); margin-bottom: 0.5rem;">
                    <strong>Doctor:</strong> Dr. ${escapeHtml(
                      apt.doctor_name || "Unknown"
                    )}
                </p>
                <p style="color: var(--text-secondary); margin-bottom: 0.5rem;">
                    <strong>Time:</strong> ${apt.start_time} - ${apt.end_time}
                </p>
                ${
                  apt.notes
                    ? `<p style="color: var(--text-light); font-size: 0.9rem; margin-top: 0.75rem;">${escapeHtml(
                        apt.notes
                      )}</p>`
                    : ""
                }
            </div>
        `
      )
      .join("");
  } else {
    displayNoAppointments();
  }
}

function displayNoAppointments() {
  document.getElementById("appointmentsList").innerHTML = `
        <div class="feature-card" style="text-align: center; padding: 3rem;">
            <div style="font-size: 3rem; margin-bottom: 1rem;">📅</div>
            <h4 style="margin-bottom: 1rem;">No Upcoming Appointments</h4>
            <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">
                Schedule a consultation with available doctors
            </p>
            <a href="appointments.html#book" class="btn btn-primary">Book Appointment</a>
        </div>
    `;
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

function getFileType(type) {
  const types = {
    lab: "🔬 Lab",
    prescription: "💊 Rx",
    imaging: "📷 Scan",
    document: "📄 Doc",
    other: "📎 File",
  };
  return types[type] || types["other"];
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function viewRecord(id) {
  window.location.href = `records.html#record-${id}`;
}

// Initialize dashboard
if (checkAuth()) {
  document.addEventListener("DOMContentLoaded", () => {
    loadUserInfo();
    loadStats();
    loadRecentRecords();
  });
}
