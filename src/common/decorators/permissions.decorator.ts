import { SetMetadata } from '@nestjs/common';
import { PERMISSIONS_KEY } from '../../config/constants';
import { Permission } from '../authorization/permissions';

export const Permissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
