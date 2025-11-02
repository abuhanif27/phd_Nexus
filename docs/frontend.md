# Frontend Documentation

> Beautiful, responsive user interface for PhD NexusCare healthcare platform.

---

## 📁 File Structure

```
frontend/
├── index.html              # Landing page
├── login.html              # Login page
├── register.html           # Registration page
├── dashboard.html          # User dashboard
├── appointments.html       # Appointment booking
├── records.html            # Medical records
├── ai-insights.html        # AI symptom analysis
├── profile.html            # User profile
├── css/
│   └── style.css           # Main stylesheet (60-30-10 design)
└── js/
    ├── main.js             # Landing page scripts
    ├── auth.js             # Authentication logic
    ├── dashboard.js        # Dashboard functionality
    ├── appointments.js     # Appointment booking
    ├── records.js          # Medical records
    ├── ai-insights.js      # AI features
    └── profile.js          # Profile management
```

---

## 🎨 Design System (60-30-10 Color Rule)

### Color Palette

**60% - Primary (Backgrounds & Dominant Areas)**

- Soft Blue/White: `#f8f9fd`, `#ffffff`, `#e8ecf7`
- Used for: Main backgrounds, cards, content areas
- Creates calm, clean medical environment

**30% - Secondary (Supporting Elements)**

- Blue Spectrum: `#4a90e2`, `#6ba3e8`, `#2c5282`
- Used for: Navigation, headers, tables, secondary buttons
- Professional medical blue theme

**10% - Accent (Call-to-Actions & Highlights)**

- Teal/Green: `#00d9b5`, `#48bb78`, `#38b2ac`
- Used for: Primary buttons, highlights, active states, borders
- Draws attention to important actions

### Typography

- **Headings**: Poppins (600-700 weight)
- **Body Text**: Inter (400-600 weight)
- **Font Scale**: Base 16px with harmonious scaling
- **Line Height**: 1.6 for readability

### Spacing System

- Base unit: 8px
- Consistent spacing: 0.5rem, 1rem, 1.5rem, 2rem
- Uses CSS custom properties for maintainability

### Visual Elements

- **Cards**: Soft shadows, 8px border-radius
- **Buttons**: Rounded corners, hover effects
- **Inputs**: Clear borders, focus states
- **Icons**: Font Awesome 6.4.0

---

## 📄 Pages Overview

### 1. Landing Page (`index.html`)

**Purpose**: Marketing page for first-time visitors

**Features**:

- Hero section with gradient design
- Feature showcase cards
- Technology stack display
- Smooth scroll navigation
- Responsive grid layout
- Call-to-action buttons

**JavaScript**: `js/main.js`

- Smooth scrolling
- Navigation highlighting
- Fade-in animations on scroll

### 2. Login Page (`login.html`)

**Purpose**: User authentication

**Features**:

- Beautiful centered auth card
- Real-time form validation
- Loading states with spinners
- Error/success alerts
- Demo credentials display
- JWT token management
- Remember me option

**JavaScript**: `js/auth.js`

- Form validation
- API authentication
- Token storage (localStorage)
- Redirect after login

**API Endpoint**: `POST /api/auth/login/`

### 3. Registration Page (`register.html`)

**Purpose**: New user signup

**Features**:

- Role selection (Patient/Doctor)
- Password strength validation
- Password confirmation matching
- Email validation
- Phone number validation
- Terms acceptance
- Success redirect

**JavaScript**: `js/auth.js`

- Password strength checker
- Form validation
- API registration
- Auto-login after registration

**API Endpoint**: `POST /api/auth/register/`

### 4. Dashboard (`dashboard.html`)

**Purpose**: Main user interface after login

**Features**:

- Stats cards with animations
- Recent records table
- Upcoming appointments list
- Quick action cards
- Profile widget in navigation
- Protected route (requires login)

**JavaScript**: `js/dashboard.js`

- Fetch user stats
- Load recent records
- Display appointments
- Quick navigation

**API Endpoints**:

- `GET /api/auth/me/` - User info
- `GET /api/records/summary/` - Stats
- `GET /api/records/files/` - Recent records
- `GET /api/scheduling/appointments/` - Appointments

### 5. Medical Records (`records.html`)

**Purpose**: Upload and manage medical documents

**Features**:

- View all records in table format
- Upload new records (Lab Results, Prescriptions, Imaging, Documents)
- Filter and search records
- Download/view medical documents
- Stats dashboard (total records by type)
- Color-coded file types
- Date sorting

**JavaScript**: `js/records.js`

- File upload with FormData
- Records listing from API
- File type categorization
- View/download functionality
- Search and filter

**API Endpoints**:

- `GET /api/records/files/` - List all records
- `POST /api/records/files/upload/` - Upload new record
- `GET /api/records/files/{id}/link/` - Get signed download link

### 6. Appointments (`appointments.html`)

**Purpose**: Book and manage appointments with doctors

**Features**:

- View upcoming and past appointments
- Book new appointments with advanced doctor search
- Filter doctors by specialty (Cardiology, Dermatology, etc.)
- Filter by location
- Search by doctor name
- Color-coded specialty cards
- Select available time slots
- Cancel appointments
- Stats dashboard (upcoming, completed, cancelled)
- Beautiful modal with sequential card animations

**JavaScript**: `js/appointments.js`

- Doctor search with real-time filtering
- Time slot availability checker
- Appointment booking form
- Status management (upcoming, completed, cancelled)
- Interactive doctor cards with hover effects

**API Endpoints**:

- `GET /api/scheduling/appointments/` - List appointments
- `POST /api/scheduling/appointments/` - Book appointment
- `GET /api/doctors/` - Search doctors
- `GET /api/scheduling/doctors/{id}/slots/?date=YYYY-MM-DD` - Get available slots
- `PATCH /api/scheduling/appointments/{id}/` - Update status

**Specialty Color Codes**:

- ❤️ Cardiology: Red border
- 🧴 Dermatology: Orange border
- 🧠 Neurology: Purple border
- 🦴 Orthopedics: Blue border
- 🩺 General Medicine: Green border

### 7. AI Insights (`ai-insights.html`)

**Purpose**: AI-powered symptom analysis and medical text summarization

**Features**:

**Symptom Analyzer**:

- Enter symptoms in natural language
- Get specialist recommendation with confidence score
- View alternative specialists
- Example symptoms provided for testing
- Model type display (PyTorch 🧠, Sklearn ⚡, Legacy 🤖)
- Model description with accuracy range
- Confidence visualization with progress bar

**Medical Summary Generator**:

- Input medical text/reports
- Get AI-generated summary
- Extract key points
- Identify medical entities (conditions, medications)

**Educational Section**:

- "Powered by Advanced Machine Learning"
- PyTorch Model Card (DistilBERT, 66M params, 85-95% accuracy)
- Scikit-learn Model Card (TF-IDF + LogReg, 75-85% accuracy)
- Smart model selection explanation

**JavaScript**: `js/ai-insights.js`

- Symptom analysis with confidence visualization
- Medical text summarization
- Entity extraction display
- Example symptoms helper
- Model badge display
- Model-specific descriptions

**API Endpoints**:

- `POST /api/ai/specialist/` - Analyze symptoms and predict specialist
- `POST /api/ai/summary/` - Generate medical summary
- `GET /api/ai/models/status/` - Check which models are trained

### 8. Profile Page (`profile.html`)

**Purpose**: User profile management

**Features**:

- View and edit personal information
- Upload profile photo
- Update contact details
- Edit medical information (blood group, medical conditions)
- Change password
- Account settings
- Date of birth picker
- Gender selection
- Address management

**JavaScript**: `js/profile.js`

- Load patient profile
- Update profile information
- Photo upload with preview
- Form validation
- Success/error notifications

**API Endpoints**:

- `GET /api/patients/` - Get patient profile
- `PUT /api/patients/` - Update patient profile
- `POST /api/patients/upload-photo/` - Upload profile photo

---

## 🎨 Key Design Features

### Visual Hierarchy

1. **Large headings** with gradient text effects
2. **Card-based layouts** with consistent shadows
3. **Icon-driven** interface for quick recognition
4. **Color-coded badges** for status indicators
5. **Progress bars** for data visualization

### Animations

- Fade-in on scroll
- Hover transformations (cards slide and glow)
- Loading spinners (consistent across all forms)
- Smooth transitions (0.3s ease)
- Pulse effects on stat cards
- Sequential card animations (0.1s delay each)

### Responsive Design

- Mobile-first approach
- Breakpoint at 768px
- Flexible grid layouts
- Collapsible navigation (hamburger menu)
- Touch-friendly buttons (44px minimum)
- Responsive tables (scroll on mobile)

---

## 🔗 API Integration

### Base URL

```javascript
const API_BASE_URL = "http://localhost:8000/api";
```

### Authentication Flow

1. User logs in → Receives JWT tokens (access + refresh)
2. Tokens stored in `localStorage`:
   - `access_token` - Short-lived (1 hour)
   - `refresh_token` - Long-lived (7 days)
3. All API calls include `Authorization: Bearer <access_token>`
4. Expired tokens trigger refresh or redirect to login

### Common Functions (`js/auth.js`)

```javascript
// Check if user is authenticated
checkAuth();

// Get current user info
getCurrentUser();

// Logout and clear tokens
logout();

// Refresh access token
refreshToken();

// Make authenticated API request
fetch(url, {
  headers: {
    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
    "Content-Type": "application/json",
  },
});
```

---

## 🎯 Demo Accounts

Backend comes pre-seeded with demo accounts:

**Patient Account**:

- Email: `patient@example.com`
- Password: `Pass1234!`

**Doctor Account**:

- Email: `doctor@example.com`
- Password: `Pass1234!`

---

## 📱 Browser Support

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari 12+
- ✅ Mobile browsers (iOS Safari, Chrome Android)
- ⚠️ IE11 not supported (uses modern JS features)

---

## 🔧 Customization

### Changing Colors

Edit CSS custom properties in `css/style.css`:

```css
:root {
  /* 60% - Primary backgrounds */
  --primary-bg: #f8f9fd;
  --white: #ffffff;

  /* 30% - Secondary blue */
  --secondary-blue: #4a90e2;
  --secondary-blue-light: #6ba3e8;
  --secondary-blue-dark: #2c5282;

  /* 10% - Accent teal/green */
  --accent-teal: #00d9b5;
  --accent-green: #48bb78;

  /* Status colors */
  --success: #48bb78;
  --warning: #f59e0b;
  --error: #ef4444;
  --info: #3b82f6;
}
```

### Changing API URL

Edit in each JavaScript file:

```javascript
const API_BASE_URL = "http://your-backend:8000/api";
```

Or create a `config.js`:

```javascript
// js/config.js
window.CONFIG = {
  API_BASE_URL: "http://localhost:8000/api",
};
```

### Adding New Pages

1. Create HTML file (copy from existing page)
2. Include navigation and profile widget
3. Create corresponding JS file
4. Import Font Awesome and Google Fonts
5. Link `css/style.css`
6. Add authentication check:

```javascript
if (!checkAuth()) {
  window.location.href = "login.html";
}
```

---

## 🔒 Security Features

### Client-Side Security

- **JWT Storage**: Tokens in localStorage (consider httpOnly cookies for production)
- **XSS Prevention**: `escapeHtml()` function for user input
- **CSRF**: Protected by Django backend
- **Input Validation**: All forms validate before submission
- **Secure Headers**: Set by backend CORS policy

### Best Practices

1. Always validate input before sending to API
2. Escape HTML when displaying user-generated content
3. Clear tokens on logout
4. Refresh tokens before expiration
5. Use HTTPS in production
6. Sanitize file uploads

---

## 📊 Performance Optimization

### Current Metrics

- **CSS**: Single stylesheet (~30KB)
- **JS**: Modular scripts, no frameworks
- **Images**: SVG icons (no raster images)
- **Fonts**: Google Fonts with preconnect
- **Load Time**: < 1 second on average connection

### Optimization Tips

1. **Minify CSS/JS** for production
2. **Lazy load images** if adding photos
3. **Use CDN** for Font Awesome and Google Fonts
4. **Enable gzip compression** on server
5. **Cache static assets** with proper headers
6. **Bundle JS files** for production

---

## 🧪 Testing

### Manual Testing Checklist

**Authentication**:

- ✅ Register new account
- ✅ Login with credentials
- ✅ Logout clears tokens
- ✅ Protected pages redirect to login
- ✅ Token refresh works

**Navigation**:

- ✅ All links work
- ✅ Profile widget shows user info
- ✅ Active page highlighted in nav
- ✅ Mobile menu toggles

**Records**:

- ✅ Upload file (all types)
- ✅ View records table
- ✅ Download file (signed URL)
- ✅ Search/filter works
- ✅ Stats update correctly

**Appointments**:

- ✅ Search doctors (name, specialty, location)
- ✅ Select doctor (card highlights)
- ✅ Book appointment
- ✅ View appointments list
- ✅ Cancel appointment
- ✅ Stats update correctly

**AI Insights**:

- ✅ Symptom analysis returns specialist
- ✅ Confidence score displays
- ✅ Model badge shows (PyTorch/Sklearn)
- ✅ Medical summary generates
- ✅ Example symptoms work

**Profile**:

- ✅ Load profile info
- ✅ Update profile
- ✅ Upload photo
- ✅ Save changes

### Browser Console Testing

Open browser console (F12) and check:

- No JavaScript errors
- API calls return 200 (or expected status)
- Tokens present in localStorage
- No CORS errors

---

## 🎓 Educational Value

This frontend demonstrates:

- **Modern CSS** with custom properties and grid/flexbox
- **Vanilla JavaScript** (no React/Vue, easier to understand)
- **RESTful API integration** with fetch API
- **JWT authentication flow** with refresh tokens
- **Responsive design principles** (mobile-first)
- **60-30-10 color rule** in action
- **Accessibility** best practices (ARIA labels, semantic HTML)
- **Progressive enhancement** (works without JS for static content)

---

## 🚀 Future Enhancements

Potential improvements:

- [ ] Dark mode toggle
- [ ] Progressive Web App (PWA) support
- [ ] Offline mode with service workers
- [ ] Real-time notifications (WebSockets)
- [ ] Advanced data visualizations (charts)
- [ ] Accessibility audit (WCAG 2.1 AAA)
- [ ] Internationalization (i18n)
- [ ] Print-friendly CSS
- [ ] Voice input for symptom analysis
- [ ] Mobile app wrapper (Capacitor/Cordova)

---

## 📝 Code Style Guide

### HTML

- Use semantic HTML5 elements
- Include ARIA labels for accessibility
- Keep structure clean and indented
- Comments for major sections

### CSS

- Use CSS custom properties for colors
- BEM naming convention for classes
- Mobile-first media queries
- Group related styles together

### JavaScript

- Use const/let (no var)
- Descriptive variable names
- Functions for reusable code
- Comments for complex logic
- Handle errors gracefully

**Example**:

```javascript
// Good
async function loadUserProfile() {
  try {
    const response = await fetch(`${API_BASE_URL}/patients/`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });

    if (!response.ok) {
      throw new Error("Failed to load profile");
    }

    const data = await response.json();
    displayProfile(data);
  } catch (error) {
    showError("Could not load profile. Please try again.");
    console.error(error);
  }
}
```

---

## 🎨 Design Philosophy

1. **Simplicity First**: Clean, uncluttered interface
2. **Medical Professional**: Trustworthy blue tones
3. **Modern**: Gradients, shadows, smooth animations
4. **Accessible**: High contrast, readable fonts, keyboard navigation
5. **Responsive**: Mobile-friendly from the start
6. **Consistent**: Same patterns across all pages

---

**Built with ❤️ for PhD research. Ready to use and customize!**
