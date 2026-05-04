const { default: axios } = require('axios');
axios.post("http://localhost:8000/api/token/", {email:"patient@example.com", password:"TestPass123!"}).then(res => {
  const token = res.data.access;
  return axios.get("http://localhost:8000/api/doctors/", {
    headers: { Authorization: `Bearer ${token}` }
  });
}).then(res => {
  console.log(typeof res.data);
  console.log(Array.isArray(res.data));
  console.log(Object.keys(res.data));
  console.log("data:", res.data);
}).catch(console.error);
