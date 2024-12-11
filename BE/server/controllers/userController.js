const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/user')
const Job = require('../models/job')
const validator = require('validator')
const moment = require('moment')

const createToken = (user) => {
  const jwtkey = process.env.JWT_SECRET_KEY
  const payload = {
    id: user._id,
    username: user.username,
    role: user.role, 
  }
  return jwt.sign(payload, jwtkey, { expiresIn: '3d' })
}

const registerClient = async (req, res) => {
  try {
    const { password, email, full_name } = req.body

    if (!password || !full_name || !email) {
      return res.status(400).json({ success: false, message: 'Không để trống các trường' })
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ success: false, message: 'Email phải là email hợp lệ...' })
    }

    let existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email đã tồn tại trong hệ thống' })
    }

    const client_profile = { jobs: [] }

    let user = new User({
      password,
      email,
      full_name,
      role: 'client',
      client_profile, 
    })

    const salt = await bcrypt.genSalt(10)
    user.password = await bcrypt.hash(password, salt)

    await user.save()
    const token = createToken(user)
    res.status(200).json({
      _id: user._id,
      email: user.email,
      full_name: user.full_name,
      token, 
    })
  } catch (error) {
    console.log(error)
    res.status(500).json({ success: false, message: error.message })
  }
}

const registerWorker = async (req, res) => {
  try {
    const { password, email, full_name, identity_number,
      phone_number, address, services } = req.body
    if (!password || !full_name || !identity_number || !email) {
      return res
        .status(400)
        .json({ success: false, message: 'Không để trống các trường thông tin bắt buộc' })
    }

    // Kiểm tra định dạng email
    if (!validator.isEmail(email)) {
      return res.status(400).json({ success: false, message: 'Email phải là email hợp lệ...' })
    }

    let existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email đã tồn tại trong hệ thống' })
    }

    const worker_profile = {
      identity_number,
      is_verified: 'pending',
      address, 
      
    }
    let user = new User({
      password,
      email: email.toLowerCase(),
      full_name,
      address,
      phone_number,
      role: 'worker',
      worker_profile, 
    })
    const salt = await bcrypt.genSalt(10)
    user.password = await bcrypt.hash(password, salt)

    await user.save()

    const token = createToken(user)
    res.status(200).json({
      _id: user._id,
      email,
      full_name,
      phone_number,
      worker_profile,
      token, 
    })
  } catch (error) {
    console.log(error)
    res.status(500).json({ success: false, message: error.message })
  }
}

const loginAdmin = async (req, res) => {
  const { email, password } = req.body

  try {
    const user = await User.findOne({ email, role: 'admin' })
    if (!user) {
      return res.status(400).json({ msg: 'Vui lòng nhập đúng tài khoản và mật khẩu' })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(400).json({ msg: 'Vui lòng nhập đúng tài khoản và mật khẩu' })
    }

    const token = createToken(user)

    // Gửi phản hồi với token
    res.json({ token, user })
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

const loginWorker = async (req, res) => {
  const { email, password } = req.body

  try {
    const user = await User.findOne({ email: email.toLowerCase(), role: 'worker' })
    if (!user) {
      return res.status(400).json({ msg: 'Vui lòng nhập đúng tài khoản và mật khẩu' })
    }

    // So sánh mật khẩu
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(400).json({ msg: 'Vui lòng nhập đúng tài khoản và mật khẩu' })
    }

    const token = createToken(user)

    res.json({ token })
  } catch (error) {
    console.error(error.message)
    res.status(500).send('Server error')
  }
}

const getMe = async (req, res) => {
  const user = await User.findById(req.user.id).select('-password')
  if (!user) {
    return res.status(400).json({ msg: 'Vui lòng đăng nhập' })
  }

  const startOfWeek = moment().startOf('week').toDate()
  const endOfWeek = moment().endOf('week').toDate()

  const completedJobs = await Job.find({
    status: 'completed',
    payment_status: 'paid',
    worker: user.id
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
const getWorkerDetails = async (req, res) => {
  const userId = req.user.id;
  console.log(`Fetching details for user ID: ${userId}`);

  try {
    const worker = await User.findById(userId).select('full_name email phone_number worker_profile');

    if (!worker) {
      console.log('User not found in the database.');
      return res.status(404).json({ error: 'User not found.' });
    }
    res.status(200).json({
      id: worker._id,
      name: worker.full_name,
      email: worker.email,
      phone: worker.phone_number,
      isVerified: worker.worker_profile.is_verified,
      identityNumber: worker.worker_profile.identity_number,
      rating: worker.worker_profile.rating,
      reviews: worker.worker_profile.reviews,
      services: worker.worker_profile.services,
      address: worker.worker_profile.address,
    });
  } catch (error) {
    console.error('Error fetching worker details:', error.message);
    res.status(500).json({ error: 'An error occurred while fetching worker details.' });
  }
};

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
  getWorkerDetails
}
