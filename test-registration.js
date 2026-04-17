const payload = {
  email: "frontendpatient@test.com",
  password: "FrontendPass123",
  password_confirm: "FrontendPass123",
  role: "patient",
  patient_profile: {
    name: "Frontend Test Patient"
  }
};

fetch('http://localhost:8000/api/auth/register/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
})
.then(r => {
  console.log('HTTP Status:', r.status);
  console.log('Status Text:', r.statusText);
  return r.json();
})
.then(data => console.log('Response Body:', JSON.stringify(data, null, 2)))
.catch(e => console.error('Error:', e));
