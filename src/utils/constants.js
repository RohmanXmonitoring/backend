// src/utils/constants.js
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
    UPDATE_SETTINGS: 'update_settings',
    // ===== FITUR BARU =====
    SEND_INVITATION: 'send_invitation',
    RESEND_INVITATION: 'resend_invitation',
    CANCEL_INVITATION: 'cancel_invitation',
    ACCEPT_INVITATION: 'accept_invitation',
    START_SCREEN_SHARING: 'start_screen_sharing',
    STOP_SCREEN_SHARING: 'stop_screen_sharing',
    START_SCREEN_RECORDING: 'start_screen_recording',
    STOP_SCREEN_RECORDING: 'stop_screen_recording',
    DELETE_RECORDING: 'delete_recording',
    MARK_MESSAGE_READ: 'mark_message_read',
    DELETE_MESSAGE: 'delete_message',
    VIEW_APP_USAGE: 'view_app_usage'
  },

  // Session Status
  SESSION_STATUS: {
    ACTIVE: 'active',
    EXPIRED: 'expired',
    INVALIDATED: 'invalidated',
    DELETED: 'deleted'
  },

  // ===== SCREEN SHARING =====
  SCREEN_SHARING_STATUS: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    REQUESTED: 'requested',
    PAUSED: 'paused',
    STOPPED: 'stopped'
  },

  // ===== SCREEN RECORDING =====
  SCREEN_RECORDING_STATUS: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    REQUESTED: 'requested',
    PAUSED: 'paused',
    STOPPED: 'stopped',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    DELETED: 'deleted'
  },

  // ===== APP MONITORING =====
  APP_MONITORING_STATUS: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    PAUSED: 'paused'
  },

  APP_CATEGORIES: {
    SOCIAL: 'social',
    COMMUNICATION: 'communication',
    ENTERTAINMENT: 'entertainment',
    GAMES: 'games',
    PRODUCTIVITY: 'productivity',
    UTILITY: 'utility',
    EDUCATION: 'education',
    SHOPPING: 'shopping',
    FINANCE: 'finance',
    HEALTH: 'health',
    NEWS: 'news',
    TRAVEL: 'travel',
    PHOTOGRAPHY: 'photography',
    MUSIC: 'music',
    VIDEO: 'video',
    UNKNOWN: 'unknown'
  },

  // ===== MESSAGES =====
  MESSAGE_TYPE: {
    WHATSAPP: 'whatsapp',
    TELEGRAM: 'telegram',
    SMS: 'sms',
    NOTIFICATION: 'notification',
    EMAIL: 'email'
  },

  MESSAGE_STATUS: {
    READ: 'read',
    UNREAD: 'unread',
    DELETED: 'deleted',
    ARCHIVED: 'archived',
    SENT: 'sent',
    DELIVERED: 'delivered',
    FAILED: 'failed'
  },

  // ===== INVITATION =====
  INVITATION_STATUS: {
    PENDING: 'pending',
    SENT: 'sent',
    ACCEPTED: 'accepted',
    EXPIRED: 'expired',
    CANCELLED: 'cancelled'
  },

  INVITATION_TYPE: {
    USER: 'user',
    RESELLER: 'reseller',
    ADMIN: 'admin'
  },

  // ===== RECORDING QUALITY =====
  RECORDING_QUALITY: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high'
  },

  RECORDING_RESOLUTION: {
    SD: '480p',
    HD: '720p',
    FULL_HD: '1080p',
    QHD: '1440p',
    UHD: '2160p'
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
    },
    INVITATION: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 20 // 20 requests per window
    },
    SCREEN_SHARING: {
      windowMs: 60 * 1000, // 1 minute
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
    DASHBOARD: 60, // 1 minute
    INVITATION: 1800, // 30 minutes
    APP_USAGE: 300, // 5 minutes
    MESSAGES: 300 // 5 minutes
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
    USER_REGISTERED: 'user_registered',
    
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
    LICENSE_EXTENDED: 'license_extended',
    
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
    
    // ===== INVITATION EVENTS =====
    INVITATION_SENT: 'invitation_sent',
    INVITATION_ACCEPTED: 'invitation_accepted',
    INVITATION_EXPIRED: 'invitation_expired',
    INVITATION_CANCELLED: 'invitation_cancelled',
    INVITATION_REMINDER: 'invitation_reminder',
    
    // ===== SCREEN SHARING EVENTS =====
    SCREEN_SHARE_REQUEST: 'screen_share_request',
    SCREEN_SHARE_ACCEPT: 'screen_share_accept',
    SCREEN_SHARE_REJECT: 'screen_share_reject',
    SCREEN_SHARE_STARTED: 'screen_share_started',
    SCREEN_SHARE_STOPPED: 'screen_share_stopped',
    SCREEN_SHARE_PAUSED: 'screen_share_paused',
    SCREEN_SHARE_RESUMED: 'screen_share_resumed',
    SCREEN_SHARE_FRAME: 'screen_share_frame',
    SCREEN_SHARE_FRAME_RECEIVED: 'screen_share_frame_received',
    REQUEST_SCREEN_FRAME: 'request_screen_frame',
    
    // ===== SCREEN RECORDING EVENTS =====
    SCREEN_RECORDING_REQUEST: 'screen_recording_request',
    SCREEN_RECORDING_ACCEPT: 'screen_recording_accept',
    SCREEN_RECORDING_REJECT: 'screen_recording_reject',
    SCREEN_RECORDING_STARTED: 'screen_recording_started',
    SCREEN_RECORDING_STOPPED: 'screen_recording_stopped',
    SCREEN_RECORDING_PAUSED: 'screen_recording_paused',
    SCREEN_RECORDING_RESUMED: 'screen_recording_resumed',
    SCREEN_RECORDING_COMPLETED: 'screen_recording_completed',
    RECORDING_CHUNK: 'recording_chunk',
    RECORDING_CHUNK_RECEIVED: 'recording_chunk_received',
    
    // ===== APP MONITORING EVENTS =====
    APP_OPENED: 'app_opened',
    APP_CLOSED: 'app_closed',
    APP_FOREGROUND: 'app_foreground',
    APP_BACKGROUND: 'app_background',
    APP_USAGE_UPDATE: 'app_usage_update',
    APP_USAGE_UPDATED: 'app_usage_updated',
    APP_INSTALLED: 'app_installed',
    APP_UNINSTALLED: 'app_uninstalled',
    
    // ===== MESSAGE EVENTS =====
    MESSAGE_RECEIVED: 'message_received',
    NEW_MESSAGE: 'new_message',
    MESSAGE_READ: 'message_read',
    MESSAGE_DELETED: 'message_deleted',
    MESSAGE_SENT: 'message_sent',
    MESSAGE_DELIVERED: 'message_delivered',
    
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
    PIN_NOT_FOUND: 'PIN not found',
    // ===== FITUR BARU =====
    INVITATION_NOT_FOUND: 'Invitation not found',
    INVITATION_EXPIRED: 'Invitation has expired',
    INVITATION_ALREADY_ACCEPTED: 'Invitation already accepted',
    INVITATION_INVALID: 'Invalid invitation',
    SCREEN_SHARING_ACTIVE: 'Screen sharing already active',
    SCREEN_SHARING_NOT_FOUND: 'No active screen sharing',
    RECORDING_ACTIVE: 'Recording already in progress',
    RECORDING_NOT_FOUND: 'Recording not found',
    MESSAGE_NOT_FOUND: 'Message not found',
    APP_NOT_FOUND: 'App not found on device'
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
    NOTIFICATION_SENT: 'Notification sent successfully',
    // ===== FITUR BARU =====
    INVITATION_SENT: 'Invitation sent successfully',
    INVITATION_RESENT: 'Invitation resent successfully',
    INVITATION_ACCEPTED: 'Invitation accepted successfully',
    INVITATION_CANCELLED: 'Invitation cancelled successfully',
    SCREEN_SHARING_STARTED: 'Screen sharing started',
    SCREEN_SHARING_STOPPED: 'Screen sharing stopped',
    SCREEN_SHARING_PAUSED: 'Screen sharing paused',
    SCREEN_SHARING_RESUMED: 'Screen sharing resumed',
    RECORDING_STARTED: 'Recording started',
    RECORDING_STOPPED: 'Recording stopped',
    RECORDING_PAUSED: 'Recording paused',
    RECORDING_RESUMED: 'Recording resumed',
    RECORDING_COMPLETED: 'Recording completed',
    RECORDING_DELETED: 'Recording deleted',
    MESSAGE_READ: 'Message marked as read',
    MESSAGE_DELETED: 'Message deleted',
    ALL_MESSAGES_READ: 'All messages marked as read'
  },

  // Regex Patterns
  PATTERNS: {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    USERNAME: /^[a-zA-Z0-9_]{3,20}$/,
    PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/,
    PHONE: /^\+?[\d\s-]{10,15}$/,
    PIN_CODE: /^[A-Z0-9]{6}$/,
    LICENSE_KEY: /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/,
    INVITE_CODE: /^[A-Z0-9]{8}$/,
    DEVICE_ID: /^[a-zA-Z0-9\-_]{8,}$/
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
    LOCKOUT_DURATION: 30, // minutes
    // ===== FITUR BARU =====
    INVITATION_EXPIRY_DAYS: 7,
    MAX_INVITATIONS_PER_USER: 50,
    SCREEN_CAPTURE_INTERVAL: 1000, // 1 second
    MAX_SCREEN_SHARING_DURATION: 3600, // 1 hour
    MAX_RECORDING_DURATION: 1800, // 30 minutes
    MAX_MESSAGE_HISTORY: 1000,
    APP_USAGE_SYNC_INTERVAL: 30000, // 30 seconds
    SCREEN_RECORDING_QUALITY: 'medium',
    RECORDING_FRAME_RATE: 15, // fps
    RECORDING_BITRATE: 1024, // kbps
    RECORDING_RESOLUTION: '720p',
    INVITATION_REMINDER_DAYS: [3, 1], // Kirim reminder 3 hari dan 1 hari sebelum expired
    MAX_MESSAGES_PER_DEVICE: 10000
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
    ENABLE_REALTIME_UPDATES: true,
    // ===== FITUR BARU =====
    ENABLE_INVITATION: true,
    ENABLE_SCREEN_SHARING: true,
    ENABLE_SCREEN_RECORDING: true,
    ENABLE_APP_MONITORING: true,
    ENABLE_MESSAGE_READING: true,
    ENABLE_BULK_INVITATION: true,
    ENABLE_SCREEN_CAPTURE: true,
    ENABLE_RECORDING_STORAGE: true
  },

  // ===== INVITATION REMINDER =====
  INVITATION_REMINDER: {
    INTERVAL: '0 * * * *', // Setiap jam
    DAYS: [3, 1], // 3 hari dan 1 hari sebelum expired
    MAX_REMINDERS: 3
  },

  // ===== RECORDING SETTINGS =====
  RECORDING_SETTINGS: {
    QUALITY_LEVELS: {
      low: { bitrate: 512, frameRate: 10, resolution: '480p' },
      medium: { bitrate: 1024, frameRate: 15, resolution: '720p' },
      high: { bitrate: 2048, frameRate: 30, resolution: '1080p' }
    },
    MAX_FILE_SIZE: 500 * 1024 * 1024, // 500MB
    MAX_RECORDING_DURATION: 3600, // 1 hour
    STORAGE_PATH: 'recordings/'
  },

  // ===== MESSAGE FILTERS =====
  MESSAGE_FILTERS: {
    SPAM_KEYWORDS: ['spam', 'promo', 'advertisement'],
    SENSITIVE_WORDS: ['password', 'credit card', 'bank'],
    MAX_MESSAGE_LENGTH: 10000
  },

  // ===== APP CATEGORIES MAPPING =====
  APP_CATEGORY_MAPPING: {
    // Social Media
    'com.facebook.katana': 'social',
    'com.instagram.android': 'social',
    'com.twitter.android': 'social',
    'com.tiktok.android': 'social',
    'com.snapchat.android': 'social',
    'com.pinterest': 'social',
    'com.reddit.frontpage': 'social',
    // Communication
    'com.whatsapp': 'communication',
    'org.telegram.messenger': 'communication',
    'com.discord': 'communication',
    'com.slack': 'communication',
    'com.microsoft.teams': 'communication',
    'com.zoom.videomeetings': 'communication',
    'com.google.android.apps.messaging': 'communication',
    // Entertainment
    'com.netflix.mediaclient': 'entertainment',
    'com.spotify.music': 'entertainment',
    'com.google.android.youtube': 'entertainment',
    'com.disney.disneyplus': 'entertainment',
    'com.amazon.avod.thirdpartyclient': 'entertainment',
    // Games
    'com.mobile.legends': 'games',
    'com.pubg.newstate': 'games',
    'com.garena.game.codm': 'games',
    'com.activision.callofduty.shooter': 'games',
    // Productivity
    'com.google.android.apps.docs': 'productivity',
    'com.google.android.apps.sheets': 'productivity',
    'com.google.android.apps.slides': 'productivity',
    'com.microsoft.office.word': 'productivity',
    'com.microsoft.office.excel': 'productivity',
    'com.microsoft.office.powerpoint': 'productivity',
    // Utility
    'com.google.android.apps.maps': 'utility',
    'com.android.chrome': 'utility',
    'com.google.android.apps.photos': 'utility',
    'com.google.android.gm': 'utility'
  }
};

module.exports = constants;
