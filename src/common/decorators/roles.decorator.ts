import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY } from '../../config/constants';

export type Role = 'student' | 'teacher' | 'admin';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
