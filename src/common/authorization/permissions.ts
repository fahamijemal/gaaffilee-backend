import { Role } from '../decorators/roles.decorator';

export const PERMISSIONS = {
  CONTENT_QUESTIONS_READ: 'content:questions:read',
  CONTENT_QUESTIONS_WRITE: 'content:questions:write',
  CONTENT_QUESTIONS_BULK: 'content:questions:bulk',
  CONTENT_CHAPTERS_READ: 'content:chapters:read',
  CONTENT_CHAPTERS_WRITE: 'content:chapters:write',
  CONTENT_AI_GENERATE_QUESTIONS: 'content:ai:generate-questions',
  PLATFORM_USERS_READ: 'platform:users:read',
  PLATFORM_USERS_WRITE: 'platform:users:write',
  PLATFORM_ANALYTICS_READ: 'platform:analytics:read',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const TEACHER_PERMISSIONS: Permission[] = [
  PERMISSIONS.CONTENT_QUESTIONS_READ,
  PERMISSIONS.CONTENT_QUESTIONS_WRITE,
  PERMISSIONS.CONTENT_QUESTIONS_BULK,
  PERMISSIONS.CONTENT_CHAPTERS_READ,
  PERMISSIONS.CONTENT_CHAPTERS_WRITE,
  PERMISSIONS.CONTENT_AI_GENERATE_QUESTIONS,
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  student: [],
  teacher: TEACHER_PERMISSIONS,
  admin: [
    ...TEACHER_PERMISSIONS,
    PERMISSIONS.PLATFORM_USERS_READ,
    PERMISSIONS.PLATFORM_USERS_WRITE,
    PERMISSIONS.PLATFORM_ANALYTICS_READ,
  ],
};
