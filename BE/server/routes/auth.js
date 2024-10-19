const express = require('express')
const router = express.Router()
const authenticateJWT = require('../middleware/auth')
const cookieParser = require('cookie-parser')
const app = express()

app.use(express.json())
app.use(cookieParser())

const { login, registerClient, registerWorker, getMe } = require('../controllers/userController')
const { createJob, queryJobsForWorker, queryJobHistories } = require('../controllers/jobController')
const { createNoti, queryNoties } = require('../controllers/notiController')

router.post('/users/registerClient', registerClient)
router.post('/users/registerWorker', registerWorker)

// Đăng nhập
router.post('/login', login)
router.get('/me', authenticateJWT, getMe)

// Job
router.get('/jobs', authenticateJWT, queryJobsForWorker)
router.get('/jobs/history', authenticateJWT, queryJobHistories)
router.post('/jobs', authenticateJWT, createJob)

// Notification
router.get('/notification', authenticateJWT, queryNoties)
router.post('/notification', authenticateJWT, createNoti)

module.exports = router
