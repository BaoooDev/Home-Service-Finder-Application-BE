const express = require('express')
const router = express.Router()
const authenticateJWT = require('../middleware/auth')
const cookieParser = require('cookie-parser')
const app = express()

app.use(express.json())
app.use(cookieParser())

const { login, registerClient, registerWorker, getMe,loginClient, loginWorker,
    addAddress,
   editAddress,
   deleteAddress,getAddresses, } = require('../controllers/userController')
const { createJob, queryJobsForWorker, queryJobHistories,getJobs,cancelJob } = require('../controllers/jobController')
const { createNoti, queryNoties } = require('../controllers/notiController')

router.post('/users/registerClient', registerClient)
router.post('/users/registerWorker', registerWorker)

// Đăng nhập
router.post('/login', login)
router.get('/me', authenticateJWT, getMe)
router.post('/login/client', loginClient);
router.post('/login/worker', loginWorker);


router.get('/client/addresses', authenticateJWT, getAddresses);
router.post('/client/add-address',authenticateJWT, addAddress);
router.put('/client/edit-address',authenticateJWT, editAddress);
router.delete('/client/delete-address',authenticateJWT, deleteAddress);

// Job
router.get('/worker_jobs', authenticateJWT, queryJobsForWorker)
router.get('/jobs/history', authenticateJWT, queryJobHistories)
router.post('/jobs/create',authenticateJWT, createJob);
router.get('/jobs',authenticateJWT, getJobs);
router.delete('/jobs/:job_id/cancel',authenticateJWT, cancelJob);
// Notification
router.get('/notification', authenticateJWT, queryNoties)
router.post('/notification', authenticateJWT, createNoti)

//Adress

module.exports = router
