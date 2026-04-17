const http = require('http');

// Generate unique emails
const timestamp = Date.now();
const patientEmail = `patient.${timestamp}@test.com`;
const doctorEmail = `doctor.${timestamp}@test.com`;

// Test 1: Patient Registration
const patientPayload = {
  email: patientEmail,
  password: "PatientTest123",
  password_confirm: "PatientTest123",
  role: "patient",
  patient_profile: {
    name: "Test Patient Fresh",
    dob: "1990-05-15"
  }
};

// Test 2: Doctor Registration
const doctorPayload = {
  email: doctorEmail,
  password: "DoctorTest123",
  password_confirm: "DoctorTest123",
  role: "doctor",
  doctor_profile: {
    name: "Dr. Fresh Doctor",
    specialty: "Neurology"
  }
};

async function testRegistration(payload, testName) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 8000,
      path: '/api/auth/register/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify(payload))
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log(`\n${res.statusCode === 201 ? '✅' : '❌'} ${testName}: HTTP ${res.statusCode}`);
          if (res.statusCode === 201) {
            console.log(`   User ID: ${response.user?.id}`);
            console.log(`   Email: ${response.user?.email}`);
            console.log(`   Role: ${response.user?.role}`);
            console.log(`   Profile: ${response.user?.patient_profile || response.user?.doctor_profile ? '✓ Created' : '✗ Missing'}`);
            console.log(`   Access Token: ${response.access ? '✓ Issued' : '✗ Missing'}`);
          } else {
            console.log(`   Error: ${JSON.stringify(response, null, 2)}`);
          }
        } catch (e) {
          console.log(`\n❌ ${testName}: Failed to parse response`);
          console.log(`   Status: ${res.statusCode}`);
          console.log(`   Raw: ${data.substring(0, 200)}`);
        }
        resolve();
      });
    });

    req.on('error', (e) => {
      console.log(`\n❌ ${testName}: ${e.message}`);
      resolve();
    });

    req.write(JSON.stringify(payload));
    req.end();
  });
}

(async () => {
  console.log('🧪 Testing Registration System (With Date Fields)\n' + '='.repeat(50));
  
  console.log('\n📝 Patient Registration Test (with DOB)');
  await testRegistration(patientPayload, 'Patient Registration');
  
  console.log('\n📝 Doctor Registration Test (with Specialty)');
  await testRegistration(doctorPayload, 'Doctor Registration');
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ Tests completed. Check results above.');
})();
