// apps/api/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { Err } from '../lib/errors'

export interface JwtPayload {
    userId: string
    email: string
}

// Extend Express Request so req.user is typed everywhere
declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload
        }
    }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) {
        return Err.unauthorized(res, 'No token provided')
    }

    const token = header.slice(7)
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload
        req.user = payload
        next()
    } catch {
        return Err.unauthorized(res, 'Invalid or expired token')
    }
}