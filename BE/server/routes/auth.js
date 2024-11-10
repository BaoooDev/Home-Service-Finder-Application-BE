const express = require('express')
const router = express.Router()
const authenticateJWT = require('../middleware/auth')
const cookieParser = require('cookie-parser')
const app = express()
const otpController = require('../controllers/otpController')

app.use(express.json())
app.use(cookieParser())

const {
  loginClient,
  loginWorker,
  loginAdmin,
  updateWorkerServices,
  registerClient,
  registerWorker,
  getMe,
  addAddress,
  editAddress,
  deleteAddress,
  getAddresses,
} = require('../controllers/userController')
const {
  createJob,
  queryJobsForWorker,
  queryJobHistories,
  getJobs,
  cancelJob,
  updateJob,
  receiveJobFromWorker,
  getDashboardData,
} = require('../controllers/jobController')
const { createNoti, queryNoties } = require('../controllers/notiController')
const { queryServices } = require('../controllers/serviceController')

//Authen
router.post('/users/send-otp', otpController.sendOTP)
router.post('/users/verify', otpController.verifyOTP)

router.post('/users/registerClient', registerClient)
router.post('/users/registerWorker', registerWorker)
router.put('/users/worker', authenticateJWT, updateWorkerServices)

// Đăng nhập
router.post('/login/client', loginClient)
router.post('/login/worker', loginWorker)
router.post('/login', loginAdmin)
router.get('/me', authenticateJWT, getMe)

// Job
router.get('/worker_jobs', authenticateJWT, queryJobsForWorker)
router.get('/jobs/history', authenticateJWT, queryJobHistories)
router.get('/jobs/dashboard', authenticateJWT, getDashboardData)
router.post('/jobs/create', authenticateJWT, createJob)
router.get('/jobs', authenticateJWT, getJobs)
router.put('/jobs/:id', authenticateJWT, updateJob)
router.post('/jobs/:id/receive', authenticateJWT, receiveJobFromWorker)
router.delete('/jobs/:job_id/cancel', authenticateJWT, cancelJob)

// Notification
router.get('/notification', authenticateJWT, queryNoties)
router.post('/notification', authenticateJWT, createNoti)

//Adress
router.get('/client/addresses', authenticateJWT, getAddresses)
router.post('/client/add-address', authenticateJWT, addAddress)
router.put('/client/edit-address', authenticateJWT, editAddress)
router.delete('/client/delete-address', authenticateJWT, deleteAddress)

// Services
router.get('/services', authenticateJWT, queryServices)

module.exports = router
