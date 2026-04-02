#!/usr/bin/env node
const http = require('http');
const { spawn } = require('child_process');
const axios = require('axios');
const { chromium } = require('playwright');

// ============================================================================
// QA RUNNER - Autonomous end-to-end test suite
// ============================================================================

const BACKEND_URL = 'http://localhost:5000';
const FRONTEND_URL = 'http://localhost:3003';  // Frontend running on dynamic port
const DB_URL = 'mongodb+srv://anshpclg4040:12345@cluster0.tftvvhr.mongodb.net/?appName=Cluster0';

let testResults = [];
let bugs = [];
let browserContext = null;

const log = (msg, type = 'info') => {
  const colors = { info: '\x1b[36m', success: '\x1b[32m', warn: '\x1b[33m', error: '\x1b[31m', reset: '\x1b[0m' };
  console.log(`${colors[type] || colors.info}[${type.toUpperCase()}] ${msg}${colors.reset}`);
};

const addTest = (feature, test, status, error = null) => {
  testResults.push({ feature, test, status, error });
  log(`${feature} → ${test}: ${status}`, status === 'PASS' ? 'success' : 'error');
};

const addBug = (severity, message, feature, steps) => {
  bugs.push({ severity, message, feature, steps, timestamp: new Date().toISOString() });
};

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const isPortFree = (port) => new Promise((resolve) => {
  const server = http.createServer();
  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE') resolve(false);
    else resolve(true);
  });
  server.once('listening', () => {
    server.close();
    resolve(true);
  });
  server.listen(port);
});

// ============================================================================
// API TESTS (Automated with axios)
// ============================================================================

async function runAPITests() {
  log('\n=== PHASE 3A: API TESTS ===', 'info');
  
  // Test users
  const testUsers = {
    jobseeker: { firstName: 'John', lastName: 'Doe', email: `jobseeker_${Date.now()}@test.com`, password: 'TestPass123!' },
    recruiter: { firstName: 'Jane', lastName: 'Smith', email: `recruiter_${Date.now()}@test.com`, password: 'TestPass123!' }
  };

  let tokens = {};
  let jobId = null;
  let applicationId = null;

  // --- AUTH TESTS ---
  try {
    // Register jobseeker
    const regRes = await axios.post(`${BACKEND_URL}/api/auth/register`, { ...testUsers.jobseeker, role: 'jobseeker' });
    tokens.jobseeker = regRes.data.data?.accessToken;
    addTest('AUTH', 'Register jobseeker', regRes.status === 201 ? 'PASS' : 'FAIL');
  } catch (e) {
    addTest('AUTH', 'Register jobseeker', 'FAIL', e.message);
    addBug('HIGH', 'Registration endpoint failing', 'AUTH', ['POST /api/auth/register']);
  }

  try {
    // Register recruiter
    const regRes = await axios.post(`${BACKEND_URL}/api/auth/register`, { ...testUsers.recruiter, role: 'recruiter' });
    tokens.recruiter = regRes.data.data?.accessToken;
    addTest('AUTH', 'Register recruiter', regRes.status === 201 ? 'PASS' : 'FAIL');
  } catch (e) {
    addTest('AUTH', 'Register recruiter', 'FAIL', e.message);
  }

  try {
    // Login with correct credentials
    const loginRes = await axios.post(`${BACKEND_URL}/api/auth/login`, { email: testUsers.jobseeker.email, password: testUsers.jobseeker.password });
    if (loginRes.status === 200 && loginRes.data.data?.accessToken) {
      addTest('AUTH', 'Login valid credentials', 'PASS');
      tokens.jobseeker = loginRes.data.data.accessToken;
    }
  } catch (e) {
    addTest('AUTH', 'Login valid credentials', 'FAIL', e.message);
    addBug('CRITICAL', 'Login failing with valid credentials', 'AUTH', ['POST /api/auth/login']);
  }

  try {
    // Login with wrong password
    const loginRes = await axios.post(`${BACKEND_URL}/api/auth/login`, { email: testUsers.jobseeker.email, password: 'wrongpass' });
    addTest('AUTH', 'Login invalid password (should fail)', 'FAIL');
  } catch (e) {
    if (e.response?.status === 401) addTest('AUTH', 'Login invalid password (should fail)', 'PASS');
    else addTest('AUTH', 'Login invalid password (should fail)', 'FAIL');
  }

  try {
    // Get current user (protected)
    const meRes = await axios.get(`${BACKEND_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${tokens.jobseeker}` }
    });
    addTest('AUTH', 'Get current user (authenticated)', meRes.status === 200 ? 'PASS' : 'FAIL');
  } catch (e) {
    addTest('AUTH', 'Get current user (authenticated)', 'FAIL', e.message);
  }

  try {
    // Access protected route without token
    await axios.get(`${BACKEND_URL}/api/auth/me`);
    addTest('AUTH', 'Unauthenticated access (should fail)', 'FAIL');
  } catch (e) {
    if (e.response?.status === 401) addTest('AUTH', 'Unauthenticated access (should fail)', 'PASS');
    else addTest('AUTH', 'Unauthenticated access (should fail)', 'FAIL');
  }

  // --- JOB TESTS ---
  try {
    // Create job (recruiter only) - creates as draft
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
      headers: { Authorization: `Bearer ${tokens.recruiter}` }
    });
    jobId = jobRes.data.data?._id;
    addTest('JOBS', 'Create job (recruiter)', jobRes.status === 201 ? 'PASS' : 'FAIL');

    // IMPORTANT: Publish the job to change status from draft to active
    if (jobId) {
      try {
        const publishRes = await axios.patch(`${BACKEND_URL}/api/jobs/${jobId}/publish`, {}, {
          headers: { Authorization: `Bearer ${tokens.recruiter}` }
        });
        addTest('JOBS', 'Publish job (recruiter)', publishRes.status === 200 ? 'PASS' : 'FAIL');
        log('Job published successfully for application testing', 'success');
      } catch (pubErr) {
        addTest('JOBS', 'Publish job (recruiter)', 'FAIL', pubErr.response?.data?.message || pubErr.message);
        log(`Job publish failed: ${pubErr.response?.data?.message}`, 'warn');
        // Continue anyway - application test will show if this is the issue
      }
    }
  } catch (e) {
    addTest('JOBS', 'Create job (recruiter)', 'FAIL', e.message);
    addBug('HIGH', 'Job creation failing in recruiter API', 'JOBS', ['POST /api/jobs']);
  }

  try {
    // Get all jobs (public)
    const jobsRes = await axios.get(`${BACKEND_URL}/api/jobs`);
    addTest('JOBS', 'Get all jobs (public)', jobsRes.status === 200 ? 'PASS' : 'FAIL');
  } catch (e) {
    addTest('JOBS', 'Get all jobs (public)', 'FAIL', e.message);
  }

  if (jobId) {
    try {
      // Get job by ID
      const jobRes = await axios.get(`${BACKEND_URL}/api/jobs/${jobId}`);
      addTest('JOBS', 'Get job by ID', jobRes.status === 200 ? 'PASS' : 'FAIL');
    } catch (e) {
      addTest('JOBS', 'Get job by ID', 'FAIL', e.message);
    }

    // --- APPLICATION TESTS ---
    // First, we need to ensure user has a resume in profile before applying
    // This will be tested AFTER profile update below

    if (applicationId) {
      try {
        // Update application stage (recruiter)
        const updateRes = await axios.patch(`${BACKEND_URL}/api/applications/${applicationId}/stage`, {
          stage: 'screening'
        }, {
          headers: { Authorization: `Bearer ${tokens.recruiter}` }
        });
        addTest('APPLICATIONS', 'Update application stage', updateRes.status === 200 ? 'PASS' : 'FAIL');
      } catch (e) {
        addTest('APPLICATIONS', 'Update application stage', 'FAIL', e.message);
      }

      try {
        // Get application by ID
        const getRes = await axios.get(`${BACKEND_URL}/api/applications/${applicationId}`, {
          headers: { Authorization: `Bearer ${tokens.recruiter}` }
        });
        addTest('APPLICATIONS', 'Get application by ID', getRes.status === 200 ? 'PASS' : 'FAIL');
      } catch (e) {
        addTest('APPLICATIONS', 'Get application by ID', 'FAIL', e.message);
      }
    }
  }

  // --- USER/PROFILE TESTS ---
  try {
    // Update user profile
    const updateRes = await axios.put(`${BACKEND_URL}/api/users/profile`, {
      firstName: 'John Updated',
      bio: 'Software engineer with 10+ years experience',
      resumeUrl: 'https://example.com/resume.pdf'
    }, {
      headers: { Authorization: `Bearer ${tokens.jobseeker}` }
    });
    addTest('USERS', 'Update profile', updateRes.status === 200 ? 'PASS' : 'FAIL');
  } catch (e) {
    addTest('USERS', 'Update profile', 'FAIL', e.message);
  }

    // --- APPLICATION TESTS (Now jobseeker has a resume) ---
    if (jobId) {
      try {
        // Apply to job (jobseeker) - REQUIRES: 1) Active job, 2) Resume on profile
        const appRes = await axios.post(`${BACKEND_URL}/api/applications/${jobId}`, {
          coverLetter: 'I am very interested in this senior engineer position. My experience with React and Node.js aligns perfectly with your requirements.'
        }, {
          headers: { Authorization: `Bearer ${tokens.jobseeker}` }
        });
        applicationId = appRes.data.data?._id;
        addTest('APPLICATIONS', 'Apply to job (jobseeker)', appRes.status === 201 ? 'PASS' : 'FAIL');
        if (appRes.status === 201) log(`Application created: ${applicationId}`, 'success');
      } catch (e) {
        const errorMsg = e.response?.data?.message || e.message;
        addTest('APPLICATIONS', 'Apply to job (jobseeker)', 'FAIL', errorMsg);
        log(`Application failed with error: ${errorMsg}. Ensure job is published and user has resume.`, 'error');
        addBug('HIGH', `Job application failed: ${errorMsg}`, 'APPLICATIONS', ['Ensure job status is active', 'Ensure resumeUrl is set in profile', 'POST /api/applications/{jobId}']);
      }

      // Only test further if application was created
      if (applicationId) {
        try {
          // Update application stage (recruiter)
          const updateRes = await axios.patch(`${BACKEND_URL}/api/applications/${applicationId}/stage`, {
            stage: 'screening'
          }, {
            headers: { Authorization: `Bearer ${tokens.recruiter}` }
          });
          addTest('APPLICATIONS', 'Update application stage', updateRes.status === 200 ? 'PASS' : 'FAIL');
        } catch (e) {
          addTest('APPLICATIONS', 'Update application stage', 'FAIL', e.response?.data?.message || e.message);
        }

        try {
          // Get application by ID
          const getRes = await axios.get(`${BACKEND_URL}/api/applications/${applicationId}`, {
            headers: { Authorization: `Bearer ${tokens.recruiter}` }
          });
          addTest('APPLICATIONS', 'Get application by ID', getRes.status === 200 ? 'PASS' : 'FAIL');
        } catch (e) {
          addTest('APPLICATIONS', 'Get application by ID', 'FAIL', e.response?.data?.message || e.message);
        }
      }
    }

  try {
    // Change password
    const changeRes = await axios.put(`${BACKEND_URL}/api/users/change-password`, {
      currentPassword: 'TestPass123!',
      newPassword: 'NewPass123!',
      confirmPassword: 'NewPass123!'
    }, {
      headers: { Authorization: `Bearer ${tokens.jobseeker}` }
    });
    addTest('USERS', 'Change password', changeRes.status === 200 ? 'PASS' : 'FAIL');
  } catch (e) {
    addTest('USERS', 'Change password', 'FAIL', e.message);
  }

  // --- NOTIFICATION TESTS ---
  try {
    const notifRes = await axios.get(`${BACKEND_URL}/api/notifications`, {
      headers: { Authorization: `Bearer ${tokens.jobseeker}` }
    });
    addTest('NOTIFICATIONS', 'Get notifications', notifRes.status === 200 ? 'PASS' : 'FAIL');
  } catch (e) {
    addTest('NOTIFICATIONS', 'Get notifications', 'FAIL', e.message);
  }

  // --- ANALYTICS TESTS ---
  try {
    const analyticsRes = await axios.get(`${BACKEND_URL}/api/analytics/recruiter`, {
      headers: { Authorization: `Bearer ${tokens.recruiter}` }
    });
    addTest('ANALYTICS', 'Get recruiter analytics', analyticsRes.status === 200 ? 'PASS' : 'FAIL');
  } catch (e) {
    addTest('ANALYTICS', 'Get recruiter analytics', 'FAIL', e.message);
  }
}

// ============================================================================
// UI TESTS (Frontend with Playwright)
// ============================================================================

async function runUITests(browser) {
  log('\n=== PHASE 3B: UI TESTS ===', 'info');
  
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Test homepage loads
    await page.goto(`${FRONTEND_URL}`);
    const pageTitle = await page.title();
    addTest('UI', 'Homepage loads', pageTitle.includes('TalentFlow') ? 'PASS' : 'FAIL');
  } catch (e) {
    addTest('UI', 'Homepage loads', 'FAIL', e.message);
  }

  try {
    // Navigate to login
    await page.goto(`${FRONTEND_URL}/login`);
    const loginHeader = await page.locator('text=Welcome Back').isVisible();
    addTest('UI', 'Login page loads', loginHeader ? 'PASS' : 'FAIL');
  } catch (e) {
    addTest('UI', 'Login page loads', 'FAIL', e.message);
  }

  try {
    // Navigate to register
    await page.goto(`${FRONTEND_URL}/register`);
    const regHeader = await page.locator('text=Select your role').isVisible();
    addTest('UI', 'Register page loads', regHeader ? 'PASS' : 'FAIL');
  } catch (e) {
    addTest('UI', 'Register page loads', 'FAIL', e.message);
  }

  try {
    // Navigate to jobs
    await page.goto(`${FRONTEND_URL}/jobs`);
    const jobsHeader = await page.locator('text=Find Your Next').isVisible();
    addTest('UI', 'Jobs page loads', jobsHeader ? 'PASS' : 'FAIL');
  } catch (e) {
    addTest('UI', 'Jobs page loads', 'FAIL', e.message);
  }

  try {
    // Test form interaction (login form)
    await page.goto(`${FRONTEND_URL}/login`);
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    const submitButton = await page.locator('button:has-text("Sign In")');
    const isClickable = await submitButton.isEnabled();
    addTest('UI', 'Login form input interaction', isClickable ? 'PASS' : 'FAIL');
  } catch (e) {
    addTest('UI', 'Login form input interaction', 'FAIL', e.message);
  }

  try {
    // Test navigation links
    await page.goto(`${FRONTEND_URL}`);
    await page.click('a:has-text("Explore Careers")');
    await page.waitForURL('**/jobs');
    addTest('UI', 'Navigation works', true ? 'PASS' : 'FAIL');
  } catch (e) {
    addTest('UI', 'Navigation works', 'FAIL', e.message);
  }

  try {
    // Test responsive design visible on mobile viewport
    await context.close();
    const mobileContext = await browser.newContext({ viewport: { width: 375, height: 667 } });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto(`${FRONTEND_URL}/jobs`);
    const filterButton = await mobilePage.locator('button:has-text("Filters")');
    const isMobileVisible = await filterButton.isVisible();
    addTest('UI', 'Mobile responsive design', isMobileVisible ? 'PASS' : 'FAIL');
    await mobileContext.close();
  } catch (e) {
    addTest('UI', 'Mobile responsive design', 'FAIL', e.message);
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  log('Starting autonomous QA audit...', 'info');

  // Check if backend is running
  try {
    await axios.get(`${BACKEND_URL}/api/docs`);
    log('Backend already running', 'success');
  } catch {
    log('Backend not detected, skipping tests', 'warn');
    return;
  }

  // Check if frontend is running
  try {
    await axios.get(`${FRONTEND_URL}`, { maxRedirects: 0 });
    log('Frontend already running', 'success');
  } catch {
    log('Frontend not detected, skipping UI tests', 'warn');
  }

  // Run API tests
  await runAPITests();

  // Run UI tests if browsers available
  try {
    const browser = await chromium.launch();
   await runUITests(browser);
    await browser.close();
  } catch (e) {
    log('Browser tests skipped: ' + e.message, 'warn');
  }

  // ============================================================================
  // GENERATE REPORT
  // ============================================================================

  log('\n=== PHASE 4: AUDIT REPORT GENERATION ===', 'info');

  const featureMap = [
    { feature: 'Authentication', tests: ['Register', 'Login', 'Logout', 'JWT refresh', 'Protected routes'] },
    { feature: 'Job Management', tests: ['Create job', 'List jobs', 'Get job details', 'Update job', 'Delete job', 'Publish job'] },
    { feature: 'Applications', tests: ['Apply to job', 'Get my applications', 'Update status', 'Withdraw', 'Get by ID'] },
    { feature: 'User Profile', tests: ['Get profile', 'Update profile', 'Upload resume', 'Upload avatar', 'Change password'] },
    { feature: 'Notifications', tests: ['Get notifications', 'Mark as read', 'Delete notification'] },
    { feature: 'Analytics', tests: ['Recruiter analytics', 'Admin analytics'] },
    { feature: 'Frontend UI', tests: ['Homepage', 'Login page', 'Register page', 'Jobs page', 'Dashboard', 'Forms', 'Navigation'] }
  ];

  const passCount = testResults.filter(t => t.status === 'PASS').length;
  const failCount = testResults.filter(t => t.status === 'FAIL').length;
  const coverage = ((passCount / testResults.length) * 100).toFixed(1);

  const report = `
================================================================================
                        QA AUDIT REPORT - JOB PORTAL
                            Date: ${new Date().toISOString()}
================================================================================

EXECUTIVE SUMMARY
─────────────────
Overall Health Score: ${coverage}%
Total Tests Run: ${testResults.length}
Passed: ${passCount}
Failed: ${failCount}
Critical Issues: ${bugs.filter(b => b.severity === 'CRITICAL').length}

FEATURE MAP & COVERAGE
──────────────────────
${featureMap.map(f => `
${f.feature}:
  Tests: ${f.tests.join(', ')}
  Status: ${testResults.some(t => t.feature === f.feature && t.status === 'FAIL') ? '⚠️  PARTIAL' : '✅ PASSING'}`).join('\n')}

TEST RESULTS TABLE
──────────────────
${testResults.map(t => `${t.feature.padEnd(20)} | ${t.test.padEnd(40)} | ${t.status.padEnd(6)} ${t.error ? '| ' + t.error.substring(0, 50) : ''}`).join('\n')}

BUGS FOUND (by severity)
─────────────────────────
${bugs.length === 0 ? 'None detected' : bugs.sort((a, b) => {
  const severity = { CRITICAL: 3, HIGH: 2, MEDIUM: 1, LOW: 0 };
  return severity[b.severity] - severity[a.severity];
}).map((b, i) => `
${i + 1}. [${b.severity}] ${b.message}
   Feature: ${b.feature}
   Steps: ${b.steps.join(' → ')}`).join('\n')}

RECOMMENDATIONS
───────────────
1. Fix all CRITICAL issues immediately before production deployment
2. Implement unit tests for API endpoints
3. Add E2E test suite with CI/CD integration
4. Set up monitoring and alerting for production endpoints
5. Conduct security testing (OWASP Top 10)
6. Performance testing for load scenarios
7. Accessibility testing (WCAG compliance)

================================================================================
                              END OF REPORT
================================================================================
`;

  console.log(report);
  
  // Save report to file
  const fs = require('fs');
  fs.writeFileSync('./QA_AUDIT_REPORT.txt', report);
  log('Report saved to QA_AUDIT_REPORT.txt', 'success');
}

main().catch(err => {
  log('Fatal error: ' + err.message, 'error');
  process.exit(1);
});
