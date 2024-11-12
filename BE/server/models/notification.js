const mongoose = require('mongoose')
const { Schema } = mongoose

const NotiSchema = new Schema({
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  type: {
    type: String,
    enum: ['client', 'worker', 'system'],
    required: true,
  },
}, {
  timestamps: true
})

module.exports = mongoose.model('Notification', NotiSchema)
