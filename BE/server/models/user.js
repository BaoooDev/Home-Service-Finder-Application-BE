const mongoose = require('mongoose')
const { Schema } = mongoose

// Client Profile Schema
const ClientProfileSchema = new Schema({
  jobs: [
    {
      job_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
      status: {
        type: String,
        enum: ['pending', 'confirmed', 'in_progress', 'completed', 'canceled'],
      },
      scheduled_time: { type: Date },
      worker_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
  ],
})

// Worker Profile Schema
const WorkerProfileSchema = new Schema({
  identity_number: String,
  is_verified: { type: Boolean, default: false },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
})

// Admin Profile Schema
const AdminProfileSchema = new Schema({
  verified_workers: [
    {
      worker_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      verification_date: { type: Date },
    },
  ],
  rejected_workers: [
    {
      worker_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      rejection_reason: String,
      rejection_date: { type: Date },
    },
  ],
})

// Main User Schema
const UserSchema = new Schema({
  username: String,
  password: { type: String },
  email: String,
  phone_number: { type: String, default: '' },
  address: String,
  full_name: String,
  role: { type: String, enum: ['client', 'worker', 'admin'], required: true },
  client_profile: ClientProfileSchema,
  worker_profile: WorkerProfileSchema,
  admin_profile: AdminProfileSchema,
  balance: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
})

module.exports = mongoose.model('User', UserSchema)
