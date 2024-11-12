const mongoose = require('mongoose')
const { Schema } = mongoose

const JobSchema = new Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    worker: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Sẽ được thêm khi worker nhận công việc
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true }, // Loại dịch vụ
    address: { type: String, required: true }, // Địa chỉ làm việc
    duration_hours: { type: Number, required: true }, // Thời lượng công việc (giờ)
    scheduled_time: { type: Date, required: true }, // Thời gian dự kiến
    status: {
      type: String,
      enum: ['pending', 'accepted', 'in_progress', 'completed', 'canceled'],
      default: 'pending',
    }, // Trạng thái công việc
    price: { type: Number, required: true }, // Giá dịch vụ
    payment_status: { type: String, enum: ['unpaid', 'paid', 'failed'], default: 'unpaid' }, // Trạng thái thanh toán
    rating: { type: Number }, // Đánh giá
    service_comments: { type: String },
    confirmation_time: { type: Date }, // Giờ xác nhận
    completion_time: { type: Date }, // Giờ hoàn thành
  },
  { timestamps: true }
)

module.exports = mongoose.model('Job', JobSchema)
