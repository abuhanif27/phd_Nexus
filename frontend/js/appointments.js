// Appointments JavaScript for NexusCare
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
    "Content-Type": "application/json",
  };
}

// Load user info
function loadUserInfo() {
  const userEmail = localStorage.getItem("userEmail");
  document.getElementById("userEmail").textContent = userEmail || "User";
}

// Load appointments
async function loadAppointments() {
  try {
    const response = await fetch(`${API_BASE_URL}/scheduling/appointments/`, {
      headers: getAuthHeaders(),
    });

    if (response.status === 401) {
      logout();
      return;
    }

    const data = await response.json();
    const appointments = data.results || data || [];

    // Separate upcoming and past
    const now = new Date();
    const upcoming = appointments.filter(
      (apt) => new Date(apt.scheduled_at) >= now
    );
    const past = appointments.filter((apt) => new Date(apt.scheduled_at) < now);

    // Update stats
    document.getElementById("upcomingCount").textContent = upcoming.length;
    document.getElementById("completedCount").textContent = past.filter(
      (a) => a.status === "completed"
    ).length;
    document.getElementById("cancelledCount").textContent = appointments.filter(
      (a) => a.status === "cancelled"
    ).length;

    // Display appointments
    displayUpcomingAppointments(upcoming);
    displayPastAppointments(past);
  } catch (error) {
    console.error("Error loading appointments:", error);
  }
}

// Display upcoming appointments
function displayUpcomingAppointments(appointments) {
  const container = document.getElementById("upcomingAppointments");

  if (appointments.length === 0) {
    container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📅</div>
                <h4>No Upcoming Appointments</h4>
                <p>Book an appointment to get started</p>
                <button onclick="showBookModal()" class="btn btn-primary" style="margin-top: 1rem;">
                    Book Appointment
                </button>
            </div>
        `;
    return;
  }

  container.innerHTML = appointments
    .map(
      (apt) => `
        <div class="appointment-card">
            <div class="appointment-header">
                <h4>${escapeHtml(apt.doctor_name || "Doctor")}</h4>
                <span class="badge badge-${getStatusColor(apt.status)}">${
        apt.status
      }</span>
            </div>
            <div class="appointment-details">
                <div class="detail-item">
                    <span>📅</span>
                    <span>${formatDate(apt.scheduled_at)}</span>
                </div>
                <div class="detail-item">
                    <span>🕐</span>
                    <span>${formatTime(apt.scheduled_at)}</span>
                </div>
                <div class="detail-item">
                    <span>🏥</span>
                    <span>${escapeHtml(apt.specialty || "General")}</span>
                </div>
                ${
                  apt.reason
                    ? `
                <div class="detail-item" style="grid-column: 1 / -1;">
                    <span>📋</span>
                    <span>${escapeHtml(apt.reason)}</span>
                </div>
                `
                    : ""
                }
            </div>
            <div class="appointment-actions">
                ${
                  apt.status === "scheduled"
                    ? `
                    <button onclick="cancelAppointment(${apt.id})" class="btn btn-outline" style="color: var(--status-error);">
                        Cancel
                    </button>
                `
                    : ""
                }
                <button onclick="viewAppointmentDetails(${
                  apt.id
                })" class="btn btn-outline">
                    View Details
                </button>
            </div>
        </div>
    `
    )
    .join("");
}

// Display past appointments
function displayPastAppointments(appointments) {
  const container = document.getElementById("pastAppointments");

  if (appointments.length === 0) {
    container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                <p>No past appointments</p>
            </div>
        `;
    return;
  }

  container.innerHTML = appointments
    .slice(0, 5)
    .map(
      (apt) => `
        <div class="appointment-card compact">
            <div class="appointment-header">
                <h5>${escapeHtml(apt.doctor_name || "Doctor")}</h5>
                <span class="badge badge-${getStatusColor(apt.status)}">${
        apt.status
      }</span>
            </div>
            <div class="appointment-details">
                <div class="detail-item">
                    <span>📅</span>
                    <span>${formatDate(apt.scheduled_at)}</span>
                </div>
                <div class="detail-item">
                    <span>🏥</span>
                    <span>${escapeHtml(apt.specialty || "General")}</span>
                </div>
            </div>
        </div>
    `
    )
    .join("");
}

// Show book modal
function showBookModal() {
  document.getElementById("bookModal").classList.remove("hidden");
  searchDoctors();
  // Focus first input
  setTimeout(() => {
    document.getElementById("specialtyFilter")?.focus();
  }, 100);
}

// Close book modal
function closeBookModal() {
  document.getElementById("bookModal").classList.add("hidden");
  document.getElementById("bookForm").reset();
  document.getElementById("doctorResults").innerHTML =
    '<p style="text-align: center; color: var(--text-secondary);">Loading doctors...</p>';
  document.getElementById("selectedDoctorDisplay").innerHTML =
    "No doctor selected";
  document.getElementById("timeSlotsContainer").innerHTML = "";
  document.getElementById("bookAlert").classList.add("hidden");
  selectedDoctorId = null;
  selectedDoctorName = null;
}

// Close modal when clicking outside
document.getElementById("bookModal")?.addEventListener("click", (e) => {
  if (e.target.id === "bookModal") {
    closeBookModal();
  }
});

// Close modal with Escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const modal = document.getElementById("bookModal");
    if (modal && !modal.classList.contains("hidden")) {
      closeBookModal();
    }
  }
});

// Search doctors
async function searchDoctors() {
  const specialty = document.getElementById("specialtyFilter").value;
  const location = document.getElementById("locationFilter").value;
  const searchQuery =
    document.getElementById("doctorSearchInput")?.value.toLowerCase() || "";

  let url = `${API_BASE_URL}/doctors/`;
  const params = new URLSearchParams();
  if (specialty) params.append("specialty", specialty);
  if (location) params.append("location", location);
  if (params.toString()) url += `?${params.toString()}`;

  try {
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });

    if (response.status === 401) {
      logout();
      return;
    }

    const data = await response.json();
    let doctors = data.results || data || [];

    // Apply client-side search filter
    if (searchQuery) {
      doctors = doctors.filter(
        (doc) =>
          doc.user.first_name.toLowerCase().includes(searchQuery) ||
          doc.user.last_name.toLowerCase().includes(searchQuery) ||
          doc.specialty.toLowerCase().includes(searchQuery) ||
          (doc.location && doc.location.toLowerCase().includes(searchQuery))
      );
    }

    displayDoctors(doctors);
  } catch (error) {
    console.error("Error searching doctors:", error);
    document.getElementById("doctorResults").innerHTML = `
            <p style="color: var(--status-error); text-align: center; padding: 1rem;">
                Error loading doctors. Please try again.
            </p>
        `;
  }
}

// Display doctors
function displayDoctors(doctors) {
  const container = document.getElementById("doctorResults");
  const countElement = document.getElementById("doctorCount");

  if (countElement) {
    countElement.textContent = `${doctors.length} doctor${
      doctors.length !== 1 ? "s" : ""
    } found`;
  }

  if (doctors.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 3rem;">
        <div style="font-size: 4rem; margin-bottom: 1rem; opacity: 0.5;">👨‍⚕️</div>
        <p style="color: var(--text-secondary); font-size: 1.1rem;">
          No doctors found matching your criteria
        </p>
        <p style="color: var(--text-light); font-size: 0.9rem; margin-top: 0.5rem;">
          Try adjusting your filters or search query
        </p>
      </div>
    `;
    return;
  }

  // Get specialty icon
  const getSpecialtyIcon = (specialty) => {
    const icons = {
      Cardiology: "❤️",
      Dermatology: "🧴",
      Neurology: "🧠",
      Orthopedics: "🦴",
      "General Medicine": "🩺",
      Pediatrics: "👶",
      Psychiatry: "🧘",
      ENT: "👂",
      Ophthalmology: "👁️",
      Gynecology: "🏥",
      Urology: "💧",
      Pulmonology: "🫁",
      Gastroenterology: "🫀",
    };
    return icons[specialty] || "👨‍⚕️";
  };

  // Get specialty color
  const getSpecialtyColor = (specialty) => {
    const colors = {
      Cardiology: "#e74c3c",
      Dermatology: "#f39c12",
      Neurology: "#9b59b6",
      Orthopedics: "#3498db",
      "General Medicine": "#2ecc71",
      Pediatrics: "#ff69b4",
      Psychiatry: "#1abc9c",
      ENT: "#e67e22",
      Ophthalmology: "#34495e",
      Gynecology: "#e91e63",
      Urology: "#00bcd4",
      Pulmonology: "#009688",
      Gastroenterology: "#ff5722",
    };
    return colors[specialty] || "#667eea";
  };

  container.innerHTML = doctors
    .map((doctor) => {
      const doctorName = doctor.name || doctor.user_name || doctor.email;
      const specialty = doctor.specialty || "General Medicine";
      const location = doctor.location || "Location not specified";
      const rating = doctor.rating || "4.5";
      const specialtyIcon = getSpecialtyIcon(specialty);
      const specialtyColor = getSpecialtyColor(specialty);

      return `
        <div 
          class="doctor-card" 
          data-doctor-id="${doctor.id}"
          style="
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1.25rem;
            background: white;
            border: 2px solid #e8ecef;
            border-left: 4px solid ${specialtyColor};
            border-radius: 12px;
            margin-bottom: 1rem;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          "
          onmouseover="this.style.transform='translateX(4px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)'; this.style.borderColor='${specialtyColor}';"
          onmouseout="if(!this.classList.contains('selected')) { this.style.transform='translateX(0)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.05)'; this.style.borderColor='#e8ecef'; }"
          onclick="selectDoctor(${doctor.id}, '${escapeHtml(
        doctorName
      )}', '${escapeHtml(specialty)}')"
        >
          <!-- Doctor Avatar with Specialty Color -->
          <div style="
            width: 60px;
            height: 60px;
            border-radius: 12px;
            background: linear-gradient(135deg, ${specialtyColor}, ${specialtyColor}cc);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2rem;
            font-weight: 600;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            flex-shrink: 0;
          ">
            ${specialtyIcon}
          </div>

          <!-- Doctor Info -->
          <div style="flex: 1; min-width: 0;">
            <h4 style="
              margin: 0 0 0.5rem 0; 
              color: var(--text-primary);
              font-size: 1.1rem;
              font-weight: 600;
            ">
              ${escapeHtml(doctorName)}
            </h4>
            
            <div style="
              display: flex; 
              align-items: center; 
              gap: 0.75rem;
              flex-wrap: wrap;
            ">
              <span style="
                display: inline-flex;
                align-items: center;
                gap: 0.25rem;
                padding: 0.25rem 0.75rem;
                background: ${specialtyColor}15;
                color: ${specialtyColor};
                border-radius: 20px;
                font-size: 0.85rem;
                font-weight: 600;
              ">
                ${specialtyIcon} ${escapeHtml(specialty)}
              </span>
              
              <span style="
                display: inline-flex;
                align-items: center;
                gap: 0.25rem;
                color: var(--text-secondary);
                font-size: 0.85rem;
              ">
                📍 ${escapeHtml(location)}
              </span>
            </div>

            ${
              doctor.qualifications
                ? `<p style="
                  margin: 0.5rem 0 0 0; 
                  color: var(--text-light); 
                  font-size: 0.8rem;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  white-space: nowrap;
                ">${escapeHtml(doctor.qualifications)}</p>`
                : ""
            }
          </div>

          <!-- Rating & Select Button -->
          <div style="
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 0.5rem;
            flex-shrink: 0;
          ">
            <div style="
              display: flex;
              align-items: center;
              gap: 0.25rem;
              padding: 0.35rem 0.75rem;
              background: linear-gradient(135deg, #ffd700, #ffed4e);
              border-radius: 20px;
              font-weight: 700;
              color: #333;
              font-size: 0.9rem;
              box-shadow: 0 2px 4px rgba(255,215,0,0.3);
            ">
              ⭐ ${rating}
            </div>
            
            <button 
              type="button"
              style="
                padding: 0.5rem 1.25rem;
                background: ${specialtyColor};
                color: white;
                border: none;
                border-radius: 20px;
                font-size: 0.85rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                white-space: nowrap;
              "
              onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.2)';"
              onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none';"
            >
              Select →
            </button>
          </div>
        </div>
      `;
    })
    .join("");
}

// Select doctor and load time slots
let selectedDoctorId = null;
let selectedDoctorName = null;

function selectDoctor(doctorId, doctorName, specialty) {
  selectedDoctorId = doctorId;
  selectedDoctorName = doctorName;

  // Get specialty icon and color
  const getSpecialtyIcon = (spec) => {
    const icons = {
      Cardiology: "❤️",
      Dermatology: "🧴",
      Neurology: "🧠",
      Orthopedics: "🦴",
      "General Medicine": "🩺",
      Pediatrics: "👶",
      Psychiatry: "🧘",
      ENT: "👂",
      Ophthalmology: "👁️",
      Gynecology: "🏥",
      Urology: "💧",
      Pulmonology: "🫁",
      Gastroenterology: "🫀",
    };
    return icons[spec] || "👨‍⚕️";
  };

  const getSpecialtyColor = (spec) => {
    const colors = {
      Cardiology: "#e74c3c",
      Dermatology: "#f39c12",
      Neurology: "#9b59b6",
      Orthopedics: "#3498db",
      "General Medicine": "#2ecc71",
      Pediatrics: "#ff69b4",
      Psychiatry: "#1abc9c",
      ENT: "#e67e22",
      Ophthalmology: "#34495e",
      Gynecology: "#e91e63",
      Urology: "#00bcd4",
      Pulmonology: "#009688",
      Gastroenterology: "#ff5722",
    };
    return colors[spec] || "#667eea";
  };

  const specialtyIcon = getSpecialtyIcon(specialty);
  const specialtyColor = getSpecialtyColor(specialty);

  // Update hidden input
  document.getElementById("doctorSelect").value = doctorId;

  // Update selected doctor display with beautiful design
  document.getElementById("selectedDoctorDisplay").innerHTML = `
    <div style="
      display: flex; 
      align-items: center; 
      gap: 1rem;
      padding: 0.5rem;
      background: white;
      border-radius: 8px;
    ">
      <div style="
        width: 50px;
        height: 50px;
        border-radius: 10px;
        background: linear-gradient(135deg, ${specialtyColor}, ${specialtyColor}cc);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.75rem;
        box-shadow: 0 4px 8px rgba(0,0,0,0.15);
      ">
        ${specialtyIcon}
      </div>
      <div style="flex: 1;">
        <div style="
          font-weight: 700; 
          color: var(--text-primary);
          font-size: 1.1rem;
          margin-bottom: 0.25rem;
        ">
          ${escapeHtml(doctorName)}
        </div>
        <div style="
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.75rem;
          background: ${specialtyColor}15;
          color: ${specialtyColor};
          border-radius: 15px;
          font-size: 0.8rem;
          font-weight: 600;
        ">
          ${specialtyIcon} ${escapeHtml(specialty)}
        </div>
      </div>
      <div style="
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        border-radius: 20px;
        font-weight: 700;
        font-size: 0.9rem;
        box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);
      ">
        <span style="font-size: 1.2rem;">✓</span>
        Selected
      </div>
    </div>
  `;

  // Highlight selected doctor card
  document.querySelectorAll(".doctor-card").forEach((card) => {
    card.classList.remove("selected");
    card.style.borderColor = "#e8ecef";
    card.style.boxShadow = "0 2px 4px rgba(0,0,0,0.05)";
    card.style.transform = "translateX(0)";
  });

  const selectedCard = document.querySelector(
    `.doctor-card[data-doctor-id="${doctorId}"]`
  );
  if (selectedCard) {
    selectedCard.classList.add("selected");
    selectedCard.style.borderColor = specialtyColor;
    selectedCard.style.boxShadow = `0 4px 12px ${specialtyColor}40`;
    selectedCard.style.transform = "translateX(4px)";
  }

  // Scroll to date selection
  setTimeout(() => {
    document.getElementById("appointmentDate").focus();
  }, 300);
}

// Load time slots
async function loadTimeSlots(doctorId) {
  const date = document.getElementById("appointmentDate").value;
  if (!date) {
    document.getElementById("timeSlotsContainer").innerHTML = `
            <p style="color: var(--text-secondary); text-align: center;">
                Please select a date first
            </p>
        `;
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/scheduling/doctors/${doctorId}/slots/?date=${date}`,
      { headers: getAuthHeaders() }
    );

    if (response.ok) {
      const data = await response.json();
      displayTimeSlots(data.slots || []);
    } else {
      displayTimeSlots([]);
    }
  } catch (error) {
    console.error("Error loading slots:", error);
    displayTimeSlots([]);
  }
}

// Display time slots
function displayTimeSlots(slots) {
  const container = document.getElementById("timeSlotsContainer");

  if (slots.length === 0) {
    container.innerHTML = `
            <p style="color: var(--text-secondary); text-align: center;">
                No available time slots for this date
            </p>
        `;
    return;
  }

  container.innerHTML = `
        <h4 style="margin-bottom: 1rem;">Available Time Slots:</h4>
        <div class="time-slots-grid">
            ${slots
              .map(
                (slot) => `
                <button type="button" class="time-slot" onclick="selectTimeSlot('${slot}')">
                    ${slot}
                </button>
            `
              )
              .join("")}
        </div>
    `;
}

// Select time slot
let selectedTimeSlot = null;

function selectTimeSlot(time) {
  selectedTimeSlot = time;

  // Highlight selected slot
  document.querySelectorAll(".time-slot").forEach((slot) => {
    slot.classList.remove("selected");
  });
  event.currentTarget.classList.add("selected");
}

// Handle date change
document.getElementById("appointmentDate")?.addEventListener("change", () => {
  if (selectedDoctorId) {
    loadTimeSlots(selectedDoctorId);
  }
});

// Handle book form
document.getElementById("bookForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!selectedDoctorId) {
    showBookAlert("Please select a doctor");
    return;
  }

  if (!selectedTimeSlot) {
    showBookAlert("Please select a time slot");
    return;
  }

  const date = document.getElementById("appointmentDate").value;
  const reason = document.getElementById("appointmentReason").value;

  // Combine date and time
  const scheduledAt = `${date}T${selectedTimeSlot}:00`;

  setBookLoading(true);

  try {
    const response = await fetch(`${API_BASE_URL}/scheduling/appointments/`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        doctor: selectedDoctorId,
        scheduled_at: scheduledAt,
        reason: reason,
        status: "scheduled",
      }),
    });

    if (response.status === 401) {
      logout();
      return;
    }

    const data = await response.json();

    if (response.ok) {
      showBookAlert("Appointment booked successfully!", "success");
      setTimeout(() => {
        closeBookModal();
        loadAppointments();
      }, 1500);
    } else {
      showBookAlert(data.detail || data.error || "Booking failed");
    }
  } catch (error) {
    console.error("Booking error:", error);
    showBookAlert("Network error. Please try again.");
  } finally {
    setBookLoading(false);
  }
});

// Book alert
function showBookAlert(message, type = "error") {
  const alertDiv = document.getElementById("bookAlert");
  const alertText = document.getElementById("bookAlertText");

  alertDiv.className = `alert alert-${type}`;
  alertText.textContent = message;
  alertDiv.classList.remove("hidden");

  if (type === "success") {
    setTimeout(() => alertDiv.classList.add("hidden"), 3000);
  }
}

// Book loading state
function setBookLoading(isLoading) {
  const btn = document.getElementById("bookBtn");
  const spinner = document.getElementById("bookSpinner");
  const text = document.getElementById("bookBtnText");

  btn.disabled = isLoading;
  if (isLoading) {
    spinner.classList.remove("hidden");
    text.classList.add("hidden");
  } else {
    spinner.classList.add("hidden");
    text.classList.remove("hidden");
  }
}

// Cancel appointment
async function cancelAppointment(id) {
  if (!confirm("Are you sure you want to cancel this appointment?")) {
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/scheduling/appointments/${id}/`,
      {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: "cancelled" }),
      }
    );

    if (response.ok) {
      loadAppointments();
    } else {
      alert("Failed to cancel appointment");
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Error cancelling appointment");
  }
}

// View appointment details
function viewAppointmentDetails(id) {
  // Implement detailed view if needed
  alert(`Viewing details for appointment ${id}`);
}

// Utility functions
function formatDate(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTime(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusColor(status) {
  const colors = {
    scheduled: "info",
    completed: "success",
    cancelled: "error",
    "no-show": "error",
  };
  return colors[status] || "info";
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
    loadAppointments();

    // Set min date to today
    const dateInput = document.getElementById("appointmentDate");
    if (dateInput) {
      const today = new Date().toISOString().split("T")[0];
      dateInput.setAttribute("min", today);
    }
  });
}
