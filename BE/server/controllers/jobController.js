const Job = require('../models/job')
const User = require('../models/user')
const moment = require('moment');

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

    // Phản hồi với thông tin công việc vừa tạo
    res.status(200).json({
      message: 'Đã đăng công việc thành công',
    })
  } catch (error) {
    console.log(error)
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

module.exports = {
  createJob,
  queryJobsForWorker,
  queryJobHistories,
}
