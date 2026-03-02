export const IS_PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';
export const CURRENT_USER_KEY = 'user';
export const JWT_STRATEGY = 'jwt';

export const OTP_EXPIRY_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 3;
export const RESET_TOKEN_EXPIRY_MINUTES = 15;
export const LOGIN_LOCK_MINUTES = 15;
export const LOGIN_MAX_FAILURES = 5;
export const NAV_CACHE_TTL_SECONDS = 3600; // 60 min
export const JWT_DENYLIST_PREFIX = 'denylist:';
export const LOGIN_FAILURES_PREFIX = 'login_failures:';
export const BULK_JOB_PREFIX = 'bulk_job:';

export const PERFORMANCE_BANDS = {
  NEEDS_REVISION: { label: 'Needs Revision', min: 0, max: 49 },
  FAIR: { label: 'Fair', min: 50, max: 69 },
  GOOD: { label: 'Good', min: 70, max: 84 },
  EXCELLENT: { label: 'Excellent', min: 85, max: 100 },
} as const;

export const WEAKNESS_TRIGGER_MIN_SESSIONS = 3;
export const WEAKNESS_TRIGGER_MAX_PCT = 70;
export const WEAKNESS_MIN_ATTEMPTS = 5;
export const EXAM_SIMULATION_SECONDS_PER_QUESTION = 90;
export const EXAM_SIMULATION_BUFFER_SECONDS = 5;
