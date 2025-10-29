# PhD NexusCare - Frontend

Beautiful, responsive frontend for the PhD NexusCare medical records platform.

## 🎨 Design System

### Color Scheme (60-30-10 Rule)

**60% - Primary (Backgrounds & Dominant Areas)**

- Soft Blue/White: `#f8f9fd`, `#ffffff`, `#e8ecf7`
- Used for: Main backgrounds, cards, content areas

**30% - Secondary (Supporting Elements)**

- Blue Spectrum: `#4a90e2`, `#6ba3e8`, `#2c5282`
- Used for: Navigation, headers, tables, secondary buttons

**10% - Accent (Call-to-Actions & Highlights)**

- Teal/Green: `#00d9b5`, `#48bb78`, `#38b2ac`
- Used for: Primary buttons, highlights, active states, borders

### Typography

- **Headings:** Poppins (600-700 weight)
- **Body:** Inter (400-600 weight)
- **Font Scale:** Base 16px with harmonious scaling

### Spacing

- Uses CSS custom properties with consistent 8px base unit
- Responsive spacing adapts to screen size

## 📁 File Structure

```
frontend/
├── index.html          # Landing page
├── login.html          # Login page
├── register.html       # Registration page
├── dashboard.html      # User dashboard
├── css/
│   └── style.css       # Main stylesheet (60-30-10 design)
└── js/
    ├── main.js         # Landing page scripts
    ├── auth.js         # Authentication logic
    └── dashboard.js    # Dashboard functionality
```

## 🚀 Quick Start

### 1. Start the Backend

```bash
cd backend
source .venv/bin/activate
python manage.py runserver
```

### 2. Serve the Frontend

**Option A: Using Python's built-in server**

```bash
cd frontend
python3 -m http.server 8080
```

**Option B: Using Node.js (if installed)**

```bash
cd frontend
npx http-server -p 8080
```

**Option C: Using VS Code Live Server**

- Install "Live Server" extension
- Right-click `index.html`
- Select "Open with Live Server"

### 3. Access the Application

- **Frontend:** http://localhost:8080
- **Backend API:** http://localhost:8000/api
- **Admin Panel:** http://localhost:8000/admin

## 🎯 Features

### Landing Page (`index.html`)

- Hero section with gradient design
- Feature cards showcasing capabilities
- Technology stack display
- Smooth scroll navigation
- Responsive grid layout

### Authentication (`login.html`, `register.html`)

- Beautiful centered auth cards
- Real-time form validation
- Loading states with spinners
- Error/success alerts
- Demo credentials display
- JWT token management

### Dashboard (`dashboard.html`)

- Stats cards with animations
- Recent records table
- Upcoming appointments
- Quick action cards
- Protected route (requires login)

## 🎨 Key Design Features

### Visual Hierarchy

1. **Large headings** with gradient text effects
2. **Card-based layouts** with consistent shadows
3. **Icon-driven** interface for quick recognition
4. **Color-coded badges** for status indicators

### Animations

- Fade-in on scroll
- Hover transformations
- Loading spinners
- Smooth transitions (0.3s ease)
- Pulse effects on stat cards

### Responsive Design

- Mobile-first approach
- Breakpoint at 768px
- Flexible grid layouts
- Collapsible navigation
- Touch-friendly buttons

## 🔗 API Integration

The frontend connects to the Django backend at `http://localhost:8000/api`:

### Endpoints Used:

- `POST /auth/register/` - User registration
- `POST /auth/login/` - User login
- `GET /auth/me/` - Get current user
- `GET /records/files/` - List medical records
- `GET /scheduling/appointments/` - List appointments
- `GET /records/prescriptions/` - List prescriptions

### Authentication Flow:

1. User logs in → Receives JWT tokens
2. Tokens stored in `localStorage`
3. All API calls include `Authorization: Bearer <token>`
4. Expired tokens redirect to login

## 🎯 Demo Accounts

**Patient Account:**

- Email: `patient@example.com`
- Password: `Pass1234!`

**Doctor Account:**

- Email: `doctor@example.com`
- Password: `Pass1234!`

## 📱 Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari 12+
- Mobile browsers (iOS Safari, Chrome Android)

## 🔧 Customization

### Changing Colors

Edit CSS custom properties in `css/style.css`:

```css
:root {
  --primary-bg: #your-color;
  --secondary-blue: #your-color;
  --accent-teal: #your-color;
}
```

### Changing API URL

Edit `API_BASE_URL` in JavaScript files:

```javascript
const API_BASE_URL = "http://your-backend:8000/api";
```

## 🚧 Future Enhancements

- [ ] Records management page
- [ ] Appointments booking interface
- [ ] AI insights visualization
- [ ] Real-time notifications
- [ ] Dark mode toggle
- [ ] Progressive Web App (PWA)
- [ ] Offline mode support

## 📄 Pages Overview

| Page             | Purpose                | Auth Required |
| ---------------- | ---------------------- | ------------- |
| `index.html`     | Landing/marketing page | No            |
| `login.html`     | User authentication    | No            |
| `register.html`  | New user signup        | No            |
| `dashboard.html` | Main user interface    | Yes           |

## 🎨 Design Philosophy

1. **Simplicity First:** Clean, uncluttered interface
2. **Medical Professional:** Trustworthy blue tones
3. **Modern:** Gradients, shadows, smooth animations
4. **Accessible:** High contrast, readable fonts
5. **Responsive:** Mobile-friendly from the start

## 📊 Performance

- **CSS:** Single minified stylesheet (~15KB)
- **JS:** Modular scripts, no heavy frameworks
- **Images:** SVG icons, no external image dependencies
- **Fonts:** Google Fonts with preconnect
- **Load Time:** < 1 second on average connection

## 🔒 Security Notes

- JWT tokens stored in `localStorage`
- XSS prevention via escapeHtml() function
- CSRF protection by Django backend
- HTTPS recommended for production
- No sensitive data in client-side code

## 🎓 Educational Value

This frontend demonstrates:

- Modern CSS with custom properties
- Vanilla JavaScript (no frameworks)
- RESTful API integration
- JWT authentication flow
- Responsive design principles
- 60-30-10 color rule application
- Accessibility best practices

---

**Built with ❤️ for PhD research. Ready to customize and extend!**
