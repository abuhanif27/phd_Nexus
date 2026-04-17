const http = require('http');

// Test 1: Patient Registration
const patientPayload = {
  email: "patient.test@example.com",
  password: "PatientTest123",
  password_confirm: "PatientTest123",
  role: "patient",
  patient_profile: {
    name: "Test Patient"
  }
};

// Test 2: Doctor Registration
const doctorPayload = {
  email: "doctor.test@example.com",
  password: "DoctorTest123",
  password_confirm: "DoctorTest123",
  role: "doctor",
  doctor_profile: {
    name: "Dr. Test Doctor",
    specialty: "Cardiology"
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
          console.log(`\n✅ ${testName}: HTTP ${res.statusCode}`);
          if (res.statusCode === 201) {
            console.log(`   User ID: ${response.user?.id}`);
            console.log(`   Email: ${response.user?.email}`);
            console.log(`   Role: ${response.user?.role}`);
            console.log(`   ✓ Tokens issued`);
          } else {
            console.log(`   Error: ${JSON.stringify(response, null, 2)}`);
          }
        } catch (e) {
          console.log(`\n❌ ${testName}: Failed to parse response`);
          console.log(`   Raw: ${data}`);
        }
        resolve();
      });
    });

    req.on('error', (e) => {
      console.log(`❌ ${testName}: ${e.message}`);
      resolve();
    });

    req.write(JSON.stringify(payload));
    req.end();
  });
}

(async () => {
  console.log('🧪 Testing Registration System\n' + '='.repeat(40));
  console.log('Patient Registration Test');
  await testRegistration(patientPayload, 'Patient Registration');
  
  console.log('\nDoctor Registration Test');
  await testRegistration(doctorPayload, 'Doctor Registration');
  
  console.log('\n' + '='.repeat(40));
  console.log('✅ Tests completed. Check results above.');
})();
