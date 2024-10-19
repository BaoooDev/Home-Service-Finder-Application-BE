const Notification = require('../models/notification')
const User = require('../models/user')

const createNoti = async (req, res) => {
  try {
    const { receiver, message, type } = req.body

    const user = await User.findById(req.user.id)
    if (user.role !== 'admin') {
      return res.status(400).json({ success: false, message: 'Bạn không có quyền này' })
    }

    if (receiver) {
      const receiverNoti = await User.findById(receiver)
      if (!receiverNoti) {
        return res.status(400).json({ success: false, message: 'Người nhận không tồn tại' })
      }
    }

    const newNoti = new Notification({
      sender: user._id,
      message,
      type,
      receiver,
    })

    await newNoti.save()

    // Phản hồi với thông tin công việc vừa tạo
    return res.status(200).json({
      message: 'Đã tạo thông báo thành công',
    })
  } catch (error) {
    console.log(error)
    res.status(500).json({ success: false, message: error.message })
  }
}

const queryNoties = async (req, res) => {
  const notis = await Notification.find()
  return res.status(200).json({
    results: notis,
  })
}

module.exports = {
  createNoti,
  queryNoties,
}
