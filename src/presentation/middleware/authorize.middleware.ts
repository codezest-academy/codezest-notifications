import { Request, Response, NextFunction } from 'express';

/**
 * Authorization middleware factory - Implements Role-Based Access Control (RBAC)
 *
 * This middleware:
 * 1. Checks if req.user exists (must be used after authMiddleware)
 * 2. Verifies the user's role against allowed roles
 * 3. Allows or denies access based on role
 *
 * @param allowedRoles - Array of roles that are allowed to access the route
 *
 * @example
 * // Single role
 * router.post('/admin', authMiddleware, authorize('ADMIN'), controller.method);
 *
 * @example
 * // Multiple roles
 * router.post('/content', authMiddleware, authorize('INSTRUCTOR', 'ADMIN'), controller.method);
 */
export function authorize(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Ensure user is authenticated
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required. Please use authMiddleware before authorize.',
      });
      return;
    }

    // Check if user's role is in the allowed roles
    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
        userRole,
      });
      return;
    }

    // User is authorized
    next();
  };
}
