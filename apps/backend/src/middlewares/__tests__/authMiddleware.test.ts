import { Request, Response, NextFunction } from 'express';
import jwt, { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { authMiddleware } from '../authMiddleware'; // Adjust path as necessary

// Mock process.env.JWT_SECRET
const MOCK_JWT_SECRET = 'testsecret';
process.env.JWT_SECRET = MOCK_JWT_SECRET;

// Mock jsonwebtoken
jest.mock('jsonwebtoken');

// Define a type for our extended Request
interface AuthRequest extends Request {
  user?: { userId: string; email: string };
}

describe('authMiddleware', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction = jest.fn();

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    nextFunction = jest.fn();
    // Clear mock history
    (jwt.verify as jest.Mock).mockClear();
    (mockResponse.status as jest.Mock).mockClear();
    (mockResponse.json as jest.Mock).mockClear();
    (nextFunction as jest.Mock).mockClear();
  });

  test('should return 401 if no token is provided', () => {
    authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Unauthorized: Missing or invalid token' });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  test('should return 401 if token format is invalid (not Bearer)', () => {
    mockRequest.headers = { authorization: 'Token somewrongtoken' };
    authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Unauthorized: Missing or invalid token' });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  test('should call next and set req.user if token is valid', () => {
    const mockUserPayload = { userId: '123', email: 'test@example.com' };
    mockRequest.headers = { authorization: 'Bearer validtoken' };
    (jwt.verify as jest.Mock).mockReturnValue(mockUserPayload);

    authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

    expect(jwt.verify).toHaveBeenCalledWith('validtoken', MOCK_JWT_SECRET);
    expect(mockRequest.user).toEqual(mockUserPayload);
    expect(nextFunction).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  test('should return 401 if token is expired', () => {
    mockRequest.headers = { authorization: 'Bearer expiredtoken' };
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new TokenExpiredError('jwt expired', new Date());
    });

    authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Unauthorized: Token expired' });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  test('should return 401 if token is malformed', () => {
    mockRequest.headers = { authorization: 'Bearer malformedtoken' };
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new JsonWebTokenError('jwt malformed');
    });

    authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Unauthorized: Invalid token' });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  test('should return 500 if JWT_SECRET is not configured', () => {
    // Temporarily undefine JWT_SECRET for this test
    const originalSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = undefined;

    mockRequest.headers = { authorization: 'Bearer anytoken' };
    
    // Clear module cache and re-import to get fresh environment
    jest.resetModules();
    const { authMiddleware: freshAuthMiddleware } = require('../authMiddleware');
    freshAuthMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Internal Server Error: JWT_SECRET not configured' });
    expect(nextFunction).not.toHaveBeenCalled();

    process.env.JWT_SECRET = originalSecret; // Restore
  });
});
