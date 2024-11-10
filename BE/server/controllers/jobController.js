const Job = require('../models/job')
const Service = require('../models/service')
const User = require('../models/user')
const moment = require('moment')

const createJob = async (req, res) => {
  try {
    // Lấy client_id từ JWT token đã được xác thực
    const client_id = req.user.id
    const { service_id, address, duration_hours, scheduled_time } = req.body

    // Kiểm tra các trường cần thiết có được cung cấp không
    if (!service_id || !address || !duration_hours || !scheduled_time) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin' })
    }

    // Kiểm tra xem client có tồn tại không
    const client = await User.findById(client_id)
    if (!client || client.role !== 'client') {
      return res.status(400).json({ success: false, message: 'Client không hợp lệ' })
    }

    const serviceModel = await Service.findById(service_id)
    if (!serviceModel) {
      return res.status(400).json({ success: false, message: 'Dịch vụ không hợp lệ' })
    }

    // Tạo công việc mới
    const newJob = new Job({
      client,
      service: serviceModel,
      address,
      duration_hours,
      scheduled_time,
      status: 'pending',
      price: calculatePrice(serviceModel.code, duration_hours), // Hàm tính giá tiền
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

  // Step 1: Retrieve the worker's information, including services
  const user = await User.findById(req.user.id)

  if (!user || user.role !== 'worker') {
    return res.status(403).json({ message: 'Access denied. User is not a worker.' })
  }

  const workerServices = user.worker_profile.services

  if (status) {
    // Step 2: Filter jobs based on status
    if (status === 'pending') {
      query.worker = { $exists: false } // Only get unassigned jobs if status is 'pending'
    }
    query.status = status
  } else {
    query.status = { $in: ['accepted', 'in_progress', 'completed'] }
    query.worker = user._id // Only jobs assigned to this worker
  }

  // Step 3: Filter jobs based on the services the worker offers
  if (workerServices && workerServices.length > 0) {
    query.service = { $in: workerServices } // Assuming 'service' field in Job schema references the service offered
  }

  // Step 4: Query jobs and populate client and worker information
  const jobs = await Job.find(query).populate('client').populate('worker').populate('service')

  return res.status(200).json({
    results: jobs,
  })
}

const queryJobHistories = async (req, res) => {
  const { from, to } = req.query
  const query = { worker: req.user.id }

  if (from && to) {
    query.completion_time = {
      $gte: moment(from).startOf('month').toDate(),
      $lte: moment(to).endOf('month').toDate(),
    }
  }

  const jobs = await Job.find(query).populate('client').populate('worker').populate('service')

  return res.status(200).json({
    results: jobs,
  })
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
  job.worker = req.user.id
  job.status = 'accepted'
  job.confirmation_time = new Date()

  await job.save()
  return res.status(200).json({ message: 'Job accepted successfully' })
}

const updateJob = async (req, res) => {
  const { id } = req.params
  const { status } = req.body
  try {
    const job = await Job.findById(id)

    if (status === 'completed') {
      job.completion_time = new Date()

      // Need to update
      const user = await User.findById(req.user.id)
      user.balance += job.price
      job.payment_status = 'paid'

      await user.save()
    }

    job.status = status
    await job.save()
    return res.status(200).json({ message: 'Job updated' })
  } catch (error) {
    console.error('Error updating job:', error)
    throw error
  }
}

const getDashboardData = async (req, res) => {
  // Pre-filter jobs for the user
  const worker_jobs = await Job.find({ worker: req.user.id })

  const month_income = await Job.aggregate([
    {
      $match: {
        completion_time: { $gte: moment().startOf('month').toDate() },
        _id: { $in: worker_jobs.map((job) => job._id) },
      },
    }, // Filter by week and user jobs
    { $group: { _id: null, totalIncome: { $sum: '$price' } } },
  ])

  const ratings = await Job.aggregate([
    { $match: { rating: { $exists: true }, _id: { $in: worker_jobs.map((job) => job._id) } } },
    { $group: { _id: '$rating', count: { $sum: 1 } } },
  ])

  const rating_counts = ratings.reduce((acc, rating) => {
    acc[rating._id] = rating.count
    return acc
  }, {})

  return res.status(200).json({
    completed_jobs: worker_jobs.filter((job) => job.status === 'completed').length,
    month_income: month_income[0]?.totalIncome || 0,
    ratings: rating_counts,
    good_jobs: worker_jobs.filter((job) => job.rating && job.rating >= 4).length,
    average_jobs: worker_jobs.filter((job) => job.rating && job.rating >= 1 && job.rating < 4)
      .length,
  })
}

module.exports = {
  createJob,
  getJobs,
  cancelJob,
  queryJobsForWorker,
  queryJobHistories,
  updateJob,
  receiveJobFromWorker,
  getDashboardData,
}
