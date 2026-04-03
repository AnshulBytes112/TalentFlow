const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const firstNonEmpty = (...values) => values.find((value) => value !== undefined && value !== null && String(value).trim() !== '');

// Prefer EMAIL_* from project .env; use SMTP_* only as fallback aliases.
const SMTP_HOST = firstNonEmpty(process.env.EMAIL_HOST, process.env.SMTP_HOST, 'smtp.gmail.com');
const SMTP_PORT = Number(firstNonEmpty(process.env.EMAIL_PORT, process.env.SMTP_PORT, 587));
const SMTP_SECURE = String(firstNonEmpty(process.env.EMAIL_SECURE, process.env.SMTP_SECURE, 'false')).toLowerCase() === 'true';
const SMTP_USER = firstNonEmpty(process.env.EMAIL_USER, process.env.SMTP_USER);
const SMTP_PASS = firstNonEmpty(process.env.EMAIL_PASS, process.env.SMTP_PASS);

const assertSmtpCredentials = () => {
  if (!SMTP_USER || !SMTP_PASS) {
    throw new Error('Email credentials are missing. Set EMAIL_USER and EMAIL_PASS in backend/.env');
  }
};

// Create transporter
assertSmtpCredentials();
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS
  }
});

const APP_NAME = 'JobMatrix';
const FROM_EMAIL = `${APP_NAME} <${SMTP_USER}>`;

/**
 * Send Welcome Email
 */
const sendWelcomeEmail = async (user) => {
  const mailOptions = {
    from: FROM_EMAIL,
    to: user.email,
    subject: `Welcome to ${APP_NAME}!`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #4a90e2; text-align: center;">Welcome to JobMatrix, ${user.firstName}!</h2>
        <p>We're excited to have you join our community. Whether you're looking for your next career move or searching for top talent, we're here to help you succeed.</p>
        <p>Get started by completing your profile to stand out to potential ${user.role === 'jobseeker' ? 'employers' : 'candidates'}.</p>
        <div style="text-align: center; margin-top: 30px;">
          <a href="${process.env.FRONTEND_URL}/profile" style="background-color: #4a90e2; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Complete Your Profile</a>
        </div>
        <p style="margin-top: 30px; font-size: 0.9em; color: #666;">If you have any questions, just reply to this email.</p>
        <footer style="margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #999; font-size: 0.8em;">
          &copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
        </footer>
      </div>
    `
  };

  return await transporter.sendMail(mailOptions);
};

/**
 * Send Email Verification Token
 */
const sendEmailVerification = async (user, token) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  
  const mailOptions = {
    from: FROM_EMAIL,
    to: user.email,
    subject: `Verify your email for ${APP_NAME}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px;">
        <h2>Verify Your Email</h2>
        <p>Hi ${user.firstName}, please click the button below to verify your email address and activate your account.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #28a745; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px;">Verify Email</a>
        </div>
        <p>Or copy this link: <br> <a href="${verificationUrl}">${verificationUrl}</a></p>
      </div>
    `
  };

  return await transporter.sendMail(mailOptions);
};

/**
 * Send Password Reset Token
 */
const sendPasswordReset = async (user, token) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  
  const mailOptions = {
    from: FROM_EMAIL,
    to: user.email,
    subject: `Password Reset Request - ${APP_NAME}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px;">
        <h2>Reset Your Password</h2>
        <p>You requested a password reset. Click the button below to choose a new password. This link expires in 1 hour.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #dc3545; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px;">Reset Password</a>
        </div>
        <p>If you didn't request this, please ignore this email.</p>
      </div>
    `
  };

  return await transporter.sendMail(mailOptions);
};

/**
 * Send Application Received Notification to Applicant
 */
const sendApplicationReceived = async (applicant, job) => {
  const mailOptions = {
    from: FROM_EMAIL,
    to: applicant.email,
    subject: `Application Received: ${job.title}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px;">
        <h2 style="color: #28a745;">Application Submitted!</h2>
        <p>Hi ${applicant.firstName}, your application for <strong>${job.title}</strong> at <strong>${job.company?.name || job.postedBy?.profile?.companyName || 'the company'}</strong> has been successfully received.</p>
        <p>The recruiter will review your profile and reach out if there's a match.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/dashboard/applications" style="background-color: #007bff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px;">Track Application</a>
        </div>
      </div>
    `
  };

  return await transporter.sendMail(mailOptions);
};

/**
 * Send Stage Update Notification
 */
const sendStageUpdate = async (applicant, job, newStage, note) => {
  const stageConfigs = {
    screening: {
      title: 'Application Under Review',
      sub: 'Good news! Your application is moving forward.',
      msg: `Your application for <strong>${job.title}</strong> is now in the <strong>Screening</strong> phase. Our team is carefully reviewing your profile and will be in touch soon.`,
      color: '#3182ce'
    },
    interview: {
      title: 'Interview Invitation!',
      sub: 'Congratulations! We\'d like to get to know you better.',
      msg: `We are excited to move your application for <strong>${job.title}</strong> to the <strong>Interview</strong> stage. Please check your dashboard for scheduling details or wait for our team to contact you.`,
      color: '#805ad5'
    },
    technical: {
      title: 'Technical Assessment',
      sub: 'Next step: Prove your skills.',
      msg: `Your application for <strong>${job.title}</strong> has advanced to the <strong>Technical</strong> stage. This is a great opportunity to showcase your expertise.`,
      color: '#38a169'
    }
  };

  const config = stageConfigs[newStage] || {
    title: 'Application Update',
    sub: 'Your application status has changed.',
    msg: `Your application for <strong>${job.title}</strong> has moved to the <strong>${newStage}</strong> stage.`,
    color: '#4a5568'
  };

  const mailOptions = {
    from: FROM_EMAIL,
    to: applicant.email,
    subject: `Job Update: ${config.title} - ${job.title}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border-top: 4px solid ${config.color};">
        <h2 style="color: ${config.color};">${config.title}</h2>
        <p>Hi ${applicant.firstName}, ${config.sub}</p>
        <p>${config.msg}</p>
        ${note ? `<div style="background-color: #f7fafc; padding: 15px; border-left: 4px solid #cbd5e0; margin: 20px 0;"><strong>Message from recruiter:</strong><br>${note}</div>` : ''}
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/dashboard/applications" style="background-color: ${config.color}; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Application Status</a>
        </div>
      </div>
    `
  };

  return await transporter.sendMail(mailOptions);
};

/**
 * Send Offer Email
 */
const sendOfferEmail = async (applicant, job) => {
  const mailOptions = {
    from: FROM_EMAIL,
    to: applicant.email,
    subject: `Job Offer: ${job.title}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; background-color: #f0fff4; border: 1px solid #c6f6d5;">
        <h1 style="color: #2f855a; text-align: center;">🎉 Congratulations!</h1>
        <p>Hi ${applicant.firstName}, we are thrilled to extend an offer for the <strong>${job.title}</strong> position.</p>
        <p>Please log in to your dashboard to view the full offer details, including compensation and benefits.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/dashboard/applications" style="background-color: #2f855a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 1.1em;">View Job Offer</a>
        </div>
      </div>
    `
  };

  return await transporter.sendMail(mailOptions);
};

/**
 * Send Rejection Email
 */
const sendRejectionEmail = async (applicant, job, note) => {
  const mailOptions = {
    from: FROM_EMAIL,
    to: applicant.email,
    subject: `Update regarding your application for ${job.title}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px;">
        <h2>Application Update</h2>
        <p>Hi ${applicant.firstName}, thank you for the time you spent applying for the <strong>${job.title}</strong> role.</p>
        <p>After careful consideration, we have decided not to move forward with your application at this time.</p>
        ${note ? `<p><strong>Feedback:</strong> ${note}</p>` : ''}
        <p>We wish you the best in your job search and encourage you to apply for future roles that match your skills.</p>
      </div>
    `
  };

  return await transporter.sendMail(mailOptions);
};

/**
 * Send Job Expiry Reminder to Recruiter
 */
const sendJobExpiryReminder = async (recruiter, jobs) => {
  const jobList = jobs.map(job => `<li>${job.title}</li>`).join('');
  
  const mailOptions = {
    from: FROM_EMAIL,
    to: recruiter.email,
    subject: `Notice: Job Postings Expired`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px;">
        <h2>Your Job Postings Have Expired</h2>
        <p>Hi ${recruiter.firstName}, the following job postings have reached their deadline and are now closed:</p>
        <ul>${jobList}</ul>
        <p>You can renew these postings or view applicants from your recruiter dashboard.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/recruiter/jobs" style="background-color: #6c757d; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px;">Manage Jobs</a>
        </div>
      </div>
    `
  };

  return await transporter.sendMail(mailOptions);
};

/**
 * Send Pending Applications Reminder to Recruiter
 */
const sendPendingApplicationsReminder = async (recruiter, count) => {
  const mailOptions = {
    from: FROM_EMAIL,
    to: recruiter.email,
    subject: `Action Required: ${count} Pending Applications`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border-left: 5px solid #ecc94b;">
        <h2>Don't lose out on great talent!</h2>
        <p>Hi ${recruiter.firstName}, you have <strong>${count}</strong> applications that have been in the "Applied" stage for more than 7 days.</p>
        <p>Reviewing applications promptly improves your hiring brand and candidate experience.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/recruiter/dashboard" style="background-color: #d69e2e; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Review Applications</a>
        </div>
      </div>
    `
  };

  return await transporter.sendMail(mailOptions);
};

/**
 * Send Job Updated Notification to Applicant
 */
const sendJobUpdatedEmail = async (applicant, job, updatedFields = []) => {
  const salaryMin = job?.salary?.min;
  const salaryMax = job?.salary?.max;
  const currency = job?.salary?.currency || 'USD';

  const formatMoney = (value) => {
    if (typeof value !== 'number') return null;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
  };

  const salaryHtml = job?.isUnpaid
    ? 'Unpaid position'
    : (() => {
        const min = formatMoney(salaryMin);
        const max = formatMoney(salaryMax);
        if (min && max) return `${min} - ${max}`;
        if (min) return `${min}+`;
        if (max) return `Up to ${max}`;
        return 'Not specified';
      })();

  const deadline = job?.deadline ? new Date(job.deadline).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not specified';
  const location = job?.location || 'Not specified';
  const companyName = job?.company?.name || job?.companyName || 'Not specified';
  const workMode = job?.workMode || 'Not specified';
  const jobType = job?.type || 'Not specified';

  const changedFieldsHtml = updatedFields.length > 0
    ? `<ul style="margin: 8px 0 0 18px; padding: 0; color: #374151;">${updatedFields.map((field) => `<li style="margin-bottom: 6px;">${field}</li>`).join('')}</ul>`
    : '<p style="margin: 8px 0 0; color: #374151;">The recruiter made updates to this listing.</p>';

  const skillsHtml = Array.isArray(job?.skills) && job.skills.length
    ? `<p style="margin: 0;"><strong>Skills:</strong> ${job.skills.slice(0, 10).join(', ')}</p>`
    : '';

  const requirementsHtml = Array.isArray(job?.requirements) && job.requirements.length
    ? `<p style="margin: 0;"><strong>Top requirements:</strong> ${job.requirements.slice(0, 5).join(', ')}</p>`
    : '';

  const descriptionSnippet = typeof job?.description === 'string' && job.description.trim()
    ? `${job.description.trim().slice(0, 320)}${job.description.trim().length > 320 ? '...' : ''}`
    : '';

  const mailOptions = {
    from: FROM_EMAIL,
    to: applicant.email,
    subject: `Job listing updated: ${job.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 680px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff;">
        <h2 style="color: #1d4ed8; margin-top: 0;">A job you applied to was updated</h2>
        <p style="color: #111827; line-height: 1.55;">Hi ${applicant.firstName},</p>
        <p style="color: #111827; line-height: 1.55;">The recruiter has posted updates to <strong>${job.title}</strong>. Please review the latest details below and confirm this opportunity still matches your preferences.</p>

        <div style="margin: 18px 0; padding: 16px; border-radius: 10px; background: #f8fafc; border: 1px solid #e5e7eb; color: #111827;">
          <p style="margin: 0 0 10px;"><strong>Job:</strong> ${job.title}</p>
          <p style="margin: 0 0 10px;"><strong>Company:</strong> ${companyName}</p>
          <p style="margin: 0 0 10px;"><strong>Location:</strong> ${location}</p>
          <p style="margin: 0 0 10px;"><strong>Type:</strong> ${jobType}</p>
          <p style="margin: 0 0 10px;"><strong>Work mode:</strong> ${workMode}</p>
          <p style="margin: 0 0 10px;"><strong>Compensation:</strong> ${salaryHtml}</p>
          <p style="margin: 0 0 10px;"><strong>Application deadline:</strong> ${deadline}</p>
          ${skillsHtml}
          ${requirementsHtml}
          ${descriptionSnippet ? `<p style="margin: 10px 0 0;"><strong>Updated description preview:</strong> ${descriptionSnippet}</p>` : ''}
        </div>

        <div style="margin: 16px 0; padding: 14px; border-left: 4px solid #1d4ed8; background: #eff6ff;">
          <p style="margin: 0; font-weight: 700; color: #1e40af;">What changed</p>
          ${changedFieldsHtml}
        </div>

        <p style="color: #111827; line-height: 1.55;">If this role still fits your goals, keep monitoring your application status in the portal for upcoming updates.</p>

        <div style="text-align: center; margin: 26px 0 12px;">
          <a href="${process.env.FRONTEND_URL}/jobs/${job._id}" style="background-color: #1d4ed8; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 700; display: inline-block;">Review Updated Job</a>
        </div>
      </div>
    `
  };

  return await transporter.sendMail(mailOptions);
};

module.exports = {
  sendWelcomeEmail,
  sendEmailVerification,
  sendPasswordReset,
  sendApplicationReceived,
  sendStageUpdate,
  sendOfferEmail,
  sendRejectionEmail,
  sendJobExpiryReminder,
  sendPendingApplicationsReminder,
  sendJobUpdatedEmail
};
