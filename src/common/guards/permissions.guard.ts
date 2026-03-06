import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../../config/constants';
import { Permission, ROLE_PERMISSIONS } from '../authorization/permissions';
import { Role } from '../decorators/roles.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const userRole = request.user?.role as Role | undefined;
    if (!userRole) return false;

    const granted = ROLE_PERMISSIONS[userRole] ?? [];
    return required.every((permission) => granted.includes(permission));
  }
}
