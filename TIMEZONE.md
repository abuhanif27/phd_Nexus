# Timezone Configuration for PhD NexusCare

## 🌍 Overview

The PhD NexusCare platform is configured with **Bangladesh Standard Time (BST = UTC+6)** as the server timezone. The system automatically converts times for international users to their local timezone.

## ⚙️ Server Configuration

**Backend Settings** (`nexuscare/settings.py`):
```python
TIME_ZONE = 'Asia/Dhaka'  # Bangladesh Standard Time (BST = UTC+6)
USE_TZ = True  # Enable timezone-aware datetimes
```

### How It Works:

1. **Database Storage**: All datetime values are stored in UTC (Universal Time) in the database
2. **Server Display**: Admin panel displays times in Bangladesh time (Asia/Dhaka)
3. **API Responses**: Returns datetime in ISO 8601 format with timezone info
4. **Client Conversion**: Frontend JavaScript converts to user's local timezone

## 🌐 Frontend Integration

### Include Timezone Utility

Add to your HTML files before closing `</body>` tag:

```html
<script src="js/timezone.js"></script>
<script src="js/main.js"></script>
```

### Display Times Automatically

Use `data-time` attribute to automatically convert and display times:

```html
<!-- Full datetime -->
<span data-time="2025-10-31T10:30:00Z">Loading...</span>

<!-- Date only -->
<span data-time="2025-10-31T10:30:00Z" data-format="date">Loading...</span>

<!-- Time only -->
<span data-time="2025-10-31T10:30:00Z" data-format="time">Loading...</span>

<!-- Relative time (e.g., "2 hours ago") -->
<span data-time="2025-10-31T10:30:00Z" data-format="relative">Loading...</span>
```

### JavaScript API Usage

```javascript
// Format server time to user's local timezone
const localTime = TimezoneUtil.formatLocal('2025-10-31T10:30:00Z');
// Output (if user is in USA): "Oct 31, 2025, 06:30 AM"

// Format date only
const date = TimezoneUtil.formatDate('2025-10-31T10:30:00Z');
// Output: "Oct 31, 2025"

// Format time only
const time = TimezoneUtil.formatTime('2025-10-31T10:30:00Z');
// Output: "06:30 AM" (in user's timezone)

// Get relative time
const relative = TimezoneUtil.getRelativeTime('2025-10-31T10:30:00Z');
// Output: "2 hours ago" or "in 3 days"

// Convert local date to server format for API
const localDate = new Date();
const serverFormat = TimezoneUtil.localToServer(localDate);
// Output: ISO 8601 format for API calls

// Get user's timezone info
const userTz = TimezoneUtil.getUserTimezone();
// Output: "America/New_York" or "Europe/London"

const offset = TimezoneUtil.getTimezoneOffset();
// Output: "GMT-5" or "GMT+1"
```

## 📝 Example: Appointments Display

**Backend API Response:**
```json
{
  "id": 123,
  "patient_name": "John Doe",
  "appointment_datetime": "2025-10-31T04:30:00Z",
  "status": "scheduled"
}
```

**Frontend Display:**
```javascript
// Fetch appointment
fetch('http://localhost:8000/api/appointments/123/')
  .then(res => res.json())
  .then(data => {
    // Display in user's local time
    const localTime = TimezoneUtil.formatLocal(data.appointment_datetime);
    document.getElementById('appointment-time').textContent = localTime;
    
    // Show relative time
    const relative = TimezoneUtil.getRelativeTime(data.appointment_datetime);
    document.getElementById('countdown').textContent = relative;
  });
```

**HTML:**
```html
<div class="appointment-card">
  <h3>Appointment with Dr. Smith</h3>
  <p>
    <strong>When:</strong> 
    <span data-time="2025-10-31T04:30:00Z">Loading...</span>
  </p>
  <p>
    <small data-time="2025-10-31T04:30:00Z" data-format="relative">Loading...</small>
  </p>
</div>
```

## 🔄 Creating Appointments (User's Local Time → Server Time)

When users create appointments in their local time:

```javascript
// User selects date and time in their timezone
const appointmentForm = document.getElementById('appointment-form');

appointmentForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Get user's selected date/time
  const dateInput = document.getElementById('appointment-date').value;
  const timeInput = document.getElementById('appointment-time').value;
  
  // Create Date object (automatically in user's timezone)
  const localDateTime = new Date(`${dateInput}T${timeInput}`);
  
  // Convert to server format (ISO 8601)
  const serverDateTime = TimezoneUtil.localToServer(localDateTime);
  
  // Send to API
  const response = await fetch('http://localhost:8000/api/appointments/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      doctor: doctorId,
      appointment_datetime: serverDateTime,  // Server will handle timezone
      reason: reason
    })
  });
});
```

## 🌏 Timezone Examples

### User in Bangladesh (BST = UTC+6)
- Server time: `2025-10-31 16:30 BST`
- Display: `Oct 31, 2025, 04:30 PM` ✅ Same time

### User in USA (EST = UTC-5)
- Server time: `2025-10-31 16:30 BST` (UTC+6)
- Display: `Oct 31, 2025, 05:30 AM` ✅ Converted to EST

### User in UK (GMT = UTC+0)
- Server time: `2025-10-31 16:30 BST` (UTC+6)
- Display: `Oct 31, 2025, 10:30 AM` ✅ Converted to GMT

### User in Japan (JST = UTC+9)
- Server time: `2025-10-31 16:30 BST` (UTC+6)
- Display: `Oct 31, 2025, 07:30 PM` ✅ Converted to JST

## ✅ Benefits

1. **Consistency**: All times stored consistently in database (UTC)
2. **Bangladesh Default**: Admin panel and server logs use Bangladesh time
3. **International Ready**: Users worldwide see times in their local timezone
4. **Automatic Conversion**: No manual calculation needed
5. **DST Handling**: Daylight saving time automatically handled by browser

## 🔧 Testing Timezone Conversion

Open browser console to see timezone info:
```
🌍 Your timezone: America/New_York GMT-5
🏥 Server timezone: Asia/Dhaka (Bangladesh)
```

Hover over any datetime element to see tooltip with both times:
- Your time: Oct 31, 2025, 05:30 AM
- Server time (Bangladesh): Oct 31, 2025, 04:30 PM

## 📚 References

- **Python Timezone List**: [Django Timezones](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)
- **Bangladesh Time**: Asia/Dhaka (UTC+6, no DST)
- **JavaScript Intl API**: [MDN DateTimeFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat)

---

**Built for PhD NexusCare - Global Healthcare Platform** 🌍🏥
