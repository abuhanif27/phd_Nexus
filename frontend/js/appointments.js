// Appointments JavaScript for NexusCare
const API_BASE_URL = 'http://localhost:8000/api';

// Check authentication
function checkAuth() {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Logout function
function logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
    window.location.href = 'index.html';
}

// Get auth headers
function getAuthHeaders() {
    const token = localStorage.getItem('accessToken');
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

// Load user info
function loadUserInfo() {
    const userEmail = localStorage.getItem('userEmail');
    document.getElementById('userEmail').textContent = userEmail || 'User';
}

// Load appointments
async function loadAppointments() {
    try {
        const response = await fetch(`${API_BASE_URL}/scheduling/appointments/`, {
            headers: getAuthHeaders()
        });

        if (response.status === 401) {
            logout();
            return;
        }

        const data = await response.json();
        const appointments = data.results || data || [];

        // Separate upcoming and past
        const now = new Date();
        const upcoming = appointments.filter(apt => new Date(apt.scheduled_at) >= now);
        const past = appointments.filter(apt => new Date(apt.scheduled_at) < now);

        // Update stats
        document.getElementById('upcomingCount').textContent = upcoming.length;
        document.getElementById('completedCount').textContent = past.filter(a => a.status === 'completed').length;
        document.getElementById('cancelledCount').textContent = appointments.filter(a => a.status === 'cancelled').length;

        // Display appointments
        displayUpcomingAppointments(upcoming);
        displayPastAppointments(past);
    } catch (error) {
        console.error('Error loading appointments:', error);
    }
}

// Display upcoming appointments
function displayUpcomingAppointments(appointments) {
    const container = document.getElementById('upcomingAppointments');

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

    container.innerHTML = appointments.map(apt => `
        <div class="appointment-card">
            <div class="appointment-header">
                <h4>${escapeHtml(apt.doctor_name || 'Doctor')}</h4>
                <span class="badge badge-${getStatusColor(apt.status)}">${apt.status}</span>
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
                    <span>${escapeHtml(apt.specialty || 'General')}</span>
                </div>
                ${apt.reason ? `
                <div class="detail-item" style="grid-column: 1 / -1;">
                    <span>📋</span>
                    <span>${escapeHtml(apt.reason)}</span>
                </div>
                ` : ''}
            </div>
            <div class="appointment-actions">
                ${apt.status === 'scheduled' ? `
                    <button onclick="cancelAppointment(${apt.id})" class="btn btn-outline" style="color: var(--status-error);">
                        Cancel
                    </button>
                ` : ''}
                <button onclick="viewAppointmentDetails(${apt.id})" class="btn btn-outline">
                    View Details
                </button>
            </div>
        </div>
    `).join('');
}

// Display past appointments
function displayPastAppointments(appointments) {
    const container = document.getElementById('pastAppointments');

    if (appointments.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                <p>No past appointments</p>
            </div>
        `;
        return;
    }

    container.innerHTML = appointments.slice(0, 5).map(apt => `
        <div class="appointment-card compact">
            <div class="appointment-header">
                <h5>${escapeHtml(apt.doctor_name || 'Doctor')}</h5>
                <span class="badge badge-${getStatusColor(apt.status)}">${apt.status}</span>
            </div>
            <div class="appointment-details">
                <div class="detail-item">
                    <span>📅</span>
                    <span>${formatDate(apt.scheduled_at)}</span>
                </div>
                <div class="detail-item">
                    <span>🏥</span>
                    <span>${escapeHtml(apt.specialty || 'General')}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Show book modal
function showBookModal() {
    document.getElementById('bookModal').classList.remove('hidden');
    searchDoctors();
}

// Close book modal
function closeBookModal() {
    document.getElementById('bookModal').classList.add('hidden');
    document.getElementById('bookForm').reset();
    document.getElementById('doctorResults').innerHTML = '';
    document.getElementById('timeSlotsContainer').innerHTML = '';
    document.getElementById('bookAlert').classList.add('hidden');
}

// Search doctors
async function searchDoctors() {
    const specialty = document.getElementById('specialtyFilter').value;
    const location = document.getElementById('locationFilter').value;

    let url = `${API_BASE_URL}/doctors/`;
    const params = new URLSearchParams();
    if (specialty) params.append('specialty', specialty);
    if (location) params.append('location', location);
    if (params.toString()) url += `?${params.toString()}`;

    try {
        const response = await fetch(url, {
            headers: getAuthHeaders()
        });

        if (response.status === 401) {
            logout();
            return;
        }

        const data = await response.json();
        const doctors = data.results || data || [];

        displayDoctors(doctors);
    } catch (error) {
        console.error('Error searching doctors:', error);
        document.getElementById('doctorResults').innerHTML = `
            <p style="color: var(--status-error); text-align: center; padding: 1rem;">
                Error loading doctors. Please try again.
            </p>
        `;
    }
}

// Display doctors
function displayDoctors(doctors) {
    const container = document.getElementById('doctorResults');

    if (doctors.length === 0) {
        container.innerHTML = `
            <p style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                No doctors found matching your criteria
            </p>
        `;
        return;
    }

    container.innerHTML = doctors.map(doctor => `
        <div class="doctor-card" onclick="selectDoctor(${doctor.id}, '${escapeHtml(doctor.user_name || doctor.email)}')">
            <div class="doctor-avatar">
                ${(doctor.user_name || doctor.email).charAt(0).toUpperCase()}
            </div>
            <div class="doctor-info">
                <h4>${escapeHtml(doctor.user_name || doctor.email)}</h4>
                <p>${escapeHtml(doctor.specialty || 'General Medicine')}</p>
                ${doctor.license_number ? `<small>License: ${escapeHtml(doctor.license_number)}</small>` : ''}
            </div>
            <div class="doctor-rating">
                ⭐ ${doctor.rating || '4.8'}
            </div>
        </div>
    `).join('');
}

// Select doctor and load time slots
let selectedDoctorId = null;
let selectedDoctorName = null;

async function selectDoctor(doctorId, doctorName) {
    selectedDoctorId = doctorId;
    selectedDoctorName = doctorName;

    // Highlight selected doctor
    document.querySelectorAll('.doctor-card').forEach(card => {
        card.style.borderColor = 'var(--border-color)';
    });
    event.currentTarget.style.borderColor = 'var(--primary-blue)';

    // Load available time slots
    await loadTimeSlots(doctorId);
}

// Load time slots
async function loadTimeSlots(doctorId) {
    const date = document.getElementById('appointmentDate').value;
    if (!date) {
        document.getElementById('timeSlotsContainer').innerHTML = `
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
        console.error('Error loading slots:', error);
        displayTimeSlots([]);
    }
}

// Display time slots
function displayTimeSlots(slots) {
    const container = document.getElementById('timeSlotsContainer');

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
            ${slots.map(slot => `
                <button type="button" class="time-slot" onclick="selectTimeSlot('${slot}')">
                    ${slot}
                </button>
            `).join('')}
        </div>
    `;
}

// Select time slot
let selectedTimeSlot = null;

function selectTimeSlot(time) {
    selectedTimeSlot = time;

    // Highlight selected slot
    document.querySelectorAll('.time-slot').forEach(slot => {
        slot.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');
}

// Handle date change
document.getElementById('appointmentDate')?.addEventListener('change', () => {
    if (selectedDoctorId) {
        loadTimeSlots(selectedDoctorId);
    }
});

// Handle book form
document.getElementById('bookForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!selectedDoctorId) {
        showBookAlert('Please select a doctor');
        return;
    }

    if (!selectedTimeSlot) {
        showBookAlert('Please select a time slot');
        return;
    }

    const date = document.getElementById('appointmentDate').value;
    const reason = document.getElementById('appointmentReason').value;

    // Combine date and time
    const scheduledAt = `${date}T${selectedTimeSlot}:00`;

    setBookLoading(true);

    try {
        const response = await fetch(`${API_BASE_URL}/scheduling/appointments/`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                doctor: selectedDoctorId,
                scheduled_at: scheduledAt,
                reason: reason,
                status: 'scheduled'
            })
        });

        if (response.status === 401) {
            logout();
            return;
        }

        const data = await response.json();

        if (response.ok) {
            showBookAlert('Appointment booked successfully!', 'success');
            setTimeout(() => {
                closeBookModal();
                loadAppointments();
            }, 1500);
        } else {
            showBookAlert(data.detail || data.error || 'Booking failed');
        }
    } catch (error) {
        console.error('Booking error:', error);
        showBookAlert('Network error. Please try again.');
    } finally {
        setBookLoading(false);
    }
});

// Book alert
function showBookAlert(message, type = 'error') {
    const alertDiv = document.getElementById('bookAlert');
    const alertText = document.getElementById('bookAlertText');

    alertDiv.className = `alert alert-${type}`;
    alertText.textContent = message;
    alertDiv.classList.remove('hidden');

    if (type === 'success') {
        setTimeout(() => alertDiv.classList.add('hidden'), 3000);
    }
}

// Book loading state
function setBookLoading(isLoading) {
    const btn = document.getElementById('bookBtn');
    const spinner = document.getElementById('bookSpinner');
    const text = document.getElementById('bookBtnText');

    btn.disabled = isLoading;
    if (isLoading) {
        spinner.classList.remove('hidden');
        text.classList.add('hidden');
    } else {
        spinner.classList.add('hidden');
        text.classList.remove('hidden');
    }
}

// Cancel appointment
async function cancelAppointment(id) {
    if (!confirm('Are you sure you want to cancel this appointment?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/scheduling/appointments/${id}/`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({ status: 'cancelled' })
        });

        if (response.ok) {
            loadAppointments();
        } else {
            alert('Failed to cancel appointment');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error cancelling appointment');
    }
}

// View appointment details
function viewAppointmentDetails(id) {
    // Implement detailed view if needed
    alert(`Viewing details for appointment ${id}`);
}

// Utility functions
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        weekday: 'short',
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function formatTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

function getStatusColor(status) {
    const colors = {
        'scheduled': 'info',
        'completed': 'success',
        'cancelled': 'error',
        'no-show': 'error'
    };
    return colors[status] || 'info';
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize
if (checkAuth()) {
    document.addEventListener('DOMContentLoaded', () => {
        loadUserInfo();
        loadAppointments();
        
        // Set min date to today
        const dateInput = document.getElementById('appointmentDate');
        if (dateInput) {
            const today = new Date().toISOString().split('T')[0];
            dateInput.setAttribute('min', today);
        }
    });
}
