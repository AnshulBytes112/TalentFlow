const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Send email function
const sendEmail = async (options) => {
  const transporter = createTransporter();
  
  const mailOptions = {
    from: `${process.env.FROM_NAME || 'Job Portal'} <${process.env.FROM_EMAIL || process.env.EMAIL_USER}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: ' + info.messageId);
    return info;
  } catch (error) {
    console.error('Email sending error:', error);
    throw new Error(`Email could not be sent: ${error.message}`);
  }
};

// Email templates
const emailTemplates = {
  welcome: (userName) => ({
    subject: 'Welcome to Job Portal!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to Job Portal, ${userName}!</h2>
        <p>We're excited to have you join our community. Get started by completing your profile and exploring job opportunities.</p>
        <a href="${process.env.FRONTEND_URL}/dashboard" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Get Started</a>
        <p>Best regards,<br>The Job Portal Team</p>
      </div>
    `,
  }),
  
  applicationReceived: (userName, jobTitle) => ({
    subject: 'Application Received',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Application Received!</h2>
        <p>Hi ${userName},</p>
        <p>We've received your application for the position of <strong>${jobTitle}</strong>. Our team will review your application and get back to you soon.</p>
        <a href="${process.env.FRONTEND_URL}/applications" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Applications</a>
        <p>Best regards,<br>The Job Portal Team</p>
      </div>
    `,
  }),
  
  applicationStatusUpdate: (userName, jobTitle, status) => ({
    subject: `Application Status Update: ${status}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Application Status Update</h2>
        <p>Hi ${userName},</p>
        <p>Your application for <strong>${jobTitle}</strong> has been updated to: <strong>${status}</strong>.</p>
        <a href="${process.env.FRONTEND_URL}/applications" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Details</a>
        <p>Best regards,<br>The Job Portal Team</p>
      </div>
    `,
  }),
};

module.exports = {
  sendEmail,
  emailTemplates,
};
