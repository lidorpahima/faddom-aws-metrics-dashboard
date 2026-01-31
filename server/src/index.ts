import express from 'express'
import cors from 'cors'
import { config } from './config.js'
import metricsRouter from './routes/metrics.js'

const app = express()

app.use(cors({
  origin: [
    'http://localhost:5173', 
    'http://localhost:8080', 
    'https://lidorpahima-faddom-aws-metrics-dash-three.vercel.app',
    'https://lidorpahima-faddom-aws-metrics-dash.vercel.app'
  ],
  credentials: true
}));app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', region: config.aws.region })
})

app.use('/api/metrics', metricsRouter)

// Export app for testing without starting the server
export default app
export { app }

if (process.env.NODE_ENV !== 'test') {
  app.listen(config.port, () => {
    console.log(`Faddom API listening on http://localhost:${config.port}`)
    console.log(`Region: ${config.aws.region}`)
  })
}
