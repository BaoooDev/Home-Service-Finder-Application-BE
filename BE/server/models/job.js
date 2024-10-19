const mongoose = require('mongoose');
const { Schema } = mongoose;

const JobSchema = new Schema({
  client_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  worker_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },  // Sẽ được thêm khi worker nhận công việc
  service_type: { type: String, required: true },  // Loại dịch vụ
  address: { type: String, required: true },  // Địa chỉ làm việc
  duration_hours: { type: Number, required: true },  // Thời lượng công việc (giờ)
  scheduled_time: { type: Date, required: true },  // Thời gian dự kiến
  status: { type: String, enum: ['pending', 'accepted', 'in_progress', 'completed', 'canceled'], default: 'pending' },  // Trạng thái công việc
  price: { type: Number, required: true },  // Giá dịch vụ
  payment_status: { type: String, enum: ['unpaid', 'paid', 'failed'], default: 'unpaid' },  // Trạng thái thanh toán
  created_at: { type: Date, default: Date.now },  // Thời gian tạo
  updated_at: { type: Date, default: Date.now }  // Thời gian cập nhật
});

module.exports = mongoose.model('Job', JobSchema);
