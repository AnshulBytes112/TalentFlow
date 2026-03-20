// User roles
const USER_ROLES = {
  JOBSEEKER: 'jobseeker',
  RECRUITER: 'recruiter',
  ADMIN: 'admin'
};

// Job types
const JOB_TYPES = {
  FULL_TIME: 'full-time',
  PART_TIME: 'part-time',
  CONTRACT: 'contract',
  INTERNSHIP: 'internship',
  REMOTE: 'remote'
};

// Job categories
const JOB_CATEGORIES = {
  ENGINEERING: 'engineering',
  DESIGN: 'design',
  MARKETING: 'marketing',
  SALES: 'sales',
  CUSTOMER_SUPPORT: 'customer-support',
  PRODUCT: 'product',
  DATA_SCIENCE: 'data-science',
  HR: 'hr',
  FINANCE: 'finance',
  OPERATIONS: 'operations',
  OTHER: 'other'
};

// Experience levels
const EXPERIENCE_LEVELS = {
  ENTRY_LEVEL: 'entry-level',
  MID_LEVEL: 'mid-level',
  SENIOR_LEVEL: 'senior-level',
  EXECUTIVE: 'executive'
};

// Application statuses
const APPLICATION_STATUSES = {
  APPLIED: 'applied',
  SCREENING: 'screening',
  INTERVIEW: 'interview',
  TECHNICAL: 'technical',
  OFFER: 'offer',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn'
};

// Application stages
const APPLICATION_STAGES = {
  INITIAL: 'initial',
  SCREENING: 'screening',
  INTERVIEW: 'interview',
  TECHNICAL: 'technical',
  FINAL: 'final',
  COMPLETED: 'completed'
};

// Priority levels
const PRIORITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
};

// Notification types
const NOTIFICATION_TYPES = {
  APPLICATION_RECEIVED: 'application_received',
  APPLICATION_STATUS_UPDATE: 'application_status_update',
  APPLICATION_VIEWED: 'application_viewed',
  INTERVIEW_SCHEDULED: 'interview_scheduled',
  INTERVIEW_REMINDER: 'interview_reminder',
  OFFER_RECEIVED: 'offer_received',
  JOB_RECOMMENDED: 'job_recommended',
  JOB_SAVED: 'job_saved',
  PROFILE_VIEWED: 'profile_viewed',
  MESSAGE: 'message',
  SYSTEM: 'system',
  DEADLINE_REMINDER: 'deadline_reminder'
};

// File types and limits
const FILE_CONSTRAINTS = {
  RESUME: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  },
  PROFILE_PICTURE: {
    maxSize: 2 * 1024 * 1024, // 2MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
  },
  COMPANY_LOGO: {
    maxSize: 1 * 1024 * 1024, // 1MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
  }
};

// Pagination defaults
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100
};

// JWT settings
const JWT = {
  EXPIRE: '7d',
  COOKIE_EXPIRE: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
};

// Email templates
const EMAIL_TEMPLATES = {
  WELCOME: 'welcome',
  APPLICATION_RECEIVED: 'application_received',
  APPLICATION_STATUS_UPDATE: 'application_status_update',
  INTERVIEW_SCHEDULED: 'interview_scheduled',
  OFFER_RECEIVED: 'offer_received',
  PASSWORD_RESET: 'password_reset',
  EMAIL_VERIFICATION: 'email_verification'
};

// Rate limiting
const RATE_LIMITS = {
  GENERAL: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100
  },
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10
  },
  PASSWORD_RESET: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3
  },
  JOB_POSTING: {
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 10
  },
  APPLICATION: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20
  }
};

// Status codes
const STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

// Regex patterns
const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  PHONE: /^[\+]?[1-9][\d]{0,15}$/,
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/
};

// Error messages
const ERROR_MESSAGES = {
  VALIDATION_FAILED: 'Validation failed',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Access denied',
  NOT_FOUND: 'Resource not found',
  DUPLICATE_EMAIL: 'Email already exists',
  INVALID_CREDENTIALS: 'Invalid email or password',
  TOKEN_EXPIRED: 'Token has expired',
  INVALID_TOKEN: 'Invalid token',
  FILE_TOO_LARGE: 'File size too large',
  INVALID_FILE_TYPE: 'Invalid file type',
  SERVER_ERROR: 'Internal server error',
  DATABASE_ERROR: 'Database operation failed',
  NETWORK_ERROR: 'Network error occurred'
};

// Success messages
const SUCCESS_MESSAGES = {
  CREATED: 'Created successfully',
  UPDATED: 'Updated successfully',
  DELETED: 'Deleted successfully',
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful',
  EMAIL_SENT: 'Email sent successfully',
  FILE_UPLOADED: 'File uploaded successfully',
  APPLICATION_SUBMITTED: 'Application submitted successfully'
};

module.exports = {
  USER_ROLES,
  JOB_TYPES,
  JOB_CATEGORIES,
  EXPERIENCE_LEVELS,
  APPLICATION_STATUSES,
  APPLICATION_STAGES,
  PRIORITY_LEVELS,
  NOTIFICATION_TYPES,
  FILE_CONSTRAINTS,
  PAGINATION,
  JWT,
  EMAIL_TEMPLATES,
  RATE_LIMITS,
  STATUS_CODES,
  REGEX_PATTERNS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES
};
