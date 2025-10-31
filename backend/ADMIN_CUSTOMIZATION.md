# PhD NexusCare Admin Customization Guide

## 🎨 Overview

The Django admin interface has been completely customized to match the PhD NexusCare branding and provide a professional healthcare platform administration experience.

## ✨ Customizations Applied

### 1. **Admin Site Branding** (`nexuscare/urls.py`)

```python
admin.site.site_header = "PhD NexusCare Administration"
admin.site.site_title = "PhD NexusCare Admin Portal"
admin.site.index_title = "Welcome to PhD NexusCare Healthcare Platform"
```

**What changed:**
- Browser tab title: "PhD NexusCare Admin Portal"
- Header text: "PhD NexusCare Administration"
- Dashboard welcome: "Welcome to PhD NexusCare Healthcare Platform"

### 2. **Custom Admin Template** (`templates/admin/base_site.html`)

**Visual Enhancements:**
- 🏥 Healthcare icon in header with brand name
- Gradient blue header (PhD NexusCare colors)
- Custom styling matching the 60-30-10 color scheme
- Professional footer with version information
- Improved breadcrumbs styling

**Colors Used:**
- Primary Blue: `#4a90e2`
- Dark Blue: `#2c5282`
- Accent Teal: `#00d9b5`
- Background: `#f8f9fd`

### 3. **Enhanced Admin Models**

Each app now has rich, customized admin interfaces with:

#### **Users Admin** (`apps/users/admin.py`)

**Features:**
- 🔐 Categorized fieldsets with emojis
- Enhanced user listing with role, phone, 2FA status
- Masked OTP codes for security
- OTP expiration status indicators
- Better search and filtering

**Display:**
- Email, Role, Phone, Active Status, Staff Status, 2FA Enabled, Created Date

#### **Patients Admin** (`apps/patients/admin.py`)

**Features:**
- 👤 Comprehensive patient information display
- Age calculation from date of birth
- Profile photo preview (200x200px)
- Medical conditions display
- Blood group and gender filters

**Display:**
- Name, Email, Phone, Blood Group, Gender, Age, Photo Status, Created Date

**Special Fields:**
- Photo preview with rounded corners
- Age auto-calculated
- Has photo indicator (✓/✗)

#### **Doctors Admin** (`apps/doctors/admin.py`)

**Features:**
- 👨‍⚕️ Doctor-specific information display
- Rating display with star emojis (⭐)
- Specialty and location filters
- Qualification display

**Display:**
- Name, Specialty, Location, Rating (with stars), Email, Phone

**Special:**
- Color-coded rating with gold stars
- Hover tooltip showing exact rating

#### **Appointments Admin** (`apps/scheduling/admin.py`)

**Features:**
- 📅 Comprehensive appointment management
- Color-coded status badges with icons
- Date hierarchy navigation
- Bulk actions (mark completed/cancelled)
- Doctor availability schedule display

**Status Badges:**
- 📅 **Scheduled** (Blue) - Upcoming appointments
- ✅ **Completed** (Green) - Finished appointments
- ❌ **Cancelled** (Red) - Cancelled by patient/doctor
- ⚠️ **No-show** (Gray) - Patient didn't attend

**Bulk Actions:**
- Mark selected as Completed
- Mark selected as Cancelled

**Display:**
- ID, Patient Name, Doctor (with specialty), Date & Time, Status Badge, Created Date

#### **Medical Records Admin** (`apps/records/admin.py`)

**Features:**
- 📁 File type badges with icons and colors
- File size display (auto-formatted)
- Lab results, prescriptions, encounters management
- Symptom logs with severity tracking

**File Type Badges:**
- 🔬 **Lab** (Blue)
- 💊 **Prescription** (Green)
- 🩻 **Imaging** (Purple)
- 📋 **Encounter** (Orange)
- 📄 **Other** (Gray)

**Display:**
- Filename, Patient, File Type Badge, Size, Created Date

**Special Features:**
- Auto file size formatting (B, KB, MB)
- Date hierarchy for easy navigation
- Linked to patient records

#### **Consent Management Admin** (`apps/consent/admin.py`)

**Features:**
- 🔐 Consent tracking with status badges
- Scope summary display
- Audit log viewer (read-only for compliance)
- Bulk revoke actions
- Security: OTP hash hidden, audit logs cannot be deleted

**Status Badges:**
- ⏳ **Pending** (Orange) - Awaiting claim
- ✅ **Active** (Green) - Currently valid
- ❌ **Revoked** (Red) - Cancelled by patient
- ⏰ **Expired** (Gray) - Time expired

**Audit Logs:**
- Complete access trail
- Actor, action, resource tracking
- IP address and user agent logging
- **Cannot be added or deleted** (compliance requirement)

**Display:**
- ID, Patient, Doctor, Status Badge, Scope Summary, Expires, Created

### 4. **Admin Features Added**

#### **Search Functionality**
Every model now has comprehensive search:
- Users: Email, phone
- Patients: Name, email, phone, address, medical conditions
- Doctors: Name, email, specialty, location, qualification
- Appointments: Patient name, doctor name, reason
- Records: Filename, patient name, notes
- Consents: Patient name, doctor name

#### **Filters**
Smart filtering on key fields:
- Users: Role, staff status, active, 2FA enabled
- Patients: Gender, blood group, created date
- Doctors: Specialty, location
- Appointments: Status, date, created date
- Records: File type, created date
- Consents: Status, created date, expires date

#### **Date Hierarchy**
Chronological navigation for:
- Appointments (by slot date)
- Lab Results (by test date)
- Prescriptions (by issued date)
- Encounters (by encounter date)
- Symptom Logs (by logged date)
- Consents (by created date)
- Audit Logs (by timestamp)

#### **Custom Actions**
- Appointments: Bulk mark as completed/cancelled
- Consents: Bulk revoke selected consents

#### **Read-Only Fields**
Protected fields that shouldn't be edited:
- Created timestamps
- Updated timestamps
- OTP hashes
- Audit log entries (entire model)

## 🎯 Accessing the Admin

1. **URL**: http://localhost:8000/admin/

2. **Login Credentials**:
   - Create superuser: `python manage.py createsuperuser`
   - Or use demo admin (if seeded)

3. **What You'll See**:
   - Custom blue gradient header with 🏥 icon
   - "PhD NexusCare Administration" branding
   - Organized app sections with icons
   - Professional layout matching the project theme

## 📊 Admin Dashboard

The admin index page shows organized sections:

**Authentication and Authorization**
- 👥 Users - Manage all user accounts
- 🔑 Groups - User permission groups
- 🛡️ Permissions - Granular permissions

**Patients**
- 👤 Patients - Patient profiles and information

**Doctors**
- 👨‍⚕️ Doctors - Doctor profiles and specialties

**Scheduling**
- 📅 Appointments - Appointment management
- ⏰ Doctor Availability - Schedule configuration

**Records**
- 📁 Files - Medical documents
- 🔬 Lab Results - Laboratory test results
- 💊 Prescriptions - Medication prescriptions
- 📋 Encounters - Clinical visit notes
- 🩺 Symptom Logs - Patient symptom tracking

**Consent**
- 🔐 Consents - Data sharing permissions
- 📜 Audit Logs - Access audit trail

**AI**
- 🤖 AI models and training data (if configured)

**Billing**
- 💰 Invoices - Payment records (future)

## 🎨 Visual Design

### Color Scheme
The admin follows the project's 60-30-10 color rule:

**60% - Backgrounds (Primary)**
- Light blue: `#f8f9fd`
- White: `#ffffff`

**30% - Elements (Secondary)**
- Primary blue: `#4a90e2`
- Dark blue: `#2c5282`

**10% - Accents**
- Teal: `#00d9b5`
- Green: `#10b981` (completed)
- Red: `#ef4444` (cancelled)
- Orange: `#f59e0b` (pending)

### Typography
- Headers: Bold, 18-24px
- Body: 14-16px
- Labels: 12px with icons

### Icons
Emoji icons for visual recognition:
- 🏥 Healthcare/Hospital
- 👤 Patient
- 👨‍⚕️ Doctor
- 📅 Appointment/Date
- 🔬 Lab/Science
- 💊 Medication
- 📋 Document
- 🔐 Security/Lock
- ⭐ Rating
- ✅ Success/Completed
- ❌ Cancelled/Error
- ⏳ Pending
- ⏰ Time/Expired

## 🔒 Security Features

1. **Audit Logs**:
   - Cannot be manually added or deleted
   - Read-only in admin
   - Complete access trail

2. **OTP Security**:
   - Codes are masked in display (`***456`)
   - Hash values hidden from admin users

3. **Permissions**:
   - Staff status required for admin access
   - Superuser for sensitive operations
   - Role-based access control

## 🚀 Development Notes

### File Locations

```
backend/
├── nexuscare/
│   ├── urls.py                    # Admin site configuration
│   └── settings.py                # Templates directory setting
├── templates/
│   └── admin/
│       └── base_site.html         # Custom admin template
└── apps/
    ├── users/admin.py             # Users & OTP admin
    ├── patients/admin.py          # Patients admin
    ├── doctors/admin.py           # Doctors admin
    ├── scheduling/admin.py        # Appointments admin
    ├── records/admin.py           # Medical records admin
    └── consent/admin.py           # Consents & audit admin
```

### Extending the Admin

To add more customizations:

1. **Add Custom Actions**:
```python
def custom_action(modeladmin, request, queryset):
    # Your action logic
    pass
custom_action.short_description = "Description shown in admin"

class MyModelAdmin(admin.ModelAdmin):
    actions = [custom_action]
```

2. **Add Custom Display Methods**:
```python
def custom_display(self, obj):
    return format_html('<span>{}</span>', obj.field)
custom_display.short_description = 'Display Name'
```

3. **Override Templates**:
Create template in `templates/admin/<app>/<model>/` to override specific views.

## 📚 Resources

- [Django Admin Documentation](https://docs.djangoproject.com/en/5.0/ref/contrib/admin/)
- [Admin Site Customization](https://docs.djangoproject.com/en/5.0/ref/contrib/admin/#adminsite-objects)
- [ModelAdmin Options](https://docs.djangoproject.com/en/5.0/ref/contrib/admin/#modeladmin-options)

---

**Built for PhD NexusCare - Professional Healthcare Platform Administration** 🏥
