const express = require('express');
const router = express.Router();
const authenticateJWT = require("../middleware/auth");
const cookieParser = require("cookie-parser");
const app = express();

app.use(express.json());
app.use(cookieParser());

const { loginClient, loginWorker,registerClient,registerWorker,
     addAddress,
    editAddress,
    deleteAddress,getAddresses, } = require('../controllers/userController');
const { createJob,getJobs,cancelJob } = require('../controllers/jobController');


router.post('/users/registerClient', registerClient);
router.post('/users/registerWorker', registerWorker);

// Đăng nhập client
router.post('/login/client', loginClient);
router.get('/client/addresses', authenticateJWT, getAddresses);

router.post('/client/add-address',authenticateJWT, addAddress);
router.put('/client/edit-address',authenticateJWT, editAddress);
router.delete('/client/delete-address',authenticateJWT, deleteAddress);
// Đăng nhập worker
router.post('/login/worker', loginWorker);

router.post('/jobs/create',authenticateJWT, createJob);
router.get('/jobs',authenticateJWT, getJobs);
router.delete('/jobs/:job_id/cancel',authenticateJWT, cancelJob);


module.exports = router;
