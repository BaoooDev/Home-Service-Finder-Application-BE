const express = require('express');
const router = express.Router();
const authenticateJWT = require("../middleware/auth");
const cookieParser = require("cookie-parser");
const app = express();

app.use(express.json());
app.use(cookieParser());

const { loginClient, loginWorker,registerClient,registerWorker } = require('../controllers/userController');
const { createJob } = require('../controllers/jobController');


router.post('/users/registerClient', registerClient);
router.post('/users/registerWorker', registerWorker);

// Đăng nhập client
router.post('/login/client', loginClient);

// Đăng nhập worker
router.post('/login/worker', loginWorker);

router.post('/jobs/create',authenticateJWT, createJob);


module.exports = router;
