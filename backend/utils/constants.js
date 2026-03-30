// User roles
const ROLES = {
  JOBSEEKER: 'jobseeker',
  RECRUITER: 'recruiter',
  ADMIN: 'admin'
};

// Valid stage transitions for applications
const VALID_STAGE_TRANSITIONS = {
  applied: ['screening', 'rejected'],
  screening: ['interview', 'rejected'],
  interview: ['offer', 'rejected'],
  offer: ['rejected'],
  rejected: [],
  withdrawn: []
};

// Application stages
const APPLICATION_STAGES = ['applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn'];

// JWT settings
const JWT_ACCESS_EXPIRY = '15m';
const JWT_REFRESH_EXPIRY = '7d';

// Cookie options
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days in ms
};

// Job status
const JOB_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  CLOSED: 'closed',
  EXPIRED: 'expired'
};

// Job types
const JOB_TYPES = ['full-time', 'part-time', 'contract', 'internship'];

// Work modes
const WORK_MODES = ['remote', 'onsite', 'hybrid'];

// Job categories
const JOB_CATEGORIES = [
  'engineering',
  'design',
  'marketing',
  'sales',
  'customer-support',
  'product',
  'data-science',
  'hr',
  'finance',
  'operations',
  'other'
];

// Experience levels
const EXPERIENCE_LEVELS = ['entry-level', 'mid-level', 'senior-level', 'executive'];

// Notification types
const NOTIFICATION_TYPES = {
  APPLICATION_UPDATE: 'application_update',
  NEW_APPLICATION: 'new_application',
  JOB_EXPIRED: 'job_expired',
  GENERAL: 'general'
};

// File constraints
const MAX_FILE_SIZE = 5 * 1024 * 1024;  // 5MB in bytes
const ALLOWED_FILE_TYPES = ['application/pdf'];
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

module.exports = {
  ROLES,
  VALID_STAGE_TRANSITIONS,
  APPLICATION_STAGES,
  JWT_ACCESS_EXPIRY,
  JWT_REFRESH_EXPIRY,
  COOKIE_OPTIONS,
  JOB_STATUS,
  JOB_TYPES,
  WORK_MODES,
  JOB_CATEGORIES,
  EXPERIENCE_LEVELS,
  NOTIFICATION_TYPES,
  MAX_FILE_SIZE,
  ALLOWED_FILE_TYPES,
  ALLOWED_IMAGE_TYPES
};
