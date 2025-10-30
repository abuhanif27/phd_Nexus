// Profile JavaScript for NexusCare
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
  localStorage.removeItem("userName");
  localStorage.removeItem("userPhoto");
  window.location.href = "index.html";
}

// Get auth headers
function getAuthHeaders() {
  const token = localStorage.getItem("accessToken");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

// Tab switching
function switchTab(tabName) {
  // Hide all tabs
  document.querySelectorAll(".tab-content").forEach((tab) => {
    tab.classList.remove("active");
  });

  // Remove active from all buttons
  document.querySelectorAll(".tab-button").forEach((btn) => {
    btn.classList.remove("active");
  });

  // Show selected tab
  document.getElementById(`${tabName}-tab`).classList.add("active");

  // Activate button
  event.target.classList.add("active");
}

// Load user profile
async function loadProfile() {
  try {
    // First get user info
    const userResponse = await fetch(`${API_BASE_URL}/auth/me/`, {
      headers: getAuthHeaders(),
    });

    if (!userResponse.ok) {
      if (userResponse.status === 401) {
        logout();
        return;
      }
      throw new Error("Failed to load user info");
    }

    const user = await userResponse.json();

    // Then get patient profile
    const patientResponse = await fetch(`${API_BASE_URL}/patients/`, {
      headers: getAuthHeaders(),
    });

    let patient = null;
    if (patientResponse.ok) {
      const patientData = await patientResponse.json();
      patient = patientData.results?.[0] || patientData[0] || null;
    }

    // Update profile display
    const displayName = patient?.name || user.email.split("@")[0];
    document.getElementById("profileName").textContent = displayName;
    document.getElementById("profileEmail").textContent = user.email;
    document.getElementById("navUserName").textContent = displayName;

    // Update form fields
    document.getElementById("fullName").value = patient?.name || "";
    document.getElementById("email").value = user.email;
    document.getElementById("phone").value = patient?.phone || "";
    document.getElementById("dateOfBirth").value = patient?.dob || "";

    // Set gender dropdown
    const genderMap = { M: "male", F: "female", O: "other", N: "prefer-not" };
    document.getElementById("gender").value = genderMap[patient?.gender] || "";

    document.getElementById("bloodGroup").value = patient?.blood_group || "";
    document.getElementById("address").value = patient?.address || "";
    document.getElementById("medicalConditions").value =
      patient?.medical_conditions || "";

    // Store patient ID for updates
    if (patient) {
      localStorage.setItem("patientId", patient.id);
    }

    // Member since
    if (patient?.created_at || user.created_at) {
      const date = new Date(patient?.created_at || user.created_at);
      document.getElementById("memberSince").textContent = date.getFullYear();
    }

    // Profile photo
    let photoUrl;
    if (patient?.profile_photo_url) {
      photoUrl = patient.profile_photo_url;
    } else {
      // Generate default avatar
      const initial = displayName.charAt(0).toUpperCase();
      photoUrl = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Crect fill='%234F46E5' width='200' height='200'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='80' fill='white'%3E${initial}%3C/text%3E%3C/svg%3E`;
    }

    document.getElementById("profilePhoto").src = photoUrl;
    document.getElementById("navUserPhoto").src = photoUrl;

    // Store user info
    localStorage.setItem("userName", displayName);
    localStorage.setItem("userPhoto", photoUrl);
  } catch (error) {
    console.error("Error loading profile:", error);
    showNotification("Error loading profile", "error");
  }
}

// Upload profile photo
async function uploadProfilePhoto(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Validate file type
  if (!file.type.startsWith("image/")) {
    showNotification("Please select an image file", "error");
    return;
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    showNotification("Image size should be less than 5MB", "error");
    return;
  }

  const formData = new FormData();
  formData.append("profile_photo", file);

  try {
    const token = localStorage.getItem("accessToken");
    const response = await fetch(`${API_BASE_URL}/patients/upload-photo/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (response.ok) {
      const data = await response.json();

      // Update photo display
      const photoUrl = data.profile_photo_url || data.profile_photo;
      document.getElementById("profilePhoto").src = photoUrl;
      document.getElementById("navUserPhoto").src = photoUrl;
      localStorage.setItem("userPhoto", photoUrl);

      showNotification("Profile photo updated successfully!", "success");
    } else {
      const errorData = await response.json();
      console.error("Upload error:", errorData);
      showNotification("Failed to upload photo", "error");
    }
  } catch (error) {
    console.error("Error uploading photo:", error);
    showNotification("Error uploading photo", "error");
  }
}

// Save personal info
document
  .getElementById("personalInfoForm")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const patientId = localStorage.getItem("patientId");

    // Map gender values
    const genderValue = document.getElementById("gender").value;
    const genderMap = { male: "M", female: "F", other: "O", "prefer-not": "N" };

    const data = {
      name: document.getElementById("fullName").value,
      phone: document.getElementById("phone").value,
      dob: document.getElementById("dateOfBirth").value || null,
      gender: genderMap[genderValue] || "",
      blood_group: document.getElementById("bloodGroup").value,
      address: document.getElementById("address").value,
      medical_conditions: document.getElementById("medicalConditions").value,
      emergency_contact_name: "",
      emergency_contact_phone: "",
    };

    try {
      let response;

      if (patientId) {
        // Update existing patient
        response = await fetch(`${API_BASE_URL}/patients/${patientId}/`, {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        });
      } else {
        // Create new patient profile
        response = await fetch(`${API_BASE_URL}/patients/`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        });
      }

      if (response.ok) {
        const updatedData = await response.json();

        // Store patient ID
        localStorage.setItem("patientId", updatedData.id);

        // Update display
        const displayName = updatedData.name || updatedData.email.split("@")[0];
        localStorage.setItem("userName", displayName);
        document.getElementById("navUserName").textContent = displayName;
        document.getElementById("profileName").textContent = displayName;

        showNotification("Profile updated successfully!", "success");

        // Reload profile to sync everything
        setTimeout(() => loadProfile(), 500);
      } else {
        const errorData = await response.json();
        console.error("Save error:", errorData);
        showNotification(
          `Failed to update profile: ${JSON.stringify(errorData)}`,
          "error"
        );
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      showNotification("Error updating profile", "error");
    }
  });

// Load health records
async function loadHealthRecords() {
  try {
    const response = await fetch(`${API_BASE_URL}/records/`, {
      headers: getAuthHeaders(),
    });

    if (response.ok) {
      const data = await response.json();
      const records = data.results || data || [];

      // Update stats
      document.getElementById("totalRecords").textContent = records.length;

      // Display records
      if (records.length === 0) {
        document.getElementById("recordsList").innerHTML = `
          <div style="text-align: center; padding: 3rem; color: var(--text-secondary);">
            <i class="fas fa-folder-open" style="font-size: 4rem; opacity: 0.3; margin-bottom: 1rem;"></i>
            <p>No health records uploaded yet</p>
            <button class="btn btn-primary" style="margin-top: 1rem;" onclick="document.getElementById('recordUploadInput').click()">
              <i class="fas fa-upload"></i> Upload Your First Record
            </button>
          </div>
        `;
      } else {
        document.getElementById("recordsList").innerHTML = records
          .map(
            (record) => `
          <div class="health-record-card">
            <div style="display: flex; justify-content: space-between; align-items: start;">
              <div style="flex: 1;">
                <h3 style="color: var(--text-primary); margin: 0 0 0.5rem 0;">
                  <i class="fas fa-file-medical"></i> ${
                    record.record_type || "Medical Record"
                  }
                </h3>
                <p style="color: var(--text-secondary); margin: 0 0 0.5rem 0;">
                  ${record.description || "No description"}
                </p>
                <p style="color: var(--text-light); font-size: 0.9rem; margin: 0;">
                  <i class="fas fa-calendar"></i> ${new Date(
                    record.created_at
                  ).toLocaleDateString()}
                  ${
                    record.doctor_name
                      ? `<i class="fas fa-user-md" style="margin-left: 1rem;"></i> Dr. ${record.doctor_name}`
                      : ""
                  }
                </p>
              </div>
              <div style="display: flex; gap: 0.5rem;">
                <button class="btn btn-secondary" onclick="downloadRecord(${
                  record.id
                })" title="Download">
                  <i class="fas fa-download"></i>
                </button>
                <button class="btn" style="background: var(--status-error); color: white;" onclick="deleteRecord(${
                  record.id
                })" title="Delete">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
          </div>
        `
          )
          .join("");
      }
    }
  } catch (error) {
    console.error("Error loading records:", error);
  }
}

// Upload health records
async function uploadHealthRecords(event) {
  const files = event.target.files;
  if (!files || files.length === 0) return;

  for (let file of files) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("record_type", "Medical Document");
    formData.append("description", `Uploaded: ${file.name}`);

    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_BASE_URL}/records/upload/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        showNotification(`${file.name} uploaded successfully!`, "success");
      } else {
        showNotification(`Failed to upload ${file.name}`, "error");
      }
    } catch (error) {
      console.error("Error uploading record:", error);
      showNotification(`Error uploading ${file.name}`, "error");
    }
  }

  // Reload records
  setTimeout(() => loadHealthRecords(), 1000);

  // Clear input
  event.target.value = "";
}

// Delete record
async function deleteRecord(recordId) {
  if (!confirm("Are you sure you want to delete this record?")) return;

  try {
    const response = await fetch(`${API_BASE_URL}/records/${recordId}/`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });

    if (response.ok) {
      showNotification("Record deleted successfully", "success");
      loadHealthRecords();
    } else {
      showNotification("Failed to delete record", "error");
    }
  } catch (error) {
    console.error("Error deleting record:", error);
    showNotification("Error deleting record", "error");
  }
}

// Download record
async function downloadRecord(recordId) {
  try {
    const token = localStorage.getItem("accessToken");
    const response = await fetch(
      `${API_BASE_URL}/records/${recordId}/download/`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `record_${recordId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }
  } catch (error) {
    console.error("Error downloading record:", error);
    showNotification("Error downloading record", "error");
  }
}

// Generate AI analysis
async function generateAIAnalysis() {
  const analysisContent = document.getElementById("aiAnalysisContent");

  // Show loading
  analysisContent.innerHTML = `
    <div style="text-align: center; padding: 3rem;">
      <div class="spinner" style="margin: 0 auto 1rem;"></div>
      <p style="color: var(--text-secondary);">Analyzing your health data with AI...</p>
    </div>
  `;

  try {
    const response = await fetch(`${API_BASE_URL}/ai/health-analysis/`, {
      method: "POST",
      headers: getAuthHeaders(),
    });

    if (response.ok) {
      const data = await response.json();

      analysisContent.innerHTML = `
        <div class="feature-card" style="margin-bottom: 1rem; border-left-color: var(--success-green);">
          <h3 style="color: var(--text-primary); margin-bottom: 1rem;">
            <i class="fas fa-heartbeat"></i> Overall Health Status
          </h3>
          <p style="color: var(--text-secondary);">${
            data.overall_status || "Good"
          }</p>
        </div>
        
        <div class="feature-card" style="margin-bottom: 1rem; border-left-color: var(--primary-blue);">
          <h3 style="color: var(--text-primary); margin-bottom: 1rem;">
            <i class="fas fa-lightbulb"></i> AI Insights
          </h3>
          <ul style="margin: 0; padding-left: 1.5rem; color: var(--text-secondary);">
            ${(data.insights || ["No specific insights at this time"])
              .map(
                (insight) =>
                  `<li style="margin-bottom: 0.5rem;">${insight}</li>`
              )
              .join("")}
          </ul>
        </div>
        
        <div class="feature-card" style="margin-bottom: 1rem; border-left-color: var(--warning-yellow);">
          <h3 style="color: var(--text-primary); margin-bottom: 1rem;">
            <i class="fas fa-exclamation-circle"></i> Recommendations
          </h3>
          <ul style="margin: 0; padding-left: 1.5rem; color: var(--text-secondary);">
            ${(
              data.recommendations || [
                "Continue regular checkups",
                "Maintain a healthy lifestyle",
              ]
            )
              .map((rec) => `<li style="margin-bottom: 0.5rem;">${rec}</li>`)
              .join("")}
          </ul>
        </div>
        
        <div class="feature-card" style="border-left-color: var(--accent-teal);">
          <h3 style="color: var(--text-primary); margin-bottom: 1rem;">
            <i class="fas fa-chart-line"></i> Health Trends
          </h3>
          <p style="color: var(--text-secondary);">${
            data.trends ||
            "Based on your records, your health metrics are stable."
          }</p>
        </div>
        
        <p style="color: var(--text-light); font-size: 0.9rem; margin-top: 1.5rem; text-align: center;">
          <i class="fas fa-info-circle"></i> This analysis is generated by AI and should not replace professional medical advice.
        </p>
      `;
    } else {
      analysisContent.innerHTML = `
        <div style="text-align: center; padding: 3rem; color: var(--status-error);">
          <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
          <p>Unable to generate analysis. Please try again later.</p>
        </div>
      `;
    }
  } catch (error) {
    console.error("Error generating AI analysis:", error);
    analysisContent.innerHTML = `
      <div style="text-align: center; padding: 3rem; color: var(--status-error);">
        <i class="fas fa-times-circle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
        <p>Error generating analysis. Please try again.</p>
      </div>
    `;
  }
}

// Change password
document
  .getElementById("changePasswordForm")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (newPassword !== confirmPassword) {
      showNotification("Passwords do not match", "error");
      return;
    }

    const data = {
      old_password: document.getElementById("currentPassword").value,
      new_password: newPassword,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/users/change-password/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });

      if (response.ok) {
        showNotification("Password changed successfully!", "success");
        e.target.reset();
      } else {
        const error = await response.json();
        showNotification(error.detail || "Failed to change password", "error");
      }
    } catch (error) {
      console.error("Error changing password:", error);
      showNotification("Error changing password", "error");
    }
  });

// Save privacy settings
function savePrivacySettings() {
  const settings = {
    email_notifications: document.getElementById("emailNotifications").checked,
    sms_notifications: document.getElementById("smsNotifications").checked,
    share_data_for_ai: document.getElementById("shareDataForAI").checked,
  };

  // Save to localStorage for now (can be sent to backend later)
  localStorage.setItem("privacySettings", JSON.stringify(settings));
  showNotification("Privacy settings saved", "success");
}

// Delete account
async function deleteAccount() {
  const confirmation = prompt('Type "DELETE" to confirm account deletion:');
  if (confirmation !== "DELETE") {
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/users/profile/`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });

    if (response.ok) {
      alert("Your account has been deleted");
      logout();
    } else {
      showNotification("Failed to delete account", "error");
    }
  } catch (error) {
    console.error("Error deleting account:", error);
    showNotification("Error deleting account", "error");
  }
}

// Notification helper
function showNotification(message, type = "info") {
  // Create notification element
  const notification = document.createElement("div");
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${
      type === "success"
        ? "var(--success-green)"
        : type === "error"
        ? "var(--status-error)"
        : "var(--primary-blue)"
    };
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    box-shadow: var(--shadow-lg);
    z-index: 10000;
    animation: slideIn 0.3s ease;
  `;
  notification.innerHTML = `
    <i class="fas fa-${
      type === "success"
        ? "check-circle"
        : type === "error"
        ? "times-circle"
        : "info-circle"
    }"></i>
    ${message}
  `;

  document.body.appendChild(notification);

  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = "slideOut 0.3s ease";
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Load appointment stats
async function loadAppointmentStats() {
  try {
    const response = await fetch(`${API_BASE_URL}/scheduling/appointments/`, {
      headers: getAuthHeaders(),
    });

    if (response.ok) {
      const data = await response.json();
      const appointments = data.results || data || [];
      document.getElementById("totalAppointments").textContent =
        appointments.length;
    }
  } catch (error) {
    console.error("Error loading appointments:", error);
  }
}

// Initialize
if (checkAuth()) {
  document.addEventListener("DOMContentLoaded", () => {
    loadProfile();
    loadHealthRecords();
    loadAppointmentStats();
  });
}
