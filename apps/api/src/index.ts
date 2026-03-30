import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { createServer } from 'http'
import { Server } from 'socket.io'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const httpServer = createServer(app)
export const io = new Server(httpServer, { cors: { origin: '*' } })

app.use(helmet())
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }))
app.use(morgan('dev'))
app.use(express.json())

// Routes (stubs — filled in next commits)
app.use('/api/auth', (req, res) => res.json({ ok: true, route: 'auth' }))
app.use('/api/sites', (req, res) => res.json({ ok: true, route: 'sites' }))
app.use('/api/pages', (req, res) => res.json({ ok: true, route: 'pages' }))
app.use('/api/ai', (req, res) => res.json({ ok: true, route: 'ai' }))

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

const PORT = process.env.PORT || 4000
httpServer.listen(PORT, () => console.log(`API running on :${PORT}`))