import { requireAuth } from '../auth';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Err } from '../../lib/errors';

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('../../lib/errors', () => ({
    Err: {
        unauthorized: jest.fn(),
    }
}));

describe('Auth Middleware (requireAuth)', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let nextFunction: NextFunction;

    beforeEach(() => {
        mockReq = {
            headers: {}
        };
        mockRes = {};
        nextFunction = jest.fn();
        process.env.JWT_SECRET = 'test-secret';
        jest.clearAllMocks();
    });

    test('should reject if no authorization header is provided', () => {
        requireAuth(mockReq as Request, mockRes as Response, nextFunction);
        expect(Err.unauthorized).toHaveBeenCalledWith(mockRes, 'No token provided');
        expect(nextFunction).not.toHaveBeenCalled();
    });

    test('should reject if authorization header is missing Bearer prefix', () => {
        mockReq.headers = { authorization: 'Basic some-token' };
        requireAuth(mockReq as Request, mockRes as Response, nextFunction);
        expect(Err.unauthorized).toHaveBeenCalledWith(mockRes, 'No token provided');
        expect(nextFunction).not.toHaveBeenCalled();
    });

    test('should reject if JWT verification fails', () => {
        mockReq.headers = { authorization: 'Bearer invalid-token' };
        (jwt.verify as jest.Mock).mockImplementation(() => {
            throw new Error('Invalid token');
        });

        requireAuth(mockReq as Request, mockRes as Response, nextFunction);
        expect(Err.unauthorized).toHaveBeenCalledWith(mockRes, 'Invalid or expired token');
        expect(nextFunction).not.toHaveBeenCalled();
    });

    test('should proceed and append user to request if JWT is valid', () => {
        mockReq.headers = { authorization: 'Bearer valid-token' };
        const mockPayload = { userId: '123', email: 'test@test.com' };
        (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

        requireAuth(mockReq as Request, mockRes as Response, nextFunction);

        expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret');
        expect(mockReq.user).toEqual(mockPayload);
        expect(nextFunction).toHaveBeenCalled();
        expect(Err.unauthorized).not.toHaveBeenCalled();
    });
});
