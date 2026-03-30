const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

/**
 * Send email verification email
 */
const sendVerificationEmail = async (user, verificationToken) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

  const mailOptions = {
    to: user.email,
    subject: 'Verify Your Email Address',
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <h2 style="color: #333;">Welcome to JobMatrix!</h2>
        <p>Hi ${user.firstName},</p>
        <p>Thank you for registering with JobMatrix. Please click the button below to verify your email address:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #007bff; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create an account, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          Best regards,<br>
          The JobMatrix Team
        </p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to ${user.email}`);
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
};

/**
 * Send password reset email
 */
const sendPasswordResetEmail = async (user, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  const mailOptions = {
    to: user.email,
    subject: 'Reset Your Password',
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <h2 style="color: #333;">Reset Your Password</h2>
        <p>Hi ${user.firstName},</p>
        <p>We received a request to reset your password for your JobMatrix account. Click the button below to create a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #dc3545; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          Best regards,<br>
          The JobMatrix Team
        </p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${user.email}`);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

/**
 * Send congratulation email for job offer
 */
const sendOfferEmail = async (applicant, job) => {
  const mailOptions = {
    to: applicant.email,
    subject: `Congratulations! Job Offer from ${job.company || job.postedBy.firstName}`,
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <h2 style="color: #28a745;">🎉 Congratulations!</h2>
        <p>Hi ${applicant.firstName},</p>
        <p>We're thrilled to inform you that you have received a job offer!</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Job Details:</h3>
          <p><strong>Position:</strong> ${job.title}</p>
          <p><strong>Company:</strong> ${job.company || job.postedBy.firstName}</p>
          <p><strong>Location:</strong> ${job.location}</p>
          <p><strong>Work Mode:</strong> ${job.workMode}</p>
          ${job.salaryMin ? `<p><strong>Salary Range:</strong> $${job.salaryMin}${job.salaryMax ? ` - $${job.salaryMax}` : ''}</p>` : ''}
        </div>
        <p>Please check your application dashboard for more details and next steps.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/applications" 
             style="background-color: #28a745; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            View Application
          </a>
        </div>
        <p>Congratulations again on this achievement!</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          Best regards,<br>
          The JobMatrix Team
        </p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Offer email sent to ${applicant.email}`);
  } catch (error) {
    console.error('Error sending offer email:', error);
    throw error;
  }
};

/**
 * Send rejection email
 */
const sendRejectionEmail = async (applicant, job, note = '') => {
  const mailOptions = {
    to: applicant.email,
    subject: `Update on Your Application for ${job.title}`,
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <h2 style="color: #dc3545;">Application Update</h2>
        <p>Hi ${applicant.firstName},</p>
        <p>Thank you for your interest in the <strong>${job.title}</strong> position at ${job.company || job.postedBy?.firstName}.</p>
        <p>After careful consideration, we have decided to move forward with other candidates at this time.</p>
        ${note ? `
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Feedback:</strong></p>
          <p>${note}</p>
        </div>
        ` : ''}
        <p>We encourage you to continue browsing and applying for other opportunities on JobMatrix.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/jobs" 
             style="background-color: #007bff; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Browse More Jobs
          </a>
        </div>
        <p>We wish you the best in your job search!</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          Best regards,<br>
          The JobMatrix Team
        </p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Rejection email sent to ${applicant.email}`);
  } catch (error) {
    console.error('Error sending rejection email:', error);
  }
};

/**
 * Send job closed email to applicants
 */
const sendJobClosedEmail = async (applicant, job) => {
  const mailOptions = {
    to: applicant.email,
    subject: `Job Closed: ${job.title}`,
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <h2 style="color: #6c757d;">Job Closed</h2>
        <p>Hi ${applicant.firstName},</p>
        <p>We're writing to inform you that the job position <strong>${job.title}</strong> at <strong>${job.company || job.postedBy?.firstName}</strong> has been closed and is no longer accepting applications.</p>
        <p>While this specific position is no longer available, we encourage you to keep your profile updated and continue your search for other exciting opportunities on JobMatrix.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/jobs" 
             style="background-color: #007bff; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Browse New Jobs
          </a>
        </div>
        <p>Thank you for your interest and best of luck with your future applications!</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          Best regards,<br>
          The JobMatrix Team
        </p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending job closed email:', error);
  }
};

/**
 * Send account status update email
 */
const sendAccountStatusEmail = async (user, status) => {
  const isActive = status === 'activated';
  const mailOptions = {
    to: user.email,
    subject: `Your JobMatrix Account has been ${status}`,
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <h2 style="color: ${isActive ? '#28a745' : '#dc3545'};">Account Status Update</h2>
        <p>Hi ${user.firstName},</p>
        <p>Your JobMatrix account has been <strong>${status}</strong> by an administrator.</p>
        ${isActive ? `
        <p>You can now log in and access all features of the platform.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/login" 
             style="background-color: #28a745; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Log In Now
          </a>
        </div>
        ` : `
        <p>If you believe this is a mistake, please contact our support team for assistance.</p>
        `}
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          Best regards,<br>
          The JobMatrix Team
        </p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending account status email:', error);
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendOfferEmail,
  sendRejectionEmail,
  sendJobClosedEmail,
  sendAccountStatusEmail
};
