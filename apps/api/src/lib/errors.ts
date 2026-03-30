// apps/api/src/lib/errors.ts
import { Response } from 'express'

export const Err = {
    bad: (res: Response, message: string) =>
        res.status(400).json({ error: message, code: 'BAD_REQUEST' }),
    unauthorized: (res: Response, message = 'Unauthorized') =>
        res.status(401).json({ error: message, code: 'UNAUTHORIZED' }),
    forbidden: (res: Response, message = 'Forbidden') =>
        res.status(403).json({ error: message, code: 'FORBIDDEN' }),
    notFound: (res: Response, message = 'Not found') =>
        res.status(404).json({ error: message, code: 'NOT_FOUND' }),
    internal: (res: Response, message = 'Internal server error') =>
        res.status(500).json({ error: message, code: 'INTERNAL_ERROR' }),
}