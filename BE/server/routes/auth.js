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
  getWorkerDetails
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
  getJobDetails,
  rateJob
} = require('../controllers/jobController')
const { createNoti, queryNoties } = require('../controllers/notiController')
const { queryServices,getServiceDetails } = require('../controllers/serviceController')
const { getPendingWorkers, reviewWorker,updateServicePrice,
  getTotalRevenue,getServiceRevenue,getMostBookedService,getWorkerRankings,getWorkerReviews,
  getMonthlyRevenue,getTopClients,getAllJobs,getAllWorkers,getJobReviews,blockWorkerAccount
 } = require('../controllers/adminController')

//Authen
router.post('/users/send-otp', otpController.sendOTP)
router.post('/users/verify', otpController.verifyOTP)

router.post('/users/registerClient', registerClient)
router.post('/users/registerWorker', registerWorker)
router.put('/users/worker', authenticateJWT, updateWorkerServices)
router.get('/worker', authenticateJWT, getWorkerDetails)

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
router.get('/jobs/:jobId/details',authenticateJWT, getJobDetails);

router.put('/jobs/:id', authenticateJWT, updateJob)
router.post('/jobs/:id/receive', authenticateJWT, receiveJobFromWorker)
router.delete('/jobs/:job_id/cancel', authenticateJWT, cancelJob)

router.post('/jobs/:jobId/rate', authenticateJWT, rateJob);

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
router.get('/services/:serviceType', getServiceDetails);

//Admin
router.get('/pendingWorkers', authenticateJWT,getPendingWorkers);
router.put('/reviewWorker/:id', authenticateJWT,reviewWorker);
router.put('/service/:id', authenticateJWT, updateServicePrice);
router.get('/stats/monthly-revenue', authenticateJWT, getMonthlyRevenue);
router.get('/stats/total-revenue', authenticateJWT, getTotalRevenue);
router.get('/stats/service-revenue', authenticateJWT, getServiceRevenue);
router.get('/stats/most-booked-service', authenticateJWT, getMostBookedService);
router.get('/stats/worker-rankings', authenticateJWT, getWorkerRankings);
router.get('/reviews/workers', authenticateJWT, getWorkerReviews);
router.get('/stats/top-clients', authenticateJWT, getTopClients);
router.get('/stats/jobs', authenticateJWT, getAllJobs);
router.get('/stats/workers', authenticateJWT, getAllWorkers);
router.get('/reviews/jobs', authenticateJWT, getJobReviews);
router.put('/workers/:id/block', authenticateJWT, blockWorkerAccount);
module.exports = router
