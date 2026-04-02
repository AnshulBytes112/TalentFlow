const axios = require('axios');

const BACKEND_URL = 'http://localhost:5000';

async function test() {
  try {
    // Register a new recruiter
    console.log('Registering recruiter...');
    const regRes = await axios.post(`${BACKEND_URL}/api/auth/register`, {
      firstName: 'Test',
      lastName: 'Recruiter',
      email: `recruiter_${Date.now()}@test.com`,
      password: 'TestPass123!',
      role: 'recruiter'
    });

    const token = regRes.data.data?.accessToken;
    console.log('Registration successful, token:', token.substring(0, 20) + '...');

    // Try creating a job
    console.log('\nCreating job...');
    const jobRes = await axios.post(`${BACKEND_URL}/api/jobs`, {
      title: 'Senior Software Engineer',
      description: 'We are looking for a senior engineer with 5+ years of experience in full-stack development and cloud architecture.',
      location: 'San Francisco, CA',
      jobType: 'full-time',
      category: 'engineering',
      experience: 'senior-level',
      companyName: 'TechCorp',
      requirements: ['5+ years experience', 'React knowledge', 'Node.js proficiency'],
      skills: ['JavaScript', 'React', 'Node.js', 'AWS'],
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('Job creation successful!');
    console.log('Response:', JSON.stringify(jobRes.data, null, 2));
  } catch (error) {
    console.error('Error response:', error.response?.data || error.message);
    if (error.response?.data?.errors) {
      console.error('Detailed errors:', error.response.data.errors);
    }
  }
}

test();
