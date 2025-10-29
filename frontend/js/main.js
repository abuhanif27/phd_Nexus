// Main JavaScript for NexusCare Landing Page

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute("href"));
    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  });
});

// Animate elements on scroll
const observerOptions = {
  threshold: 0.1,
  rootMargin: "0px 0px -50px 0px",
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = "1";
      entry.target.style.transform = "translateY(0)";
    }
  });
}, observerOptions);

// Observe all fade-in elements
document.querySelectorAll(".fade-in").forEach((el) => {
  el.style.opacity = "0";
  el.style.transform = "translateY(20px)";
  el.style.transition = "opacity 0.6s ease-out, transform 0.6s ease-out";
  observer.observe(el);
});

// Check if user is already logged in
const token = localStorage.getItem("accessToken");
if (token && window.location.pathname.includes("index.html")) {
  // Update nav menu to show dashboard link
  const navMenu = document.querySelector(".nav-menu");
  if (navMenu) {
    navMenu.innerHTML = `
            <li><a href="#features" class="nav-link">Features</a></li>
            <li><a href="#dashboard" class="nav-link">About</a></li>
            <li><a href="dashboard.html" class="btn btn-primary">Go to Dashboard</a></li>
        `;
  }
}

// Add loading animation
window.addEventListener("load", () => {
  document.body.style.opacity = "0";
  setTimeout(() => {
    document.body.style.transition = "opacity 0.3s ease-in";
    document.body.style.opacity = "1";
  }, 100);
});

// Mobile menu toggle (for responsive design)
const createMobileMenu = () => {
  const navbar = document.querySelector(".navbar-container");
  if (window.innerWidth <= 768 && navbar) {
    const menuButton = document.createElement("button");
    menuButton.className = "mobile-menu-btn";
    menuButton.innerHTML = "☰";
    menuButton.style.cssText = `
            display: block;
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: var(--secondary-blue);
        `;

    menuButton.addEventListener("click", () => {
      const navMenu = document.querySelector(".nav-menu");
      navMenu.style.display =
        navMenu.style.display === "flex" ? "none" : "flex";
    });
  }
};

// Initialize
window.addEventListener("resize", createMobileMenu);
createMobileMenu();

console.log("🏥 PhD NexusCare - Privacy-First Healthcare Platform");
console.log("📊 Backend API:", "http://localhost:8000/api");
console.log("✅ Status: Ready");
