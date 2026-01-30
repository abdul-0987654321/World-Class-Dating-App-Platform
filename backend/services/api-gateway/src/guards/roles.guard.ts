import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ROLES_KEY } from '../decorators/roles.decorator';

export enum Role {
  USER = 'user',
  PREMIUM = 'premium',
  VIP = 'vip',
  MODERATOR = 'moderator',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}

/**
 * Role hierarchy levels for comparison.
 * Higher number = higher privilege.
 * SUPER_ADMIN > ADMIN > MODERATOR > VIP > PREMIUM > USER
 */
const ROLE_HIERARCHY: Record<string, number> = {
  [Role.USER]: 0,
  [Role.PREMIUM]: 1,
  [Role.VIP]: 2,
  [Role.MODERATOR]: 3,
  [Role.ADMIN]: 4,
  [Role.SUPER_ADMIN]: 5,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.roles) {
      return false;
    }

    // Use role hierarchy: user passes if they have ANY role
    // whose hierarchy level >= the minimum required role level.
    const minRequiredLevel = Math.min(
      ...requiredRoles.map((role) => ROLE_HIERARCHY[role] ?? 0)
    );

    return user.roles.some((userRole: string) => {
      const userLevel = ROLE_HIERARCHY[userRole] ?? 0;
      return userLevel >= minRequiredLevel;
    });
  }
}
