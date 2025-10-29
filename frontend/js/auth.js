// Authentication JavaScript for NexusCare
const API_BASE_URL = "http://localhost:8000/api";

// Utility Functions
function showAlert(message, type = "error") {
  const alertDiv = document.getElementById("alertMessage");
  const alertText = document.getElementById("alertText");

  alertDiv.className = `alert alert-${type}`;
  alertText.textContent = message;
  alertDiv.classList.remove("hidden");

  // Auto-hide after 5 seconds
  setTimeout(() => {
    alertDiv.classList.add("hidden");
  }, 5000);
}

function setLoading(btnId, spinnerId, textId, isLoading) {
  const btn = document.getElementById(btnId);
  const spinner = document.getElementById(spinnerId);
  const text = document.getElementById(textId);

  if (isLoading) {
    btn.disabled = true;
    spinner.classList.remove("hidden");
    text.classList.add("hidden");
  } else {
    btn.disabled = false;
    spinner.classList.add("hidden");
    text.classList.remove("hidden");
  }
}

// Login Handler
if (document.getElementById("loginForm")) {
  document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const remember = document.getElementById("remember").checked;

    setLoading("loginBtn", "loginSpinner", "loginBtnText", true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store tokens
        localStorage.setItem("accessToken", data.access);
        localStorage.setItem("refreshToken", data.refresh);
        localStorage.setItem("userEmail", email);
        localStorage.setItem("userRole", data.user?.role || "patient");

        if (remember) {
          localStorage.setItem("rememberMe", "true");
        }

        showAlert("Login successful! Redirecting...", "success");

        // Redirect to dashboard
        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 1000);
      } else {
        showAlert(
          data.detail ||
            data.error ||
            "Login failed. Please check your credentials."
        );
      }
    } catch (error) {
      console.error("Login error:", error);
      if (
        error.name === "TypeError" &&
        error.message.includes("Failed to fetch")
      ) {
        showAlert(
          "Cannot connect to backend server. Please check:\n" +
            "1. Backend is running: cd backend && source .venv/bin/activate && python manage.py runserver\n" +
            "2. CORS is configured for port 8080\n" +
            "3. Backend API URL: " +
            API_BASE_URL
        );
      } else {
        showAlert(
          "Network error: " +
            error.message +
            "\nPlease ensure the backend server is running at " +
            API_BASE_URL
        );
      }
    } finally {
      setLoading("loginBtn", "loginSpinner", "loginBtnText", false);
    }
  });
}

// Register Handler
if (document.getElementById("registerForm")) {
  document
    .getElementById("registerForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      const confirmPassword = document.getElementById("confirmPassword").value;
      const phone = document.getElementById("phone").value;
      const role = document.getElementById("role").value;

      // Validate passwords match
      if (password !== confirmPassword) {
        showAlert("Passwords do not match!");
        return;
      }

      // Validate password strength
      if (password.length < 8) {
        showAlert("Password must be at least 8 characters long!");
        return;
      }

      if (
        !/[A-Z]/.test(password) ||
        !/[a-z]/.test(password) ||
        !/[0-9]/.test(password)
      ) {
        showAlert("Password must contain uppercase, lowercase, and numbers!");
        return;
      }

      setLoading("registerBtn", "registerSpinner", "registerBtnText", true);

      try {
        const response = await fetch(`${API_BASE_URL}/auth/register/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
            phone: phone || null,
            role,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          // Store tokens
          localStorage.setItem("accessToken", data.access);
          localStorage.setItem("refreshToken", data.refresh);
          localStorage.setItem("userEmail", email);
          localStorage.setItem("userRole", data.user?.role || role);

          showAlert("Account created successfully! Redirecting...", "success");

          // Redirect to dashboard
          setTimeout(() => {
            window.location.href = "dashboard.html";
          }, 1500);
        } else {
          const errorMsg = data.email
            ? data.email[0]
            : data.password
            ? data.password[0]
            : data.detail || "Registration failed. Please try again.";
          showAlert(errorMsg);
        }
      } catch (error) {
        console.error("Registration error:", error);
        if (
          error.name === "TypeError" &&
          error.message.includes("Failed to fetch")
        ) {
          showAlert(
            "Cannot connect to backend server. Please check:\n" +
              "1. Backend is running: cd backend && source .venv/bin/activate && python manage.py runserver\n" +
              "2. CORS is configured for port 8080\n" +
              "3. Backend API URL: " +
              API_BASE_URL
          );
        } else {
          showAlert(
            "Network error: " +
              error.message +
              "\nPlease ensure the backend server is running at " +
              API_BASE_URL
          );
        }
      } finally {
        setLoading("registerBtn", "registerSpinner", "registerBtnText", false);
      }
    });
}

// Check if user is already logged in
function checkAuth() {
  const token = localStorage.getItem("accessToken");
  if (!token && window.location.pathname.includes("dashboard")) {
    window.location.href = "login.html";
  }
}

// Logout function
function logout() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("userRole");
  localStorage.removeItem("rememberMe");
  window.location.href = "index.html";
}

// Initialize
checkAuth();
