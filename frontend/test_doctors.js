const { default: axios } = require('axios');
axios.post("http://localhost:8000/api/auth/login/", {email:"patient@example.com", password:"TestPass123!"}).then(res => {
  const token = res.data.access;
  return axios.get("http://localhost:8000/api/doctors/", {
    headers: { Authorization: `Bearer ${token}` }
  });
}).then(res => {
  console.log("IsArray:", Array.isArray(res.data));
  console.log("Keys:", Object.keys(res.data));
}).catch(console.error);
