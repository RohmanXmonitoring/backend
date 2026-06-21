const constants = {
  // User Roles
  ROLES: {
    SUPER_ADMIN: 'super_admin',
    ADMIN: 'admin',
    RESELLER: 'reseller',
    USER: 'user'
  },

  // User Status
  USER_STATUS: {
    ACTIVE: 'active',
    SUSPENDED: 'suspended',
    PENDING: 'pending',
    DELETED: 'deleted'
  },

  // Device Status
  DEVICE_STATUS: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    LOST: 'lost',
    DELETED: 'deleted'
  },

  // License Types
  LICENSE_TYPES: {
    RESELLER_1_YEAR: 'reseller_1year',
    USER_30_DAYS: 'user_30days',
    USER_1_YEAR: 'user_1year'
  },

  // License Status
  LICENSE_STATUS: {
    ACTIVE: 'active',
    EXPIRED: 'expired',
    DISABLED: 'disabled',
    DELETED: 'deleted'
  },

  // PIN Status
  PIN_STATUS: {
    ACTIVE: 'active',
    USED: 'used',
    EXPIRED: 'expired',
    DISABLED: 'disabled',
    DELETED: 'deleted'
  },

  // Notification Types
  NOTIFICATION_TYPES: {
    BROADCAST: 'broadcast',
    USER: 'user',
    ROLE: 'role',
    DEVICE: 'device',
    SYSTEM: 'system'
  },

  // Notification Priority
  NOTIFICATION_PRIORITY: {
    HIGH: 'high',
    NORMAL: 'normal',
    LOW: 'low'
  },

  // Notification Status
  NOTIFICATION_STATUS: {
    PENDING: 'pending',
    SENT: 'sent',
    DELIVERED: 'delivered',
    READ: 'read',
    FAILED: 'failed'
  },

  // Audit Actions
  AUDIT_ACTIONS: {
    LOGIN: 'login',
    LOGOUT: 'logout',
    CREATE_USER: 'create_user',
    UPDATE_USER: 'update_user',
    DELETE_USER: 'delete_user',
    SUSPEND_USER: 'suspend_user',
    RESET_PASSWORD: 'reset_password',
    ASSIGN_ROLE: 'assign_role',
    EXTEND_LICENSE: 'extend_license',
    CREATE_DEVICE: 'create_device',
    UPDATE_DEVICE: 'update_device',
    DELETE_DEVICE: 'delete_device',
    GENERATE_PIN: 'generate_pin',
    DELETE_PIN: 'delete_pin',
    USE_PIN: 'use_pin',
    CREATE_LICENSE: 'create_license',
    UPDATE_LICENSE: 'update_license',
    DELETE_LICENSE: 'delete_license',
    SEND_NOTIFICATION: 'send_notification',
    UPDATE_SETTINGS: 'update_settings'
  },

  // Session Status
  SESSION_STATUS: {
    ACTIVE: 'active',
    EXPIRED: 'expired',
    INVALIDATED: 'invalidated',
    DELETED: 'deleted'
  },

  // CORS Origins
  CORS_ORIGINS: process.env.CORS_ORIGIN ? 
    process.env.CORS_ORIGIN.split(',') : 
    ['http://localhost:3000'],

  // Rate Limiting
  RATE_LIMITS: {
    AUTH: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5 // 5 requests per window
    },
    API: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // 100 requests per window
    },
    STRICT: {
      windowMs: 5 * 60 * 1000, // 5 minutes
      max: 10 // 10 requests per window
    }
  },

  // Pagination
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100
  },

  // File Upload
  UPLOAD: {
    MAX_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    MAX_FILES: 5
  },

  // Cache TTL (seconds)
  CACHE_TTL: {
    USER: 3600, // 1 hour
    DEVICE: 300, // 5 minutes
    LICENSE: 600, // 10 minutes
    PIN: 300, // 5 minutes
    SETTINGS: 3600, // 1 hour
    DASHBOARD: 60 // 1 minute
  },

  // Socket Events
  SOCKET_EVENTS: {
    // Connection
    CONNECT: 'connect',
    DISCONNECT: 'disconnect',
    AUTH: 'auth',
    UNAUTH: 'unauth',
    
    // User Events
    USER_CREATED: 'user_created',
    USER_UPDATED: 'user_updated',
    USER_DELETED: 'user_deleted',
    USER_STATUS_CHANGED: 'user_status_changed',
    USER_ONLINE: 'user_online',
    USER_OFFLINE: 'user_offline',
    
    // Device Events
    DEVICE_CONNECTED: 'device_connected',
    DEVICE_DISCONNECTED: 'device_disconnected',
    DEVICE_UPDATED: 'device_updated',
    DEVICE_STATUS_CHANGED: 'device_status_changed',
    
    // License Events
    LICENSE_CREATED: 'license_created',
    LICENSE_UPDATED: 'license_updated',
    LICENSE_EXPIRED: 'license_expired',
    LICENSE_STATUS_CHANGED: 'license_status_changed',
    
    // PIN Events
    PIN_CREATED: 'pin_created',
    PIN_UPDATED: 'pin_updated',
    PIN_USED: 'pin_used',
    PIN_EXPIRED: 'pin_expired',
    
    // Notification Events
    NOTIFICATION_CREATED: 'notification_created',
    NOTIFICATION_SENT: 'notification_sent',
    NOTIFICATION_READ: 'notification_read',
    
    // Dashboard Events
    DASHBOARD_UPDATE: 'dashboard_update',
    STATISTICS_UPDATE: 'statistics_update',
    
    // System Events
    SYSTEM_STATUS: 'system_status',
    SYSTEM_ERROR: 'system_error',
    SYSTEM_WARNING: 'system_warning'
  },

  // HTTP Status Codes
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500
  },

  // Error Messages
  ERROR_MESSAGES: {
    UNAUTHORIZED: 'Authentication required',
    INVALID_TOKEN: 'Invalid or expired token',
    FORBIDDEN: 'Insufficient permissions',
    NOT_FOUND: 'Resource not found',
    VALIDATION_ERROR: 'Validation error',
    DUPLICATE_EMAIL: 'Email already exists',
    DUPLICATE_USERNAME: 'Username already exists',
    INVALID_CREDENTIALS: 'Invalid email or password',
    ACCOUNT_SUSPENDED: 'Account has been suspended',
    ACCOUNT_DELETED: 'Account has been deleted',
    LICENSE_EXPIRED: 'License has expired',
    LICENSE_INVALID: 'Invalid license',
    PIN_INVALID: 'Invalid PIN',
    PIN_EXPIRED: 'PIN has expired',
    PIN_USED: 'PIN has already been used',
    DEVICE_LIMIT_REACHED: 'Device limit reached',
    USER_NOT_FOUND: 'User not found',
    DEVICE_NOT_FOUND: 'Device not found',
    LICENSE_NOT_FOUND: 'License not found',
    PIN_NOT_FOUND: 'PIN not found'
  },

  // Success Messages
  SUCCESS_MESSAGES: {
    LOGIN_SUCCESS: 'Login successful',
    LOGOUT_SUCCESS: 'Logout successful',
    REGISTER_SUCCESS: 'Registration successful',
    USER_CREATED: 'User created successfully',
    USER_UPDATED: 'User updated successfully',
    USER_DELETED: 'User deleted successfully',
    DEVICE_CREATED: 'Device created successfully',
    DEVICE_UPDATED: 'Device updated successfully',
    DEVICE_DELETED: 'Device deleted successfully',
    LICENSE_CREATED: 'License created successfully',
    LICENSE_UPDATED: 'License updated successfully',
    LICENSE_DELETED: 'License deleted successfully',
    PIN_CREATED: 'PIN generated successfully',
    PIN_UPDATED: 'PIN updated successfully',
    PIN_DELETED: 'PIN deleted successfully',
    NOTIFICATION_SENT: 'Notification sent successfully'
  },

  // Regex Patterns
  PATTERNS: {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    USERNAME: /^[a-zA-Z0-9_]{3,20}$/,
    PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/,
    PHONE: /^\+?[\d\s-]{10,15}$/,
    PIN_CODE: /^[A-Z0-9]{6}$/,
    LICENSE_KEY: /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/
  },

  // License Durations (in days)
  LICENSE_DURATIONS: {
    RESELLER_1_YEAR: 365,
    USER_30_DAYS: 30,
    USER_1_YEAR: 365
  },

  // Default Values
  DEFAULTS: {
    USER_ROLE: 'user',
    DEVICE_LIMIT: 1,
    MAX_DEVICES_PER_USER: 5,
    SESSION_TIMEOUT: 7 * 24 * 60 * 60, // 7 days in seconds
    TOKEN_EXPIRY: '15m',
    REFRESH_TOKEN_EXPIRY: '7d',
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION: 30 // minutes
  },

  // Feature Flags
  FEATURES: {
    ENABLE_REGISTRATION: true,
    ENABLE_EMAIL_VERIFICATION: true,
    ENABLE_TWO_FACTOR_AUTH: false,
    ENABLE_DEVICE_MANAGEMENT: true,
    ENABLE_LICENSE_MANAGEMENT: true,
    ENABLE_PIN_ENROLLMENT: true,
    ENABLE_NOTIFICATIONS: true,
    ENABLE_AUDIT_LOG: true,
    ENABLE_REALTIME_UPDATES: true
  }
};

module.exports = constants;
