const mongoose = require('mongoose');
const { Schema } = mongoose;

// Client Profile Schema
const ClientProfileSchema = new Schema({
  jobs: [{
    job_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
    status: { type: String, enum: ['pending', 'confirmed', 'in_progress', 'completed', 'canceled'] },
    scheduled_time: { type: Date },
    worker_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }]
});

// Worker Profile Schema
const WorkerProfileSchema = new Schema({
  identity_number: String,
  certifications: String,

  is_verified: { type: Boolean, default: false },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  kpi: {
    jobs_completed: { type: Number, default: 0 },
    rating: { type: Number, default: 0 }
  },
  assigned_jobs: [{
    job_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
    status: { type: String, enum: ['in_progress', 'completed'] },
    confirmation_time: { type: Date },
    completion_time: { type: Date }
  }]
});

// Admin Profile Schema
const AdminProfileSchema = new Schema({
  verified_workers: [{
    worker_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verification_date: { type: Date }
  }],
  rejected_workers: [{
    worker_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejection_reason: String,
    rejection_date: { type: Date }
  }]
});

// Main User Schema
const UserSchema = new Schema({
  username: String,
  password: String,
  email: String,
  phone_number: { type: String, default: '' },
  full_name: String,
  role: { type: String, enum: ['client', 'worker', 'admin'], required: true },
  client_profile: ClientProfileSchema,
  worker_profile: WorkerProfileSchema,
  admin_profile: AdminProfileSchema,
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
