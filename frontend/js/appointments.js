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
  console.log("📅 Opening book modal...");
  document.getElementById("bookModal").classList.remove("hidden");
  console.log("🔄 Calling searchDoctors...");
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

// Load doctors for main page
async function loadDoctorsMainPage() {
  console.log("🏥 Loading doctors for main page...");
  const container = document.getElementById("doctorsList");

  if (!container) {
    console.log("ℹ️ doctorsList container not found, skipping main page load");
    return;
  }

  // 🔍 AUTHENTICATION DEBUGGING
  const token = localStorage.getItem("accessToken");
  const userEmail = localStorage.getItem("userEmail");
  console.log("🔐 Auth Debug:");
  console.log("  - Token exists:", !!token);
  console.log("  - User email:", userEmail || "NOT LOGGED IN");
  if (token) {
    console.log(
      "  - Token preview:",
      token.substring(0, 20) + "..." + token.substring(token.length - 20)
    );
  } else {
    console.error("❌ NO TOKEN FOUND - User not logged in!");
    container.innerHTML = `
      <div class="feature-card" style="text-align: center; padding: 3rem; border: 2px solid #dc3545;">
        <i class="fas fa-exclamation-triangle" style="font-size: 4rem; color: #dc3545; margin-bottom: 1rem;"></i>
        <h3 style="color: #dc3545; margin-bottom: 1rem;">Authentication Required</h3>
        <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">
          You need to be logged in to view doctors
        </p>
        <a href="login.html" class="btn btn-primary">
          <i class="fas fa-sign-in-alt"></i> Login Now
        </a>
      </div>
    `;
    return;
  }

  try {
    console.log("📡 Fetching from:", `${API_BASE_URL}/doctors/`);
    const response = await fetch(`${API_BASE_URL}/doctors/`, {
      headers: getAuthHeaders(),
    });

    console.log("📬 API Response:");
    console.log("  - Status:", response.status);
    console.log("  - Status Text:", response.statusText);

    if (response.status === 401) {
      console.error("❌ 401 Unauthorized - Token invalid or expired");
      container.innerHTML = `
        <div class="feature-card" style="text-align: center; padding: 3rem; border: 2px solid #ffc107;">
          <i class="fas fa-clock" style="font-size: 4rem; color: #ffc107; margin-bottom: 1rem;"></i>
          <h3 style="color: #ffc107; margin-bottom: 1rem;">Session Expired</h3>
          <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">
            Your login session has expired. Please login again.
          </p>
          <a href="login.html" class="btn btn-primary">
            <i class="fas fa-sign-in-alt"></i> Login Again
          </a>
        </div>
      `;
      // Don't auto-logout, let user see the message
      return;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const doctors = data.results || data || [];

    console.log("✅ API Success:");
    console.log("  - Doctors count:", doctors.length);
    if (doctors.length > 0) {
      console.log(
        "  - First doctor:",
        doctors[0].name || doctors[0].user_name || doctors[0].email
      );
    }

    console.log(`✅ Loaded ${doctors.length} doctors for main page`);

    if (doctors.length === 0) {
      container.innerHTML = `
        <div class="feature-card" style="text-align: center; padding: 3rem;">
          <i class="fas fa-user-md" style="font-size: 4rem; color: var(--text-secondary); opacity: 0.5; margin-bottom: 1rem;"></i>
          <p style="color: var(--text-secondary); font-size: 1.1rem; font-weight: 600;">
            No doctors found in the system
          </p>
          <p style="color: var(--text-light); font-size: 0.9rem; margin-top: 0.5rem;">
            Please contact administrator to add doctors
          </p>
        </div>
      `;
      return;
    }

    // Display doctors as cards
    container.innerHTML = doctors
      .map((doctor) => {
        const doctorName =
          doctor.name || doctor.user_name || doctor.email || "Unknown Doctor";
        const specialty = doctor.specialty || "General Medicine";
        const location = doctor.location || "Location not specified";
        const rating = doctor.rating || "4.5";
        const qualifications = doctor.qualifications || "";

        return `
        <div class="feature-card" style="cursor: pointer; transition: all 0.3s ease;" 
             onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='var(--shadow-lg)';"
             onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='var(--shadow-md)';"
             onclick="showBookModalWithDoctor(${doctor.id})">
          <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
            <div style="width: 60px; height: 60px; background: linear-gradient(135deg, var(--primary-blue), var(--accent-teal)); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.5rem; font-weight: bold;">
              ${doctorName.charAt(0).toUpperCase()}
            </div>
            <div style="flex: 1;">
              <h3 style="margin: 0; color: var(--text-primary); font-size: 1.1rem;">
                ${escapeHtml(doctorName)}
              </h3>
              <p style="margin: 0.25rem 0 0 0; color: var(--text-secondary); font-size: 0.9rem;">
                ${escapeHtml(specialty)}
              </p>
            </div>
            <div style="text-align: right;">
              <div style="background: linear-gradient(135deg, #ffd700, #ffed4e); padding: 0.25rem 0.75rem; border-radius: 20px; font-weight: bold; color: #333; font-size: 0.9rem;">
                ⭐ ${rating}
              </div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 0.5rem;">
            <i class="fas fa-map-marker-alt"></i>
            <span>${escapeHtml(location)}</span>
          </div>
          ${
            qualifications
              ? `
            <div style="color: var(--text-light); font-size: 0.8rem; margin-bottom: 1rem;">
              <i class="fas fa-graduation-cap"></i> ${escapeHtml(
                qualifications
              )}
            </div>
          `
              : ""
          }
          <button class="btn btn-primary" style="width: 100%;" onclick="event.stopPropagation(); showBookModalWithDoctor(${
            doctor.id
          })">
            <i class="fas fa-calendar-plus"></i> Book Appointment
          </button>
        </div>
      `;
      })
      .join("");
  } catch (error) {
    console.error("❌ Error loading doctors:", error);
    console.error("  - Error type:", error.name);
    console.error("  - Error message:", error.message);

    const token = localStorage.getItem("accessToken");
    const isAuthError =
      !token ||
      error.message.includes("401") ||
      error.message.includes("Unauthorized");

    if (isAuthError) {
      container.innerHTML = `
        <div class="feature-card" style="text-align: center; padding: 3rem; border: 2px solid #dc3545;">
          <i class="fas fa-lock" style="font-size: 4rem; color: #dc3545; margin-bottom: 1rem;"></i>
          <h3 style="color: #dc3545; margin-bottom: 1rem;">Authentication Failed</h3>
          <p style="color: var(--text-secondary); margin-bottom: 0.5rem;">
            ${error.message}
          </p>
          <p style="color: var(--text-light); font-size: 0.9rem; margin-bottom: 1.5rem;">
            ${
              !token
                ? "No authentication token found"
                : "Your session may have expired"
            }
          </p>
          <a href="login.html" class="btn btn-primary">
            <i class="fas fa-sign-in-alt"></i> Login ${!token ? "Now" : "Again"}
          </a>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="feature-card" style="text-align: center; padding: 3rem;">
          <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: var(--status-error); margin-bottom: 1rem;"></i>
          <p style="color: var(--status-error); font-weight: 600;">
            Error loading doctors
          </p>
          <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 0.5rem;">
            ${error.message}
          </p>
          <button class="btn btn-secondary" style="margin-top: 1rem;" onclick="loadDoctorsMainPage()">
            <i class="fas fa-redo"></i> Retry
          </button>
        </div>
      `;
    }
  }
}

// Helper function to open modal with pre-selected doctor
function showBookModalWithDoctor(doctorId) {
  showBookModal();
  // Wait for modal to open and doctors to load, then select
  setTimeout(() => {
    const doctorCard = document.querySelector(
      `.doctor-card-hover[data-doctor-id="${doctorId}"]`
    );
    if (doctorCard) {
      doctorCard.click();
    }
  }, 500);
}

// Search doctors on main page with filters
async function searchDoctorsMainPage() {
  console.log("🔍 Searching doctors on main page...");
  const specialty = document.getElementById("mainSpecialtyFilter")?.value || "";
  const location = document.getElementById("mainLocationFilter")?.value || "";

  console.log("Main page search params:", { specialty, location });

  const container = document.getElementById("doctorsList");
  if (!container) return;

  // Show loading
  container.innerHTML = `
    <div class="feature-card" style="text-align: center; padding: 3rem">
      <div class="spinner" style="margin: 0 auto 1rem"></div>
      <p style="color: var(--text-secondary)">Searching doctors...</p>
    </div>
  `;

  try {
    let url = `${API_BASE_URL}/doctors/`;
    const params = new URLSearchParams();
    if (specialty) params.append("specialty", specialty);
    if (location) params.append("location", location);
    if (params.toString()) url += `?${params.toString()}`;

    console.log("Fetching from:", url);

    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });

    if (response.status === 401) {
      logout();
      return;
    }

    const data = await response.json();
    const doctors = data.results || data || [];

    console.log(`Found ${doctors.length} doctors on main page`);

    if (doctors.length === 0) {
      container.innerHTML = `
        <div class="feature-card" style="text-align: center; padding: 3rem;">
          <i class="fas fa-user-md" style="font-size: 4rem; color: var(--text-secondary); opacity: 0.5; margin-bottom: 1rem;"></i>
          <p style="color: var(--text-secondary); font-size: 1.1rem; font-weight: 600;">
            No doctors found matching your search
          </p>
          <p style="color: var(--text-light); font-size: 0.9rem; margin-top: 0.5rem;">
            Try different filters or <a href="#" onclick="document.getElementById('mainSpecialtyFilter').value=''; document.getElementById('mainLocationFilter').value=''; searchDoctorsMainPage(); return false;" style="color: var(--primary-blue); text-decoration: underline;">clear filters</a>
          </p>
        </div>
      `;
      return;
    }

    // Display doctors (reuse the same rendering logic)
    container.innerHTML = doctors
      .map((doctor) => {
        const doctorName =
          doctor.name || doctor.user_name || doctor.email || "Unknown Doctor";
        const specialty = doctor.specialty || "General Medicine";
        const location = doctor.location || "Location not specified";
        const rating = doctor.rating || "4.5";
        const qualifications = doctor.qualifications || "";

        return `
        <div class="feature-card" style="cursor: pointer; transition: all 0.3s ease;" 
             onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='var(--shadow-lg)';"
             onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='var(--shadow-md)';"
             onclick="showBookModalWithDoctor(${doctor.id})">
          <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
            <div style="width: 60px; height: 60px; background: linear-gradient(135deg, var(--primary-blue), var(--accent-teal)); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.5rem; font-weight: bold;">
              ${doctorName.charAt(0).toUpperCase()}
            </div>
            <div style="flex: 1;">
              <h3 style="margin: 0; color: var(--text-primary); font-size: 1.1rem;">
                ${escapeHtml(doctorName)}
              </h3>
              <p style="margin: 0.25rem 0 0 0; color: var(--text-secondary); font-size: 0.9rem;">
                ${escapeHtml(specialty)}
              </p>
            </div>
            <div style="text-align: right;">
              <div style="background: linear-gradient(135deg, #ffd700, #ffed4e); padding: 0.25rem 0.75rem; border-radius: 20px; font-weight: bold; color: #333; font-size: 0.9rem;">
                ⭐ ${rating}
              </div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 0.5rem;">
            <i class="fas fa-map-marker-alt"></i>
            <span>${escapeHtml(location)}</span>
          </div>
          ${
            qualifications
              ? `
            <div style="color: var(--text-light); font-size: 0.8rem; margin-bottom: 1rem;">
              <i class="fas fa-graduation-cap"></i> ${escapeHtml(
                qualifications
              )}
            </div>
          `
              : ""
          }
          <button class="btn btn-primary" style="width: 100%;" onclick="event.stopPropagation(); showBookModalWithDoctor(${
            doctor.id
          })">
            <i class="fas fa-calendar-plus"></i> Book Appointment
          </button>
        </div>
      `;
      })
      .join("");
  } catch (error) {
    console.error("❌ Error searching doctors:", error);
    container.innerHTML = `
      <div class="feature-card" style="text-align: center; padding: 3rem;">
        <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: var(--status-error); margin-bottom: 1rem;"></i>
        <p style="color: var(--status-error); font-weight: 600;">
          Error searching doctors
        </p>
        <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 0.5rem;">
          ${error.message}
        </p>
        <button class="btn btn-secondary" style="margin-top: 1rem;" onclick="searchDoctorsMainPage()">
          <i class="fas fa-redo"></i> Retry
        </button>
      </div>
    `;
  }
}

// Search doctors
async function searchDoctors() {
  console.log("🔍 searchDoctors() called");
  const specialty = document.getElementById("specialtyFilter")?.value || "";
  const location = document.getElementById("locationFilter")?.value || "";
  const searchQuery =
    document.getElementById("doctorSearchInput")?.value.toLowerCase() || "";

  console.log("Search params:", { specialty, location, searchQuery });

  let url = `${API_BASE_URL}/doctors/`;
  const params = new URLSearchParams();
  if (specialty) params.append("specialty", specialty);
  if (location) params.append("location", location);
  if (params.toString()) url += `?${params.toString()}`;

  console.log("Fetching from:", url);

  try {
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });

    console.log("Response status:", response.status);

    if (response.status === 401) {
      console.log("❌ Unauthorized - logging out");
      logout();
      return;
    }

    const data = await response.json();
    console.log("Received data:", data);

    let doctors = data.results || data || [];
    console.log(`Found ${doctors.length} doctors`);

    // Apply client-side search filter
    if (searchQuery) {
      doctors = doctors.filter(
        (doc) =>
          doc.user.first_name.toLowerCase().includes(searchQuery) ||
          doc.user.last_name.toLowerCase().includes(searchQuery) ||
          doc.specialty.toLowerCase().includes(searchQuery) ||
          (doc.location && doc.location.toLowerCase().includes(searchQuery))
      );
      console.log(`After search filter: ${doctors.length} doctors`);
    }

    displayDoctors(doctors);
  } catch (error) {
    console.error("❌ Error searching doctors:", error);
    document.getElementById("doctorResults").innerHTML = `
      <div class="text-center py-8">
        <i class="fas fa-exclamation-triangle text-red-500 text-4xl mb-3"></i>
        <p class="text-red-600 font-semibold">Error loading doctors</p>
        <p class="text-gray-500 text-sm mt-2">${error.message}</p>
      </div>
    `;
  }
}

// Display doctors
function displayDoctors(doctors) {
  console.log("🎨 displayDoctors() called with", doctors.length, "doctors");

  const container = document.getElementById("doctorResults");
  const countElement = document.getElementById("doctorCount");

  if (!container) {
    console.error("❌ doctorResults container not found!");
    return;
  }

  if (countElement) {
    countElement.textContent = `${doctors.length} doctor${
      doctors.length !== 1 ? "s" : ""
    }`;
  }

  if (doctors.length === 0) {
    console.log("ℹ️ No doctors found, showing empty state");
    container.innerHTML = `
      <div class="text-center py-12">
        <div class="text-6xl mb-4 opacity-50">
          <i class="fas fa-user-md text-gray-300"></i>
        </div>
        <p class="text-gray-600 text-lg font-semibold mb-2">
          No doctors found
        </p>
        <p class="text-gray-500 text-sm">
          Try adjusting your filters or search query
        </p>
      </div>
    `;
    return;
  }

  console.log("✅ Rendering", doctors.length, "doctor cards");

  // Get specialty data with icons and colors
  const getSpecialtyData = (specialty) => {
    const data = {
      Cardiology: {
        icon: "fa-heart-pulse",
        color: "bg-red-500",
        lightColor: "bg-red-50",
        textColor: "text-red-700",
        borderColor: "border-red-400",
      },
      Dermatology: {
        icon: "fa-hand-sparkles",
        color: "bg-orange-500",
        lightColor: "bg-orange-50",
        textColor: "text-orange-700",
        borderColor: "border-orange-400",
      },
      Neurology: {
        icon: "fa-brain",
        color: "bg-purple-500",
        lightColor: "bg-purple-50",
        textColor: "text-purple-700",
        borderColor: "border-purple-400",
      },
      Orthopedics: {
        icon: "fa-bone",
        color: "bg-blue-500",
        lightColor: "bg-blue-50",
        textColor: "text-blue-700",
        borderColor: "border-blue-400",
      },
      "General Medicine": {
        icon: "fa-stethoscope",
        color: "bg-green-500",
        lightColor: "bg-green-50",
        textColor: "text-green-700",
        borderColor: "border-green-400",
      },
      Pediatrics: {
        icon: "fa-baby",
        color: "bg-pink-500",
        lightColor: "bg-pink-50",
        textColor: "text-pink-700",
        borderColor: "border-pink-400",
      },
      Psychiatry: {
        icon: "fa-head-side-virus",
        color: "bg-teal-500",
        lightColor: "bg-teal-50",
        textColor: "text-teal-700",
        borderColor: "border-teal-400",
      },
      ENT: {
        icon: "fa-ear-listen",
        color: "bg-amber-500",
        lightColor: "bg-amber-50",
        textColor: "text-amber-700",
        borderColor: "border-amber-400",
      },
      Ophthalmology: {
        icon: "fa-eye",
        color: "bg-slate-500",
        lightColor: "bg-slate-50",
        textColor: "text-slate-700",
        borderColor: "border-slate-400",
      },
      Gynecology: {
        icon: "fa-hospital-user",
        color: "bg-rose-500",
        lightColor: "bg-rose-50",
        textColor: "text-rose-700",
        borderColor: "border-rose-400",
      },
      Urology: {
        icon: "fa-droplet",
        color: "bg-cyan-500",
        lightColor: "bg-cyan-50",
        textColor: "text-cyan-700",
        borderColor: "border-cyan-400",
      },
      Pulmonology: {
        icon: "fa-lungs",
        color: "bg-emerald-500",
        lightColor: "bg-emerald-50",
        textColor: "text-emerald-700",
        borderColor: "border-emerald-400",
      },
      Gastroenterology: {
        icon: "fa-stomach",
        color: "bg-red-600",
        lightColor: "bg-red-50",
        textColor: "text-red-800",
        borderColor: "border-red-400",
      },
    };
    return (
      data[specialty] || {
        icon: "fa-user-doctor",
        color: "bg-indigo-500",
        lightColor: "bg-indigo-50",
        textColor: "text-indigo-700",
        borderColor: "border-indigo-400",
      }
    );
  };

  container.innerHTML = doctors
    .map((doctor, index) => {
      const doctorName = doctor.name || doctor.user_name || doctor.email;
      const specialty = doctor.specialty || "General Medicine";
      const location = doctor.location || "Location not specified";
      const rating = doctor.rating || "4.5";
      const qualifications = doctor.qualifications || "";
      const specialtyData = getSpecialtyData(specialty);

      return `
        <div 
          class="doctor-card-hover bg-white rounded-xl border-2 ${
            specialtyData.borderColor
          } shadow-sm p-4 cursor-pointer opacity-0"
          data-doctor-id="${doctor.id}"
          onclick="selectDoctor(${doctor.id}, '${escapeHtml(
        doctorName
      )}', '${escapeHtml(specialty)}')"
          style="animation: fadeInUp 0.5s ease forwards ${index * 0.1}s;"
        >
          <div class="flex items-start gap-4">
            <!-- Avatar Icon -->
            <div class="${
              specialtyData.color
            } rounded-xl p-4 flex items-center justify-center flex-shrink-0 shadow-lg">
              <i class="fas ${specialtyData.icon} text-white text-2xl"></i>
            </div>

            <!-- Doctor Info -->
            <div class="flex-1 min-w-0">
              <h3 class="text-lg font-bold text-gray-800 mb-1 truncate">
                ${escapeHtml(doctorName)}
              </h3>
              
              <div class="flex items-center gap-2 mb-2 flex-wrap">
                <span class="inline-flex items-center gap-1.5 px-3 py-1 ${
                  specialtyData.lightColor
                } ${
        specialtyData.textColor
      } rounded-full text-xs font-semibold">
                  <i class="fas ${specialtyData.icon}"></i>
                  ${escapeHtml(specialty)}
                </span>
                
                <span class="inline-flex items-center gap-1 text-gray-600 text-xs">
                  <i class="fas fa-location-dot"></i>
                  ${escapeHtml(location)}
                </span>
              </div>

              ${
                qualifications
                  ? `
                <p class="text-xs text-gray-500 truncate">
                  <i class="fas fa-graduation-cap mr-1"></i>${escapeHtml(
                    qualifications
                  )}
                </p>
              `
                  : ""
              }
            </div>

            <!-- Rating & Select -->
            <div class="flex flex-col items-end gap-2 flex-shrink-0">
              <div class="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full shadow-md">
                <i class="fas fa-star text-white text-sm"></i>
                <span class="text-white font-bold text-sm">${rating}</span>
              </div>
              
              <button 
                type="button"
                class="${
                  specialtyData.color
                } hover:opacity-90 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-md transition-all hover:scale-105 flex items-center gap-1.5"
              >
                <span>Select</span>
                <i class="fas fa-arrow-right"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  // Add fadeInUp animation if not exists
  if (!document.getElementById("fadeInUpStyle")) {
    const style = document.createElement("style");
    style.id = "fadeInUpStyle";
    style.textContent = `
      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }
}

// Select doctor and load time slots
let selectedDoctorId = null;
let selectedDoctorName = null;

function selectDoctor(doctorId, doctorName, specialty) {
  selectedDoctorId = doctorId;
  selectedDoctorName = doctorName;

  // Get specialty data
  const getSpecialtyData = (spec) => {
    const data = {
      Cardiology: { icon: "fa-heart-pulse", color: "bg-red-500" },
      Dermatology: { icon: "fa-hand-sparkles", color: "bg-orange-500" },
      Neurology: { icon: "fa-brain", color: "bg-purple-500" },
      Orthopedics: { icon: "fa-bone", color: "bg-blue-500" },
      "General Medicine": { icon: "fa-stethoscope", color: "bg-green-500" },
      Pediatrics: { icon: "fa-baby", color: "bg-pink-500" },
      Psychiatry: { icon: "fa-head-side-virus", color: "bg-teal-500" },
      ENT: { icon: "fa-ear-listen", color: "bg-amber-500" },
      Ophthalmology: { icon: "fa-eye", color: "bg-slate-500" },
      Gynecology: { icon: "fa-hospital-user", color: "bg-rose-500" },
      Urology: { icon: "fa-droplet", color: "bg-cyan-500" },
      Pulmonology: { icon: "fa-lungs", color: "bg-emerald-500" },
      Gastroenterology: { icon: "fa-stomach", color: "bg-red-600" },
    };
    return data[spec] || { icon: "fa-user-doctor", color: "bg-indigo-500" };
  };

  const specialtyData = getSpecialtyData(specialty);

  // Update hidden input
  document.getElementById("doctorSelect").value = doctorId;

  // Update selected doctor display with Tailwind
  document.getElementById("selectedDoctorDisplay").innerHTML = `
    <div class="flex items-center gap-4 bg-white p-3 rounded-xl shadow-sm">
      <!-- Icon -->
      <div class="${
        specialtyData.color
      } rounded-xl p-3 flex items-center justify-center shadow-md">
        <i class="fas ${specialtyData.icon} text-white text-2xl"></i>
      </div>
      
      <!-- Doctor Info -->
      <div class="flex-1">
        <div class="text-lg font-bold text-gray-800 mb-1">
          ${escapeHtml(doctorName)}
        </div>
        <div class="flex items-center gap-2 text-sm text-gray-600">
          <i class="fas ${specialtyData.icon}"></i>
          <span>${escapeHtml(specialty)}</span>
        </div>
      </div>
      
      <!-- Selected Badge -->
      <div class="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl shadow-lg font-bold">
        <i class="fas fa-check-circle text-lg"></i>
        <span>Selected</span>
      </div>
    </div>
  `;

  // Highlight selected doctor card
  document.querySelectorAll(".doctor-card-hover").forEach((card) => {
    card.classList.remove("selected", "ring-4", "ring-blue-300");
  });

  const selectedCard = document.querySelector(
    `.doctor-card-hover[data-doctor-id="${doctorId}"]`
  );
  if (selectedCard) {
    selectedCard.classList.add("selected", "ring-4", "ring-blue-300");
    selectedCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // Scroll to date selection
  setTimeout(() => {
    document.getElementById("appointmentDate")?.focus();
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

// Initialize - FIXED: DOMContentLoaded must run first, THEN check auth
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 Page loaded, initializing...");
  
  // Check authentication first
  if (!checkAuth()) {
    console.log("❌ Auth check failed, redirecting to login...");
    return; // checkAuth() will redirect to login.html
  }
  
  console.log("✅ Auth check passed, loading data...");
  
  // Load all data
  loadUserInfo();
  loadAppointments();
  loadDoctorsMainPage(); // Load doctors on main page

  // Set min date to today
  const dateInput = document.getElementById("appointmentDate");
  if (dateInput) {
    const today = new Date().toISOString().split("T")[0];
    dateInput.setAttribute("min", today);
  }
});
