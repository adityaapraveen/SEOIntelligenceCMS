// apps/api/src/routes/auth.ts
import { Router, Request, Response } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { Err } from '../lib/errors'

const router = Router()

const RegisterSchema = z.object({
    name: z.string().min(2).max(80),
    email: z.string().email(),
    password: z.string().min(8).max(128),
})

const LoginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
})

function signToken(userId: string, email: string): string {
    return jwt.sign(
        { userId, email },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
    )
}

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
    const parsed = RegisterSchema.safeParse(req.body)
    if (!parsed.success) {
        return Err.bad(res, parsed.error.issues[0].message)
    }

    const { name, email, password } = parsed.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
        return Err.bad(res, 'Email already registered')
    }

    const hashed = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
        data: { name, email, password: hashed },
    })

    const token = signToken(user.id, user.email)

    return res.status(201).json({
        token,
        user: { id: user.id, name: user.name, email: user.email },
    })
})

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
    const parsed = LoginSchema.safeParse(req.body)
    if (!parsed.success) {
        return Err.bad(res, parsed.error.issues[0].message)
    }

    const { email, password } = parsed.data

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
        return Err.unauthorized(res, 'Invalid email or password')
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
        return Err.unauthorized(res, 'Invalid email or password')
    }

    const token = signToken(user.id, user.email)

    return res.json({
        token,
        user: { id: user.id, name: user.name, email: user.email },
    })
})

// GET /api/auth/me  (protected — verify token works)
router.get('/me', async (req: Request, res: Response) => {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) {
        return Err.unauthorized(res)
    }
    try {
        const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET!) as { userId: string }
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: { id: true, name: true, email: true, createdAt: true },
        })
        if (!user) return Err.notFound(res, 'User not found')
        return res.json({ user })
    } catch {
        return Err.unauthorized(res, 'Invalid token')
    }
})

export default router