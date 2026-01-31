import express from 'express'
import cors from 'cors'
import { config } from './config.js'
import metricsRouter from './routes/metrics.js'

const app = express()

app.use(cors({ origin: true }))
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', region: config.aws.region })
})

app.use('/api/metrics', metricsRouter)

// Export app for testing without starting the server
export { app }

if (process.env.NODE_ENV !== 'test') {
  app.listen(config.port, () => {
    console.log(`Faddom API listening on http://localhost:${config.port}`)
    console.log(`Region: ${config.aws.region}`)
  })
}
