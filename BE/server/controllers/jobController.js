const Job = require('../models/job')
const User = require('../models/user')
const moment = require('moment')

const createJob = async (req, res) => {
  try {
    // Lấy client_id từ JWT token đã được xác thực
    const client_id = req.user.id
    const { service_type, address, duration_hours, scheduled_time } = req.body

    // Kiểm tra các trường cần thiết có được cung cấp không
    if (!service_type || !address || !duration_hours || !scheduled_time) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin' })
    }

    // Kiểm tra xem client có tồn tại không
    const client = await User.findById(client_id)
    if (!client || client.role !== 'client') {
      return res.status(400).json({ success: false, message: 'Client không hợp lệ' })
    }

    // Tạo công việc mới
    const newJob = new Job({
      client_id: client._id,
      service_type,
      address,
      duration_hours,
      scheduled_time,
      status: 'pending',
      price: calculatePrice(service_type, duration_hours), // Hàm tính giá tiền
      payment_status: 'unpaid',
    })

    // Lưu công việc vào cơ sở dữ liệu
    await newJob.save()

    // Đẩy jobId và status vào jobs của client trong client_profile
    client.client_profile.jobs.push({
      job_id: newJob._id,
      status: 'pending', // Đặt trạng thái công việc khi mới tạo
    })

    // Lưu lại client với thông tin công việc mới
    await client.save()

    // Phản hồi với thông tin công việc vừa tạo
    res.status(200).json({
      success: true,
      message: 'Đã đăng công việc thành công',
      job: newJob,
      client_jobs: client.client_profile.jobs, // Phản hồi danh sách công việc của client
    })
  } catch (error) {
    console.log(error)
    res.status(500).json({ success: false, message: error.message })
  }
}

const calculatePrice = (service_type, duration_hours) => {
  let basePrice = 0

  switch (service_type) {
    case 'cleaning':
      basePrice = 100000 // Giá cơ bản cho dịch vụ dọn dẹp
      break
    case 'deep_cleaning':
      basePrice = 150000 // Giá cơ bản cho dịch vụ tổng vệ sinh
      break
    case 'ac_cleaning':
      basePrice = 200000 // Giá cơ bản cho dịch vụ vệ sinh máy lạnh
      break
    default:
      basePrice = 100000 // Giá mặc định nếu không xác định loại dịch vụ
      break
  }

  return basePrice * duration_hours // Tính giá dựa trên thời lượng làm việc
}
// Get list of jobs for the authenticated client
const getJobs = async (req, res) => {
  try {
    const client_id = req.user.id

    const client = await User.findById(client_id)
    if (!client || client.role !== 'client') {
      return res.status(400).json({ success: false, message: 'Client không hợp lệ' })
    }

    const jobs = await Job.find({ client_id }).sort({ scheduled_time: -1 })

    return res.status(200).json({
      success: true,
      jobs,
    })
  } catch (error) {
    console.log('Error fetching jobs:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}

const cancelJob = async (req, res) => {
  try {
    const { job_id } = req.params
    const userId = req.user.id

    const job = await Job.findById(job_id)

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' })
    }

    if (job.client_id.toString() !== userId && req.user.role !== 'admin') {
      return res
        .status(403)
        .json({ success: false, message: 'You do not have permission to cancel this job' })
    }

    const currentTime = new Date()
    const scheduledTime = new Date(job.scheduled_time)
    const timeDifference = scheduledTime - currentTime
    const twelveHoursInMilliseconds = 12 * 60 * 60 * 1000

    if (timeDifference <= twelveHoursInMilliseconds) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel job within 12 hours of scheduled time',
      })
    }

    // Update the job status to 'canceled'
    job.status = 'canceled'
    job.updated_at = new Date()
    await job.save()

    res.status(200).json({
      success: true,
      message: 'Job canceled successfully',
      job,
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

const queryJobsForWorker = async (req, res) => {
  const { status } = req.query

  const query = {}

  if (status) {
    if (status === 'pending') {
      query.worker_id = { $exists: false }
    }
    query.status = status
  } else {
    query.status = { $nin: ['pending', 'canceled'] }
  }

  const jobs = await Job.find(query)

  return res.status(200).json({
    results: jobs,
  })
}

const queryJobHistories = async (req, res) => {
  const { from, to } = req.query

  const user = await User.findById(req.user.id)
  const query = { worker_id: user.worker_profile._id }

  if (from && to) {
    query.completion_time = {
      $gte: moment(from).startOf('day').toDate(), // Jobs completed on or after the 'from' date
      $lte: moment(to).endOf('day').toDate(), // Jobs completed on or before the 'to' date
    }
  }

  const jobs = await Job.find(query)

  return res.status(200).json({
    results: jobs,
  })
}

const getJobById = async (req, res) => {
  const job = await Job.findById(req.params.id)
  if (!job) return res.status(404).json({ success: false, message: 'Job not found' })
  return res.status(200).json(job)
}

const receiveJobFromWorker = async (req, res) => {
  const { id } = req.params

  const user = await User.findById(req.user.id)
  if (!user || user.role !== 'worker')
    return res
      .status(404)
      .json({ success: false, message: 'You do not have permission to receive this job' })

  const job = await Job.findById(id)
  if (!job || job.status !== 'pending') {
    return res.status(404).json({ message: 'Job not found' })
  }

  // Update the job with the worker's ID and change status to 'accepted'
  job.worker_id = req.user.id
  job.status = 'accepted'
  job.confirmation_time = new Date()

  await job.save()
  return res.status(200).json({ message: 'Job accepted successfully' })
}

module.exports = {
  createJob,
  getJobs,
  cancelJob,
  queryJobsForWorker,
  queryJobHistories,
  getJobById,
  receiveJobFromWorker,
}
