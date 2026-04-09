// apps/api/src/index.ts
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { createServer } from 'http'
import { Server } from 'socket.io'
import dotenv from 'dotenv'

dotenv.config()

import { chat, AI_MODEL } from './lib/ai'
import authRouter from './routes/auth'
import sitesRouter from './routes/sites'
import pagesRouter from './routes/pages'
import aiRouter from './routes/ai'
import publicRouter from './routes/public'

const app = express()
const httpServer = createServer(app)
export const io = new Server(httpServer, { cors: { origin: '*' } })

app.use(helmet())
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }))
app.use(morgan('dev'))
app.use(express.json())

app.use('/api/auth', authRouter)
app.use('/api/sites', sitesRouter)
app.use('/api/pages', pagesRouter)
app.use('/api/ai', aiRouter)
app.use('/p', publicRouter)  // Public CMS page hosting


// AI smoke-test: confirms OpenRouter + model config is working
app.get('/api/ai/ping', async (_req, res) => {
    try {
        const reply = await chat([
            { role: 'user', content: 'Reply with exactly: {"status":"ok","model":"' + AI_MODEL + '"}' }
        ], { max_tokens: 64 })
        res.json({ reply, model: AI_MODEL })
    } catch (err: any) {
        res.status(500).json({ error: err.message })
    }
})

app.get('/health', (_req, res) => res.json({ status: 'ok', model: AI_MODEL }))

const PORT = process.env.PORT || 4000
httpServer.listen(PORT, () => {
    console.log(`API running on :${PORT}`)
    console.log(`AI model: ${AI_MODEL}`)
})