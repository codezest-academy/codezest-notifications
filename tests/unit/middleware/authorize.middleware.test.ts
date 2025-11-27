import { Request, Response, NextFunction } from 'express';
import { authorize } from '../../../src/presentation/middleware/authorize.middleware';
import { TokenPayload } from '../../../src/presentation/middleware/auth.middleware';

describe('authorize middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    nextFunction = jest.fn();
  });

  it('should reject request without user (not authenticated)', () => {
    const middleware = authorize('ADMIN');

    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Unauthorized',
      message: 'Authentication required. Please use authMiddleware before authorize.',
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should reject user with wrong role', () => {
    mockRequest.user = {
      userId: '123',
      email: 'user@example.com',
      role: 'USER',
    } as TokenPayload;

    const middleware = authorize('ADMIN');

    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Forbidden',
      message: 'Access denied. Required roles: ADMIN',
      userRole: 'USER',
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should allow user with correct role', () => {
    mockRequest.user = {
      userId: '123',
      email: 'admin@example.com',
      role: 'ADMIN',
    } as TokenPayload;

    const middleware = authorize('ADMIN');

    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  it('should allow user with one of multiple allowed roles', () => {
    mockRequest.user = {
      userId: '123',
      email: 'instructor@example.com',
      role: 'INSTRUCTOR',
    } as TokenPayload;

    const middleware = authorize('ADMIN', 'INSTRUCTOR');

    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  it('should reject user when role not in multiple allowed roles', () => {
    mockRequest.user = {
      userId: '123',
      email: 'user@example.com',
      role: 'USER',
    } as TokenPayload;

    const middleware = authorize('ADMIN', 'INSTRUCTOR');

    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Forbidden',
      message: 'Access denied. Required roles: ADMIN, INSTRUCTOR',
      userRole: 'USER',
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });
});
