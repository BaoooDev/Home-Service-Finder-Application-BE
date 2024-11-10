const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/user')
const Job = require('../models/job')
const validator = require('validator')
const moment = require('moment')

const createToken = (user) => {
  const jwtkey = process.env.JWT_SECRET_KEY
  const payload = {
    id: user._id, // Sử dụng _id thay vì id
    username: user.username,
    role: user.role, // Thêm role để phân quyền
  }
  return jwt.sign(payload, jwtkey, { expiresIn: '3d' })
}

const registerClient = async (req, res) => {
  try {
    // Lấy thông tin từ body
    const { password, email, full_name } = req.body

    // Kiểm tra các trường có được cung cấp hay không
    if (!password || !full_name || !email) {
      return res.status(400).json({ success: false, message: 'Không để trống các trường' })
    }

    // Kiểm tra định dạng email
    if (!validator.isEmail(email)) {
      return res.status(400).json({ success: false, message: 'Email phải là email hợp lệ...' })
    }

    // Kiểm tra email đã tồn tại chưa
    let existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email đã tồn tại trong hệ thống' })
    }

    // Kiểm tra độ mạnh của mật khẩu (có thể bật nếu cần)
    // if (!validator.isStrongPassword(password)) {
    //   return res
    //     .status(400)
    //     .json({ success: false, message: "Mật khẩu phải đủ mạnh..." });
    // }

    // Khởi tạo profile client (nếu cần) hoặc để trống
    const client_profile = { jobs: [] } // Mặc định client không có việc làm

    // Tạo người dùng mới
    let user = new User({
      password,
      email,
      full_name,
      role: 'client',
      client_profile, // Thêm profile của client
    })

    // Mã hóa mật khẩu trước khi lưu
    const salt = await bcrypt.genSalt(10)
    user.password = await bcrypt.hash(password, salt)

    // Lưu người dùng vào cơ sở dữ liệu
    await user.save()

    // Tạo JWT token
    const token = createToken(user) // Hàm này sẽ tạo JWT token

    // Gửi lại phản hồi cho client
    res.status(200).json({
      _id: user._id,
      email: user.email,
      full_name: user.full_name,
      token, // Token để client sử dụng cho các yêu cầu tiếp theo
    })
  } catch (error) {
    console.log(error)
    res.status(500).json({ success: false, message: error.message })
  }
}

const registerWorker = async (req, res) => {
  try {
    // Lấy thông tin từ body
    const { password, email, full_name, identity_number, address, services } = req.body

    // Kiểm tra các trường có được cung cấp hay không
    if (!password || !full_name || !identity_number || !email) {
      return res
        .status(400)
        .json({ success: false, message: 'Không để trống các trường thông tin bắt buộc' })
    }

    // Kiểm tra định dạng email
    if (!validator.isEmail(email)) {
      return res.status(400).json({ success: false, message: 'Email phải là email hợp lệ...' })
    }

    // Kiểm tra độ mạnh của mật khẩu
    //   if (!validator.isStrongPassword(password)) {
    //     return res
    //       .status(400)
    //       .json({ success: false, message: "Mật khẩu phải đủ mạnh..." });
    //   }

    // Kiểm tra email đã tồn tại chưa
    let existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email đã tồn tại trong hệ thống' })
    }

    // Khởi tạo profile cho worker
    const worker_profile = {
      identity_number,
      is_verified: false, // Chưa được xác thực
      status: 'pending', // Chờ duyệt
    }

    // Tạo một user mới và lưu vào cơ sở dữ liệu
    let user = new User({
      password,
      email: email.toLowerCase(),
      full_name,
      address,
      role: 'worker',
      worker_profile, // Đính kèm profile của worker
    })

    // Mã hóa mật khẩu trước khi lưu
    const salt = await bcrypt.genSalt(10)
    user.password = await bcrypt.hash(password, salt)

    // Lưu người dùng vào cơ sở dữ liệu
    await user.save()

    // Tạo JWT token
    const token = createToken(user)

    // Gửi phản hồi cho client
    res.status(200).json({
      _id: user._id,
      email,
      full_name,
      identity_number,
      address,
      token, // JWT Token để client sử dụng cho các yêu cầu khác
    })
  } catch (error) {
    console.log(error)
    res.status(500).json({ success: false, message: error.message })
  }
}

const loginAdmin = async (req, res) => {
  const { email, password } = req.body

  try {
    // Tìm người dùng với email và role là client
    const user = await User.findOne({ email, role: 'admin' })
    if (!user) {
      return res.status(400).json({ msg: 'Vui lòng nhập đúng tài khoản và mật khẩu' })
    }

    // So sánh mật khẩu
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(400).json({ msg: 'Vui lòng nhập đúng tài khoản và mật khẩu' })
    }

    // Tạo JWT
    const token = createToken(user)

    // Gửi phản hồi với token
    res.json({ token })
  } catch (error) {
    console.error(error.message)
    res.status(500).send('Server error')
  }
}

const loginClient = async (req, res) => {
  const { email, password } = req.body

  try {
    // Tìm người dùng với email và role là client
    const user = await User.findOne({ email, role: 'client' })
    if (!user) {
      return res.status(400).json({ msg: 'Vui lòng nhập đúng tài khoản và mật khẩu' })
    }

    // So sánh mật khẩu
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(400).json({ msg: 'Vui lòng nhập đúng tài khoản và mật khẩu' })
    }

    // Tạo JWT
    const token = createToken(user)

    // Gửi phản hồi với token
    res.json({ token })
  } catch (error) {
    console.error(error.message)
    res.status(500).send('Server error')
  }
}

// Đăng nhập Worker
const loginWorker = async (req, res) => {
  const { email, password } = req.body

  try {
    // Tìm người dùng với email
    const user = await User.findOne({ email: email.toLowerCase(), role: 'worker' })
    if (!user) {
      return res.status(400).json({ msg: 'Vui lòng nhập đúng tài khoản và mật khẩu' })
    }

    // So sánh mật khẩu
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(400).json({ msg: 'Vui lòng nhập đúng tài khoản và mật khẩu' })
    }

    if (!user.worker_profile.is_verified) {
      return res
        .status(400)
        .json({ msg: 'Tài khoản chưa được xác minh vui lòng liên hệ admin để xử lý' })
    }

    // Tạo JWT
    const token = createToken(user)

    res.json({ token })
  } catch (error) {
    console.error(error.message)
    res.status(500).send('Server error')
  }
}

const getMe = async (req, res) => {
  const user = await User.findById(req.user.id).select('-password')

  const startOfWeek = moment().startOf('week').toDate()
  const endOfWeek = moment().endOf('week').toDate()

  const completedJobs = await Job.find({
    status: 'completed',
    completion_time: { $gte: startOfWeek, $lte: endOfWeek },
    payment_status: 'paid',
  })

  // Calculate the total income from the completed jobs
  const total_income = completedJobs.reduce((acc, job) => acc + job.price, 0)

  // Filter jobs that have ratings
  const rated_jobs = completedJobs.filter((job) => job.rating !== undefined && job.rating !== null)

  // Calculate total rating and average rating
  const total_rating = rated_jobs.reduce((acc, job) => acc + job.rating, 0)
  const average_rating = rated_jobs.length > 0 ? total_rating / rated_jobs.length : 0

  // Return the total income and number of completed jobs
  return res.status(200).json({
    user,
    total_income,
    work_done: completedJobs.length,
    total_rating,
    average_rating,
    rated_jobs: rated_jobs.length, // Number of jobs that have a rating
  })
}

const addAddress = async (req, res) => {
  try {
    const userId = req.user.id

    const { name, phone, address } = req.body

    // Validate input
    if (!name || !phone || !address) {
      return res.status(400).json({ msg: 'Name, phone, and address are required' })
    }

    // Find the client and check if they exist
    const user = await User.findById(userId)
    if (!user || user.role !== 'client') {
      return res.status(404).json({ msg: 'Client not found' })
    }

    // Ensure client_profile is initialized
    if (!user.client_profile) {
      user.client_profile = { addresses: [] } // Initialize client_profile if it doesn't exist
    }

    // Ensure addresses array is initialized
    if (!user.client_profile.addresses) {
      user.client_profile.addresses = [] // Initialize addresses array if it doesn't exist
    }

    // Add the new address
    user.client_profile.addresses.push({ name, phone, address })
    await user.save()

    res
      .status(200)
      .json({ msg: 'Address added successfully', addresses: user.client_profile.addresses })
  } catch (error) {
    console.error('Error adding address:', error)
    res.status(500).json({ msg: 'Server error' })
  }
}

// Edit Address
const editAddress = async (req, res) => {
  try {
    const userId = req.user.id
    const { addressId, name, phone, address } = req.body

    // Validate input
    if (!addressId || !name || !phone || !address) {
      return res.status(400).json({ msg: 'Address ID, name, phone, and address are required' })
    }

    // Find the client and check if they exist
    const user = await User.findById(userId)
    if (!user || user.role !== 'client') {
      return res.status(404).json({ msg: 'Client not found' })
    }

    // Ensure client_profile and addresses exist
    if (!user.client_profile || !user.client_profile.addresses) {
      return res.status(400).json({ msg: 'No addresses found for this client' })
    }

    // Find the address to edit
    const addressIndex = user.client_profile.addresses.findIndex(
      (addr) => addr._id.toString() === addressId
    )
    if (addressIndex === -1) {
      return res.status(404).json({ msg: 'Address not found' })
    }

    // Update the address details
    user.client_profile.addresses[addressIndex] = { name, phone, address }

    // Save the updated user
    await user.save()

    res
      .status(200)
      .json({ msg: 'Address updated successfully', addresses: user.client_profile.addresses })
  } catch (error) {
    console.error('Error editing address:', error)
    res.status(500).json({ msg: 'Server error' })
  }
}

// Delete Address
const deleteAddress = async (req, res) => {
  try {
    const userId = req.user.id
    const { addressId } = req.body

    // Validate input
    if (!addressId) {
      return res.status(400).json({ msg: 'Address ID is required' })
    }

    // Find the client and check if they exist
    const user = await User.findById(userId)
    if (!user || user.role !== 'client') {
      return res.status(404).json({ msg: 'Client not found' })
    }

    // Ensure client_profile and addresses exist
    if (!user.client_profile || !user.client_profile.addresses) {
      return res.status(400).json({ msg: 'No addresses found for this client' })
    }

    // Find the address to delete
    const addressIndex = user.client_profile.addresses.findIndex(
      (addr) => addr._id.toString() === addressId
    )
    if (addressIndex === -1) {
      return res.status(404).json({ msg: 'Address not found' })
    }

    // Remove the address
    user.client_profile.addresses.splice(addressIndex, 1)

    // Save the updated user
    await user.save()

    res
      .status(200)
      .json({ msg: 'Address deleted successfully', addresses: user.client_profile.addresses })
  } catch (error) {
    console.error('Error deleting address:', error)
    res.status(500).json({ msg: 'Server error' })
  }
}
const getAddresses = async (req, res) => {
  try {
    // Assuming req.user contains the authenticated user's information
    const userId = req.user.id

    // Find the client by user ID
    const user = await User.findById(userId)

    // Check if the user exists and if the role is 'client'
    if (!user || user.role !== 'client') {
      return res.status(404).json({ msg: 'Client not found' })
    }

    // Send back the list of addresses
    res.status(200).json({ addresses: user.client_profile.addresses })
  } catch (error) {
    console.error('Error fetching addresses:', error)
    res.status(500).json({ msg: 'Server error' })
  }
}

const updateWorkerServices = async (req, res) => {
  const { services, address } = req.body
  try {
    await User.findByIdAndUpdate(
      req.user.id,
      {
        $addToSet: {
          'worker_profile.services': { $each: services },
        },
        $set: {
          'worker_profile.address': address,
        },
      },
      { new: true, runValidators: true }
    )

    res.status(200).json({ msg: 'Success' })
  } catch (error) {
    console.error('Error updating worker services:', error)
    return {
      success: false,
      message: 'Failed to update worker services',
      error: error.message,
    }
  }
}

module.exports = {
  registerClient,
  registerWorker,
  loginClient,
  loginWorker,
  loginAdmin,
  getMe,
  updateWorkerServices,
  addAddress,
  editAddress,
  deleteAddress,
  getAddresses,
}
