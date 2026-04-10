import { Err } from '../errors';
import { Response } from 'express';

describe('Error Handler Utility', () => {
    let mockRes: Partial<Response>;

    beforeEach(() => {
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
    });

    test('bad request returns 400 with BAD_REQUEST code', () => {
        Err.bad(mockRes as Response, 'Missing fields');
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Missing fields', code: 'BAD_REQUEST' });
    });

    test('unauthorized returns 401 with UNAUTHORIZED code', () => {
        Err.unauthorized(mockRes as Response, 'No token');
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'No token', code: 'UNAUTHORIZED' });
    });

    test('unauthorized returns default message if none passed', () => {
        Err.unauthorized(mockRes as Response);
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
    });

    test('notFound returns 404 with NOT_FOUND code', () => {
        Err.notFound(mockRes as Response);
        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Not found', code: 'NOT_FOUND' });
    });

    test('internal error returns 500 with INTERNAL_ERROR code', () => {
        Err.internal(mockRes as Response);
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
    });
});
